// BL-0045 acceptance (pure): item selection of 06 section 3.8, the same-day retrieval gap (FR-030, PRM-04)
// and the worked-example skip (FR-034). AC-3 is the property test over 100 reviews.
import { describe, expect, it } from "vitest";
import type { Candidate, ServedHistory } from "@/server/privileged/session-store";
import { dropSkippedWorkedExamples, enforceRetrievalGap, selectItem } from "./select-item.ts";

let n = 0;
const cand = (o: Partial<Candidate> = {}): Candidate => ({
  itemId: `item-${String(++n).padStart(4, "0")}`,
  skillKey: "math.m.s",
  taskKind: "retrieval",
  templateKey: "tpl.math.a",
  phoneSuitable: true,
  seed: String(n),
  difficulty: 1500,
  tier: null,
  answer: `"a${n}"`,
  lastUsed: null,
  ...o,
});
const none: ServedHistory = { seeds: [], templates: [], answers: [] };
const ctx = (o: Partial<{ theta: number; tierTarget: string; belowMastered: boolean; history: ServedHistory }> = {}) => ({
  theta: 1500,
  tierTarget: "L1",
  belowMastered: true,
  history: none,
  ...o,
});

describe("selectItem (06 section 3.8)", () => {
  it("picks the template whose difficulty is nearest theta - 240.8 (theta 1500 -> 1259.18)", () => {
    const far = cand({ difficulty: 1600, templateKey: "tpl.far" });
    const near = cand({ difficulty: 1250, templateKey: "tpl.near" });
    const mid = cand({ difficulty: 1400, templateKey: "tpl.mid" });
    expect(selectItem([far, mid, near], ctx())).toBe(near);
  });

  it("breaks a difficulty tie to the least recently used template, never-used first", () => {
    const old = cand({ difficulty: 1300, templateKey: "tpl.old", lastUsed: new Date(1000) });
    const recent = cand({ difficulty: 1300, templateKey: "tpl.recent", lastUsed: new Date(9000) });
    const never = cand({ difficulty: 1300, templateKey: "tpl.never", lastUsed: null });
    expect(selectItem([recent, old, never], ctx())).toBe(never);
    expect(selectItem([recent, old], ctx())).toBe(old);
  });

  it("restricts to tier >= tier_target while below mastered, and not once mastered", () => {
    const low = cand({ difficulty: 1259, tier: "L0", templateKey: "tpl.low" });
    const ok = cand({ difficulty: 1500, tier: "L1", templateKey: "tpl.ok" });
    expect(selectItem([low, ok], ctx())).toBe(ok);
    expect(selectItem([low, ok], ctx({ belowMastered: false }))).toBe(low);
    // a null tier means the skill's own tier_target, which qualifies
    const implicit = cand({ difficulty: 1700, tier: null, templateKey: "tpl.implicit" });
    expect(selectItem([low, implicit], ctx())).toBe(implicit);
  });

  it("falls back to the lower tier when nothing in tier exists rather than serve nothing", () => {
    const low = cand({ tier: "L0" });
    expect(selectItem([low], ctx())).toBe(low);
  });

  it("never reuses a (template, seed) pair or an answer among the last 5 served; the 6th-oldest may return", () => {
    const sameSeed = cand({ templateKey: "tpl.x", seed: "7", answer: '"p"' });
    const sameAnswer = cand({ templateKey: "tpl.y", seed: "8", answer: '"q"' });
    const history: ServedHistory = {
      seeds: ["tpl.x|7"],
      templates: [],
      answers: ['"z1"', '"z2"', '"z3"', '"z4"', '"q"', '"p"'],
    };
    const fresh = cand({ templateKey: "tpl.z", seed: "9", answer: '"r"' });
    expect(selectItem([sameSeed, sameAnswer, fresh], ctx({ history }))).toBe(fresh);
    expect(selectItem([sameSeed], ctx({ history }))).toBeUndefined();
    // "q" is 5th (index 4) and still blocked; "p" is 6th and allowed
    expect(selectItem([sameAnswer], ctx({ history }))).toBeUndefined();
    const sixth = cand({ templateKey: "tpl.w", seed: "10", answer: '"p"' });
    expect(selectItem([sixth], ctx({ history }))).toBe(sixth);
  });

  it("avoids the templates of the last 2 reviews when another qualifies, else reuses one", () => {
    const a = cand({ templateKey: "tpl.a", difficulty: 1259 });
    const b = cand({ templateKey: "tpl.b", difficulty: 1700 });
    const history: ServedHistory = { seeds: [], templates: ["tpl.a", "tpl.c"], answers: [] };
    expect(selectItem([a, b], ctx({ history }))).toBe(b);
    expect(selectItem([a], ctx({ history }))).toBe(a);
  });

  it("AC-3: every review item over 100 simulated reviews has a seed new for the skill and a fresh answer", () => {
    // Deterministic generator; three templates, 150 items with repeating seeds across templates and answers.
    let state = 12345;
    const rnd = (): number => {
      state = (state * 1103515245 + 12345) % 2 ** 31;
      return state / 2 ** 31;
    };
    let pool: Candidate[] = Array.from({ length: 150 }, (_, i) =>
      cand({ templateKey: `tpl.t${i % 3}`, seed: String(i % 50), answer: `"${Math.floor(rnd() * 40)}"`, difficulty: 1200 + (i % 3) * 200 }),
    );
    const history: ServedHistory = { seeds: [], templates: [], answers: [] };
    let served = 0;
    for (let review = 0; review < 100; review += 1) {
      const pick = selectItem(pool, ctx({ theta: 1300 + review * 5, history }));
      if (!pick) break;
      expect(history.seeds).not.toContain(`${pick.templateKey}|${pick.seed}`);
      expect(history.answers.slice(0, 5)).not.toContain(pick.answer);
      history.seeds.unshift(`${pick.templateKey}|${pick.seed}`);
      history.templates.unshift(pick.templateKey);
      if (pick.answer !== null) history.answers.unshift(pick.answer);
      pool = pool.filter((c) => c !== pick);
      served += 1;
    }
    expect(served).toBe(100);
  });
});

