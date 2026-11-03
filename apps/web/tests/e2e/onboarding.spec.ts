import { expect, test } from "@playwright/test";
import { adminClient, deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { acceptConsent, signInAs } from "./support/signin";

// BL-0023 acceptance; S01 AC-2 and S02 (doc 09). The browser runs in Europe/Rome so the
// time-zone auto-detection is visible.
const email = `bl0023-${Math.random().toString(36).slice(2, 10)}@example.test`;
test.afterAll(async () => {
  await deleteUserByEmail(email);
});

test("S01 AC-2 + S02: a new learner lands on onboarding; finishing saves, and the values persist after reload", async ({ page }) => {
  await signInAs(page, email);
  await acceptConsent(page); // consent comes before onboarding (BL-0028)

  // Step 1: goal and adult attestation; Next is refused until it is ticked.
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "confirm" })).toBeVisible();
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: weekly time, validated before Next (S02 AC-3: no skip).
  await expect(page.getByLabel("Hours per week (1 to 20)")).toHaveValue("8");
  await page.getByLabel("Hours per week (1 to 20)").fill("0");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "1 to 20" })).toBeVisible();
  await page.getByLabel("Hours per week (1 to 20)").fill("6.5");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: time zone is detected; going back keeps the earlier answers (S02 AC-2).
  await expect(page.getByLabel("Time zone")).toHaveValue("Europe/Rome");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Hours per week (1 to 20)")).toHaveValue("6.5");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Display name (optional)").fill("Ada");
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Reload: home no longer sends the learner to onboarding, the API and the form show the values.
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  const { data } = await learner.client.from("profiles").select("display_name, timezone, weekly_minutes_target, onboarded_at, adult_attested_at").eq("id", learner.id).single();
  expect(data).toMatchObject({ display_name: "Ada", timezone: "Europe/Rome", weekly_minutes_target: 390 });
  expect(data?.onboarded_at).not.toBeNull();
  expect(data?.adult_attested_at).not.toBeNull();
  const api = await page.request.get("/api/v1/profile");
  expect(await api.json()).toMatchObject({ display_name: "Ada", timezone: "Europe/Rome", weekly_minutes_target: 390 });

  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Hours per week (1 to 20)")).toHaveValue("6.5");
});

test("ST-API-05: PATCH profile with cohort_id or consents is refused and the row is unchanged (browser session)", async ({ page }) => {
  const admin = adminClient();
  await signInAs(page, email); // each test has its own browser context
  await expect(page).toHaveURL(/\/$/); // already onboarded by the test above
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  const { data: row } = await admin.from("profiles").select("*").eq("id", learner.id).single();
  for (const body of [{ cohort_id: learner.id }, { consents: { research: { version: "x", granted: true } } }, { weekly_minutes_target: 100000 }, { weekly_minutes_target: 0 }]) {
    const res = await page.request.patch("/api/v1/profile", { data: body });
    expect(res.status()).toBe(400);
  }
  const { data: after } = await admin.from("profiles").select("*").eq("id", learner.id).single();
  expect(after).toEqual(row);
});
