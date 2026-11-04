import type { components } from "@polymath/shared-types";
import { describe, expect, it } from "vitest";
import { buildMapSkills, defaultNode, filterSkills, listOrder, trailOrder, type MapEdge } from "./skill-map";

type Graph = components["schemas"]["Graph"];

const NOW = new Date(2026, 10, 4, 10, 0, 0); // local time, so the "end of today" boundary is the same everywhere
const skill = (key: string, state?: components["schemas"]["SkillStateView"]): Graph["nodes"][number] => ({
  key: key as Graph["nodes"][number]["key"],
  node: key.split(".")[0] as Graph["nodes"][number]["node"],
  module: "m",
  title: `T ${key}`,
  tier_target: "L1",
  est_minutes: 10,
  status: "verified" as Graph["nodes"][number]["status"],
  ...(state ? { state } : {}),
});

const graph: Graph = {
  nodes: [
    skill("elec.a.one", { mastery_state: "mastered", tier_attained: "L1", due: new Date(2026, 10, 20).toISOString() }),
    skill("elec.a.two", { mastery_state: "reviewing", due: new Date(2026, 10, 4, 23, 0).toISOString() }),
    skill("elec.a.three", { mastery_state: "learning" }),
    skill("elec.a.four"),
    skill("elec.a.five"),
    skill("elec.a.six", { mastery_state: "decayed" }),
    skill("math.b.one", { mastery_state: "unseen" }),
  ],
  edges: [],
};

describe("buildMapSkills", () => {
  const skills = buildMapSkills(graph, { available: [{ skill_key: "elec.a.four" as never, reason: "r" }], in_progress: [] }, NOW);
  const state = (k: string) => skills.find((s) => s.key === k)?.state;

  it("maps each mastery state and the frontier to one of the six visible states (S14 AC 1)", () => {
    expect(state("elec.a.one")).toBe("mastered");
    expect(state("elec.a.two")).toBe("reviewing");
    expect(state("elec.a.three")).toBe("learning");
    expect(state("elec.a.four")).toBe("ready");
    expect(state("elec.a.five")).toBe("locked");
    expect(state("elec.a.six")).toBe("refresher");
  });

  it("flags a review due by the end of today (local) and not one due tomorrow", () => {
    expect(skills.find((s) => s.key === "elec.a.two")?.dueToday).toBe(true);
    expect(skills.find((s) => s.key === "elec.a.one")?.dueToday).toBe(false);
  });

  it("only a ready or learning skill can be practised", () => {
    expect(skills.filter((s) => s.practisable).map((s) => s.key)).toEqual(["elec.a.three", "elec.a.four"]);
  });

  it("uses the words of doc 09 section 3.2 and never a number", () => {
    expect(skills.find((s) => s.key === "elec.a.two")?.word).toBe("Reviewing");
    expect(skills.find((s) => s.key === "elec.a.five")?.word).toBe("Locked");
  });

  it("opens on the first area with a started skill", () => {
    expect(defaultNode(skills)).toBe("elec");
    expect(defaultNode(skills.filter((s) => s.node === "math"))).toBe("math");
  });

  it("filters by area, ready-now, due and title", () => {
    const f = { node: null, readyNow: false, dueNow: false, query: "" };
    expect(filterSkills(skills, { ...f, node: "math" }).map((s) => s.key)).toEqual(["math.b.one"]);
    expect(filterSkills(skills, { ...f, readyNow: true }).map((s) => s.key)).toEqual(["elec.a.four"]);
    expect(filterSkills(skills, { ...f, dueNow: true }).map((s) => s.key)).toEqual(["elec.a.two"]);
    expect(filterSkills(skills, { ...f, query: "  FIVE " }).map((s) => s.key)).toEqual(["elec.a.five"]);
  });

  it("lists by state then key", () => {
    expect(listOrder(skills).map((s) => s.state)).toEqual(["refresher", "learning", "ready", "reviewing", "mastered", "locked", "locked"]);
  });
});

describe("trailOrder", () => {
  const skills = buildMapSkills(graph, { available: [], in_progress: [] }, NOW);
  it("puts prerequisites before the skills that need them and keeps every skill", () => {
    const edges: MapEdge[] = [
      { from: "elec.a.two", to: "elec.a.one", strength: "hard", minTier: "L0" },
      { from: "elec.a.three", to: "elec.a.two", strength: "soft", minTier: "L0" },
    ];
    const order = trailOrder(skills, edges).map((s) => s.key);
    expect(order).toHaveLength(skills.length);
    expect(order.indexOf("elec.a.three")).toBeLessThan(order.indexOf("elec.a.two"));
    expect(order.indexOf("elec.a.two")).toBeLessThan(order.indexOf("elec.a.one"));
  });
  it("keeps skills of a cycle at the end instead of dropping them", () => {
    const edges: MapEdge[] = [
      { from: "elec.a.one", to: "elec.a.two", strength: "hard", minTier: "L0" },
      { from: "elec.a.two", to: "elec.a.one", strength: "hard", minTier: "L0" },
    ];
    expect(trailOrder(skills, edges)).toHaveLength(skills.length);
  });
});