const task = (kind: string, reason: string, skill: string | null = "s", est = 2) => ({ task_kind: kind, reason, skill_key: skill, est_min: est });

describe("enforceRetrievalGap (FR-030, PRM-04)", () => {
  it("carries a same-day retrieval that follows its faded problem with fewer than 3 tasks and under 10 minutes", () => {
    const tasks = [task("worked_example", "new_frontier", "s", 4), task("faded_problem", "new_frontier", "s", 5), task("retrieval", "same_day_retrieval", "s", 1.5)];
    expect(enforceRetrievalGap(tasks).map((t) => t.task_kind)).toEqual(["worked_example", "faded_problem"]);
  });

  it("keeps it at exactly 3 intervening tasks, and at exactly 10 intervening minutes; drops at 2 tasks / 9.9 minutes", () => {
    const base = [task("faded_problem", "new_frontier")];
    const retr = task("retrieval", "same_day_retrieval");
    const three = [...base, task("retrieval", "due_review", "o", 1), task("retrieval", "due_review", "p", 1), task("retrieval", "due_review", "q", 1), retr];
    expect(enforceRetrievalGap(three)).toHaveLength(5);
    const tenMin = [...base, task("problem", "continue", "o", 10), retr];
    expect(enforceRetrievalGap(tenMin)).toHaveLength(3);
    const two = [...base, task("retrieval", "due_review", "o", 1), task("retrieval", "due_review", "p", 1), retr];
    expect(enforceRetrievalGap(two)).toHaveLength(3);
    const nineNine = [...base, task("problem", "continue", "o", 9.9), retr];
    expect(enforceRetrievalGap(nineNine)).toHaveLength(2);
  });

  it("leaves a retrieval with no chunk this session, and other skills' tasks, alone", () => {
    const tasks = [task("retrieval", "same_day_retrieval", "s"), task("faded_problem", "new_frontier", "o"), task("retrieval", "due_review", "o")];
    expect(enforceRetrievalGap(tasks)).toHaveLength(3);
  });
});

describe("dropSkippedWorkedExamples (FR-034)", () => {
  const tasks = [task("worked_example", "new_frontier", "s"), task("faded_problem", "new_frontier", "s"), task("worked_example", "new_frontier", "t")];
  it("skips the worked example only for a placement-sourced skill that has not started the loop", () => {
    const states = {
      s: { source: "placement", mastery_state: "unseen", loop_step: null },
      t: { source: "learning", mastery_state: "unseen", loop_step: null },
    };
    expect(dropSkippedWorkedExamples(tasks, states).map((t) => `${t.skill_key}:${t.task_kind}`)).toEqual(["s:faded_problem", "t:worked_example"]);
    expect(dropSkippedWorkedExamples(tasks, { s: { source: "placement", mastery_state: "learning", loop_step: "worked_example" } })).toHaveLength(3);
  });
});
