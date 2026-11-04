# 05 — Skill graph and curriculum spec

Status: draft 0.2, written 2026-10-31. Follows `00-contract.md` (v1.2) without silent deviation; every difference was resolved by `00a-change-decisions.md` (see **Resolved by 00a (v1.1)** and the **Review pass status** at the end). Updated 2026-10-31 for contract v1.1 (two safety skills, 00a E1; module exemption, 00a E2) and for contract v1.2 / graph 0.2.0 (decisions G1, G7, G8, G9: four new skills, corrected edges, module order, confusable sets, a two-sitting diagnostic, the planning rate).
Machine-readable companions: `schemas/skill-node.schema.json`, `content/mvp-skill-graph.yaml`, `reference/validate_graph.py`.
Evidence tags as in the contract: [V] read, [S] snippet, [R] recalled, [P] proposal, [inf] inference. Nothing below that is tagged [P] or [inf] may appear in UI copy as fact.

---

## 1. Purpose and the four modelling objects

The curriculum is content-as-code: one YAML file in git is the source of truth and `content:sync` loads it into the `skills` and `skill_edges` tables (contract section 3 and 6).

| Object | What it is | Where it lives |
|---|---|---|
| **Node** | A discipline group, from the contract list (`math`, `elec`, `sw`, and so on). First path part of a skill key. | `node` field, key part 1 |
| **Module** | An ordered group of 4 to 14 skills inside one node that a learner works through together; also the unit of the unaided checkpoint (contract 7.7). Second part of the key. | `modules` list in the graph file |
| **Skill** | The atomic, testable unit. A vertex in the DAG. Has one `skill_state` row per learner. | `skills` list |
| **Edge** | A prerequisite relation with `strength` (`hard`/`soft`) and `min_tier`. | `prerequisites` inside the dependent skill |

Skill key regex (contract section 4): `^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$`, for example `elec.dc.voltage-divider`. The `node` and `module` fields must equal key parts 1 and 2 (checked by the validator).

---

## 2. What a skill is

A skill is acceptable only if all six hold:

1. **Atomic.** It teaches one capability. If the title needs "and" to join two verbs that can be used independently, split it. The only "and" allowed is a pair that is always used together (for example "Kirchhoff laws").
2. **One verifiable outcome.** The description states a single observable thing the learner can do, phrased with a verb a grader can check: compute, choose, trace, write, measure, convert, explain. Forbidden verbs: understand, know, appreciate, be familiar with.
3. **Time-boxed.** A learner starting from the prerequisites reaches the skill's `tier_target` (L0 or L1 in the MVP) in **about 10 to 40 minutes** of focused work, counting the worked example, faded problems, the practice problem(s) and the first reviews, not later reviews. This is `est_minutes`. The schema allows 5 to 60 for non-stub skills; the validator **warns above 40** (a split candidate) and the splitting guide below still applies. Estimates are author judgment [P] and are replaced by median observed time once 10 learners have finished the skill (section 10). **Reconciled with document 06 (00a G8, design review F-07).** The earlier note compared 28 minutes a skill with the builder's 10.5-minute new-skill chunk. They measure different things: 10.5 minutes is only the first chunk (worked example 4.0, faded problem 5.0, same-day retrieval 1.5). On the builder's own defaults (06 section 7.2) a whole skill costs 15.5 minutes for the chunk in a focus session (two faded problems), 10.0 for one practice problem and 3.0 for the two retrievals that make the second and third qualifying attempts: **28.5 minutes in a focus session and 23.5 in a micro-session chain**, plus 10.0 for each extra problem. The graph mean is 28.6 minutes (graph 0.2.0), which matches the focus path, so `est_minutes` means "learner time from first exposure to first mastery" and the builder spreads it over several sessions. Skills that need more than one practice problem are timed accordingly; five skills were re-timed upwards in graph 0.2.0 (`elec.dc.nodal-analysis` 40 to 55, `elec.rc.rc-lowpass` 40 to 50, `math.calc.exp-growth-decay` 35 to 45, `elec.rc.spice-rc` 40 to 45, `elec.dig.mux-decoder-adder` 30 to 35) because three problems, not two, is the realistic number for a novice; four other skills changed by 5 minutes for content reasons (`math.alg.exp-log`, `elec.dig.latch-flipflop`, `sw.fw.i2c-protocol`, `sw.fw.uart-logging`). Both sets of figures stay [P] until the three orientation sessions give the actual/estimate ratio; if it is above 1.8, raise the personalisation cap of 06 section 7.2 to 3.0 and plan 5, not 7, new skills a week (a founder decision). **Planning rate (00a G8): 5 to 7 new skills a week, never 20.** At 28.5 minutes a skill that is 140 to 200 minutes of first learning in a week with about 252 usable non-lab minutes (06 section 14.1).
4. **Gradeable.** At least one task kind in `task_kinds` can be graded by a grader in `grader_types` that is **deterministic** (`exact_numeric`, `symbolic_equivalence`, `multiple_choice`, `code_tests`, `spice_compare`, `drc_erc`, `measurement_check`). A skill that could only be graded by `rubric_llm` or `human_review` is not allowed (contract 7.8: rubric grading is never the sole correctness grader).
5. **Generatable.** It must be possible to write an item template (`tpl.{node}.{slug}`) with a seed that produces fresh variants, because the review loop needs new variants each time (contract 7.3).
6. **Original.** Title and description are written for this product. `license: original`. `source` names the reference curriculum used only for the order of topics, never a text that was copied. MIT OpenCourseWare is CC BY-NC-SA and must not be copied (contract 11), so the graph records the course name as an ordering reference only, and nothing is paraphrased closely from it.

Splitting and merging guide: if reaching the outcome takes more than 40 minutes, split it at the next minor version (the four skills above 40 minutes are listed by the validator as warnings). If two skills always share a worked example and have no independent failure mode, merge them. A bench skill (needs a breadboard) may include setup time in its minutes, but a full build belongs in a project step, not a skill.

---

## 3. Tiers L0 to L3 as observable behaviour

The tier names come from the research report [P] ("Depth tiers replace top 1% in everything"). The hour ranges there are unvalidated and are not used by the app logic. They are defined here as behaviours so that a tier can be tested.

| Tier | Name | Observable behaviour (the test) |
|---|---|---|
| **L0** | Literacy | Without help, the learner uses the vocabulary correctly, recognises the right model for a situation, reads a datasheet or spec section for it, and asks a specific question. Test: multiple-choice and explain-back items, plus reading a given datasheet extract. No construction required. |
| **L1** | Working | The learner **completes a guided project that uses the skill and debugs it when it fails**. Skill-level proxy: `mastered` under the contract rule (at least 3 correct unaided attempts on at least 2 days across at least 2 variants), including at least one `debug_case` or `problem` where the learner must find the fault themselves. Module-level L1 additionally needs the module's guided project step accepted (below). |
| **L2** | Professional | Designs to a written specification without a walkthrough, justifies component and parameter choices against standards or datasheet limits, and has the design reviewed. Test: open-ended design task, human review. Not used in the MVP. |
| **L3** | Expert | Produces a novel result that others can reuse. Not testable in the app. Not used in the MVP. |

