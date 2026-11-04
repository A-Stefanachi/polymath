import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestDb, runCli, type TestDb } from "../../../../tools/content-sync/test/helpers/db";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { createReviewFixture, withLocalSql, type ReviewFixture } from "./support/review-fixture";
import { signInAs } from "./support/signin";

// BL-0057 acceptance (FR-124, US-031, doc 07 T9, ST-AUTH-05): the /admin/content review console.
// Approval is recorded in the database (item_templates.body._review), never in a content file.
const REPO_CONTENT = path.resolve(import.meta.dirname, "../../../../polymath-app-spec/content");
const SYNCED = "tpl.math.units-kilo"; // the real template the throwaway sync database holds
const emails: string[] = [];

test.afterEach(async () => {
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

const newEmail = (tag: string) => `bl0057-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
const serious = (violations: { impact?: string | null | undefined }[]) => violations.filter((v) => v.impact === "critical" || v.impact === "serious");

test("non-admin gets 403 on /admin/content and a signed-out visitor is sent to /welcome (ST-AUTH-05)", async ({ page, browser, baseURL }) => {
  const email = newEmail("learner");
  emails.push(email);
  await signInAs(page, email);
  const response = await page.goto("/admin/content");
  expect(response?.status()).toBe(403);
  expect(await page.locator("body").innerText()).not.toContain("Templates waiting");

  const anonymous = await browser.newContext({ baseURL: baseURL ?? "" });
  const out = await (await anonymous.newPage()).goto("/admin/content");
  expect(new URL(out?.url() ?? "").pathname).toBe("/welcome");
  await anonymous.close();
});

test("admin approves a template by keyboard (hash stored), retires an item, and an edited file returns it to review on re-sync", async ({ page }) => {
  test.setTimeout(240_000);
  const email = newEmail("admin");
  emails.push(email);
  await signInAs(page, email);
  const admin = await learnerFromCookies(page);
  if (!admin) throw new Error("no session");
  await withLocalSql((sql) => sql`insert into public.admin_users (user_id) values (${admin.id})`);

  // A throwaway database synced from a copy of the content gives the template's real hash.
  const content = mkdtempSync(path.join(tmpdir(), "pm_bl57_"));
  for (const entry of ["mvp-skill-graph.yaml", "templates", "REVIEW-LOG.md", "prompts"]) {
    cpSync(path.join(REPO_CONTENT, entry), path.join(content, entry), { recursive: true });
  }
  let td: TestDb | undefined;
  let fixture: ReviewFixture | undefined;
  try {
    td = await createTestDb();
    const sync = () => runCli(["--content-root", content, "--database-url", td?.url ?? ""]);
    const first = sync();
    expect(first.status, first.stderr).toBe(0);
    const synced = (await td.sql<{ hash: string; job: string }[]>`
      select body->'_sync'->>'sha256' as hash, body->'_sync'->>'fuzz_job_id' as job from public.item_templates where key = ${SYNCED}`)[0];
    if (!synced) throw new Error("synced template missing");
    fixture = await createReviewFixture(synced.hash);
    const key = fixture.templateKey;
    const row = () =>
      withLocalSql(async (sql) =>
        (
          await sql<{ status: string; review: Record<string, string | number | null> | null }[]>`
            select status::text as status, body->'_review' as review from public.item_templates where key = ${key}`
        )[0],
      );

    await page.goto("/admin/content");
    await expect(page.getByRole("heading", { name: "Templates waiting for review" })).toBeVisible();
    expect(serious((await new AxeBuilder({ page }).analyze()).violations)).toEqual([]);
    await page.getByRole("link", { name: `Open ${key}` }).click();

    // Five (here two) generated items render with the typeset statement, key and report.
    await expect(page.getByTestId("item-statement")).toHaveCount(2);
    await expect(page.getByTestId("item-statement").first().locator(".katex")).toBeVisible();
    await expect(page.getByText("Reference answer").first()).toBeVisible();
    await expect(page.getByText("Verification report").first()).toBeVisible();
    expect(serious((await new AxeBuilder({ page }).analyze()).violations)).toEqual([]);

    // Without the hand-solve box nothing is recorded.
    await page.getByRole("button", { name: "Approve template" }).click();
    await expect(page.getByText("Tick the hand-solve box before approving.")).toBeVisible();
    expect((await row())?.status).toBe("needs_human_review");

    // Keyboard path: box, notes, button.
    await page.goto(`/admin/content?template=${key}`);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("I solved two of the five items by hand")).toBeFocused();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await page.keyboard.type("checked two by hand");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Approve template" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Template approved.")).toBeVisible();
    await expect(page.getByTestId("approved-state")).toBeVisible();

    const approved = await row();
    expect(approved?.status).toBe("verified");
    expect(approved?.review).toMatchObject({
      reviewer: admin.id,
      template_sha256: synced.hash,
      checklist_version: "g3_checklist_v1",
      hand_solve: "done",
      disagreements: 0,
      notes: "checked two by hand",
    });

    // Retire the first item with a reason.
    await page.getByLabel("Reason").first().fill("Wrong sign in the key");
    await page.getByRole("button", { name: "Retire item" }).first().click();
    await expect(page.getByText("Item retired.")).toBeVisible();
    const retired = await withLocalSql((sql) => sql<{ status: string }[]>`select status::text as status from public.items where id = ${fixture?.itemIds[0] ?? ""}`);
    expect(retired[0]?.status).toBe("retired");

    // Re-sync with the same hash keeps the sign-off; an edited file voids it (doc 07 T9).
    // The G2 job of the run covers all templates; this one gets its own passed job so no other row moves.
    const passed = (
      await td.sql<{ id: string }[]>`insert into public.jobs (kind, payload, status, result)
        values ('content_postprocess', '{}', 'succeeded', ${td.sql.json({ passed: true })}) returning id`
    )[0];
    await td.sql`update public.item_templates
                    set status = 'verified',
                        body = jsonb_set(jsonb_set(body, '{_review}', ${td.sql.json(approved?.review ?? {})}), '{_sync,fuzz_job_id}', to_jsonb(${passed?.id ?? ""}::text))
                  where key = ${SYNCED}`;
    const same = sync();
    expect(same.status, same.stderr).toBe(0);
    expect(same.stdout).toMatch(/templates\s+created=0 updated=0 unchanged=30 retired=0/);
    expect((await td.sql<{ status: string }[]>`select status::text as status from public.item_templates where key = ${SYNCED}`)[0]?.status).toBe("verified");

    const file = path.join(content, "templates", "math", `${SYNCED}.yaml`);
    writeFileSync(file, readFileSync(file, "utf8").replace("title: Kilo-ohms to ohms", "title: Kilo-ohms to ohms, edited after review"));
    const edited = sync();
    expect(edited.status, edited.stderr).toBe(0);
    expect(edited.stdout).toMatch(/templates\s+created=0 updated=1 unchanged=29 retired=0/);
    const after = await td.sql<{ status: string; review: unknown }[]>`select status::text as status, body->'_review' as review from public.item_templates where key = ${SYNCED}`;
    expect(after).toEqual([{ status: "needs_human_review", review: null }]);
  } finally {
    rmSync(content, { recursive: true, force: true });
    await fixture?.cleanup();
    await td?.drop();
  }
});
