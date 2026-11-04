import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { sampleLesson } from "./support/lesson-fixture";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { withLocalSql } from "./support/review-fixture";
import { createRunnerFixture, MIXUP_VALUE, STEP_LABELS, type RunnerFixture } from "./support/runner-fixture";
import { acceptConsent, signInAs } from "./support/signin";
import { sessionRows } from "./support/today-fixture";

// BL-0202 acceptance (doc 09 S08 card 9, 00a K8 and K10, FR-030, FR-072): the concept primer before the worked-example
// stepper, its ungraded checks, the two events, and the link from a graded mix-up back to the recap. 360 px is the phone.
const emails: string[] = [];
const fixtures: RunnerFixture[] = [];

test.use({ viewport: { width: 360, height: 800 } });

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

const serious = (violations: { impact?: string | null | undefined }[]) => violations.filter((v) => v.impact === "critical" || v.impact === "serious");
const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true });

async function started(page: Page, admin = false) {
  const email = `bl0202-${Math.random().toString(36).slice(2, 10)}@example.test`;
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
  const fixture = await createRunnerFixture(learner.id, true, "labelled");
  fixtures.push(fixture);
  // The founder has approved this primer: one verified version of the sample lesson for the new skill.
  await withLocalSql(
    (sql) =>
      sql`insert into public.skill_lessons (skill_key, version, status, body, content_hash, license, source, reviewed_by, reviewed_at)
        values (${fixture.newSkillKey}, 1, 'verified', ${sql.json(sampleLesson(fixture.newSkillKey) as never)}, 'bl0202', 'original', 'bl0202-test', ${learner.id}, now())`,
  );
  if (admin) await withLocalSql((sql) => sql`insert into public.admin_users (user_id) values (${learner.id})`);
  await page.reload();
  await expect(page.getByRole("radio", { name: "15 min" })).toBeChecked();
  await page.getByRole("button", { name: "Start 15-minute session" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  const rows = await sessionRows(learner.id);
  return { userId: learner.id, sessionId: rows[0]?.id ?? "", skillKey: fixture.newSkillKey };
}

const events = (userId: string, name: string) =>
  withLocalSql((sql) => sql<{ props: Record<string, unknown> }[]>`select props from public.events where user_id = ${userId} and name = ${name} order by at`);
const learnerRows = (userId: string) =>
  withLocalSql(
    async (sql) =>
      (
        await sql<{ n: number }[]>`
          select (select count(*) from public.attempts where user_id = ${userId})::int
               + (select count(*) from public.skill_state where user_id = ${userId})::int
               + (select count(*) from public.review_log where user_id = ${userId})::int as n`
      )[0]?.n,
  );

test("AC: primer, misconception screen, check feedback, then step 1 of the stepper; two check events and no attempt, skill_state or review_log row", async ({ page }) => {
  const { userId, skillKey } = await started(page);
  const lesson = sampleLesson(skillKey);
  const before = await learnerRows(userId);

  await expect(page.getByTestId("lesson-primer")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: lesson.screens[0]?.title ?? "" })).toBeVisible();
  await expect(page.getByTestId("lesson-step")).toContainText("Almost every circuit you will build has resistors in it");
  expect(serious((await new AxeBuilder({ page }).analyze()).violations)).toEqual([]);

  // Screens, "Skip to the example" on each, the figure only as an image with its alt text.
  for (let i = 0; i < lesson.screens.length; i += 1) {
    await expect(page.getByRole("button", { name: "Skip to the example" })).toBeVisible();
    await expect(page.getByTestId("lesson-primer").locator("svg")).toHaveCount(0);
    const figure = lesson.screens[i]?.figure;
    if (figure) expect(await page.getByRole("img", { name: figure.alt }).getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    await next(page).click();
  }
  await expect(page.getByRole("heading", { level: 2, name: "A common mix-up" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Skip to the example" })).toBeVisible();
  await expect(page.getByTestId("lesson-mixup")).toContainText("The correct idea");
  await next(page).click();

  // Check 1: the right option; check 2: a wrong option. Both give feedback and neither is marked as an attempt.
  for (const [i, check] of lesson.checks.entries()) {
    await expect(page.getByRole("button", { name: "Skip to the example" })).toBeVisible();
    const wanted = check.options.findIndex((o) => o.correct === (i === 0));
    await page.getByRole("group").getByRole("button").nth(Math.max(0, wanted)).click();
    await expect(page.getByTestId("lesson-check-feedback")).toContainText(i === 0 ? "Right." : "Not quite.");
    await next(page).click();
  }
  await expect(page.getByRole("heading", { level: 2, name: "Recap" })).toBeVisible();
  expect(serious((await new AxeBuilder({ page }).analyze()).violations)).toEqual([]);
  await page.getByRole("button", { name: "Go to the example" }).click();

  await expect(page.getByRole("heading", { level: 2, name: /^Step 1 of 3/ })).toBeVisible();
  await expect(page.getByTestId("lesson-primer")).toHaveCount(0);

  await expect.poll(async () => (await events(userId, "lesson_check_answered")).length).toBe(2);
  expect((await events(userId, "lesson_check_answered")).map((e) => e.props["correct"])).toEqual([true, false]);
  const viewed = await events(userId, "lesson_viewed");
  expect(viewed).toHaveLength(1);
  expect(viewed[0]?.props).toMatchObject({ skill_key: skillKey, lesson_version: 1, variant: "full", skipped: false });
  expect(await learnerRows(userId)).toBe(before);
});

test("AC: skip from screen 1 (keyboard) lands on step 1 and lesson_viewed is recorded with skipped true", async ({ page }) => {
  const { userId } = await started(page);
  await expect(page.getByTestId("lesson-primer")).toBeVisible();
  await page.getByRole("button", { name: "Skip to the example" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: /^Step 1 of 3/ })).toBeVisible();
  await expect.poll(async () => (await events(userId, "lesson_viewed")).length).toBe(1);
  expect((await events(userId, "lesson_viewed"))[0]?.props).toMatchObject({ variant: "full", skipped: true, screens_seen: 1 });
  expect(await events(userId, "lesson_check_answered")).toHaveLength(0);
});

test("AC: a numeric answer equal to a misconception expression with the lesson's tag shows 'Common mix-up' and opens the recap", async ({ page }) => {
  await started(page);
  await page.getByRole("button", { name: "Skip to the example" }).click();
  for (const [i, label] of STEP_LABELS.entries()) {
    await page.getByRole("button", { name: label }).click();
    if (i < 2) await page.getByRole("button", { name: "Show the next step" }).click();
  }
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByTestId("given-steps")).toBeVisible();
  await page.getByLabel("Your answer", { exact: true }).fill(`${String(MIXUP_VALUE)} V`);
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("radio", { name: "4", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Not quite." })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("mixup")).toContainText("Common mix-up");
  await expect(page.getByTestId("mixup")).toContainText("20 mA is 0.020 A");
  await page.getByRole("button", { name: "Read the recap" }).click();
  await expect(page.getByTestId("lesson-recap")).toContainText("Rearrange for the missing quantity");
  expect(serious((await new AxeBuilder({ page }).analyze()).violations)).toEqual([]);
});

test("AC: the console preview matches the learner render (same component)", async ({ page }) => {
  const { skillKey } = await started(page, true);
  const learnerStep = await page.getByTestId("lesson-step").innerHTML();
  await page.goto(`/admin/content?tab=lessons&lesson=${skillKey}&version=1`);
  await expect(page.getByTestId("lesson-primer")).toBeVisible();
  expect(await page.getByTestId("lesson-step").innerHTML()).toBe(learnerStep);
});
