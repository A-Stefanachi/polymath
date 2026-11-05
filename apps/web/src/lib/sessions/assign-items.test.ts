// 00a H1: one template serves every loop stage. Task kind belongs to the served task, not to the template,
// so the builder must give a worked_example, faded_problem or retrieval task an item of the skill whatever
// kind its template declares. Real content has one template per skill (`problem` or `retrieval`); without
// this a new learner's first session (worked examples) found no item and answered item_pool_empty.
import { DEFAULT_PARAMS, type PackedTask } from "@polymath/scheduler";
import { describe, expect, it } from "vitest";
import type { Candidate } from "@/server/privileged/session-store";
import { assignItems } from "./builder.ts";

let n = 0;
const cand = (o: Partial<Candidate> = {}): Candidate => ({
  itemId: `item-${String(++n)}`,
  skillKey: "math.alg.s",
  taskKind: "problem",
  templateKey: "tpl.math.s",
  phoneSuitable: true,
  seed: String(n),
  difficulty: 1300,
  tier: null,
  answer: `"a${String(n)}"`,
  lastUsed: null,
  ...o,
});
const packed = (task_kind: string, position: number, reason = "new_frontier", skill_key = "math.alg.s"): PackedTask => ({
  task_kind,
  skill_key,
  est_min: 2,
  reason,
  position,
});
const sel = {
  states: {},
  graph: { skills: { "math.alg.s": { node: "math", module: "alg", est_minutes: 10, tier_target: "L1" as const } }, edges: [] },
  history: {},
  params: DEFAULT_PARAMS,
};

describe("assignItems (00a H1: one template serves every loop stage)", () => {
  it("fills worked_example and faded_problem tasks from a skill whose only template is a `problem`", () => {
    const pool = [cand(), cand(), cand()];
    const out = assignItems([packed("worked_example", 1), packed("faded_problem", 2)], pool, "desktop", sel);
    expect(out.dropped).toBe(0);
    expect(out.tasks.map((t) => t.taskKind)).toEqual(["worked_example", "faded_problem"]);
    expect(new Set(out.tasks.map((t) => t.itemId)).size).toBe(2);
  });

  it("fills a retrieval task from a `problem` template and a problem task from a `retrieval` template", () => {
    const out = assignItems(
      [packed("retrieval", 1, "due_review"), packed("problem", 2, "continue", "elec.dc.t")],
      [cand(), cand({ skillKey: "elec.dc.t", taskKind: "retrieval", templateKey: "tpl.elec.t" })],
      "desktop",
      { ...sel, graph: { ...sel.graph, skills: { ...sel.graph.skills, "elec.dc.t": sel.graph.skills["math.alg.s"] } } },
    );
    expect(out.dropped).toBe(0);
    expect(out.tasks.map((t) => `${t.skillKey}:${t.taskKind}`)).toEqual(["math.alg.s:retrieval", "elec.dc.t:problem"]);
  });

  it("still matches other task kinds exactly, and still drops a task with no item of its skill", () => {
    const out = assignItems([packed("explain_back", 1), packed("worked_example", 2, "new_frontier", "math.alg.other")], [cand()], "desktop", sel);
    expect(out.tasks).toHaveLength(0);
    expect(out.dropped).toBe(2);
  });

  it("keeps the phone filter: a template that is not phone-suitable is not served on phone", () => {
    const out = assignItems([packed("worked_example", 1)], [cand({ phoneSuitable: false })], "phone", sel);
    expect(out.tasks).toHaveLength(0);
  });
});
