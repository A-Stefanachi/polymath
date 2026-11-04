import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail } from "./support/mail";
import { acceptConsent, signInAs } from "./support/signin";

// BL-0061 acceptance (doc 09 S14, S15, S17): /map, /progress and /review. The three screens read the app's own API
// from the browser, so the scenarios answer those documents with fixed JSON (page.route); the server side of each
// operation has its own tests (BL-0048, BL-0190). A learner is still signed in for real, so the proxy gate runs.
const SHOTS = "test-results/bl0061";
const emails: string[] = [];

test.afterEach(async () => {
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

async function signedIn(page: Page, tag: string) {
  const email = `bl0061-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
}

const answer = (page: Page, pattern: string | RegExp, body: unknown, status = 200) =>
  page.route(pattern, (route) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }));

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => (document.scrollingElement ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth : 0));
  expect(overflow).toBeLessThanOrEqual(0);
}

async function seriousViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

/** axe in light, then dark (system setting). */
async function axeBothThemes(page: Page) {
  await page.emulateMedia({ colorScheme: "light" });
  expect(await seriousViolations(page)).toEqual([]);
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await seriousViolations(page)).toEqual([]);
  await page.emulateMedia({ colorScheme: "light" });
}

// ---------- fixtures ----------

const day = (offset: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const sk = (key: string, title: string, state?: Record<string, unknown>) => ({
  key,
  node: key.split(".")[0],
  module: "dc",
  title,
  description: `About ${title}.`,
  tier_target: "L1",
  est_minutes: 10,
  status: "verified",
  ...(state ? { state } : {}),
});
const GRAPH = {
  nodes: [
    sk("elec.dc.units", "Units and prefixes", { mastery_state: "mastered", tier_attained: "L1", due: day(10) }),
    sk("elec.dc.ohms", "Ohm's law", { mastery_state: "reviewing", tier_attained: "L0", due: day(0, 23) }),
    sk("elec.dc.series", "Series resistance", { mastery_state: "learning" }),
    sk("elec.dc.parallel", "Parallel pair"),
    sk("elec.dc.kcl", "Kirchhoff's current law"),
    sk("elec.dc.thevenin", "Thevenin model"),
    sk("math.alg.lin", "Linear equations", { mastery_state: "decayed", due: day(-2) }),
  ],
  edges: [
    ["elec.dc.units", "elec.dc.ohms"],
    ["elec.dc.ohms", "elec.dc.series"],
    ["elec.dc.series", "elec.dc.parallel"],
    ["elec.dc.parallel", "elec.dc.kcl"],
    ["elec.dc.kcl", "elec.dc.thevenin"],
  ].map(([from, to]) => ({ from_skill_key: from, to_skill_key: to, strength: "hard", min_tier: "L0" })),
};
const FRONTIER = { available: [{ skill_key: "elec.dc.parallel", reason: "all 1 hard prerequisite satisfied" }], in_progress: ["elec.dc.series"] };

async function mockMap(page: Page) {
  await answer(page, "**/api/v1/graph", GRAPH);
  await answer(page, "**/api/v1/frontier", FRONTIER);
  await answer(page, "**/api/v1/skills/elec.dc.kcl", { ...GRAPH.nodes[4], prerequisites: [], dependants: [], available: false, blocked_by: ["elec.dc.parallel"] });
}

const COUNTS = { unseen: 20, learning: 5, reviewing: 3, mastered: 4, decayed: 2 };
const PROGRESS = {
  generated_at: day(0),
  timezone: "Europe/Rome",
  week: {
    start_date: "2026-11-02",
    end_date: "2026-11-08",
    minutes_done: 210,
    minutes_target: 480,
    // Eight Mondays ending on 2026-11-02.
    history: Array.from({ length: 8 }, (_, i) => ({ start_date: new Date(Date.UTC(2026, 10, 2) - (7 - i) * 7 * 86_400_000).toISOString().slice(0, 10), minutes_done: 60 * i })),
  },
  totals: { skills: 34, needs_applied: 1, by_mastery_state: COUNTS },
  nodes: [
    {
      node: "elec",
      skills_total: 17,
      by_mastery_state: COUNTS,
      tier_counts: { none: 3, L0: 0, L1: 14, L2: 0, L3: 0 },
      l1_scope_skills: 17,
      l1_scope_at_l1: 14,
      l1_gate_project: { project_key: "prj.L1.led-blink", status: "active", steps_done: 2, steps_total: 6, evidence_accepted: 1, evidence_required: 3 },
      l1_working: false,
    },
  ],
  review_load: { horizon_days: 7, overdue_now: 0, total_due: 0, estimated_minutes: 0, days: [] },
  projects: [{ user_project_id: "00000000-0000-4000-8000-000000000001", project_key: "prj.L1.led-blink", status: "active", steps_done: 2, steps_total: 6, evidence_pending_review: 0 }],
  checkpoints: {
    completed_count: 3,
    recent: [{ checkpoint_id: "00000000-0000-4000-8000-0000000000c1", completed_at: "2026-10-24T10:00:00Z", correct: 6, total: 9 }],
    aided_vs_unaided: { aided: { correct: 41, total: 50 }, unaided: { correct: 17, total: 25 } },
  },
  decayed: [{ skill_key: "math.alg.lin", title: "Linear equations", last_review_at: "2026-10-01T10:00:00Z" }],
};

const QUEUE = {
  now: day(0),
  due_now: 3,
  due_within_horizon: 4,
  estimated_minutes: 8,
  items: [
    { skill_key: "math.alg.lin", due: day(-2), mastery_state: "decayed", retrievability: 0.41 },
    { skill_key: "elec.dc.ohms", due: day(0, 23), mastery_state: "reviewing", retrievability: 0.8 },
    { skill_key: "elec.dc.units", due: day(3), mastery_state: "mastered", retrievability: 0.9 },
  ],
};

// ---------- S14 ----------

test("map: a locked skill lists the unmet prerequisites; list view holds the same skills and states; keyboard path (S14 AC 2, 3)", async ({ page }) => {
  await signedIn(page, "map");
  await mockMap(page);
  await page.goto("/map");
  await expect(page.getByRole("heading", { level: 1, name: "Skill map" })).toBeVisible();
  // Opens on the area with started skills; everything else is one filter away.
  await page.getByRole("button", { name: "All areas" }).click();

  const snapshot = () => page.locator("li[data-skill-key]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-skill-key")}=${e.getAttribute("data-state")}`).sort());
  const trail = await snapshot();
  expect(trail).toContain("elec.dc.kcl=locked");
  expect(trail).toContain("elec.dc.parallel=ready");
  expect(trail).toContain("math.alg.lin=refresher");

  // Locked skill: the reasons come from getSkill.blocked_by.
  await page.getByRole("button", { name: /Kirchhoff's current law/ }).click();
  const unmet = page.getByTestId("unmet-prerequisites");
  await expect(unmet).toBeVisible();
  await expect(unmet.getByRole("listitem")).toHaveText(["Parallel pair: Ready to start"]);
  // The row now says what it needs.
  await expect(page.getByRole("button", { name: /Kirchhoff's current law/ })).toContainText("Locked: needs Parallel pair");

  // List view: same set, same states; reachable and operable by keyboard.
  await page.getByRole("button", { name: "List view" }).click();
  expect(await snapshot()).toEqual(trail);
  const row = page.getByRole("button", { name: /Ohm's law/ });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Reviewing", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  // No percentage or numeric mastery figure anywhere on the map (S14 AC 5).
  expect(await page.locator("main").innerText()).not.toMatch(/\d\s?%/);
});

test("map: the filters narrow the list and a failed load offers a retry", async ({ page }) => {
  await signedIn(page, "filters");
  await mockMap(page);
  await page.goto("/map");
  await page.getByRole("button", { name: "All areas" }).click();
  await page.getByRole("button", { name: "Ready now" }).click();
  await expect(page.locator("li[data-skill-key]")).toHaveCount(1);
  await page.getByRole("button", { name: "Ready now" }).click();
  await page.getByRole("searchbox", { name: "Search skills by title" }).fill("ohm");
  await expect(page.locator("li[data-skill-key]")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Search skills by title" }).fill("zzz");
  await expect(page.getByText("No skill matches these filters.")).toBeVisible();

  await page.unrouteAll();
  await answer(page, "**/api/v1/graph", { error: "x" }, 500);
  await answer(page, "**/api/v1/frontier", FRONTIER);
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText("This did not load.");
  await page.unrouteAll();
  await mockMap(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Skill map" })).toBeVisible();
  await expect(page.locator("li[data-skill-key]").first()).toBeVisible();
});

for (const width of [360, 1280]) {
  test(`map at ${width}px: no horizontal scroll, axe clean in light and dark, nav links here`, async ({ page }) => {
    await signedIn(page, `map${width}`);
    await mockMap(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/map");
    await expect(page.locator("li[data-skill-key]").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Map" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/review");
    await expect(page.getByRole("link", { name: "Progress" })).toHaveAttribute("href", "/progress");
    await noHorizontalScroll(page);
    await page.getByRole("button", { name: /Parallel pair/ }).click(); // an open detail card too
    await noHorizontalScroll(page);
    await axeBothThemes(page);
  });
}

// ---------- S15 ----------

test("progress: reads getProgress once, first heading names the next artifact, no streak counters, applied-problem line (S15 AC 2, 4, 5)", async ({ page }) => {
  await signedIn(page, "progress");
  let calls = 0;
  await page.route("**/api/v1/progress", (route) => {
    calls++;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROGRESS) });
  });
  await page.goto("/progress");
  const first = page.getByRole("heading").first();
  await expect(first).toHaveText("Next: Electronics working level, 14 of 17 skills; Led blink project, evidence 1 of 3 accepted");
  await expect(page.getByRole("row", { name: /Reviewing: needs one more applied problem\s+1/ })).toBeVisible();
  await expect(page.getByTestId("gap-line")).toContainText("Practice answers with help: 82% correct. Unaided checks: 68% correct.");
  await expect(page.getByText("210 of 480 min this week")).toBeVisible();
  // Every chart has a table next to it.
  await expect(page.getByRole("table", { name: "Minutes per week, last 8 weeks" })).toBeVisible();
  const text = (await page.locator("main").innerText()).toLowerCase();
  expect(text).not.toMatch(/streak|\bxp\b|badge|level up|\btop \d/);
  expect(calls).toBe(1);
});

test("progress: gap line is hidden without enough checkpoints, and a new learner sees the empty note", async ({ page }) => {
  await signedIn(page, "progress-gap");
  const few = { ...PROGRESS, checkpoints: { completed_count: 2, recent: [], aided_vs_unaided: null } };
  await answer(page, "**/api/v1/progress", few);
  await page.goto("/progress");
  await expect(page.getByText("No unaided check yet.")).toBeVisible();
  await expect(page.getByTestId("gap-line")).toHaveCount(0);

  await page.unrouteAll();
  const fresh = {
    ...PROGRESS,
    week: { ...PROGRESS.week, minutes_done: 0, history: PROGRESS.week.history.map((w) => ({ ...w, minutes_done: 0 })) },
    totals: { skills: 34, needs_applied: 0, by_mastery_state: { ...COUNTS, unseen: 34, learning: 0, reviewing: 0, mastered: 0, decayed: 0 } },
    projects: [],
    checkpoints: { completed_count: 0, recent: [], aided_vs_unaided: null },
    decayed: [],
  };
  await answer(page, "**/api/v1/progress", fresh);
  await page.reload();
  await expect(page.getByText("Nothing to show yet. After your first sessions this page fills in.")).toBeVisible();
});

for (const width of [360, 1280]) {
  test(`progress at ${width}px: no horizontal scroll, axe clean in light and dark`, async ({ page }) => {
    await signedIn(page, `progress${width}`);
    await answer(page, "**/api/v1/progress", PROGRESS);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/progress");
    await expect(page.getByTestId("next-artifact")).toBeVisible();
    await page.getByText("How this is checked").click();
    await noHorizontalScroll(page);
    await axeBothThemes(page);
  });
}

// ---------- S17 ----------

test("review: counts, due rows and the upcoming list; Not now changes nothing; no retention figure (S17 AC 1, 3)", async ({ page }) => {
  await signedIn(page, "review");
  await answer(page, "**/api/v1/graph", GRAPH);
  await answer(page, /\/api\/v1\/review-queue/, QUEUE);
  await page.goto("/review");
  await expect(page.getByTestId("review-counts")).toHaveText("Due today 1, overdue 1, coming in the next 7 days 1");
  const due = page.getByRole("list", { name: "Skills due today or earlier" }).getByRole("listitem");
  await expect(due).toHaveCount(2);
  await expect(due.first()).toContainText("Linear equations");
  await expect(due.first()).toContainText("Was due 2 days ago");
  await expect(page.getByRole("list", { name: "Skills due later this week" }).getByRole("listitem")).toHaveCount(1);
  await due.first().getByRole("button", { name: "Not now" }).click();
  await expect(due.first()).toContainText("Nothing changes");
  await expect(due).toHaveCount(2);
  const text = (await page.locator("main").innerText()).toLowerCase();
  expect(text).not.toMatch(/retention|retrievab|memory strength|\d\s?%/);
});

test("review: Practise now builds a session for that skill and opens it; an open session is explained", async ({ page }) => {
  await signedIn(page, "review-start");
  // /session/[id] gates on consent and onboarding (BL-0060), so this learner completes both for real.
  await acceptConsent(page);
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "What fits your time now?" })).toBeVisible();
  await answer(page, "**/api/v1/graph", GRAPH);
  await answer(page, /\/api\/v1\/review-queue/, QUEUE);
  let body: Record<string, unknown> = {};
  await page.route("**/api/v1/sessions/build", async (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    if (body["skill_focus"] === "math.alg.lin") return route.fulfill({ status: 409, contentType: "application/problem+json", body: JSON.stringify({ code: "open_session_exists" }) });
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "00000000-0000-4000-8000-0000000000aa" }) });
  });
  await page.goto("/review");
  const due = page.getByRole("list", { name: "Skills due today or earlier" }).getByRole("listitem");
  await due.first().getByRole("button", { name: /Practise now/ }).click();
  await expect(page.getByText("You already have a session open.")).toBeVisible();
  expect(body).toMatchObject({ available_minutes: 5, skill_focus: "math.alg.lin" });

  await due.nth(1).getByRole("button", { name: /Practise now/ }).click();
  await expect(page).toHaveURL(/\/session\/00000000-0000-4000-8000-0000000000aa$/);
});

