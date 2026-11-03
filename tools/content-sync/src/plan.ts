// Steps 3 to 6 of doc 07 section 10 as a pure function: the loaded content and the rows already in
// the database go in, the writes to make come out. No database access here, so --dry-run and the
// unit tests use the same code as the real run.
import type { Doc, Loaded, Problem } from "./load.ts";
import { statusFor, type TemplateStatus } from "./status.ts";

export type ModuleRow = { key: string; node: string; module: string; title: string; order_index: number; is_stub: boolean };
export type SkillRow = {
  key: string;
  node: string;
  module: string;
  title: string;
  description: string;
  tier_target: string;
  est_minutes: number;
  license: string;
  source: string;
  status: string;
  task_kinds: string[];
  grader_types: string[];
  phone_suitable: boolean;
  confusable_set: string | null;
  content_hash: string;
};
export type EdgeRow = { from_skill_key: string; to_skill_key: string; strength: string; min_tier: string };
export type TemplateRow = {
  key: string;
  skill_key: string;
  task_kind: string;
  grader_type: string;
  difficulty_prior: number;
  version: number;
  status: TemplateStatus;
  body: Doc;
  phone_suitable: boolean;
  est_seconds: number;
  license: string;
  source: string;
  content_hash: string;
  tier: string | null;
  pool: string;
  interleave: boolean;
  reference_time_s: number | null;
  mastery_eligible: boolean;
  retired_reason: string | null;
};

export type ExistingTemplate = { key: string; version: number; status: string; sha256: string | null; fuzzPassed: boolean };
export type Existing = {
  modules: Map<string, { title: string; order_index: number; is_stub: boolean }>;
  skills: Map<string, { content_hash: string | null; status: string }>;
  edges: EdgeRow[];
  templates: ExistingTemplate[];
};

export type Change<T> = { row: T; kind: "created" | "updated" };
export type Counts = { created: number; updated: number; unchanged: number; retired: number };
export type Retirement = { key: string; version: number; reason: string };

export type Plan = {
  modules: Change<ModuleRow>[];
  modulesUnchanged: number;
  skills: { changes: Change<SkillRow>[]; unchanged: number; retire: string[] };
  edges: { insert: EdgeRow[]; update: EdgeRow[]; remove: EdgeRow[]; unchanged: number };
  templates: { changes: Change<TemplateRow>[]; unchanged: number; retire: Retirement[]; needsJob: string[]; awaitingReview: string[] };
  problems: Problem[];
};

export type PlanOptions = { only?: string | undefined };

// Columns hoisted out of the body (problem-template.schema.json description), plus the status the
// sync derives; license, source and delivery stay in the body and are copied to their columns.
const HOISTED = ["key", "skill_key", "task_kind", "grader_type", "difficulty_prior", "version", "authoring_status", "pool", "interleave", "reference_time_s", "mastery_eligible", "tier"];

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function d(v: unknown): Doc {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Doc) : {};
}

export function desiredModules(loaded: Loaded): ModuleRow[] {
  const rows = new Map<string, ModuleRow>();
  for (const m of loaded.graph?.modules ?? []) {
    rows.set(s(m["key"]), {
      key: s(m["key"]),
      node: s(m["node"]),
      module: s(m["module"]),
      title: s(m["title"]),
      order_index: Number(m["order"]),
      is_stub: false,
    });
  }
  // A module used only by stub skills gets a stub row, title = slug, order 1000 and up (doc 04 section 5).
  let next = 1000;
  for (const { doc } of loaded.graph?.skills ?? []) {
    const key = `${s(doc["node"])}.${s(doc["module"])}`;
    if (!rows.has(key))
      rows.set(key, { key, node: s(doc["node"]), module: s(doc["module"]), title: s(doc["module"]), order_index: next++, is_stub: true });
  }
  return [...rows.values()];
}

