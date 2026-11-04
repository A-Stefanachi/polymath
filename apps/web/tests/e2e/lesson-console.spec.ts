import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { createLessonFixture, sampleLesson, type LessonFixture } from "./support/lesson-fixture";
import { withLocalSql } from "./support/review-fixture";
import { signInAs } from "./support/signin";

// BL-0201 acceptance (00a K9, FR-124, doc 07 section 15 L-G3): the lesson tab of /admin/content. The preview is the
// learner's primer component, so each step is checked against the lesson file itself. Approval is recorded in the
// database for that version only; the console never writes files.
const emails: string[] = [];
const fixtures: LessonFixture[] = [];

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

const serious = (violations: { impact?: string | null | undefined }[]) => violations.filter((v) => v.impact === "critical" || v.impact === "serious");

async function adminWithLessons() {
  const email = `bl0201-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  const fixture = await createLessonFixture();
  fixtures.push(fixture);
  return { email, fixture };
}

const versionRow = (skillKey: string, version: number) =>
  withLocalSql(async (sql) =>
    (
      await sql<{ status: string; reviewed_by: string | null; reviewed_at: Date | null; retired: boolean }[]>`
        select status::text as status, reviewed_by, reviewed_at, retired_at is not null as retired
          from public.skill_lessons where skill_key = ${skillKey} and version = ${version}`
    )[0],
  );

async function stepTexts(page: Page): Promise<string[]> {
  const out: string[] = [];
  const total = Number(/of (\d+)/.exec((await page.getByTestId("lesson-progress").innerText()) ?? "")?.[1]);
  for (let i = 0; i < total; i += 1) {
    out.push(await page.getByTestId("lesson-step").innerText());
    if (i < total - 1) await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  return out;
}

test("a learner cannot open the lesson tab (403), and the tab lists versions waiting for review", async ({ page }) => {
  const { email, fixture } = await adminWithLessons();
  await signInAs(page, email);
  await fixture.addVersion(1, "needs_human_review", null);
  expect((await page.goto("/admin/content?tab=lessons"))?.status()).toBe(403);
  const admin = await learnerFromCookies(page);
  if (!admin) throw new Error("no session");
  await withLocalSql((sql) => sql`insert into public.admin_users (user_id) values (${admin.id})`);
  await page.goto("/admin/content?tab=lessons");
  await expect(page.getByRole("heading", { name: "Lessons waiting for review" })).toBeVisible();
  await expect(page.getByRole("link", { name: `Open ${fixture.skillKey} version 1` })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Content kind" }).getByRole("link", { name: "Lessons" })).toHaveAttribute("aria-current", "page");
  expect(serious((await new AxeBuilder({ page }).analyze()).violations)).toEqual([]);
});

test("the preview shows every screen, the figure as an image, the mix-up, the checks and the recap; approval is by keyboard and touches one version", async ({ page }) => {
  test.setTimeout(120_000);
  const { email, fixture } = await adminWithLessons();
  await signInAs(page, email);
  const admin = await learnerFromCookies(page);
  if (!admin) throw new Error("no session");
  await withLocalSql((sql) => sql`insert into public.admin_users (user_id) values (${admin.id})`);
  await fixture.addVersion(1, "needs_human_review", null);
  await fixture.addVersion(2, "needs_human_review", null);
  const lesson = sampleLesson(fixture.skillKey);

  await page.goto("/admin/content?tab=lessons");
  await page.getByRole("link", { name: `Open ${fixture.skillKey} version 1` }).click();
  await expect(page.getByTestId("lesson-status")).toHaveText("needs_human_review");

  const texts = await stepTexts(page);
  expect(texts).toHaveLength(lesson.screens.length + 1 + lesson.checks.length + 1);
  lesson.screens.forEach((s, i) => expect(texts[i]).toContain(s.title));
  expect(texts[0]).toContain("Almost every circuit you will build has resistors in it");
  expect(texts[lesson.screens.length]).toContain("A common mix-up");
  expect(texts[lesson.screens.length]).toContain("The correct idea");
  expect(texts.at(-1)).toContain("Recap");

  // The figure is an image with its alt text, never markup in the page.
  while (!(await page.getByTestId("lesson-progress").innerText()).startsWith("Part 2 ")) await page.getByRole("button", { name: "Back", exact: true }).click();
  const figure = lesson.screens[1]?.figure;
  const img = page.getByRole("img", { name: figure?.alt ?? "" });
  await expect(img).toBeVisible();
  expect(await img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  await expect(page.getByTestId("lesson-primer").locator("svg")).toHaveCount(0);
  expect(serious((await new AxeBuilder({ page }).analyze()).violations)).toEqual([]);

  // Keyboard: the four checklist boxes, then the approve button. Nothing is recorded before it.
  expect((await versionRow(fixture.skillKey, 1))?.status).toBe("needs_human_review");
  const boxes = page.getByRole("checkbox");
  await expect(boxes).toHaveCount(4);
  await boxes.first().focus();
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
  }
  await expect(page.getByRole("button", { name: "Approve this version" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Lesson version approved.")).toBeVisible();
  await expect(page.getByTestId("approved-state")).toBeVisible();

  const approved = await versionRow(fixture.skillKey, 1);
  expect(approved).toMatchObject({ status: "verified", reviewed_by: admin.id, retired: false });
  expect(approved?.reviewed_at).not.toBeNull();
  expect(await versionRow(fixture.skillKey, 2)).toMatchObject({ status: "needs_human_review", reviewed_by: null });

  // Retiring version 2 leaves version 1 as the one learners get.
  await page.goto(`/admin/content?tab=lessons&lesson=${fixture.skillKey}&version=2`);
  await page.getByRole("button", { name: "Retire this version" }).click();
  await expect(page.getByText("Lesson version retired.")).toBeVisible();
  expect(await versionRow(fixture.skillKey, 2)).toMatchObject({ status: "retired", retired: true });
  expect(await versionRow(fixture.skillKey, 1)).toMatchObject({ status: "verified" });
});
