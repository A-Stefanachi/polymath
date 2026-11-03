import { expect, test, type Page } from "@playwright/test";
import {
  adminClient,
  ageSignInTokens,
  deleteUserByEmail,
  learnerFromCookies,
  linkOnApp,
  readSignInMail,
  uniqueEmail,
} from "./support/mail";

// BL-0021 acceptance tests; S01 (doc 09). Each test deletes the user it created.
let email: string;
test.beforeEach(() => {
  email = uniqueEmail();
});
test.afterEach(async () => {
  await deleteUserByEmail(email);
});

async function requestCode(page: Page): Promise<number> {
  const sentAt = Date.now() - 2000; // Mailpit and this machine share a clock; allow for rounding
  await page.goto("/welcome");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("Check your email and enter the 6-digit code here.")).toBeVisible();
  return sentAt;
}

async function expectProfileRow(page: Page) {
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session cookie after sign-in");
  const { data, error } = await learner.client.from("profiles").select("id, weekly_minutes_target").eq("id", learner.id);
  expect(error).toBeNull();
  expect(data).toEqual([{ id: learner.id, weekly_minutes_target: 480 }]);
}

test("AC-1 the emailed six-digit code signs in and lands on / with a profiles row", async ({ page }) => {
  const sentAt = await requestCode(page);
  const codeField = page.getByLabel("6-digit code");
  await expect(codeField).toHaveAttribute("autocomplete", "one-time-code");
  await expect(codeField).toHaveAttribute("inputmode", "numeric");
  const { code } = await readSignInMail(email, sentAt);
  expect(code).toMatch(/^\d{6}$/);
  await codeField.fill(`${code.slice(0, 3)} ${code.slice(3)}`); // pasted with a space
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expectProfileRow(page);
});

test("AC-2 the same email holds a working link; following it signs in", async ({ page, baseURL }) => {
  const sentAt = await requestCode(page);
  const { link } = await readSignInMail(email, sentAt);
  await page.goto(linkOnApp(link, baseURL ?? ""));
  await expect(page).toHaveURL(/\/$/);
  await expectProfileRow(page);
});

test("AC-4 ST-AUTH-03: a consumed code and a consumed link are rejected and create no session", async ({ page, context, baseURL }) => {
  const sentAt = await requestCode(page);
  const { code, link } = await readSignInMail(email, sentAt);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Same code again, signed out.
  await context.clearCookies();
  await page.goto("/welcome");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  // The new request replaced the old code; submit the old one anyway.
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "That code did not work" })).toBeVisible();
  expect(await learnerFromCookies(page)).toBeNull();

  // The link from the first email, now consumed.
  await page.goto(linkOnApp(link, baseURL ?? ""));
  await expect(page).toHaveURL(/\/welcome\?error=link/);
  await expect(page.getByRole("alert").filter({ hasText: "That sign-in link did not work" })).toBeVisible();
  expect(await learnerFromCookies(page)).toBeNull();
});

test("AC-4 ST-AUTH-03: an expired code and an expired link are rejected and create no session", async ({ page, baseURL }) => {
  const sentAt = await requestCode(page);
  const { code, link } = await readSignInMail(email, sentAt);
  ageSignInTokens(email);

  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "That code did not work" })).toBeVisible();
  expect(await learnerFromCookies(page)).toBeNull();

  await page.goto(linkOnApp(link, baseURL ?? ""));
  await expect(page).toHaveURL(/\/welcome\?error=link/);
  expect(await learnerFromCookies(page)).toBeNull();
});

test("S01 AC-1 an invalid email shows an inline error without a page reload", async ({ page }) => {
  await page.goto("/welcome");
  await page.evaluate(() => ((window as unknown as { marker: string }).marker = "same-page"));
  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter an email address" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe("same-page");
});

test("the request gate sends a signed-out visitor from / to /welcome", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
});

test("handle_new_user: creating an auth user creates its profiles row with the defaults", async () => {
  const admin = adminClient();
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  expect(error).toBeNull();
  const id = created.user?.id;
  expect(id).toBeTruthy();
  const { data: profile } = await admin.from("profiles").select("id, timezone, weekly_minutes_target, onboarded_at").eq("id", id);
  expect(profile).toEqual([{ id, timezone: "UTC", weekly_minutes_target: 480, onboarded_at: null }]);
});