function skillRow(doc: Doc, sha256: string): SkillRow {
  return {
    key: s(doc["key"]),
    node: s(doc["node"]),
    module: s(doc["module"]),
    title: s(doc["title"]),
    description: s(doc["description"]),
    tier_target: s(doc["tier_target"]),
    est_minutes: Number(doc["est_minutes"]),
    license: s(doc["license"]),
    source: s(doc["source"]),
    status: s(doc["status"]),
    task_kinds: list(doc["task_kinds"]),
    grader_types: list(doc["grader_types"]),
    phone_suitable: doc["phone_suitable"] === true,
    confusable_set: typeof doc["confusable_set"] === "string" ? doc["confusable_set"] : null,
    content_hash: sha256,
  };
}

export function desiredEdges(loaded: Loaded): EdgeRow[] {
  const out: EdgeRow[] = [];
  for (const { doc } of loaded.graph?.skills ?? []) {
    for (const p of (doc["prerequisites"] as Doc[] | undefined) ?? []) {
      out.push({ from_skill_key: s(p["skill"]), to_skill_key: s(doc["key"]), strength: s(p["strength"]), min_tier: s(p["min_tier"]) });
    }
  }
  return out;
}

export function templateRow(doc: Doc, sha256: string, reviewLog: string, fuzzPassed: boolean): TemplateRow {
  const delivery = d(doc["delivery"]);
  const body: Doc = {};
  for (const [k, v] of Object.entries(doc)) if (!HOISTED.includes(k)) body[k] = v;
  const status = statusFor({
    authoringStatus: s(doc["authoring_status"]),
    key: s(doc["key"]),
    sha256,
    review: d(d(doc["provenance"])["review"]),
    reviewLog,
    fuzzPassed,
  });
  return {
    key: s(doc["key"]),
    skill_key: s(doc["skill_key"]),
    task_kind: s(doc["task_kind"]),
    grader_type: s(doc["grader_type"]),
    difficulty_prior: Number(doc["difficulty_prior"]),
    version: Number(doc["version"]),
    status,
    body,
    phone_suitable: delivery["phone_suitable"] === true,
    est_seconds: typeof delivery["est_seconds"] === "number" ? delivery["est_seconds"] : 60,
    license: s(doc["license"]),
    source: s(doc["source"]),
    content_hash: sha256,
    tier: typeof doc["tier"] === "string" ? doc["tier"] : null,
    pool: typeof doc["pool"] === "string" ? doc["pool"] : "practice",
    interleave: doc["interleave"] !== false,
    reference_time_s: typeof doc["reference_time_s"] === "number" ? doc["reference_time_s"] : null,
    mastery_eligible: doc["mastery_eligible"] !== false,
    retired_reason: status === "retired" ? "retired in the content file" : null,
  };
}

const edgeId = (e: EdgeRow): string => `${e.from_skill_key}|${e.to_skill_key}`;

