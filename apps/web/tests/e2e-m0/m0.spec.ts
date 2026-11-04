import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TEMPLATE_KEY, deleteLearner, queueTask, stagingAdmin, verifiedPoolItems } from "./support/staging";

// BL-0032, the M0 exit test on staging (doc 01 section 10; FR-001, FR-002, FR-004 founder record,
// FR-060, FR-061, FR-067, SM-06): email-code sign-in, consent, onboarding with a weekly target, one
// verified item of the voltage-divider template rendered for 3 seeds, numeric grading, and the attempt
// and events logged. The learner is a throwaway account made with the admin API (signup is off on
// staging) and deleted at the end.
//
// The only stand-in is the email itself: the browser's call to /auth/send-code is answered in the
// test, and the six-digit code is minted with the admin API, because staging's mail sender (Resend's
// test sender, infra/DEPLOY-STAGING.md) delivers only to the founder's inbox. The code is then typed
// into the real form and checked by the real /auth/verify-code route on staging. Delivery of the
// email itself is the founder's iPhone check in infra/VERIFIED.md.
const admin = stagingAdmin();
const email = `bl0032-m0-${Math.random().toString(36).slice(2, 10)}@example.test`;
let userId = "";

test.afterAll(async () => {
  if (userId) await deleteLearner(admin, userId);
});

// Staging is remote and slower than a local build: a click before React hydrates the page is lost,
// so each step waits for the page's scripts to settle first.
async function settled(page: Page, url: RegExp) {
  await expect(page).toHaveURL(url);
  await page.waitForLoadState("networkidle");
}

async function signInWithCode(page: Page) {
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  expect(error).toBeNull();
  userId = created.user?.id ?? "";
  expect(userId).not.toBe("");

  await page.route("**/auth/send-code", (route) => route.fulfill({ status: 200, json: { status: "sent" } }));
  await page.goto("/welcome");
  await settled(page, /\/welcome$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("Check your email and enter the 6-digit code here.")).toBeVisible();

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  expect(linkError).toBeNull();
  const code = link.properties?.email_otp ?? "";
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function consentAndOnboard(page: Page) {
  await settled(page, /\/consent$/);
  await page.getByRole("button", { name: "I agree to research use of my data" }).click();
  await settled(page, /\/onboarding$/);
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Hours per week (1 to 20)").fill("8");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Time zone")).toHaveValue("Europe/Rome");
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("M0 exit: sign in with a code, onboard, answer the verified divider item for 3 seeds, attempts and events logged", async ({ page, request }) => {
  const health = await request.get("/api/v1/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok", db: "ok" });

  const items = await verifiedPoolItems(admin);
  expect(items.length).toBeGreaterThanOrEqual(3); // acceptance 2: >= 3 verified items of the template
  const seeds = items.slice(0, 3);
  expect(new Set(seeds.map((i) => i.seed)).size).toBe(3);

  await signInWithCode(page);
  await consentAndOnboard(page);

  const { data: profile } = await admin
    .from("profiles")
    .select("weekly_minutes_target, timezone, onboarded_at, consents")
    .eq("id", userId)
    .single();
  expect(profile).toMatchObject({ weekly_minutes_target: 480, timezone: "Europe/Rome" });
  expect(profile?.onboarded_at).not.toBeNull();
  expect(JSON.stringify(profile?.consents ?? {})).toContain("research"); // FR-004 self-consent record

  const statements = new Set<string>();
  for (const item of seeds) {
    await queueTask(admin, userId, item);
    await page.goto("/demo-item");
    await settled(page, /\/demo-item$/);
    const statement = page.getByTestId("statement");
    await expect(statement).toBeVisible();
    const alt = (await statement.getAttribute("aria-label")) ?? "";
    expect(alt).not.toBe(""); // text alternative for the math (WCAG, doc 09 section 13)
    statements.add(alt);
    expect(await page.content()).not.toContain(String(item.reference)); // the key is never sent before grading

    if (statements.size === 1) {
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    }

    await page.getByLabel("Your answer").fill(`${item.reference.toPrecision(4)} ${item.unit}`);
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Skip" }).click(); // confidence comes before feedback (BL-0047)
    await expect(page.getByRole("heading", { name: "Correct." })).toBeVisible();
  }
  expect(statements.size).toBe(3); // three seeds, three different renderings

  // Logged: one graded, correct attempt per seed, and the events of the loop.
  const { data: attempts } = await admin
    .from("attempts")
    .select("item_id, grade_status, grade, items(status, template_key)")
    .eq("user_id", userId);
  expect(attempts).toHaveLength(3);
  for (const a of attempts ?? []) {
    expect(a.grade_status).toBe("graded");
    expect((a.grade as { correct?: boolean }).correct).toBe(true);
    // SM-06 for this learner: every served item is verified and from the M0 template.
    expect(a.items).toMatchObject({ status: "verified", template_key: TEMPLATE_KEY });
  }
  expect(new Set((attempts ?? []).map((a) => a.item_id))).toEqual(new Set(seeds.map((i) => i.id)));

  const { data: events } = await admin.from("events").select("name").eq("user_id", userId);
  const names = (events ?? []).map((e) => e.name as string);
  expect(names.filter((n) => n === "task_shown")).toHaveLength(3);
  expect(names.filter((n) => n === "attempt_submitted")).toHaveLength(3);
});
