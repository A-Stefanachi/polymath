// The 12-skill graph the vectors run against; a copy of sample_graph() in
// polymath-app-spec/reference/scheduler_reference.py. Do not change it without regenerating vectors.
import type { EdgeStrength, GraphEdge, GraphSkill, SkillGraph } from "./types.ts";
import type { Tier } from "./params.ts";

function sk(node: string, module: string, est_minutes = 60, confusable_set?: string): GraphSkill {
  const base = { node, module, est_minutes, tier_target: "L1" as Tier };
  return confusable_set === undefined ? base : { ...base, confusable_set };
}

function edge(from: string, to: string, strength: EdgeStrength = "hard", min_tier: Tier | null = null): GraphEdge {
  return { from, to, strength, min_tier };
}

export function sampleGraph(): SkillGraph {
  return {
    skills: {
      "math.alg.linear-equations": sk("math", "alg", 45),
      "math.alg.exponents-logs": sk("math", "alg", 60),
      "math.calc.exponential-decay": sk("math", "calc", 60),
      "elec.dc.ohms-law": sk("elec", "dc", 45, "dc-laws"),
      "elec.dc.series-parallel": sk("elec", "dc", 60, "dc-laws"),
      "elec.dc.voltage-divider": sk("elec", "dc", 45),
      "elec.dc.kirchhoff-laws": sk("elec", "dc", 75, "dc-laws"),
      "elec.rc.rc-time-constant": sk("elec", "rc", 75),
      "sw.c.variables": sk("sw", "c", 45),
      "sw.c.control-flow": sk("sw", "c", 60),
      "sw.fw.gpio": sk("sw", "fw", 60),
      "sw.fw.adc-reading": sk("sw", "fw", 75),
    },
    edges: [
      edge("math.alg.linear-equations", "elec.dc.ohms-law"),
      edge("math.alg.exponents-logs", "math.calc.exponential-decay"),
      edge("elec.dc.ohms-law", "elec.dc.series-parallel"),
      edge("elec.dc.series-parallel", "elec.dc.voltage-divider"),
      edge("elec.dc.series-parallel", "elec.dc.kirchhoff-laws"),
      edge("math.alg.linear-equations", "elec.dc.kirchhoff-laws", "soft"),
      edge("elec.dc.voltage-divider", "elec.rc.rc-time-constant", "hard", "L1"),
      edge("math.calc.exponential-decay", "elec.rc.rc-time-constant"),
      edge("sw.c.variables", "sw.c.control-flow"),
      edge("sw.c.control-flow", "sw.fw.gpio"),
      edge("elec.dc.ohms-law", "sw.fw.gpio", "soft"),
      edge("sw.fw.gpio", "sw.fw.adc-reading"),
      edge("elec.dc.voltage-divider", "sw.fw.adc-reading", "soft"),
    ],
  };
}
