import { expect, test } from "@playwright/test";
import { adminClient, deleteUserByEmail, learnerFromCookies } from "./support/mail";
import { acceptConsent, signInAs } from "./support/signin";

// BL-0028 acceptance (FR-004, doc 11 section 8): founder self-consent, shown before onboarding.
const email = `bl0028-${Math.random().toString(36).slice(2, 10)}@example.test`;
test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const id = data.users.find((u) => u.email === email)?.id;
  if (id) await admin.from("events").delete().eq("user_id", id);
  await deleteUserByEmail(email);
});

test("first login shows consent before onboarding; accepting records the version and one event; the second login skips it", async ({ page, context }) => {
  await signInAs(page, email);
  await expect(page).toHaveURL(/\/consent$/);
  await expect(page.getByRole("heading", { name: "Your data and research use" })).toBeVisible();
  for (const heading of ["What is logged", "What research use means", "Who sees it", "How to withdraw"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  // Consent comes first: onboarding is not reachable without it.
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/consent$/);

  await acceptConsent(page);

  const learner = await learnerFromCookies(page);
  if (!learner) throw new Error("no session");
  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("consents").eq("id", learner.id).single();
  const record = (profile?.consents as { research: { version: string; granted: boolean; at: string } }).research;
  expect(record).toMatchObject({ version: "2026-11", granted: true });
  expect(Number.isNaN(Date.parse(record.at))).toBe(false);
  const { data: events } = await admin.from("events").select("name, props").eq("user_id", learner.id).eq("name", "consent_recorded");
  expect(events).toEqual([{ name: "consent_recorded", props: { consent_version: "2026-11", research: true } }]);

  // Second login: a new browser session goes straight on to onboarding, and no second event appears.
  await context.clearCookies();
  await signInAs(page, email);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.goto("/consent");
  await expect(page).toHaveURL(/\/onboarding$/);
  const { data: again } = await admin.from("events").select("id").eq("user_id", learner.id).eq("name", "consent_recorded");
  expect(again).toHaveLength(1);
});
