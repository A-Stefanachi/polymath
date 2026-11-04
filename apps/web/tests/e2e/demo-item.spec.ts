import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ALT_TEXT, REFERENCE, attemptRows, createDemoItem, eventNames, type DemoFixture } from "./support/demo-item-fixture";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { signInAs } from "./support/signin";

// BL-0027 acceptance (FR-061, doc 09 S08): the throwaway /demo-item page.
const emails: string[] = [];
const fixtures: DemoFixture[] = [];

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

async function learnerWithTask(page: Page, tag: string) {
  const email = `bl0027-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  fixtures.push(await createDemoItem(learner.id));
  return learner.id;
}

test("signed-in learner answers correctly by keyboard: statement alternative, correct state, attempts row, events, axe clean", async ({ page }) => {
  const userId = await learnerWithTask(page, "ok");
  await page.goto("/demo-item");

  const statement = page.getByTestId("statement");
  await expect(statement).toBeVisible();
  await expect(statement).toHaveAttribute("aria-label", ALT_TEXT);
  await expect(statement.locator(".katex").first()).toBeVisible();
  await expect(page.getByText("Enter the voltage with a unit")).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);

  // Keyboard only: Tab reaches the answer field, Enter submits.
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Your answer")).toBeFocused();
  await page.keyboard.type(`${REFERENCE} V`);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Correct." })).toBeVisible();
  await expect(page.getByLabel("Your answer")).toHaveAttribute("readonly", "");
  expect((await attemptRows(userId)).map((r) => ({ grade_status: r.grade_status, correct: r.correct }))).toEqual([{ grade_status: "graded", correct: true }]);
  expect(await eventNames(userId)).toEqual(expect.arrayContaining(["task_shown", "attempt_submitted"]));

  const after = await new AxeBuilder({ page }).analyze();
  expect(after.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
});

test("a wrong answer shows the incorrect state and never the reference value", async ({ page }) => {
  const userId = await learnerWithTask(page, "bad");
  await page.goto("/demo-item");
  await page.getByLabel("Your answer").fill("4 V");
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByRole("heading", { name: "Not quite." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Correct." })).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toContain(String(REFERENCE));
  expect(await page.content()).not.toContain(String(REFERENCE));
  expect((await attemptRows(userId)).map((r) => r.correct)).toEqual([false]);
});

test("with no open session task the page shows a calm empty state", async ({ page }) => {
  const email = `bl0027-empty-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
  await page.goto("/demo-item");
  await expect(page.getByRole("heading", { name: "No question is waiting" })).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
});
