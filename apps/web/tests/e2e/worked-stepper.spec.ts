import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { createRunnerFixture, sessionCounts, stepperRows, STEP_LABELS, type RunnerFixture } from "./support/runner-fixture";
import { sessionRows } from "./support/today-fixture";
import { acceptConsent, signInAs } from "./support/signin";

// BL-0199 acceptance (doc 09 S08 cards 6 and 7, 00a K4, FR-030, FR-032, LS-008): the worked-example stepper and the
// faded-problem card in the micro runner. Items carry labelled or unlabelled 3-step solutions, written the way the
// worker's item writer stores them (BL-0204), because the live templates have no labels yet. A new skill's session is
// worked example, faded problem, then same-day retrieval. 360 px is the phone width.
const emails: string[] = [];
const fixtures: RunnerFixture[] = [];

test.use({ viewport: { width: 360, height: 800 } });

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

async function started(page: Page, steps: "labelled" | "unlabelled") {
  const email = `bl0199-${steps}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
  await acceptConsent(page);
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "What fits your time now?" })).toBeVisible();
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  fixtures.push(await createRunnerFixture(learner.id, true, steps));
  await page.reload();
  await expect(page.getByRole("radio", { name: "15 min" })).toBeChecked();
  await page.getByRole("button", { name: "Start 15-minute session" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  const rows = await sessionRows(learner.id);
  expect(rows).toHaveLength(1);
  return { userId: learner.id, sessionId: rows[0]?.id ?? "" };
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => (document.scrollingElement ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth : 0));
  expect(overflow).toBeLessThanOrEqual(0);
}

const stepHeading = (page: Page, n: number) => page.getByRole("heading", { level: 2, name: new RegExp(`^Step ${String(n)} of 3`) });

/** The answer for the faded card, shared by the pointer and keyboard scenarios. */
async function answerFaded(page: Page) {
  await expect(page.getByTestId("given-steps")).toBeVisible();
  await page.getByLabel("Your answer", { exact: true }).fill("5 V");
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("radio", { name: "4", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correct." })).toBeVisible({ timeout: 15_000 });
}

test("AC-1: a labelled 3-step worked example reveals step 1, 2, 3 behind a label choice; completeTask runs once and no attempt is written", async ({ page }) => {
  const { sessionId, userId } = await started(page, "labelled");
  const completes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/api\/v1\/tasks\/[^/]+\/complete$/.test(r.url())) completes.push(r.postData() ?? "");
  });

  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(stepHeading(page, 1)).toBeVisible();
  await expect(stepHeading(page, 2)).toHaveCount(0);
  await expect(page.getByText("What is this step doing?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show the next step" })).toHaveCount(0);
  for (const label of STEP_LABELS) await expect(page.getByRole("button", { name: label })).toBeVisible();
  await noHorizontalScroll(page);

  // A wrong tap is allowed (no penalty); the right label is shown at once and the next step unlocks.
  await page.getByRole("button", { name: STEP_LABELS[2] }).click();
  await expect(page.getByRole("status")).toHaveText(`This step: ${STEP_LABELS[0]}`);
  await expect(stepHeading(page, 1)).toHaveText(`Step 1 of 3: ${STEP_LABELS[0]}`);
  await expect(stepHeading(page, 2)).toHaveCount(0);
  await page.getByRole("button", { name: "Show the next step" }).click();

  await expect(stepHeading(page, 2)).toBeFocused();
  await expect(stepHeading(page, 3)).toHaveCount(0);
  await page.getByRole("button", { name: STEP_LABELS[1] }).click();
  await page.getByRole("button", { name: "Show the next step" }).click();

  await expect(stepHeading(page, 3)).toBeFocused();
  await expect(page.getByText("Why it works")).toHaveCount(0);
  await page.getByRole("button", { name: STEP_LABELS[2] }).click();
  await expect(stepHeading(page, 3)).toHaveText(`Step 3 of 3: ${STEP_LABELS[2]}`);
  await expect(page.getByRole("button", { name: "Show the next step" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Why it works" })).toBeVisible();
  await expect(page.getByText("Equal resistors in series share the supply equally.")).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  await noHorizontalScroll(page);

  await page.getByLabel("In one sentence, say it in your own words (optional)").fill("The same current flows through both.");
  expect(completes).toHaveLength(0);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Your answer", { exact: true })).toBeVisible(); // the faded card

  expect(completes).toHaveLength(1);
  const body = JSON.parse(completes[0] ?? "{}") as { outcome: string; self_explanation: string };
  expect(body.outcome).toBe("done");
  expect(body.self_explanation).toContain(`s1: ${STEP_LABELS[2]} (other)`);
  expect(body.self_explanation).toContain(`s2: ${STEP_LABELS[1]} (matched)`);
  expect(body.self_explanation).toContain("Note: The same current flows through both.");

  const rows = await stepperRows(sessionId, userId);
  expect(rows.outcomes).toEqual([expect.objectContaining({ outcome: "done", self_explanation: body.self_explanation })]);
  expect((await sessionCounts(sessionId)).attempts).toBe(0);
  await expect.poll(async () => (await stepperRows(sessionId, userId)).viewed.length).toBe(1);
  const viewed = (await stepperRows(sessionId, userId)).viewed[0];
  expect(viewed?.dwell_ms).toBeGreaterThanOrEqual(0);
  expect(viewed?.dwell_ms).toBeLessThanOrEqual(300_000);
  expect(viewed?.skill_key).toMatch(/^math\./);
});

test("AC-2: a faded problem shows its given steps read-only, 'your turn', and the answer box, and grades as before", async ({ page }) => {
  const { sessionId } = await started(page, "labelled");
  // Get past the worked example: each labelled step needs its tap before the next unlocks.
  for (const [i, label] of STEP_LABELS.entries()) {
    await page.getByRole("button", { name: label }).click();
    if (i < 2) await page.getByRole("button", { name: "Show the next step" }).click();
  }
  await page.getByRole("button", { name: "Next" }).click();

  const given = page.getByTestId("given-steps");
  await expect(given).toBeVisible();
  await expect(given.getByRole("listitem")).toHaveCount(2); // the last step is never shown (00a K3)
  await expect(given).toContainText(`Step 1 of 3: ${STEP_LABELS[0]}`);
  await expect(given).toContainText(`Step 2 of 3: ${STEP_LABELS[1]}`);
  await expect(given).not.toContainText(STEP_LABELS[2]);
  await expect(given.getByRole("textbox")).toHaveCount(0);
  await expect(given.getByText("Step 3 of 3: your turn")).toBeVisible();
  await noHorizontalScroll(page);

  await answerFaded(page);
  expect(await sessionCounts(sessionId).then((c) => ({ attempts: c.attempts, correct: c.correct }))).toEqual({ attempts: 1, correct: 1 });
});

test("AC-3: an unlabelled template asks no label question, only the optional sentence", async ({ page }) => {
  const { sessionId, userId } = await started(page, "unlabelled");
  await expect(stepHeading(page, 1)).toHaveText("Step 1 of 3");
  await expect(page.getByText("What is this step doing?")).toHaveCount(0);
  await page.getByRole("button", { name: "Show the next step" }).click();
  await expect(stepHeading(page, 2)).toBeFocused();
  await page.getByRole("button", { name: "Show the next step" }).click();
  await expect(stepHeading(page, 3)).toBeVisible();
  await expect(page.getByText("What is this step doing?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show the next step" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Why it works" })).toBeVisible();

  // The sentence is optional: Next with it empty sends no self_explanation at all.
  const done = page.waitForRequest((r) => r.method() === "POST" && /\/tasks\/[^/]+\/complete$/.test(r.url()));
  await page.getByRole("button", { name: "Next" }).click();
  expect(JSON.parse((await done).postData() ?? "{}")).toEqual({ outcome: "done" });
  const [outcome, ...rest] = (await stepperRows(sessionId, userId)).outcomes;
  expect(rest).toEqual([]);
  expect(outcome?.outcome).toBe("done");
  expect(outcome).not.toHaveProperty("self_explanation");
  expect((await sessionCounts(sessionId)).attempts).toBe(0);
});

test("AC-4: the whole worked example and the faded card work from the keyboard alone", async ({ page }) => {
  const { sessionId } = await started(page, "labelled");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  for (let n = 1; n <= 3; n += 1) {
    if (n === 1) await page.keyboard.press("Tab");
    else {
      await expect(stepHeading(page, n)).toBeFocused();
      await page.keyboard.press("Tab");
    }
    await expect(page.locator('[role="group"] button:focus')).toHaveCount(1); // a label choice; their order is shuffled
    await page.keyboard.press("Enter");
    if (n < 3) {
      await expect(page.getByRole("button", { name: "Show the next step" })).toBeFocused();
      await page.keyboard.press("Enter");
    }
  }
  await page.keyboard.press("Tab");
  await page.keyboard.type("keyboard note");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Next" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("given-steps")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Your answer", { exact: true })).toBeFocused();
  await page.keyboard.type("5 V");
  await page.keyboard.press("Enter");
  await page.keyboard.press("4");
  await expect(page.getByRole("heading", { name: "Correct." })).toBeVisible({ timeout: 15_000 });
  expect((await sessionCounts(sessionId)).attempts).toBe(1);
});
