import { expect, test } from "@playwright/test";
import { adminClient, deleteUserByEmail, uniqueEmail } from "./support/mail";

// ST-AUTH-01 (doc 12): an unknown address gets the same answer as a known one, in the same time
// class, and with signup off no account is created. Runs against the app with signup disabled.
//
// "Same time class" is defined as: with 20 samples each, (a) every response is under 5 s, and
// (b) the medians differ by less than 20 percent of the larger. A real leak is the SMTP hand-off
// (hundreds of milliseconds to seconds) against an immediate refusal; the server pads both to a
// fixed floor (send-code/route.ts), so equal medians are expected, while 20 percent is wide
// enough to absorb scheduler noise and narrow enough to catch an unpadded difference.
const SAMPLES = 20;
const MAX_MS = 5000;
const MAX_MEDIAN_GAP = 0.2;

const known = uniqueEmail();
test.beforeAll(async () => {
  const { error } = await adminClient().auth.admin.createUser({ email: known, email_confirm: true });
  expect(error).toBeNull();
});
test.afterAll(async () => {
  await deleteUserByEmail(known);
});

async function sample(request: import("@playwright/test").APIRequestContext, email: string) {
  const started = performance.now();
  const res = await request.post("/auth/send-code", { data: { email } });
  const ms = performance.now() - started;
  return { ms, status: res.status(), body: await res.json() };
}

const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? Number.NaN;

test("ST-AUTH-01 unknown and known addresses get the same response in the same time class", async ({ request }) => {
  const knownRuns = [];
  const unknownRuns = [];
  for (let i = 0; i < SAMPLES; i++) {
    knownRuns.push(await sample(request, known));
    unknownRuns.push(await sample(request, `bl0021-unknown-${i}-${Math.random().toString(36).slice(2, 8)}@example.test`));
  }
  const all = [...knownRuns, ...unknownRuns];
  for (const run of all) {
    expect(run.status).toBe(200);
    expect(run.body).toEqual({ status: "sent" });
    expect(run.ms).toBeLessThan(MAX_MS);
  }
  const mk = median(knownRuns.map((r) => r.ms));
  const mu = median(unknownRuns.map((r) => r.ms));
  console.log(`ST-AUTH-01 medians: known ${mk.toFixed(0)} ms, unknown ${mu.toFixed(0)} ms`);
  expect(Math.abs(mk - mu) / Math.max(mk, mu)).toBeLessThan(MAX_MEDIAN_GAP);
});

test("ST-AUTH-01 with signup off, a request for an unknown address creates no account", async ({ request }) => {
  const unknown = uniqueEmail();
  const res = await request.post("/auth/send-code", { data: { email: unknown } });
  expect(res.status()).toBe(200);
  const { data } = await adminClient().auth.admin.listUsers({ perPage: 1000 });
  expect(data.users.some((u) => u.email === unknown)).toBe(false);
});
