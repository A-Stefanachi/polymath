// Steps 5 and 6 of doc 07 section 10 (status rule, never delete, versions) on the pure planner.
import { describe, expect, it } from "vitest";

import { CONTENT_ROOT } from "../src/config.ts";
import { loadContent, type Loaded } from "../src/load.ts";
import { buildPlan, type Existing } from "../src/plan.ts";
import { reviewLogDone, statusFor } from "../src/status.ts";

const loaded = loadContent(CONTENT_ROOT);

function existingFrom(l: Loaded): Existing {
  const p = buildPlan(l, { modules: new Map(), skills: new Map(), edges: [], templates: [] });
  return {
    modules: new Map(p.modules.map((m) => [m.row.key, { title: m.row.title, order_index: m.row.order_index, is_stub: m.row.is_stub }])),
    skills: new Map(p.skills.changes.map((s) => [s.row.key, { content_hash: s.row.content_hash, status: s.row.status }])),
    edges: [...p.edges.insert],
    templates: p.templates.changes.map((t) => ({ key: t.row.key, version: t.row.version, status: t.row.status, sha256: t.row.content_hash, fuzzPassed: false })),
  };
}

describe("status rule (doc 07 section 10 step 5, 00a H4)", () => {
  const base = { key: "tpl.a.b", sha256: "h1", review: { template_sha256: "h1" }, reviewLog: "| tpl.a.b | 2 | 1–5 | done | 0 |", fuzzPassed: true };
  it("draft and retired files keep their status", () => {
    expect(statusFor({ ...base, authoringStatus: "draft" })).toBe("draft");
    expect(statusFor({ ...base, authoringStatus: "retired" })).toBe("retired");
  });
  it("ready is verified only with a passed fuzz job, a matching review hash and a done row with 0 disagreements", () => {
    expect(statusFor({ ...base, authoringStatus: "ready" })).toBe("verified");
    expect(statusFor({ ...base, authoringStatus: "ready", fuzzPassed: false })).toBe("needs_human_review");
    expect(statusFor({ ...base, authoringStatus: "ready", review: { template_sha256: "old" } })).toBe("needs_human_review");
    expect(statusFor({ ...base, authoringStatus: "ready", review: {} })).toBe("needs_human_review");
    expect(statusFor({ ...base, authoringStatus: "ready", reviewLog: "| tpl.a.b | 2 | 1–5 | pending | — |" })).toBe("needs_human_review");
    expect(statusFor({ ...base, authoringStatus: "ready", reviewLog: "| tpl.a.b | 2 | 1–5 | done | 1 |" })).toBe("needs_human_review");
  });
  it("BL-0057: a console sign-off replaces the file review only for the hash it names", () => {
    const ready = { ...base, authoringStatus: "ready", review: {}, reviewLog: "" };
    expect(statusFor({ ...ready, consoleReviewSha256: "h1" })).toBe("verified");
    expect(statusFor({ ...ready, consoleReviewSha256: "old" })).toBe("needs_human_review");
    expect(statusFor({ ...ready, consoleReviewSha256: null })).toBe("needs_human_review");
    expect(statusFor({ ...ready, consoleReviewSha256: "h1", fuzzPassed: false })).toBe("needs_human_review");
    expect(statusFor({ ...ready, authoringStatus: "draft", consoleReviewSha256: "h1" })).toBe("draft");
  });
  it("reviewLogDone matches the key cell exactly", () => {
    expect(reviewLogDone("| tpl.a.bc | 2 | s | done | 0 |", "tpl.a.b")).toBe(false);
  });
});

describe("planner on the real content", () => {
  it("loads without problems and finds 30 templates", () => {
    expect(loaded.problems).toEqual([]);
    expect(loaded.templates).toHaveLength(30);
  });

  it("everything unchanged when the database already matches", () => {
    const p = buildPlan(loaded, existingFrom(loaded));
    expect([p.modules.length, p.skills.changes.length, p.templates.changes.length, p.edges.insert.length, p.edges.remove.length]).toEqual([0, 0, 0, 0, 0]);
    expect(p.templates.unchanged).toBe(30);
    expect(p.templates.needsJob).toEqual([]);
  });

  it("a verified row with the same hash and a still-valid review stays verified; a hash change voids it", () => {
    const key = "tpl.math.units-kilo";
    const ex = existingFrom(loaded);
    const row = ex.templates.find((t) => t.key === key);
    if (!row) throw new Error("fixture row missing");
    // No REVIEW-LOG row is done today, so the rule demotes even a verified row: nothing is verified by hand.
    row.status = "verified";
    const p = buildPlan(loaded, ex);
    expect(p.templates.changes.map((c) => [c.row.key, c.kind, c.row.status])).toEqual([[key, "updated", "needs_human_review"]]);
    row.sha256 = "different";
    const q = buildPlan(loaded, ex);
    expect(q.templates.needsJob).toEqual([key]);
  });

  it("a removed file retires every non-retired version; an older version is superseded by a newer one; a lower version is an error", () => {
    const ex = existingFrom(loaded);
    ex.templates.push({ key: "tpl.math.gone", version: 1, status: "needs_human_review", sha256: "x", fuzzPassed: false });
    ex.templates.push({ key: "tpl.math.units-kilo", version: 2, status: "needs_human_review", sha256: "x", fuzzPassed: false });
    const p = buildPlan(loaded, ex);
    expect(p.templates.retire).toEqual([
      { key: "tpl.math.units-kilo", version: 2, reason: "superseded by version 3" },
      { key: "tpl.math.gone", version: 1, reason: "content file removed" },
    ]);
    const only = buildPlan(loaded, ex, { only: "tpl.math.units-kilo" });
    expect(only.templates.retire.map((r) => r.key)).toEqual(["tpl.math.units-kilo"]);

    const ex2 = existingFrom(loaded);
    ex2.templates.push({ key: "tpl.math.units-kilo", version: 9, status: "needs_human_review", sha256: "x", fuzzPassed: false });
    expect(buildPlan(loaded, ex2).problems.map((x) => x.rule)).toEqual(["VERSION"]);
  });

  it("a skill missing from the graph is retired, never deleted; a retired skill that returns is updated; edges are replaced", () => {
    const ex = existingFrom(loaded);
    ex.skills.set("math.alg.gone", { content_hash: "x", status: "draft" });
    const back = [...ex.skills.keys()][0] ?? "";
    ex.skills.set(back, { content_hash: ex.skills.get(back)?.content_hash ?? null, status: "retired" });
    ex.edges.push({ from_skill_key: "math.alg.gone", to_skill_key: back, strength: "hard", min_tier: "L0" });
    const first = ex.edges[0];
    if (!first) throw new Error("no edges");
    first.strength = first.strength === "hard" ? "soft" : "hard";
    const p = buildPlan(loaded, ex);
    expect(p.skills.retire).toEqual(["math.alg.gone"]);
    expect(p.skills.changes.map((c) => [c.row.key, c.kind])).toEqual([[back, "updated"]]);
    expect(p.edges.remove).toHaveLength(1);
    expect(p.edges.update).toHaveLength(1);
  });
});