How tiers attach (precise rules):

- **`tier_target` (on a skill)** is the highest tier this skill can contribute to. MVP skills are L0 or L1. A skill with `tier_target: L0` is a vocabulary or concept skill (for example `elec.dc.charge-current-voltage`, `elec.semi.switching-regulator`); mastering it gives `tier_attained = L0` and never L1.
- **`skill_state.tier_attained`** is per learner per skill. It is computed by document 06 section 4.6 (canonical, 00a B3): `L0` when the mastery rule's conditions 1 to 5 are met counting attempts on items of any tier; `L1` when the full mastery rule is met at tier L1 and `tier_target` is L1 or higher. It never exceeds `tier_target`. (The scheduler spec 06 owns the mastered rule and the tier rule; this document only reads them.)
- **`min_tier` (on an edge)** is the tier of the prerequisite that the learner must have attained before the dependent skill is available. It must satisfy `min_tier <= tier_target of the prerequisite` (validator error otherwise). Default is the prerequisite's `tier_target`. Use a lower `min_tier` when the dependent only needs the idea, not the fluency (example: `sw.fw.gpio-output` needs `elec.meas.lab-safety-esd` at L0 only).
- **Module and node tier (derived, not stored on skills).** A module is L0 for a learner when all its L0-target skills have `tier_attained >= L0`. A module is **L1 Working** when every skill with `tier_target = L1` is at L1 **and** the learner has an `accepted` or `auto_verified` `project_evidence` for the module's guided project step (contract `project_steps.skill_keys`). That is the operational definition of "completes a guided project and debugs it". The project/lab spec owns the step list; this document requires that each MVP module with bench or code skills is referenced by at least one step. **Exemptions (00a E2).** The `math` modules are not bench or code modules and need no project step (their applied evidence comes from `problem` attempts and checkpoints). Module `elec.opamp` is **exempt in v1** from the rule "every module has a project step": its applied evidence comes from checkpoints, and a future project (for example an op-amp buffer in front of the ADC) may remove the exemption. `reference/validate_projects.py` reports module coverage and allows exactly these exemptions. **Project credit (00a B5):** completing a verified project step gives L0 credit immediately and pending L1+ credit that becomes real only when the step's evidence is `accepted`; it counts only toward the "applied" condition and the module-level L1 condition, and no project grants L2 or L3.
- A node is "L1" when all of its MVP modules are L1. The UI may show a per-module tier badge; it must not show a single "overall level" number (contract section 8).

---

## 4. Hard and soft prerequisites

Contract 7.1: a skill is available when every **hard** prerequisite is `mastered` (or `reviewing` with retrievability >= 0.8) and the learner's `tier_attained` meets `min_tier`. Soft prerequisites only influence ordering.

**Choosing the strength** (apply in order, first match wins):

