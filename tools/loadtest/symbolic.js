// BL-0054 acceptance: submitAttempt p95 for symbolic_equivalence items under 2 s over 50 runs, against a running
// web app whose WORKER_URL points at a reachable worker (local stack in the lean slice, staging once the worker is
// hosted, 00a I2). Plain Node, no dependencies.
//
//   BASE_URL=http://127.0.0.1:3000 ACCESS_TOKEN=<learner access token> ITEM_ID=<verified symbolic item id> \
//     node tools/loadtest/symbolic.js
//
// Optional: RUNS (default 50), WARMUP (default 3, not counted), P95_MAX_MS (default 2000), EXPRESSION (the learner
// answer to send; default "x"). Each run posts a fresh client_attempt_id. Exit code 1 when any response is not a
// 200 graded attempt (a 202 means the app could not reach the worker) or when p95 reaches the limit.
// The access token and the answer are never printed.
const { randomUUID } = require("node:crypto");

const env = (name, fallback) => process.env[name] ?? fallback;
const baseUrl = env("BASE_URL", "http://127.0.0.1:3000");
const token = env("ACCESS_TOKEN");
const itemId = env("ITEM_ID");
const runs = Number(env("RUNS", "50"));
const warmup = Number(env("WARMUP", "3"));
const limitMs = Number(env("P95_MAX_MS", "2000"));
const expression = env("EXPRESSION", "x");

if (!token || !itemId) {
  console.error("ACCESS_TOKEN and ITEM_ID are required");
  process.exit(2);
}

async function submit() {
  const now = new Date();
  const started = performance.now();
  const res = await fetch(new URL("/api/v1/attempts", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      client_attempt_id: randomUUID(),
      item_id: itemId,
      started_at: new Date(now.getTime() - 30_000).toISOString(),
      submitted_at: now.toISOString(),
      response: { kind: "symbolic", expression },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ms: performance.now() - started, status: res.status, gradeStatus: body.grade_status };
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

async function main() {
  for (let i = 0; i < warmup; i++) await submit();
  const results = [];
  for (let i = 0; i < runs; i++) results.push(await submit());

  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const keys = results.map((r) => `${r.status}/${r.gradeStatus}`);
  const summary = {
    runs,
    p50_ms: Math.round(percentile(times, 0.5)),
    p95_ms: Math.round(percentile(times, 0.95)),
    max_ms: Math.round(times[times.length - 1]),
    statuses: Object.fromEntries(keys.map((k) => [k, keys.filter((x) => x === k).length])),
    limit_ms: limitMs,
  };
  console.log(JSON.stringify(summary));
  const notGraded = results.filter((r) => r.status !== 200 || r.gradeStatus === "pending");
  if (notGraded.length > 0 || summary.p95_ms >= limitMs) process.exit(1);
}

main().catch((e) => {
  console.error(`load test failed: ${e instanceof Error ? e.message : "unknown error"}`);
  process.exit(1);
});