export function buildPlan(loaded: Loaded, existing: Existing, options: PlanOptions = {}): Plan {
  const problems: Problem[] = [];

  const modules: Change<ModuleRow>[] = [];
  const allModules = desiredModules(loaded);
  for (const row of allModules) {
    const old = existing.modules.get(row.key);
    if (!old) modules.push({ row, kind: "created" });
    else if (old.title !== row.title || old.order_index !== row.order_index || old.is_stub !== row.is_stub) modules.push({ row, kind: "updated" });
  }

  const skillChanges: Change<SkillRow>[] = [];
  let skillsUnchanged = 0;
  const desiredKeys = new Set<string>();
  for (const { doc, sha256 } of loaded.graph?.skills ?? []) {
    const row = skillRow(doc, sha256);
    desiredKeys.add(row.key);
    const old = existing.skills.get(row.key);
    if (!old) skillChanges.push({ row, kind: "created" });
    else if (old.content_hash !== row.content_hash || old.status === "retired") skillChanges.push({ row, kind: "updated" });
    else skillsUnchanged++;
  }
  const retireSkills = [...existing.skills].filter(([k, v]) => !desiredKeys.has(k) && v.status !== "retired").map(([k]) => k);

  const want = desiredEdges(loaded);
  const have = new Map(existing.edges.map((e) => [edgeId(e), e]));
  const wantIds = new Set(want.map(edgeId));
  const edges: Plan["edges"] = { insert: [], update: [], remove: [], unchanged: 0 };
  for (const e of want) {
    const old = have.get(edgeId(e));
    if (!old) edges.insert.push(e);
    else if (old.strength !== e.strength || old.min_tier !== e.min_tier) edges.update.push(e);
    else edges.unchanged++;
  }
  edges.remove = existing.edges.filter((e) => !wantIds.has(edgeId(e)));

  const templates: Plan["templates"] = { changes: [], unchanged: 0, retire: [], needsJob: [], awaitingReview: [] };
  const byKey = new Map<string, ExistingTemplate[]>();
  for (const t of existing.templates) byKey.set(t.key, [...(byKey.get(t.key) ?? []), t]);
  const scoped = loaded.templates.filter((t) => options.only === undefined || s(t.doc["key"]) === options.only);
  for (const { file, doc, sha256 } of scoped) {
    const key = s(doc["key"]);
    const version = Number(doc["version"]);
    const rows = byKey.get(key) ?? [];
    const old = rows.find((r) => r.version === version);
    const newer = rows.find((r) => r.version > version);
    if (newer) {
      problems.push({ file, rule: "VERSION", message: `version ${String(version)} is lower than the synced version ${String(newer.version)}` });
      continue;
    }
    const sameHash = old?.sha256 === sha256;
    const keepVerified = old !== undefined && sameHash && old.status === "verified";
    const row = templateRow(doc, sha256, loaded.reviewLog, sameHash && (old?.fuzzPassed === true || keepVerified));
    if (row.status === "needs_human_review") templates.awaitingReview.push(key);
    const isNew = old === undefined;
    if (isNew || !sameHash || old.status !== row.status) {
      templates.changes.push({ row, kind: isNew ? "created" : "updated" });
      const reactivated = old !== undefined && sameHash && ["draft", "retired"].includes(old.status) && !["draft", "retired"].includes(row.status);
      if (row.status !== "retired" && (isNew || !sameHash || reactivated)) templates.needsJob.push(key);
    } else templates.unchanged++;
    for (const r of rows) {
      if (r.version < version && r.status !== "retired")
        templates.retire.push({ key, version: r.version, reason: `superseded by version ${String(version)}` });
    }
  }
  if (options.only === undefined) {
    const present = new Set(loaded.templates.map((t) => s(t.doc["key"])));
    for (const [key, rows] of byKey) {
      if (present.has(key)) continue;
      for (const r of rows) if (r.status !== "retired") templates.retire.push({ key, version: r.version, reason: "content file removed" });
    }
  }

  return { modules, modulesUnchanged: allModules.length - modules.length, skills: { changes: skillChanges, unchanged: skillsUnchanged, retire: retireSkills }, edges, templates, problems };
}

export function countsOf(plan: Plan): { modules: Counts; skills: Counts; edges: Counts; templates: Counts } {
  const n = (changes: { kind: string }[], kind: string): number => changes.filter((c) => c.kind === kind).length;
  return {
    modules: { created: n(plan.modules, "created"), updated: n(plan.modules, "updated"), unchanged: plan.modulesUnchanged, retired: 0 },
    skills: {
      created: n(plan.skills.changes, "created"),
      updated: n(plan.skills.changes, "updated"),
      unchanged: plan.skills.unchanged,
      retired: plan.skills.retire.length,
    },
    edges: { created: plan.edges.insert.length, updated: plan.edges.update.length, unchanged: plan.edges.unchanged, retired: plan.edges.remove.length },
    templates: {
      created: n(plan.templates.changes, "created"),
      updated: n(plan.templates.changes, "updated"),
      unchanged: plan.templates.unchanged,
      retired: plan.templates.retire.length,
    },
  };
}