1. **Hard** if the skill's worked example cannot be understood without the prerequisite, that is, a typical learner who fails the prerequisite will fail the first faded problem. Example: `elec.dc.kirchhoff-laws` needs `elec.dc.series-parallel`.
2. **Hard** if a step of the skill's grader or item template uses the prerequisite as an unexplained operation. Example: `elec.rc.rc-step-response` uses logarithms (`math.alg.exp-log`).
3. **Soft** if the prerequisite makes the new skill easier or gives motivation but the worked example re-states what is needed. Example: `~math.prob.normal-distribution` after `math.calc.integral-meaning`.
4. **Soft** if it is a "better after" ordering that would otherwise create a long forced wait (a hard edge to a skill in a module the learner meets much later).
5. **No edge** otherwise. Do not add edges for "related topic". Implicit credit (a filter project also exercising Ohm's law) is a separate encompassing layer owned by the scheduler spec, not prerequisites [P].

Rules of thumb:

- At most **4 hard prerequisites** per skill is normal; 5 to 7 triggers a validator warning or error (section 7). Most skills should have 1 to 3.
- Never keep a hard edge that is already implied by another hard path (transitive edge). The validator reports these as warnings; the graph file as shipped has none (0 warnings on 31 Oct 2026). The earlier statement that 17 such edges were removed while authoring is an author's log entry that cannot be reproduced from the repository [inf].
- A hard edge never points from a non-stub skill to a stub (error).
- Cross-node edges are allowed and expected (for example `sw.fw.moving-average` needs `math.prob.averaging-noise`), but each cross-node hard edge must be justified by rule 1 or 2.
- Use `min_tier: L0` to express "needs the idea only". Never put a `min_tier` above what the prerequisite can reach.

---

## 5. Authoring rules

### 5.1 Naming

- Key slug: lowercase words joined by hyphens, a noun phrase of 1 to 4 words (`voltage-divider`, `rc-step-response`, `isr-shared-data`). No verbs, no versions, no numbers unless they are part of the concept (`systems-2x2`, `i2c-protocol`).
- Keys are **immutable** once a skill has `status: verified` (section 8).
- Title: 3 to 60 characters, sentence case, names the concept, not the exercise ("Voltage divider", not "Solving divider problems").
- Module slugs are short (`dc`, `meas`, `rc`, `semi`, `opamp`, `dig`, `c`, `mem`, `fsm`, `fw`, `tools`, `alg`, `trig`, `cplx`, `calc`, `vec`, `prob`).

### 5.2 Description style

One sentence, 20 to 220 characters, ends with a full stop, starts with a verb in imperative or an action noun phrase ("Calculate ...", "Explain ...", "Trace ..."), contains exactly one verifiable outcome, names the quantities or artefacts involved, and uses no marketing language. Examples: "Calculate the output of a two-resistor divider and choose resistor values for a target ratio." Not: "Learn about voltage dividers."

### 5.3 Which task kinds a skill must support

Contract enum `task_kind`. For a non-stub skill:

| Rule | Reason |
|---|---|
| `worked_example` and `retrieval` are **mandatory** in `task_kinds` | The learning loop is worked example, faded problem, same-day retrieval, scheduled reviews (contract 7.3). |
| At least one practice kind in addition: `faded_problem`, `problem`, `debug_case`, `perceptual_drill`, `project_step` or `explain_back` | A skill with only a worked example and a recall item gives no production practice (the product is active learning). |
| Computation skills: `faded_problem` and `problem` | Fading is the bridge from example to independent problems. |
| Code and firmware skills: `debug_case` | L1 means debugging. |
| Recognition skills (reading schematics, resistor codes, dimensional analysis): `perceptual_drill` | Fast discrimination practice. |
| Concept-only L0 skills: `explain_back` (graded by `rubric_llm` with a `multiple_choice` companion) | The rubric grader is allowed, but the multiple-choice companion keeps a deterministic grader (rule 4 in section 2). |
| Bench skills: `project_step` with `measurement_check` or `human_review` | Evidence from the bench; see the evidence statuses in the contract. |
| `diagnostic` and `checkpoint` are **not listed** per skill | They are session-level kinds. Any non-stub skill is eligible to be sampled for them because it has a deterministic `retrieval` or `problem` item. |

`grader_types` lists the graders available for the skill's items. Consistency rules checked by the validator: `explain_back` needs `rubric_llm` or `human_review`; `project_step` needs `measurement_check`, `human_review` or `drc_erc`; `code_tests` needs a code-style task kind; every skill has at least one deterministic grader. Note `drc_erc` is available to KiCad skills, which are stubs in the MVP, so no MVP skill uses it.

### 5.4 The `phone_suitable` flag

`phone_suitable: true` means a learner can complete the skill's worked example and retrieval items on a phone with no keyboard-heavy input, no code editor, no SPICE editor and no bench, in a micro session (<= 20 min), and the item answers are numeric, multiple choice or short symbolic. Micro sessions use only phone-suitable skills (contract 7.6). Rules: `spice_compare` skills and bench (`project_step`) skills are never phone suitable (validator error); `code_tests` skills are phone suitable only when their retrieval items are reading-code multiple-choice (for example `sw.c.types-ints`). In the shipped graph 110 of 142 skills are phone suitable (counted from the YAML; the validator does not print this); of the four skills added in 0.2.0, three are phone suitable (`sw.mem.memory-mapped-registers`, `sw.fw.uart-framing`, `elec.opamp.summing-level-shift`) and `sw.fsm.function-pointers` is not.

### 5.5 Required fields and status

Every skill carries every field in the schema; none is optional, which keeps the sync script simple. `status` starts at `draft`. A skill becomes `verified` only after it passes the human checklist (section 10) **and** at least one item template for it has passed item verification (spec 07 or the content-verification doc). Stubs use `status: stub` (00a section C).

### 5.6 Concept primers (lessons, 00a K6)

A skill may have one lesson file, `content/lessons/<skill_key>.yaml` (schema `schemas/lesson.schema.json`, validator `reference/validate_lessons.py`). The lesson is shown before the first worked example of the skill and as a short recap when the skill is relearned (00a K8). It is optional: a skill without a verified lesson starts at the worked example. Lessons are kept out of the graph file so that editing one never touches the graph's hash or the templates' reviews.

How much a lesson does depends on the kind of skill (doc 02 M14):

| Kind of skill | Lesson emphasis |
|---|---|
| Computation (most of the lean slice: algebra, Ohm's law, dividers, nodal analysis) | Short: why it matters, the one relation, the units rule. The labelled stepper (00a K5) carries most of the teaching. |
| Conceptual (charge, current and voltage; what KCL and KVL mean; lab safety) | Fuller: a mental model with a figure, prediction checks ("which bulb is brighter?"), and a strong refutation of the top misconception, for example "a battery delivers a fixed current". |
| Recognition (schematic reading, resistor codes) | A symbol next to the symbol it is confused with, then the perceptual drill. |
| Code and firmware | Read a short program and predict its output, then the code tasks. |
| Bench | The lesson is the background reading the project steps link to; the step itself stays worked, faded, then free build (LS-080). |

The lesson's `misconception.tag` reuses a tag already declared by one of the skill's templates, so a graded wrong answer with that tag can point back to the lesson (00a K8). A lesson becomes visible to learners only after the founder approves its current version in the review console (00a K9).

---

## 6. The MVP graph

### 6.1 Scope

The graph in `content/mvp-skill-graph.yaml` contains, for this first-walk slice (the `draft` skills, also called T0; graph_version 0.10.0, after the first-walk swaps and bridge skills of 00a), **142 real skills** in three active nodes (contract section 9): `math` essentials (43), `elec` (57) and `sw` including embedded firmware (42). Four stubs remain in the file. Spine skills marked `needs_human_review` are outside these counts. Graph 0.1.0 had 138 real skills; 0.2.0 adds four (00a G9, review finding F-06): `sw.fsm.function-pointers`, `sw.mem.memory-mapped-registers` (memory-mapped registers and `volatile`), `sw.fw.uart-framing` and `elec.opamp.summing-level-shift`. Two of the 142 are the safety skills added by 00a E1, `elec.meas.soldering-safety` and `elec.semi.battery-safety`. Firmware topics are in `sw.fw`; the hardware they depend on (pull-ups, op-amp scaling, regulators) stays in `elec`. The research report's MVP slice estimated roughly 40 to 60 skill nodes [P]; this graph is larger because each skill here is about 10 to 55 minutes, a finer grain than the report's "node". The grain is deliberate (it matches the FSRS per-skill scheduling) and is the main item to revisit after the beta (section 10).

Within the 142 skills: hard edges 216, of which 206 carry `min_tier: L1` and 10 `min_tier: L0`. Soft edges: 10 (226 edges in all). The share of hard edges (96%) and of L1 tier requirements (95% of hard edges) makes the frontier strict; the diagnostic placement grace relaxes this for placed skills only (G1, 06 section 6.1). Roots (skills with no prerequisites): 4 (`math.alg.order-of-operations`, `elec.meas.schematic-reading`, `elec.meas.lab-safety-esd`, `sw.tools.terminal-basics`). Longest hard chain within these skills: 13 (computed from the YAML; the validator's figure of 20 covers the whole graph). A chain of that depth is not a first-month problem: each hop needs a prerequisite to be `mastered`, which takes about 3 or more days under 06 section 4.2, so the minimum calendar time along the longest chain is about 6 weeks. The first LED-blink prerequisites (`sw.fw.gpio-output`, 20 skills, 7.7 core hours) are reached in weeks 12 to 23 (median 15) in the model of 06 section 14.4 under the v1.2 mastery rule, against a median of 11 under the v1.1 rule [inf]; a guided first build with immediate L0 credit (00a B5) is the remedy for that wait, not a weaker rule. `sw.mem.memory-mapped-registers` is deliberately **not** a prerequisite of `sw.fw.gpio-output` (it would add the whole pointer chain to the first blink): it gates `sw.fw.timers-tick` and, through it, interrupts and UART logging, so the first LED can use a driver call and the register view comes next.

### 6.2 Modules, order learners meet them, and hour estimates

**These hour figures are unvalidated author estimates [P].** "Core hours" is the sum of `est_minutes` (first learning only: first exposure to first mastery, section 2). "Planning hours" multiplies by 2.5 to allow for scheduled reviews, checkpoints, tutor time, errors and (in the intent of the multiplier) some project work; the 2.5 factor has no source and is a placeholder to be replaced by beta data. The research report's L1 range of 150 to 300 hours for one CE2016-sized area [P] suggests 168 planning hours for the whole slice may be optimistic; treat 160 to 300 hours as the plausible range until measured. At the founder's 8 hours a week, 168 planning hours is about 21 weeks; 300 hours is about 38 weeks. Per 00a E3 these figures stay explicitly unvalidated: the 67.2 core hours are a first-pass sum of minutes, the 2.5 multiplier is a placeholder, the 150 to 300 hour L1-per-node estimate stands, and no document may promise L1 across all three slice nodes inside a short window.

**Skill hours and project hours are not additive (00b item 10, check-package finding F-07).** Document 10 section 4 estimates the build projects at **62.8 hours** (3,770 minutes of step estimates across L0 to L5; 47.3 hours for L0 to L4). The 168 planning hours of this section already contain an unknown share of project work through the 2.5 multiplier, so the two figures overlap in a way nobody has measured. Reading A (the multiplier covers the projects) would leave only about 38 hours of the 101 hours of overhead (168 minus 67.2) for reviews, checkpoints and tutor time once 62.8 hours of projects are taken out; reading B (projects are extra) gives about 231 hours. Neither reading is validated. Rule: do not add the two figures, and do not subtract one from the other; the planning range stays 160 to 300 hours [P] until the golden builds (doc 10 section 12) and ten learners give observed medians. Doc 10's Quick reference explains the same point from the project side.

**Planning rate versus these totals (00a G8).** 142 skills at 5 to 7 new skills a week take 20 to 28 weeks of new learning, in line with the 21 to 38 weeks above. Quote the rate, not a date.

Order = the order in which a new learner first meets the module (`modules[].order`). Modules interleave: after the first three, the scheduler may open a skill from any module whose prerequisites are met, so the order is the default suggested path, not a gate. The control arm of the evaluation follows this order as a static syllabus (00a D7), which is why the order must not contain a dependency that points forward. The validator guarantees that **no edge, hard or soft, points to a later module** unless it is whitelisted with a reason (rule 13).

Counts in this table are `draft` skills only, so a module can show fewer skills than the validator's list, which also counts `needs_human_review` skills.

| Order | Module key | Title | Skills | Core min | Core h | Planning h (x2.5) |
|---|---|---|---|---|---|---|
| 1 | `math.alg` | Algebra review | 13 | 235 | 3.9 | 9.8 |
| 2 | `sw.tools` | Terminal, Git and build tools | 4 | 110 | 1.8 | 4.6 |
| 3 | `elec.dc` | DC circuits | 11 | 290 | 4.8 | 12.1 |
| 4 | `math.prob` | Probability and uncertainty | 5 | 135 | 2.2 | 5.6 |
| 5 | `elec.meas` | Measurement and SPICE basics | 9 | 255 | 4.2 | 10.6 |
| 6 | `elec.dig` | Digital logic | 8 | 240 | 4.0 | 10.0 |
| 7 | `sw.c` | C basics | 10 | 300 | 5.0 | 12.5 |
| 8 | `sw.mem` | Memory and pointers | 5 | 155 | 2.6 | 6.5 |
| 9 | `math.trig` | Trigonometry | 6 | 140 | 2.3 | 5.8 |
| 10 | `math.cplx` | Complex numbers and phasors | 4 | 105 | 1.8 | 4.4 |
| 11 | `math.calc` | Calculus basics | 8 | 245 | 4.1 | 10.2 |
| 12 | `elec.rc` | Capacitors and RC filters | 11 | 360 | 6.0 | 15.0 |
| 13 | `elec.semi` | Diodes, transistor switches, regulators | 11 | 285 | 4.8 | 11.9 |
| 14 | `sw.fsm` | State machines in code | 5 | 160 | 2.7 | 6.7 |
| 15 | `elec.opamp` | Op-amp basics | 7 | 210 | 3.5 | 8.8 |
| 16 | `sw.fw` | Firmware: I/O, interrupts, buses, filtering | 18 | 625 | 10.4 | 26.0 |
| 17 | `math.vec` | Vectors and matrices | 7 | 180 | 3.0 | 7.5 |
| | **Total** | | **142** | **4030** | **67.2** | **168** |

Per node: `elec` 27.3 core hours, `math` 17.3, `sw` 22.5.

**Module order changes in graph 0.2.0 (00a G9).** Two moves remove five of the six backward dependencies found by the design review (00f F-06): `math.prob` moved from order 17 to order 4, before `elec.meas`, because `elec.meas.measure-vs-simulate` (hard) needs `math.prob.measurement-uncertainty` and `sw.fw.moving-average` and `sw.fw.sensor-calibration` need `averaging-noise` and `measurement-uncertainty`; and `elec.opamp` (now 15) moved before `sw.fw` (now 16), which removes the soft edge from `elec.opamp.sensor-conditioning` to `sw.fw.adc-scaling` that pointed backwards. A third dependency was removed by an edge correction: `elec.meas.oscilloscope` no longer depends on `math.trig.sinusoids` (amplitude, period and frequency need no phase). All other orders are unchanged apart from renumbering. Module order is not a gate: moving `math.prob` earlier does not make the learner study probability first, because the frontier opens skills by prerequisites and project pull; it only fixes the static syllabus of the control arm.

**Remaining module-order exceptions (whitelisted in the graph file under `module_order_exceptions`, each with a reason; the validator fails on any other backward edge or on a stale entry):**

| Edge (prerequisite -> skill) | Kind | Why it stays |
|---|---|---|
| `sw.c.program-structure` (order 7) -> `sw.tools.build-make` (order 2) | hard | `sw.tools` is a cross-cutting module met first (terminal, Git); its last skill, building a C program with make, needs a C program to build |
| `math.calc.integral-meaning` (11) -> `math.prob.normal-distribution` (4) | soft | area under a curve is intuition only and never gates; `math.prob` is early on purpose |
| `math.calc.derivative-meaning` (11) -> `math.prob.measurement-uncertainty` (4) | soft | slope as sensitivity helps uncertainty propagation but is not needed to start it |

**Other edge corrections in graph 0.2.0 (00f section 8).** `elec.dig.latch-flipflop` now depends on `elec.dig.gates-truth-tables` instead of `combinational-design` (an SR latch and a D flip-flop need gates, not K-maps), and its description no longer calls the SR latch "clocked"; `elec.dig.fsm-from-spec` gained a hard edge from `combinational-design` (next-state logic is combinational) so that nothing was lost. `sw.fw.i2c-protocol` gained a hard edge from `elec.rc.rc-time-constant` (pull-ups set the rise time) and its description now has one outcome. `math.alg.exp-log` mentions the natural logarithm and e, and no longer teaches decibels; `elec.rc.bode-db` states 20 log10 for voltage ratios and 10 log10 for power. `elec.opamp.comparator` depends on `elec.dc.voltage-divider` (hysteresis thresholds) with a soft edge from `ideal-rules`, because the ideal rules assume negative feedback and a comparator uses none or positive feedback. `elec.dig.logic-levels` has a soft rather than hard edge from `elec.dig.binary-hex`. `sw.fsm.table-driven` depends on the new `sw.fsm.function-pointers` instead of `sw.mem.pointers` (implied), `sw.fw.uart-logging` on the new `sw.fw.uart-framing`, and `elec.opamp.sensor-conditioning` on the new `elec.opamp.summing-level-shift`. Two edges that the new skills made redundant were removed (`sw.fw.isr-basics` from `sw.mem.pointers`, `sw.fw.uart-logging` from `sw.c.arrays-strings`). Not applied: relaxing `min_tier: L1` to L0 on edges that need only the idea (00f F-05, section 8 item 10): the expected gain is small and the diagnostic grace (G1) covers the placement case; the content owner may revisit it after the orientation sessions.

**Confusable sets (00a G9).** 10 tags covering 28 skills, each inside one module (rule 14): `dc-network-methods`, `opamp-configurations`, `rc-filter-type`, `transistor-switches`, `regulator-types`, `calculus-operations`, `complex-forms`, `serial-protocols`, `value-vs-address`, `fsm-styles`. They cover, among others, Kirchhoff vs nodal vs superposition vs Thevenin/Norton, inverting vs non-inverting vs comparator, low-pass vs high-pass, BJT vs MOSFET switch, I2C vs UART, and pointer vs array. "Series vs parallel" is one skill and "SPI" has no skill in the MVP, so neither can be a set. A skill without a tag is never interleaved (06 section 7.6, 02 LS-011).

Why this order [P]: algebra first because every circuit formula needs rearranging; Git and terminal in parallel because they carry no dependency and give early wins; DC circuits next, then probability and uncertainty because the first measurement-versus-simulation work needs them, then measurement so the learner builds and measures early (the research report's "measurement from day one"; the probability module is short, 3.2 hours); digital logic before C so that bits, hex and state machines are physical before they are code (MIT 6.002 and Nand2Tetris orderings, as read in the research notes [V for the course orders, P for this sequencing]); trigonometry, complex numbers and calculus placed just before the RC filters that use them (derivative of a capacitor, exponential decay, impedance), though since graph 0.10.0 only `elec.rc.impedance` and `elec.rc.bode-db` hard-require phasors, and the time-constant and low-pass skills work from formulas so that project L1 does not need more closure than L2; the firmware module after diodes/transistors (LED drive, pull-ups), C, memory and state machines; op-amps before firmware so that sensor conditioning (including the summing stage) is available when the ADC skills arrive (`sw.fw.adc-scaling` has only a soft edge to `elec.opamp.sensor-conditioning`); vectors and matrices last because the circuits need only 2x2 systems (inside `math.alg`). If the beta shows learners stall on calculus, the safest change is to move `math.calc` to just before `elec.rc` as already done and the soft edge from `elec.rc.rc-time-constant` to `math.calc.exp-growth-decay` already allows a no-calculus route.

### 6.3 Capstone linkage (the sensor board)

The contract's capstone is a sensor board that logs and filters data. The graph supports the project ladder L0 to L4, and L5 as the last item built, with these terminal skills (the project spec 10 references them in `project_steps.skill_keys`):

| Ladder step | Skills needed (terminal) |
|---|---|
| L0 blink LED, resistor calculation | `elec.semi.led-current-limit`, `sw.fw.gpio-output`, `elec.meas.breadboard-build` |
| L1 divider/RC filter measured on a scope and matched to SPICE | `elec.rc.filter-bench`, `elec.rc.spice-rc`, `elec.meas.measure-vs-simulate` |
| L2 transistor switch and regulator | `elec.semi.mosfet-switch`, `elec.semi.regulator-dissipation`, `elec.semi.inductive-load` |
| L3 I2C sensor with UART logging, non-blocking | `sw.fw.i2c-sensor-read`, `sw.fw.uart-logging`, `sw.fw.logic-analyzer`, `sw.fsm.nonblocking-timing` |
| L4 state-machine device with ISR | `sw.fsm.fsm-testing`, `sw.fw.isr-shared-data`, `sw.fw.debounce` |
| Filtering and calibration of the logged data (capstone) | `sw.fw.exponential-filter`, `sw.fw.moving-average`, `sw.fw.sensor-calibration` |
| L5 first KiCad board (fully specified in the project ladder; the last item built, milestone M5, 00a A3) | `elec.pcb.kicad-schematic-erc` (stub in the graph) |
| Safety acknowledgements (00a E1) | `elec.semi.battery-safety` (L2 project, battery steps), `elec.meas.soldering-safety` (L3 and L5 projects, soldering steps), both with prerequisite `elec.meas.lab-safety-esd` |

The ladder names follow the research report's proposed ladder [P]. Graph 0.2.0 adds prerequisites behind these terminal skills without renaming any key: `sw.fw.i2c-sensor-read` is now also linked to `elec.rc.rc-time-constant` through `i2c-protocol` (a soft edge since graph 0.10.0) and `sw.fw.uart-framing`; the L3 and L4 steps that name `sw.fw.timers-tick`, `sw.fw.isr-shared-data` or `sw.fw.uart-logging` now pass through `sw.mem.memory-mapped-registers`. The project ladder file lists linked skills per step and was not edited by this pass; see the requests to the project owner in the review notes.

### 6.4 Stub nodes (18)

Stubs show where other disciplines attach. They have `status: stub`, `est_minutes: 0`, empty `task_kinds` and `grader_types`, `phone_suitable: false`, and each depends on at least one real skill (or stub). They are excluded from totals, never offered to learners, and no real skill may depend on one (validator error). Their descriptions are also original.

| Stub key | Attaches after | Why it is there |
|---|---|---|
| `phys.mech.newton-laws` | vector basics, derivative meaning | Mechanics base |
| `phys.em.fields-induction` | dot product, inductor basics | Fields behind inductors and antennas |
| `phys.thermal.heat-transfer` | regulator dissipation | Thermal resistance for chips |
| `sig.freq.fourier-intuition` | phasors, Bode plots | Hinge from math to filtering and sensing |
| `sig.sampling.nyquist-aliasing` | ADC scaling, Fourier intuition | What an ADC can see |
| `ctl.pid.pid-controller` | exponential filter, numerical methods | Control starts from filters and discrete calculus |
| `sens.meas.calibration-uncertainty` | sensor calibration | Error budgets (tier L2) |
| `net.proto.ip-and-sockets` | UART logging | Networking literacy |
| `sec.hw.threat-modelling` | I2C sensor read | Security hook for devices |
| `mech.cad.parametric-sketch` | vector basics | Enclosure CAD |
| `matl.mfg.pcb-fabrication` | KiCad stub | Fabrication and DFM |
| `elec.pcb.kicad-schematic-erc` | schematic reading, linear regulator, I2C protocol | Project ladder L5 |
| `ml.core.linear-regression` | linear systems, variance | First ML model |
| `ml.edge.quantization` | linear regression, integer types | Edge-AI path |
| `sys.req.requirements` | measure vs simulate | Requirements and verification |
| `prof.law.export-control-literacy` | lab safety (L0) | Compliance literacy; no defense content in the MVP |
| `econ.cost.bom-costing` | linear regulator | Costing from component choices |
| `rf.basics.link-budget` | Bode plots, impedance | Wireless basics |

When a stub is promoted to a real skill: set the five fields (`est_minutes`, `task_kinds`, `grader_types`, `phone_suitable`, status `draft`), run the validator, and bump the graph minor version (section 8). Keys do not change.

---

## 7. Graph validation rules

Run from the repository root (the package root `polymath-app-spec/`):

```
pip install jsonschema pyyaml --break-system-packages
python3 reference/validate_graph.py
```

Optional arguments: path to the graph YAML, path to the schema. Exit code 0 on success, 1 on any error. CI must run this on every pull request that touches `content/`.

| # | Rule | Severity |
|---|---|---|
| 1 | File validates against `schemas/skill-node.schema.json` (types, enums, ranges, stub vs non-stub conditional) | error |
| 2 | Key matches the contract regex; unique; `node` and `module` match the key parts; every used module is declared and vice versa | error |
| 3 | Description is a single sentence ending in a full stop | error (full stop), warning (more than one sentence) |
| 4 | Every prerequisite key exists (no orphan prerequisites); no self-edges; no duplicate edges | error |
| 5 | `min_tier` on an edge does not exceed the prerequisite's `tier_target` | error |
| 6 | No non-stub skill depends on a stub; every stub has at least one prerequisite | error |
| 7 | Graph is acyclic (all edges, hard and soft) | error |
| 8 | Every skill is reachable from a root (a skill with no prerequisites); more than 8 roots | error / warning |
| 9 | Hard prerequisites per skill: more than 4 | warning; more than 7 is an error |
| 10 | Longest hard chain more than 22 skills | warning |
| 11 | Redundant (transitive) hard edge | warning |
| 12 | Non-stub skill has `worked_example` and `retrieval`; a practice kind; at least one deterministic grader; kind/grader consistency (section 5.3); phone-suitability consistency (section 5.4) | error (warning for missing practice kind) |
| 13 | **Every** edge (hard and soft, entry skill or not) points to the same module or one of lower `order`, unless the pair is whitelisted in the graph file's `module_order_exceptions` with a reason; a whitelist entry that is not a backward edge, or names a missing skill, is an error (00a G9; before v0.2.0 only module entry skills were checked, and six backward edges passed) | error |
| 14 | Per-module total `est_minutes` below 60 or above 600; a skill above 40 minutes | warning (suggests merging or splitting) |
| 15 | Summary printed: skills per node, edges, roots, longest path, per-module and total minutes, terminal skills, confusable sets, whitelisted exceptions, mean minutes against the builder reference | informational |
| 16 | `confusable_set` tags: at least two members, all in one module, no stubs; fewer than 8 sets in the file | error / error / error / warning (00a G9) |

Note on rule 8: in a DAG every vertex is reachable from some source, so the check is a safeguard for malformed files, and its practical value is catching stubs or skill islands that were never connected (rule 6).

Validated result for graph 0.10.0 (command above, run 2026-11-02; whole graph, so totals include the spine):

```
skills: 389 real + 4 stubs; edges: 868 (632 hard, 236 soft)
roots: 4; longest hard chain: 20 skills
skills per node: ctl=34, def=5, econ=5, elec=60, math=49, matl=7, mech=24, ml=21, net=3, phys=8, prof=17, pwr=31, rf=2, robo=27, sec=10, sens=2, sig=15, sw=50, sys=19
total est_minutes: 12855 = 214.2 h core learning time (planning multiplier 2.5x = 536 h, unvalidated)
confusable sets: 10 covering 28 skills; module-order exceptions whitelisted: 5
mean est_minutes per skill: 33.0 (builder reference: 28.5 min = 15.5 focus chunk + 10 practice problem + 3 for two retrievals)
RESULT: PASS (0 errors, 66 warnings)
```

The validator was also run against a corrupted copy (an injected cycle, a missing prerequisite and a rubric-only skill) and reported errors for each, so the checks do fire.

Not checked by the script (human checklist items): that a prerequisite is pedagogically right, that descriptions are original, that the 5 to 40 minute estimate is plausible, and that an item template can really be written.

---

## 8. Versioning and change policy

The graph file has `graph_version` (semantic version) and `schema_version`.

| Change | Version bump | Learner-state effect |
|---|---|---|
| Fix wording of title or description; change `est_minutes`; change `source`; add or remove `task_kinds` or `grader_types`; toggle `phone_suitable` | patch | None |
| Add a skill or a stub; promote a stub; add a soft edge; add a hard edge **to a new skill** | minor | New skill appears as `unseen` |
| Add a hard edge into an existing skill; raise a `min_tier`; change `tier_target`; change an edge soft to hard | major | Recompute frontier. Learners who already started the dependent keep access (grandfathering) for 30 days, then the new rule applies; nothing is deleted |
| Remove an edge or lower a `min_tier`; change an edge hard to soft | minor | Frontier may widen |
| Retire a skill (`status: retired`) | major | Keep the row and the learner's `skill_state` and `review_log`; scheduler stops serving it; its dependents keep their edges until rewired in the same release |
| Rename a key | **forbidden** | Create a new key, retire the old one, and record the mapping in `content/graph-migrations.yaml` (CCR-05-3, accepted in 00a section C); `content:sync` copies learner state across using the map |
| Merge or split a skill | major | Same mechanism as rename: old key retired, `replaces` mapping recorded; learner state is copied with `elo` and FSRS fields kept and `mastery_state` lowered to `reviewing` for a verification review |

Process rules:

- Every graph change is a pull request that changes the YAML and nothing else in `content/` unless required. The PR description lists changed keys, the reason, and the version bump.
- CI runs the validator. A failing validator blocks merge.
- Pulling a skill from learners (wrong content) uses `status: retired` or `needs_human_review`; it does not delete rows.
- `content:sync` is idempotent and refuses to drop a key that has learner `skill_state` rows unless it is marked `retired`.
- The graph version is stored on each `sessions` row and each `events` row of type `graph_loaded` so analysis can tell which graph a learner saw.
- Before beta, the founder is the only learner and breaking changes are acceptable if the migration map is kept. After beta recruitment (10 to 50 learners), major bumps need a written note in the release log and a warning in the app.

---

## 9. Using LLMs in authoring

Allowed uses (default model by cost: the cheaper tagging/drafting model; the contract sets provider and interface):

- Draft candidate skill lists for a module from a topic outline written by the founder.
- Propose prerequisite edges and strengths, with a one-line reason each. Output must be JSON matching the schema's `edge` object plus a `reason` string kept in the PR, not in the graph.
- Tag `est_minutes`, `phone_suitable`, difficulty prior, and suggested `task_kinds`.
- Rewrite a description to satisfy section 5.2.
- Find likely redundant or missing skills by comparing the graph with a topic outline.
- Draft item templates (a separate document governs those).

Forbidden uses:

- An LLM answer is **never** the sole validator of a prerequisite, a time estimate, a tier assignment or a description's originality. The deterministic validator plus the human checklist (section 10) are the gate.
- An LLM must not set `status: verified` or alter `license`.
- Prompts must not paste text from copyrighted or NC-licensed course material (such as MIT OCW pages); give the model only the topic title and the product's own outline, to keep content original (contract 11).
- No LLM output is merged without a diff review. Prompts are versioned files in the repo (contract 3).

Recommended workflow: (1) founder writes a 5 to 15 line outline for the module; (2) LLM drafts skills and edges; (3) the draft goes through `validate_graph.py`; (4) a second, independent LLM pass is asked to try to break each hard edge ("Give a learner profile who has the prerequisite but not the skill, and a profile who has the skill without the prerequisite"); disagreements go on the checklist; (5) the founder completes the checklist; (6) merge as `draft`; (7) `verified` after items are verified.

---

## 10. Human review checklist (per module, before `status: verified`)

Tick every box in the PR description.

1. Each skill passes the six tests in section 2 (atomic, one verifiable outcome, 5 to 40 minutes, gradeable, generatable, original).
2. Each description is one sentence with a gradeable verb; none copies or closely paraphrases a textbook, course page or OCW material.
3. Every hard prerequisite satisfies rule 1 or 2 of section 4; every soft edge is really optional; no edge exists "because related".
4. For the three hardest-to-place skills in the module, the reviewer wrote down a learner who has the prerequisites and should succeed, and one who lacks one and should fail.
5. `tier_target` is L0 only for concept/vocabulary skills; all L1 skills have at least one task where the learner must produce or debug something.
6. The module has at least one guided project step or bench task that exercises its L1 skills (module-level L1 definition, section 3).
7. Each task kind and grader combination is feasible with the graders the MVP actually ships (exact numeric, symbolic, multiple choice, code tests, ngspice compare, measurement checks, rubric); nothing relies on `drc_erc` or CAD.
8. `phone_suitable` is true only if the worked example and retrieval work on a phone; no SPICE or code editor needed.
9. `est_minutes` was sanity-checked by doing the skill at least once with a stopwatch (author or founder), recorded in the PR.
10. Units, constants and values mentioned (resistor E-series, logic levels, supply voltages) are standard and checked against a datasheet or independent reference; no [R] fact is left unchecked.
11. The module total is within 60 to 600 minutes and the planning hours (x2.5) are written down.
12. The validator passes with no errors; every warning is explained or fixed.
13. `source` names the reference curriculum used only for ordering, `license` is `original`.
14. No claims about brains, "mastery of all disciplines", or fixed learning timelines appear (contract section 8).

After the beta starts, add a step: compare `est_minutes` with the median observed time per skill (from `attempts` and `sessions`) and update by patch release when the difference exceeds 50% with at least 10 learners.

---

## 11. Diagnostic placement design

### 11.1 Goal and constraints

Place a new learner on the graph so that (a) already-known skills are not taught again, (b) the starting frontier is sensible, (c) the learner is not discouraged, and (d) the result is conservative, because skipped content is never re-seen unless reviewed. It uses the contract `diagnostic` task kind inside `focus` sessions (00a A2), **constructed-response items only (no multiple choice), about 2.5 minutes an item, at most 20 items in at most two sittings of 25 minutes each** (00a G7). The app never splits it into session types that do not exist. The design is a proposal [P]; the approach follows the research report's "Math Academy-style frontier estimation" but is not copied from it, and nothing about its accuracy is validated. The evaluation plan should test it (for example, compare predicted known skills with later first-attempt success).

### 11.2 Procedure (identical to document 06 section 5.5, which is canonical; 00a B3, G7)

1. **Scope and items.** All non-stub skills form the unresolved set. A skill can be probed only if it has a verified constructed-response diagnostic item (a validator rule of the content pipeline rejects multiple choice for the `diagnostic` kind; document 07). The item is a fresh variant at the template whose difficulty prior is nearest the skill's median template difficulty; `phone_suitable` skills are preferred when the context is phone.
2. **Selection (min-max).** Serve the unresolved skill `s` that maximises `min(|ancestors(s) in unresolved|, |descendants(s) in unresolved|)` over hard edges; ties go to the smaller depth, then the smaller key. This is the item whose answer, right or wrong, resolves the most skills.
3. **Answer.** The learner answers, or presses "I don't know" (score 0, weight 0 for Elo, counted as a wrong answer for propagation, no penalty). A confidence rating (1 to 5) is recorded for each answer but does not change propagation.
4. **Propagation.** Correct (`score >= 0.8`, no hint): `s` is `probed_known` and every unresolved hard ancestor is `inferred_known`. Wrong or "I don't know": `s` is `probed_unknown` and every unresolved hard descendant is `inferred_unknown`. Soft edges do not propagate.
5. **Sittings and stopping.** Stop when the unresolved set is empty, when 20 items are done, or when the learner stops. A **sitting** ends after 25 minutes of active time or 10 items, whichever comes first; the second sitting is offered from the next local day and resumes the stored result (nothing is asked twice). Skills still unresolved are treated as `unseen`. There is no self-report questionnaire and no spot-check probe: the cheap `verify` retrievals after the diagnostic do that job (11.3).
6. **Expected result.** With 20 items on the real graph the model of 06 section 14.5 leaves about 16 of 142 skills unresolved for a near-novice and about 28 to 40 for a learner with background [inf]. Placement is a starting-point estimate, not a measurement; the UI says so.
7. **Never probe stubs.** Only the MVP skills are in scope.

### 11.3 Mapping the result to `skill_state` (conservative; same as 06 section 5.5)

The contract defines `mastered` as three correct unaided attempts on two different days across two variants (plus the span and template conditions of v1.2), and the frontier rule needs `mastered` or `reviewing` with retrievability >= 0.8. A single diagnostic item cannot satisfy that. So the mapping creates **provisional credit** rather than mastery:

| Diagnostic outcome | `mastery_state` | `tier_attained` | `elo` | FSRS card | What the learner sees |
|---|---|---|---|---|---|
| `probed_known` | `reviewing` with `source = placement`, `loop_step = verify` | `L0` at most (document 06 section 4.6 gives L1 only through the mastery rule) | `theta` from the diagnostic formula of 06 section 5.5 (`diagnostic_init`) | none at placement; the card is created at the first verification review (06 section 3.6) | Skill marked "placed"; the first verification retrieval within a few days acts as the check |
| `inferred_known` | `learning` with `diag_credit = true`, `loop_step = verify` | none | `theta` of the probed descendant minus 100 | none; the card is created at the first verification retrieval | Not shown as new content; verified by cheap retrievals (at most 4 per session) |
| `probed_unknown` or "I don't know" | `unseen` | none | seeded from the module prior | none | Normal teaching |
| `inferred_unknown` | `unseen` | none | module prior | none | Normal teaching |
| unresolved (not reached in 20 items) | `unseen` | none | module prior | none | Normal teaching; the "I already know this" skip of 06 section 5.6 is available |

Safety rules: no skill is ever set to `mastered` by placement; a failed verification review on a placed skill sets `mastery_state = learning`, removes the placement credit, ends its frontier grace and re-opens its dependants that were started on that credit (they stay accessible but are flagged for review); the first unaided checkpoint (contract 7.7) includes at least 2 placed skills per module to measure placement accuracy. Placement credit carries `tier_attained` of at most L0, because L1 requires the full mastery rule and the debugging evidence described in section 3; module-level L1 still needs the project step either way.

**Frontier effect (00a G1, supersedes the strict reading recorded by the design review).** A `probed_known` card in `reviewing` with `source = placement` satisfies the frontier test for 14 days, or until its first verification review or a failed `verify` retrieval, **both on retrievability and on `min_tier` up to L1**: during the grace it counts as tier L1 for that test only (06 section 6.1, contract 7.1). That is what lets the diagnostic open dependents across the 227 L1 edges of the graph; `tier_attained` shown to the learner and used for credit stays at most L0, and nothing is written to `skill_state` by the relaxation. Without it, a placed skill would open nothing across an L1 edge until it had earned L1 normally. Inferred skills (in `learning`) satisfy no edge until their verification retrievals bring them to `reviewing`, normally within two days; they are re-checked by cheap `verify` retrievals ranked with due reviews (document 06 section 7.4).

The retrievability needed for frontier access (>= 0.8) would hold for only about two days after placement given a 3-day stability under FSRS defaults [inf]; hence the fixed 14-day grace of 00a B6.

### 11.4 What gets logged

Each diagnostic item creates an `attempts` row with `task_kind = diagnostic` through the normal pipeline (so the verification gate applies), plus the events `diagnostic_started`, `diagnostic_item_answered` and `diagnostic_finished` with the final belief table in `props`. The final table lets the evaluation plan compute placement accuracy.

---

## 12. Long-term capability spine (post-MVP)

Planning only; does not change the MVP graph file or lean slice.

After first-walk L1 is evidenced, curriculum expands along **tracks** in `docs/15-cyber-physical-capability-spine.md` and `content/capability-tracks.yaml`: foundation (existing), power and motion, control, mechanical, UAV integration (`robo`), cloud twin, governance. The eighteen MVP **stubs** (section 6.4) are the attachment points; promotion follows section 6.4 rules. New nodes (`robo`, expanded `pwr`) add skills at roughly **[P] 150–300** over years, with project ladder L6–L13.

Founder goals (dual-use literacy, defense-industrial integration, production AI, cybersecurity, real-world builds) map to tracks in the YAML file. Credible outcomes after the full spine are in `docs/16-capability-outcomes.md`. Content boundaries (no weapon/EW enablement) match PRD NG-06 as refined in doc 15.

---

## 13. Assumptions and open items

- All hours, minutes and the 2.5x planning multiplier are unvalidated author estimates [P]. The re-timing of five slow skills in graph 0.2.0 is also an author estimate (no stopwatch run yet).
- Topic orderings come from the reference curricula named in `source` (Math Academy's public course chain, MIT 6.002's public topic order, Nand2Tetris, CS50x) as read through the research notes; the notes record that several course pages gave only partial detail, so the fine ordering inside modules is the author's judgment [P].
- Component facts in descriptions (for example "logic-level N-channel MOSFET", "LDO dropout") are standard but were not checked against a datasheet for this document. Item templates must be verified independently.
- The grain (142 skills at about 10 to 55 minutes) is finer than the research report's 40 to 60 "skill nodes"; this is a choice, not a research finding.
- Embedded firmware skills are written against a generic microcontroller; the board choice (RP2350 or ESP32 in the research report) is still the founder's decision (contract section 12) and will change a few item templates, not the graph.
- Physical-world grading (breadboard, scope) relies on `measurement_check` and `human_review`, designed in the project/evidence spec, not here.

---

## Resolved by 00a (v1.1)

| ID | Outcome | Where it landed |
|---|---|---|
| CCR-05-1 (`stub` status) | Accepted | 00a section C and contract 5: skill status values `stub`, `draft`, `verified`, `needs_human_review`, `retired`; a stub is never served and never a prerequisite of a non-stub skill |
| CCR-05-2 (provisional placement credit) | Accepted | 00a B6: `skill_state.source` in (`learned`, `placement`), 14-day frontier grace, `verify` retrievals; the two-day fallback is not used |
| CCR-05-3 (graph file, migration map, extra skill columns, `modules`, `graph_version`) | Accepted | 00a section C (`modules`, `skills.task_kinds`, `grader_types`, `phone_suitable`, `confusable_set`, `sessions.graph_version`, `events.graph_version`). `content/graph-migrations.yaml` is listed as a content object here and is created when the first key is retired |
| CCR-05-4 (tier definition) | Modified | 00a B3 and B5: document 06 section 4.6 is canonical for `tier_attained`; section 3 of this document reads it; project credit is defined in 00a B5 |
| CCR-05-5 (`diagnostic` and `checkpoint` are session-level kinds) | Accepted | 00a A2 and contract 5 |

## Review pass status (engine pass, 31 Oct 2026)

Findings of `00f-design-review.md` that this document now reflects: **F-02** applied as decision G1 (11.3, 6.1; the strict reading is withdrawn); **F-05** recorded (6.1, 6.2: relaxing `min_tier` was considered and not applied; the grace covers placement); **F-06** applied (graph 0.2.0 corrections and ordering, 6.2, rule 13); **F-07** applied as decision G8 (section 2 rule 3, 6.2); **F-11** applied as decision G7 (section 11 now identical to 06 section 5.5: two sittings, constructed response only, 20 items); **F-13** applied (11 confusable sets, 6.2); **F-19** partly (the four skills above 40 minutes are validator warnings and split candidates; the eight skills that looked like two were reworded where the review named a fix: `latch-flipflop`, `i2c-protocol`, `exp-log`; the others are open). Open and not mine: **F-10** (adherence), **F-16** (phone input), **F-17** (checkpoint cost). The hours cross-note in 6.2 now states that skill planning hours (169) and project hours (62.8) are not additive.