test("review: an empty queue says nothing is due", async ({ page }) => {
  await signedIn(page, "review-empty");
  await answer(page, "**/api/v1/graph", GRAPH);
  await answer(page, /\/api\/v1\/review-queue/, { now: day(0), due_now: 0, due_within_horizon: 0, items: [] });
  await page.goto("/review");
  await expect(page.getByText("Nothing is due right now.")).toBeVisible();
});

for (const width of [360, 1280]) {
  test(`review at ${width}px: no horizontal scroll, axe clean in light and dark`, async ({ page }) => {
    await signedIn(page, `review${width}`);
    await answer(page, "**/api/v1/graph", GRAPH);
    await answer(page, /\/api\/v1\/review-queue/, QUEUE);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/review");
    await expect(page.getByTestId("review-counts")).toBeVisible();
    await noHorizontalScroll(page);
    await axeBothThemes(page);
  });
}

// ---------- review screenshots (phone, 2x) ----------

test("phone screenshots of /map, /progress and /review", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL: baseURL ?? "", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await signedIn(page, "shots");
  await mockMap(page);
  await answer(page, "**/api/v1/progress", PROGRESS);
  await answer(page, /\/api\/v1\/review-queue/, QUEUE);
  await page.goto("/map");
  await page.getByRole("button", { name: /Parallel pair/ }).click();
  await page.screenshot({ path: `${SHOTS}/map.png`, fullPage: true });
  await page.goto("/progress");
  await expect(page.getByTestId("next-artifact")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/progress.png`, fullPage: true });
  await page.goto("/review");
  await expect(page.getByTestId("review-counts")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/review.png`, fullPage: true });
  await context.close();
});
