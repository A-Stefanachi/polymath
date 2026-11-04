import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { REFERENCE, createDemoItem, type DemoFixture } from "./support/demo-item-fixture";
import { deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { signInAs } from "./support/signin";

// BL-0058 acceptance: the component gallery (/dev/gallery, sign-in required, no data) at phone and desktop
// widths without horizontal scroll, axe-clean in light and dark, plus review screenshots of the restyled screens.
const SHOTS = "test-results/ui";
const emails: string[] = [];
const fixtures: DemoFixture[] = [];

test.afterEach(async () => {
  while (fixtures.length) await fixtures.pop()?.cleanup();
  while (emails.length) await deleteUserByEmail(emails.pop() ?? "");
});

async function signedIn(page: Page, tag: string) {
  const email = `bl0058-${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  emails.push(email);
  await signInAs(page, email);
  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  return learner.id;
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement;
    return el ? el.scrollWidth - el.clientWidth : 0;
  });
  expect(overflow).toBeLessThanOrEqual(0);
}

async function seriousViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

for (const width of [360, 1280]) {
  test(`gallery at ${width}px: no horizontal scroll, one navigation visible, screenshot`, async ({ page }) => {
    await signedIn(page, `w${width}`);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/gallery");
    await expect(page.getByRole("heading", { level: 1, name: "Bench Arcade" })).toBeVisible();
    await noHorizontalScroll(page);
    // Bottom bar below 1024 px, side rail from 1024 px: exactly one "Main" navigation is exposed.
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: `${SHOTS}/gallery-${width}.png`, fullPage: true });
  });
}

test("gallery has no critical or serious axe issues in light, dark (system) and dark (manual override)", async ({ page }) => {
  await signedIn(page, "axe");
  await page.goto("/dev/gallery");
  expect(await seriousViolations(page)).toEqual([]);

  await page.emulateMedia({ colorScheme: "dark" });
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(18, 19, 31)");
  expect(await seriousViolations(page)).toEqual([]);

  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(18, 19, 31)");
  expect(await seriousViolations(page)).toEqual([]);
});

test("the skip link is the first Tab stop and moves focus to main", async ({ page }) => {
  await signedIn(page, "skip");
  await page.goto("/dev/gallery");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test.describe("phone screenshots for review", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" }); // reduced motion: the shots show settled panels

  test("welcome, question, confidence, both feedback states, gallery in dark", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page.getByRole("heading", { name: "Polymath" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/phone-welcome.png`, fullPage: true });

    const userId = await signedIn(page, "phone");
    for (const [name, answer] of [
      ["correct", `${REFERENCE} V`],
      ["not-quite", "4 V"],
    ] as const) {
      fixtures.push(await createDemoItem(userId));
      await page.goto("/demo-item");
      await expect(page.getByTestId("statement").locator(".katex").first()).toBeVisible();
      await page.getByLabel("Your answer").fill(answer);
      if (name === "correct") await page.screenshot({ path: `${SHOTS}/phone-question.png`, fullPage: true });
      await page.getByRole("button", { name: "Check" }).click();
      await expect(page.getByRole("radiogroup", { name: "How sure are you?" })).toBeVisible();
      if (name === "correct") await page.screenshot({ path: `${SHOTS}/phone-confidence.png`, fullPage: true });
      await page.getByRole("radio", { name: "4", exact: true }).click();
      await expect(page.getByRole("heading", { name: name === "correct" ? "Correct." : "Not quite." })).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/phone-feedback-${name}.png`, fullPage: true });
      await fixtures.pop()?.cleanup();
    }

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/dev/gallery");
    await noHorizontalScroll(page);
    await page.screenshot({ path: `${SHOTS}/phone-gallery-dark.png`, fullPage: true });
  });
});
