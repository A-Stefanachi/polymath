import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { REFERENCE, attemptRows, createDemoItem, type DemoFixture } from "./support/demo-item-fixture";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { signInAs } from "./support/signin";

// BL-0047 acceptance (FR-071, LS-071, doc 09 S08 AC 3): confidence is asked before feedback.
const emails: string[] = [];
const fixtures: DemoFixture[] = [];

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

async function learnerWithTask(page: Page, tag: string) {
  const email = `bl0047-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  fixtures.push(await createDemoItem(learner.id));
  return learner.id;
}

test("feedback stays hidden until a confidence is chosen, then the 1-5 value is stored", async ({ page }) => {
  const userId = await learnerWithTask(page, "pick");
  await page.goto("/demo-item");
  await page.getByLabel("Your answer").fill(`${REFERENCE} V`);
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByRole("group", { name: "How sure are you?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1 Guessing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "5 Certain" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Correct\.|Not quite\./ })).toHaveCount(0);
  await expect(page.getByLabel("Your answer")).toHaveAttribute("readonly", "");
  expect(await attemptRows(userId)).toEqual([]);

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);

  await page.getByRole("button", { name: "4", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correct." })).toBeVisible();
  await expect(page.getByTestId("confidence")).toHaveCount(0);
  expect((await attemptRows(userId)).map((r) => r.confidence)).toEqual([4]);
});

test("skipping reveals feedback and stores null", async ({ page }) => {
  const userId = await learnerWithTask(page, "skip");
  await page.goto("/demo-item");
  await page.getByLabel("Your answer").fill("4 V");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("heading", { name: "Not quite." })).toHaveCount(0);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "Not quite." })).toBeVisible();
  expect((await attemptRows(userId)).map((r) => r.confidence)).toEqual([null]);
});
