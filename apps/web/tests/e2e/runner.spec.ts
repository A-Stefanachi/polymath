import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { createRunnerFixture, applyWorkerGrade, sessionCounts, type RunnerFixture } from "./support/runner-fixture";
import { sessionRows } from "./support/today-fixture";
import { acceptConsent, signInAs } from "./support/signin";

// BL-0060 acceptance (FR-021, FR-025, FR-071, US-008, US-011; doc 09 S08, S09): a 15-minute micro session built and
// started from Today, run task by task, closed on a summary whose numbers equal the attempt rows.
// The symbolic item is graded by the worker in production; here WORKER_URL is unset, so the attempt stays pending
// (202) and the test stores the grade on the attempt row the way the worker does, then the runner's poll applies it.
const SHOTS = process.env["E2E_SHOTS"] ?? "test-results/ui";
const emails: string[] = [];
const fixtures: RunnerFixture[] = [];

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

type Started = { userId: string; sessionId: string };

/** New learner through consent and onboarding, an item pool, then Start on Today (15 min, Phone). */
async function startedSession(page: Page, tag: string, onlyNewSkill = false): Promise<Started> {
  const email = `bl0060-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
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
  fixtures.push(await createRunnerFixture(learner.id, onlyNewSkill));
  await page.reload();
  await expect(page.getByRole("radio", { name: "15 min" })).toBeChecked();
  await page.getByRole("button", { name: "Start 15-minute session" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  const rows = await sessionRows(learner.id);
  expect(rows).toHaveLength(1);
  return { userId: learner.id, sessionId: rows[0]?.id ?? "" };
}

async function seriousViolations(page: Page) {
  // Panels rise in over 160 ms; axe reads colours mid-fade otherwise.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  const axe = await new AxeBuilder({ page }).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => (document.scrollingElement ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth : 0));
  expect(overflow).toBeLessThanOrEqual(0);
}

type Kind = "worked" | "choice" | "symbolic" | "numeric" | "summary";

/** Which card is on screen now. Waits for the runner to show one of them. */
async function cardKind(page: Page): Promise<Kind> {
  const probes: [Kind, () => Promise<number>][] = [
    ["summary", () => page.getByTestId("headline").count()],
    ["worked", () => page.getByText("Read the steps, then go on.").count()],
    ["choice", () => page.getByRole("group", { name: "Choose one answer" }).count()],
    ["symbolic", () => page.getByLabel("Your expression").count()],
    ["numeric", () => page.getByLabel("Your answer", { exact: true }).count()],
  ];
  let found: Kind | null = null;
  await expect
    .poll(async () => {
      for (const [kind, count] of probes) if ((await count()) > 0) return (found = kind);
      return null;
    })
    .not.toBeNull();
  return found ?? "summary";
}

type Tally = { attempts: number; correct: number; numeric: number; numericWrong: number; choice: number; symbolic: number; worked: number };

/**
 * Plays the open session to its summary. Numeric: the first answer is wrong ("4 V"), later ones right ("5 V").
 * `keys` uses the keyboard only (Tab, typing, Enter, digit keys); otherwise the pointer.
 */
async function playSession(page: Page, userId: string, keys: boolean, shots?: string): Promise<Tally> {
  const tally: Tally = { attempts: 0, correct: 0, numeric: 0, numericWrong: 0, choice: 0, symbolic: 0, worked: 0 };
  const seen = new Set<string>();
  for (;;) {
    const kind = await cardKind(page);
    if (kind === "summary") return tally;
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    if (kind === "worked") {
      tally.worked += 1;
      if (shots && !seen.has("worked")) await page.screenshot({ path: `${shots}/runner-worked-example.png` });
      seen.add("worked");
      if (keys) {
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: /^(Next|Finish)$/ })).toBeFocused();
        await page.keyboard.press("Enter");
      } else {
        await page.getByRole("button", { name: /^(Next|Finish)$/ }).click();
      }
      await expect(page.getByText("Read the steps, then go on.")).toHaveCount(0);
      continue;
    }
    let correct = true;
    if (kind === "numeric") {
      correct = tally.numeric > 0;
      tally.numeric += 1;
      if (!correct) tally.numericWrong += 1;
      const text = correct ? "5 V" : "4 V";
      if (keys) {
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Your answer", { exact: true })).toBeFocused();
        await page.keyboard.type(text);
      } else {
        await page.getByLabel("Your answer", { exact: true }).fill(text);
      }
    } else if (kind === "choice") {
      tally.choice += 1;
      if (keys) {
        await page.keyboard.press("Tab");
        await page.keyboard.press("Space");
      } else {
        await page.getByRole("radio", { name: "The same current flows through both" }).check();
      }
      await expect(page.getByRole("radio", { name: "The same current flows through both" })).toBeChecked();
    } else {
      tally.symbolic += 1;
      if (keys) {
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Your expression")).toBeFocused();
        await page.keyboard.type("2*x");
      } else {
        await page.getByLabel("Your expression").fill("2*x");
      }
    }
    if (keys) await page.keyboard.press("Enter");
    else await page.getByRole("button", { name: "Check" }).click();

    // Confidence comes before any result (FR-071).
    await expect(page.getByRole("radiogroup", { name: "How sure are you?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^(Correct\.|Not quite\.)$/ })).toHaveCount(0);
    if (shots && !seen.has("confidence")) await page.screenshot({ path: `${shots}/runner-confidence.png` });
    seen.add("confidence");
    if (keys) await page.keyboard.press("4");
    else await page.getByRole("radio", { name: "4", exact: true }).click();

    if (kind === "symbolic") {
      // No worker: the answer is stored pending and the runner waits (doc 03 section 7.2).
      await expect(page.getByRole("heading", { name: "Checking your answer" })).toBeVisible();
      if (shots) await page.screenshot({ path: `${shots}/runner-pending.png` });
      await expect.poll(() => applyWorkerGrade(userId, true)).toBe(1);
    }
    await expect(page.getByRole("heading", { name: correct ? "Correct." : "Not quite." })).toBeVisible({ timeout: 15_000 });
    tally.attempts += 1;
    if (correct) tally.correct += 1;
    const state = `${kind}-${correct ? "ok" : "nq"}`;
    if (shots && !seen.has(state)) await page.screenshot({ path: `${shots}/runner-feedback-${state}.png` });
    seen.add(state);
    // After feedback the answer cannot be edited (S08 AC 4) and Next has focus, so Enter moves on.
    if (kind !== "choice") await expect(page.getByLabel(kind === "symbolic" ? "Your expression" : "Your answer", { exact: true })).toHaveAttribute("readonly", "");
    if (keys) {
      await expect(page.getByRole("button", { name: /^(Next|Finish)$/ })).toBeFocused();
      await page.keyboard.press("Enter");
    } else {
      await page.getByRole("button", { name: /^(Next|Finish)$/ }).click();
    }
  }
}

test.describe("phone", () => {
  test.use({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });

  test("scenario 1: a 15-minute micro session from Today to its summary; summary numbers equal the attempt rows", async ({ page }) => {
    const { userId, sessionId } = await startedSession(page, "flow");
    const tally = await playSession(page, userId, false, SHOTS);

    // The mix covers every answer type: numeric right and wrong, multiple choice, symbolic.
    // A 15-minute window holds the six due reviews (the packer's time estimates); BL-0060 names 7 tasks, which a
    // 15-minute window does not hold with these estimates, so the scenario runs six.
    expect(tally.attempts).toBeGreaterThanOrEqual(6);
    expect(tally.numeric - tally.numericWrong).toBeGreaterThanOrEqual(1);
    expect(tally.numericWrong).toBeGreaterThanOrEqual(1);
    expect(tally.choice).toBeGreaterThanOrEqual(1);
    expect(tally.symbolic).toBeGreaterThanOrEqual(1);

    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/summary$`));
    await expect(page.getByRole("heading", { level: 1, name: "Session summary" })).toBeVisible();
    // S09 AC 1: the numbers equal the sums over the session's attempt rows (SQL cross-check).
    const sql = await sessionCounts(sessionId);
    expect(sql.sessionStatus).toBe("completed");
    expect(sql.attempts).toBe(tally.attempts);
    expect(sql.correct).toBe(tally.correct);
    await expect(page.getByTestId("headline")).toHaveText(`You answered ${sql.correct} of ${sql.attempts} with at most a nudge.`);
    await expect(page.getByTestId("task-counts")).toContainText(`${sql.tasksDone} ${sql.tasksDone === 1 ? "task" : "tasks"} finished`);
    // S09 AC 2: no streak, points or badge.
    expect((await page.locator("main").innerText()).toLowerCase()).not.toMatch(/streak|xp|badge|points/);
    expect(await seriousViolations(page)).toEqual([]);
    await noHorizontalScroll(page);
    await page.screenshot({ path: `${SHOTS}/summary.png` });

    await page.getByRole("link", { name: "Back to Today" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "What fits your time now?" })).toBeVisible();
  });

  test("keyboard-only: the whole session is completed with Tab, typing, digits and Enter; axe is clean on the way", async ({ page }) => {
    const { userId, sessionId } = await startedSession(page, "keys");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    expect(await seriousViolations(page)).toEqual([]);
    // Tab order: Pause comes before the task; the heading holds focus, so Shift+Tab reaches Pause.
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("button", { name: "Pause" })).toBeFocused();
    await page.getByRole("heading", { level: 1 }).focus();
    const tally = await playSession(page, userId, true);
    expect(tally.attempts).toBeGreaterThan(0);
    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/summary$`));
    expect((await sessionCounts(sessionId)).attempts).toBe(tally.attempts);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Back to Today" })).toBeVisible();
  });

  test("a task answered twice quickly creates one attempt (idempotency)", async ({ page }) => {
    const { userId, sessionId } = await startedSession(page, "twice");
    const posted: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/api/v1/attempts")) posted.push(r.postData() ?? "");
    });
    // Walk to the first answerable card.
    for (;;) {
      const kind = await cardKind(page);
      if (kind !== "worked") break;
      await page.getByRole("button", { name: /^(Next|Finish)$/ }).click();
      await expect(page.getByText("Read the steps, then go on.")).toHaveCount(0);
    }
    const kind = await cardKind(page);
    if (kind === "numeric") await page.getByLabel("Your answer", { exact: true }).fill("5 V");
    else if (kind === "choice") await page.getByRole("radio", { name: "The same current flows through both" }).check();
    else await page.getByLabel("Your expression").fill("2*x");
    await page.getByRole("button", { name: "Check" }).click();
    // Two quick taps on the same confidence button: the second lands after the first has been taken.
    await page.getByRole("radio", { name: "3", exact: true }).dblclick();
    if (kind === "symbolic") await expect.poll(() => applyWorkerGrade(userId, true)).toBe(1);
    await expect(page.getByRole("heading", { name: /^(Correct\.|Not quite\.)$/ })).toBeVisible({ timeout: 15_000 });
    expect((await sessionCounts(sessionId)).attempts).toBe(1);

    // The same client_attempt_id sent twice at once (a retry after a dropped response) is one row too.
    expect(posted.length).toBeGreaterThanOrEqual(1);
    const statuses = await page.evaluate(
      async (body) =>
        Promise.all([0, 1].map(async () => (await fetch("/api/v1/attempts", { method: "POST", headers: { "content-type": "application/json" }, body })).status)),
      posted[0] ?? "",
    );
    expect(statuses.every((s) => s === 200)).toBe(true);
    expect((await sessionCounts(sessionId)).attempts).toBe(1);
  });

  test("Pause stops the clock view, Back asks to pause, End asks first and leads to the summary", async ({ page }) => {
    const { sessionId } = await startedSession(page, "pause");
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("heading", { name: "Session paused" })).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // S08 AC 6: the browser Back button pauses and keeps the session open.
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Session paused" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));
    await page.getByRole("button", { name: "End this session" }).click();
    await expect(page.getByText("End now? Your answers are saved.")).toBeVisible();
    await page.getByRole("button", { name: "End session" }).click();
    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/summary$`));
    await expect(page.getByTestId("headline")).toHaveText("No answers were recorded this time.");
    expect((await sessionCounts(sessionId)).sessionStatus).toBe("completed");
  });

  test("a new skill opens with a worked example: no answer field, no confidence, Next writes no attempt", async ({ page }) => {
    const { sessionId } = await startedSession(page, "worked", true);
    expect(await cardKind(page)).toBe("worked");
    await expect(page.getByLabel("Your answer")).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "How sure are you?" })).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/runner-worked-example.png` });
    await page.getByRole("button", { name: /^(Next|Finish)$/ }).click();
    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/summary$`));
    expect((await sessionCounts(sessionId)).attempts).toBe(0);
  });

  test("the ? key opens the shortcut list and Escape closes it", async ({ page }) => {
    await startedSession(page, "help");
    await page.getByRole("heading", { level: 1 }).focus();
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Enter");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test("axe: zero critical or serious issues at 360 and 1280 px, light and dark; no horizontal scroll", async ({ page }) => {
  test.setTimeout(180_000);
  const { sessionId } = await startedSession(page, "axe");
  const combos = [
    { width: 360, height: 800, scheme: "light" as const },
    { width: 360, height: 800, scheme: "dark" as const },
    { width: 1280, height: 800, scheme: "light" as const },
    { width: 1280, height: 800, scheme: "dark" as const },
  ];
  const sweep = async (label: string) => {
    for (const c of combos) {
      await page.setViewportSize({ width: c.width, height: c.height });
      await page.emulateMedia({ colorScheme: c.scheme });
      expect(await seriousViolations(page), `${label} ${c.width} ${c.scheme}`).toEqual([]);
      await noHorizontalScroll(page);
    }
  };
  while ((await cardKind(page)) === "worked") await page.getByRole("button", { name: /^(Next|Finish)$/ }).click();
  const kind = await cardKind(page);
  await sweep("question");
  if (kind === "numeric") await page.getByLabel("Your answer", { exact: true }).fill("4 V");
  else if (kind === "choice") await page.getByRole("radio", { name: "The same current flows through both" }).check();
  else await page.getByLabel("Your expression").fill("2*x");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("radiogroup", { name: "How sure are you?" })).toBeVisible();
  await sweep("confidence");
  await page.getByRole("button", { name: "Skip" }).click();
  if (kind === "symbolic") await expect(page.getByRole("heading", { name: "Checking your answer" })).toBeVisible();
  await sweep(kind === "symbolic" ? "pending" : "feedback");
  await page.getByRole("button", { name: "Report a problem" }).click();
  await sweep("report");
  // Paused and the summary.
  await page.getByRole("button", { name: "Pause" }).click();
  await sweep("paused");
  await page.getByRole("button", { name: "End this session" }).click();
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/summary$`));
  await expect(page.getByTestId("headline")).toBeVisible();
  await sweep("summary");
});
