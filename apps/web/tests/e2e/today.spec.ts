import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { acceptConsent, signInAs } from "./support/signin";
import { createTodayFixture, sessionRows, type TodayFixture } from "./support/today-fixture";

// BL-0059 acceptance: doc 09 S06 (Today), S07 (session preview), scenario 1 up to starting a 15 minute Phone
// session, plus S01/S02 reached on the way. The learner owns a small item pool created in the local database.
const SHOTS = "test-results/ui";
const emails: string[] = [];
const fixtures: TodayFixture[] = [];

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

/** New learner through sign-in, consent and onboarding (480 min a week), landing on Today. */
async function onboarded(page: Page, tag: string): Promise<string> {
  const email = `bl0059-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
  await acceptConsent(page);
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Hours per week (1 to 20)")).toHaveValue("8");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "What fits your time now?" })).toBeVisible();
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  return learner.id;
}

async function seriousViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => (document.scrollingElement ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth : 0));
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("phone", () => {
  test.use({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });

  test("scenario 1: S06 AC-1..4 and S07 AC-1, AC-3, AC-4: preview with dry_run, sheet, dismiss leaves no session, start a 15 minute Phone session", async ({ page }) => {
    const userId = await onboarded(page, "flow");
    fixtures.push(await createTodayFixture(userId));
    await page.reload();

    // Defaults: 15 minutes, Phone on a phone-width viewport.
    await expect(page.getByRole("radio", { name: "15 min" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Phone" })).toBeChecked();
    await expect(page.getByText(/^About \d+ min, \d+ tasks?$/)).toBeVisible();
    const about = await page.getByText(/^About \d+ min, \d+ tasks?$/).innerText();
    expect(Number(/About (\d+) min/.exec(about)?.[1])).toBeLessThanOrEqual(15);

    // S06 AC-1: changing the chip re-previews; the estimate stays within the chosen minutes.
    const previewCalls: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith("/api/v1/sessions/build")) previewCalls.push(r.postData() ?? "");
    });
    await page.getByRole("radio", { name: "30 min" }).check();
    await expect.poll(() => previewCalls.length).toBe(1);
    expect(JSON.parse(previewCalls[0] ?? "{}")).toMatchObject({ available_minutes: 30, context: "phone", dry_run: true });
    await expect(page.getByText(/^About \d+ min, \d+ tasks?$/)).toBeVisible();
    const longer = await page.getByText(/^About \d+ min, \d+ tasks?$/).innerText();
    expect(Number(/About (\d+) min/.exec(longer)?.[1])).toBeLessThanOrEqual(30);
    await page.getByRole("radio", { name: "15 min" }).check();
    await expect(page.getByText(/^About \d+ min, \d+ tasks?$/)).toBeVisible();

    // S07: the list is grouped and reads in plain language, with no internal code.
    await page.getByRole("button", { name: "See the list" }).click();
    const sheet = page.getByRole("dialog", { name: "Your session" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/^About \d+ min of your 15$/)).toBeVisible();
    await expect(sheet.getByText(/Series resistors/).first()).toBeVisible();
    expect(await sheet.innerText()).not.toMatch(/[a-z]+_[a-z]+/);
    await page.screenshot({ path: `${SHOTS}/today-preview-sheet.png` });

    // S07 AC-4: dismissing leaves no session row (previews are dry runs).
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    expect(await sessionRows(userId)).toEqual([]);

    // S06 AC-4 / S07 AC-1: Start persists one session for 15 minutes on the phone with N tasks, and opens it.
    await page.getByRole("button", { name: "Start 15-minute session" }).click();
    await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
    const rows = await sessionRows(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ context: "phone", session_type: "micro", status: "active" });
    expect(rows[0]?.planned_min).toBeLessThanOrEqual(15);
    expect(rows[0]?.tasks).toBeGreaterThan(0);

    // The placeholder says so honestly and lets the learner leave; Today then builds again.
    await expect(page.getByRole("heading", { level: 1, name: "Your session" })).toBeVisible();
    await expect(page.getByText(/not built yet/)).toBeVisible();
    await page.getByRole("button", { name: "End this session and go back" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/^About \d+ min, \d+ tasks?$/)).toBeVisible();
  });

  test("S06: an open session is offered instead of a second build", async ({ page }) => {
    const userId = await onboarded(page, "open");
    fixtures.push(await createTodayFixture(userId));
    await page.reload();
    await page.getByRole("button", { name: "Start 15-minute session" }).click();
    await expect(page).toHaveURL(/\/session\//);
    await page.goto("/");
    await expect(page.getByText("You have a session open")).toBeVisible();
    await page.getByRole("button", { name: "Go to your session" }).click();
    await expect(page).toHaveURL(/\/session\//);
  });

  test("S06 states: empty copy matches doc 09 3.3; a server error offers retry; Bench states what it is", async ({ page }) => {
    await onboarded(page, "states");
    await page.route("**/api/v1/sessions/build", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dry_run: true, session_type: "micro", context: "phone", planned_min: 0, tasks: [] }) }),
    );
    await page.reload();
    await expect(page.getByText("That is everything useful for now. Come back later, or pick a longer session.")).toBeVisible();
    await expect(page.getByText("Nothing is due right now.")).toBeVisible();

    await page.unroute("**/api/v1/sessions/build");
    let fail = true;
    await page.route("**/api/v1/sessions/build", (route) =>
      fail ? route.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ code: "internal", status: 500 }) }) : route.fallback(),
    );
    await page.getByRole("radio", { name: "30 min" }).check();
    await expect(page.getByRole("alert").filter({ hasText: "We could not build a session. Try again." })).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "We could not build a session" })).toBeHidden();

    await page.getByRole("radio", { name: "Bench" }).check();
    await expect(page.getByText("Bench: step-by-step project work")).toBeVisible();
  });

  test("S06 AC-5: keyboard path, chips are a radio group operated by arrow keys, Start by Enter; axe clean in light and dark, sheet open too", async ({ page }) => {
    const userId = await onboarded(page, "kbd");
    fixtures.push(await createTodayFixture(userId));
    await page.reload();
    await expect(page.getByText(/^About \d+ min, \d+ tasks?$/)).toBeVisible();
    await noHorizontalScroll(page);
    expect(await seriousViolations(page)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/today-light.png`, fullPage: true });

    await page.emulateMedia({ colorScheme: "dark" });
    expect(await seriousViolations(page)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/today-dark.png`, fullPage: true });
    await page.emulateMedia({ colorScheme: "light" });

    // Skip link, then the chips: Tab lands on the checked chip, ArrowRight moves the selection.
    await page.getByRole("radio", { name: "15 min" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "30 min" })).toBeChecked();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "15 min" })).toBeChecked();
    await expect(page.getByText(/^About \d+ min, \d+ tasks?$/)).toBeVisible();

    await page.getByRole("button", { name: "See the list" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Your session" })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "See the list" })).toBeFocused();

    await page.getByRole("button", { name: "Start 15-minute session" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/session\//);
  });
});

test("S06 at 1280 px: no horizontal scroll, Desktop is the default context, axe clean", async ({ page }) => {
  const userId = await onboarded(page, "wide");
  fixtures.push(await createTodayFixture(userId));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await expect(page.getByRole("radio", { name: "Desktop" })).toBeChecked();
  await expect(page.getByText(/^About \d+ min, \d+ tasks?$/)).toBeVisible();
  await noHorizontalScroll(page);
  expect(await seriousViolations(page)).toEqual([]);
  await page.screenshot({ path: `${SHOTS}/today-1280.png`, fullPage: true });
});

test("S01 sign-in page at 360 px: no horizontal scroll, axe clean", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/welcome");
  expect(await seriousViolations(page)).toEqual([]);
  await noHorizontalScroll(page);
});
