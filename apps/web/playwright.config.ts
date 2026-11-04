import { execFileSync } from "node:child_process";
import { defineConfig } from "@playwright/test";
import { localSupabase } from "./tests/e2e/support/local-supabase";

// Sign-in scenarios against the local Supabase stack and its mail catcher (BL-0021). Two copies of
// the built app run: one with signup on, one with signup off (ST-AUTH-01 needs both kinds of
// address). Ports are free ones picked once; workers inherit them through the environment.
function freePort(): string {
  return execFileSync(
    process.execPath,
    ["-e", "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"],
    { encoding: "utf8" },
  ).trim();
}

const supabase = localSupabase();
process.env.E2E_PORT_SIGNUP ??= freePort();
process.env.E2E_PORT_NO_SIGNUP ??= freePort();
const signupPort = process.env.E2E_PORT_SIGNUP;
const noSignupPort = process.env.E2E_PORT_NO_SIGNUP;

function server(port: string, signup: "true" | "false") {
  return {
    command: `pnpm exec next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}/welcome`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      AUTH_SIGNUP_ENABLED: signup,
      // The API routes need the privileged connection; it is the local stack's database (never
      // staging: localSupabase refuses a non-local host).
      DATABASE_URL_PRIVILEGED: supabase.dbUrl,
    },
  };
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1, // GoTrue rate limits are per IP and the stack is shared
  reporter: [["list"]],
  timeout: 90_000,
  projects: [
    { name: "signin", testMatch: "signin.spec.ts", use: { baseURL: `http://127.0.0.1:${signupPort}` } },
    {
      name: "onboarding",
      testMatch: "onboarding.spec.ts",
      use: { baseURL: `http://127.0.0.1:${signupPort}`, timezoneId: "Europe/Rome" },
    },
    { name: "consent", testMatch: "consent.spec.ts", use: { baseURL: `http://127.0.0.1:${signupPort}` } },
    { name: "demo-item", testMatch: "demo-item.spec.ts", use: { baseURL: `http://127.0.0.1:${signupPort}` } },
    { name: "ui-gallery", testMatch: "ui-gallery.spec.ts", use: { baseURL: `http://127.0.0.1:${signupPort}` } },
    { name: "review-console", testMatch: "review-console.spec.ts", use: { baseURL: `http://127.0.0.1:${signupPort}` } },
    { name: "enumeration", testMatch: "enumeration.spec.ts", use: { baseURL: `http://127.0.0.1:${noSignupPort}` } },
  ],
  webServer: [server(signupPort, "true"), server(noSignupPort, "false")],
});
