import { defineConfig } from "@playwright/test";

// BL-0032: the M0 exit scenario runs against the deployed staging app (doc 01 section 10), so it
// starts no local server. The app URL is E2E_BASE_URL (default: the staging URL of
// infra/DEPLOY-STAGING.md); the Supabase project and its secret key come from the environment
// (see tests/e2e-m0/support/staging.ts).
export default defineConfig({
  testDir: "./tests/e2e-m0",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 180_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://polymath-staging.vercel.app",
    timezoneId: "Europe/Rome",
    // A phone viewport: the M0 demo is "from the phone" (doc 13 wave 3, 360 px rule of CLAUDE.md section 6).
    viewport: { width: 360, height: 780 },
  },
});
