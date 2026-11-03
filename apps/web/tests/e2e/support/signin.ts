import { expect, type Page } from "@playwright/test";
import { adminClient } from "./mail";

/** On the consent screen: agrees to research use and waits for the app to move on to onboarding. */
export async function acceptConsent(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/consent$/);
  await page.getByRole("button", { name: "I agree to research use of my data" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

/**
 * Signs a learner in through the app's own link route (`/auth/callback?token_hash=...`), with the
 * token minted by the admin API. It exercises the same server-side verification as the emailed
 * link without depending on the mail template, so specs about later screens (onboarding,
 * consent) do not fail when the sign-in email itself is broken. BL-0021 specs cover the email.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: "magiclink", email });
  expect(error).toBeNull();
  const hash = data?.properties?.hashed_token;
  if (!hash) throw new Error("generateLink returned no token");
  await page.goto(`/auth/callback?token_hash=${encodeURIComponent(hash)}&type=email`);
  await expect(page).not.toHaveURL(/\/welcome/);
}
