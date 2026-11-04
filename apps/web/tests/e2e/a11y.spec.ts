import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createDemoItem, type DemoFixture } from "./support/demo-item-fixture";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { createRunnerFixture, type RunnerFixture } from "./support/runner-fixture";
import { acceptConsent, signInAs } from "./support/signin";

// BL-0064 acceptance (FR-125, US-050, NFR-04; doc 09 section 7): one gate over every core route. Each route is
// checked in light and dark at 360 and 1280 px with axe (WCAG 2.0 to 2.2 A and AA tags, zero critical or serious),
// then at 640 px (200 percent zoom of a 1280 px window) and 320 px for reflow, and for pointer target size (SC 2.5.8).
// /admin/content is gated by the admin role and has its own axe check in review-console.spec.ts.
// The manual screen-reader pass is in polymath-app-spec/docs/a11y-checklist.md.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const emails: string[] = [];
const fixtures: { cleanup: () => Promise<void> }[] = [];

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

async function signedIn(page: Page, tag: string): Promise<string> {
  const email = `bl0064-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  return learner.id;
}

async function onboarded(page: Page, tag: string): Promise<string> {
  const userId = await signedIn(page, tag);
  await acceptConsent(page);
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "What fits your time now?" })).toBeVisible();
  return userId;
}

async function settle(page: Page) {
  // Panels rise in over 160 ms; axe reads colours mid-fade otherwise.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
}

async function seriousViolations(page: Page) {
  await settle(page);
  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

/** Visible pointer targets smaller than 24 x 24 CSS px; inline text links are exempt (SC 2.5.8). */
async function smallTargets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=radio], [role=tab]")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || style.visibility === "hidden" || el.closest("[hidden]")) return false;
        if (el.tagName === "A" && style.display === "inline") return false;
        if (el.matches("input[type=radio], input[type=checkbox]") && el.closest("label")) return false; // the label is the target
        return r.width < 24 || r.height < 24;
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`),
  );
}

async function overflow(page: Page) {
  return page.evaluate(() => (document.scrollingElement ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth : 0));
}

/** The whole matrix for the screen the page shows now. */
async function audit(page: Page, label: string) {
  const problems: string[] = [];
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const v of await seriousViolations(page)) problems.push(`${label} ${width}px ${scheme}: axe ${v}`);
    }
    await page.emulateMedia({ colorScheme: "light" });
    for (const t of await smallTargets(page)) problems.push(`${label} ${width}px: target under 24 px: ${t}`);
  }
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 900 });
    if ((await overflow(page)) > 0) problems.push(`${label} ${width}px: horizontal scroll`);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  expect(problems).toEqual([]);
}

test("S01 welcome (signed out)", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", /^en/);
  await audit(page, "/welcome");
});

test("S02 consent and S03 onboarding", async ({ page }) => {
  await signedIn(page, "consent");
  await expect(page).toHaveURL(/\/consent$/);
  await audit(page, "/consent");
  await acceptConsent(page);
  await expect(page.getByLabel("I am 18 or older")).toBeVisible();
  await audit(page, "/onboarding");
});

test("S06 Today, S07 preview sheet, S08 runner and S09 summary", async ({ page }) => {
  const userId = await onboarded(page, "today");
  const fixture: RunnerFixture = await createRunnerFixture(userId);
  fixtures.push(fixture);
  await page.reload();
  await expect(page.getByRole("radio", { name: "15 min" })).toBeChecked();
  await audit(page, "/ (Today)");

  await page.getByRole("button", { name: "See the list" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "/ (preview sheet)");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Start 15-minute session" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading").first()).toBeVisible();
  await audit(page, "/session/[id]");

  await page.goto(`${new URL(page.url()).pathname}/summary`);
  await expect(page.locator("main")).toBeVisible();
  await audit(page, "/session/[id]/summary");
});

test("S14 map (trail and list), S15 progress and S17 review", async ({ page }) => {
  const userId = await onboarded(page, "screens");
  fixtures.push(await createRunnerFixture(userId));
  await page.goto("/map");
  await expect(page.getByRole("heading", { level: 1, name: "Skill map" })).toBeVisible();
  await audit(page, "/map (trail)");
  await page.getByRole("button", { name: "All areas" }).click();
  await audit(page, "/map (trail, all areas)");
  await page.getByRole("button", { name: "List view" }).click();
  await audit(page, "/map (list)");

  await page.goto("/progress");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await audit(page, "/progress");

  await page.goto("/review");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await audit(page, "/review");
});

test("dev gallery and /demo-item (math statement has MathML and a spoken alternative)", async ({ page }) => {
  const userId = await signedIn(page, "gallery");
  await page.goto("/dev/gallery");
  await expect(page.getByRole("heading", { level: 1, name: "Bench Arcade" })).toBeVisible();
  await audit(page, "/dev/gallery");

  const demo: DemoFixture = await createDemoItem(userId);
  fixtures.push(demo);
  await page.goto("/demo-item");
  const statement = page.getByTestId("statement");
  await expect(statement.locator(".katex").first()).toBeVisible();
  await expect(statement.locator(".katex-mathml math").first()).toBeAttached(); // MathML output (doc 09 section 7.6)
  expect(await statement.getAttribute("aria-label")).toBeTruthy();
  await audit(page, "/demo-item");
});

test("keyboard: skip link first and working, focus ring 3 px on every control kind", async ({ page }) => {
  await signedIn(page, "keys");
  await page.goto("/dev/gallery");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  // Every control kind on the gallery shows the 3 px --focus outline when focused by keyboard.
  const widths: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const width = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null; // tabbed past the last control
      const s = getComputedStyle(el);
      return s.outlineStyle === "none" ? "none" : s.outlineWidth;
    });
    if (width === null) break;
    widths.push(width);
  }
  expect(widths.length).toBeGreaterThan(5);
  expect(widths.filter((w) => w !== "3px")).toEqual([]);
});

test("reduced motion switches the rise and press motion off", async ({ page }) => {
  await signedIn(page, "motion");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/gallery");
  const names = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "px-rise px-press";
    document.body.append(probe);
    const s = getComputedStyle(probe);
    const out = { animation: s.animationName, transition: s.transitionDuration };
    probe.remove();
    return out;
  });
  expect(names.animation).toBe("none");
  expect(names.transition).toMatch(/^0s(, 0s)*$/);
});
