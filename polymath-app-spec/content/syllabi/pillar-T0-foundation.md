# Pillar T0 — Foundation (first walk)

Status: v1.0, 1 Nov 2026. **Planning / curriculum; not a contract change.** Track key: `foundation` in `content/capability-tracks.yaml`. Authoritative skill graph: `content/mvp-skill-graph.yaml`. Module plan: `content/syllabi/foundation-module-plan.yaml`. Projects: `content/project-ladder.yaml` L0–L5.

## Pillar purpose

Take one adult from near-zero to **working knowledge (L1)** in **math essentials**, **electronics**, and **embedded software**, evidenced by unaided checkpoints, verified practice, and accepted project evidence through the sensor-logging capstone.

## L1 competence artifact (product display)

- **Capstone path:** L3 I2C sensor + UART log → L4 FSM/ISR device → filtered/calibrated data (doc 05 §6.3).
- **L5 KiCad board** ships late (M5) but is part of the foundation track scope.
- **Strict-unaided** checkpoints and tutor-off weeks when D2/D4 ship (doc 11).

## Pillar totals [P]

| Node | Skills | Core hours (sum est_minutes) | Modules |
|------|--------|------------------------------|---------|
| `math` | 43 | 17.3 h | 6 |
| `elec` | 57 | 27.3 h | 6 |
| `sw` | 42 | 22.5 h | 5 |
| **All foundation** | **142** | **67.2 h** | **17** |


Planning range with reviews/projects overlap: **160–300 h** (doc 05 §6.2).

## Lean slice within this pillar

- **19 skills** in `content/lean-skill-slice.yaml` (mostly `math.alg` + `elec.dc` + safety/measurement roots).
- **~30 verified templates** before go/no-go (BL-0065/0066).
- Remaining modules stay on the map as `draft` until authored.

## Discipline overview

### `math` — Mathematics essentials

43 skills. Modules (meet order): `math.alg`, `math.prob`, `math.trig`, `math.cplx`, `math.calc`, `math.vec`.

### `elec` — Electronics

57 skills. Modules (meet order): `elec.dc`, `elec.meas`, `elec.dig`, `elec.rc`, `elec.semi`, `elec.opamp`.

### `sw` — Software & embedded firmware

42 skills. Modules (meet order): `sw.tools`, `sw.c`, `sw.mem`, `sw.fsm`, `sw.fw`.

## Module syllabi

### `math.alg` — Algebra review

**Order:** 1 · **Node:** `math` · **Skills:** 13 · **Core:** ~3.9 h [P]

**Outcomes (after this module):**
- Rearrange formulas and solve linear equations used in circuit analysis.
- Convert units and use SI prefixes without calculator errors.
- Apply order of operations on expressions with fractions and negatives.

**Evidence path:** Math modules: L1 via unaided checkpoints and constructed-response mastery (doc 05 §3); no bench project step.
**Projects (ladder touch):** none (exempt)
**Checkpoints / assessment:** Module-end unaided checkpoint when D4 ships; lean slice uses retrieval only.
**Hard task (unaided):** From an unseen formula P = V²R/(R+r)², isolate r, check units, and estimate within 10% without a calculator.
**Confusable set:** none
**Template plan [P]:** Lean: 8 skills in slice → ~8–10 templates (BL-0065). Full module: ~13 skills → ~26 templates at 2/skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `math.alg.dimensional-analysis` | Dimensional analysis | L1 | 15 | yes | multiple_choice, exact_numeric |  |
| `math.alg.estimation` | Estimation and sanity checks | L1 | 15 | yes | exact_numeric, multiple_choice |  |
| `math.alg.exp-log` | Exponentials and logarithms | L1 | 35 | yes | symbolic_equivalence, exact_numeric |  |
| `math.alg.exponents-roots` | Exponent and root rules | L1 | 20 | yes | symbolic_equivalence, exact_numeric | yes |
| `math.alg.function-notation` | Function notation | L1 | 15 | yes | symbolic_equivalence, exact_numeric |  |
| `math.alg.linear-functions` | Linear functions and graphs | L1 | 20 | yes | exact_numeric, multiple_choice | yes |
| `math.alg.order-of-operations` | Order of operations | L1 | 10 | yes | exact_numeric, multiple_choice | yes |
| `math.alg.quadratics` | Quadratic equations | L1 | 25 | yes | symbolic_equivalence, exact_numeric | yes |
| `math.alg.ratios-proportions` | Ratios, percent and proportion | L1 | 15 | yes | exact_numeric, multiple_choice | yes |
| `math.alg.rearrange-formulas` | Rearrange formulas | L1 | 15 | yes | symbolic_equivalence, exact_numeric | yes |
| `math.alg.solve-linear` | Solve linear equations | L1 | 15 | yes | symbolic_equivalence, exact_numeric | yes |
| `math.alg.systems-2x2` | Systems of two equations | L1 | 20 | yes | symbolic_equivalence, exact_numeric | yes |
| `math.alg.units-and-prefixes` | Units and SI prefixes | L1 | 15 | yes | exact_numeric, multiple_choice | yes |

### `sw.tools` — Terminal, Git and build tools

**Order:** 2 · **Node:** `sw` · **Skills:** 4 · **Core:** ~1.8 h [P]

**Outcomes (after this module):**
- Use shell, Git, and make to build and flash a minimal C project.
- Read build errors and recover without losing work.

**Evidence path:** Project steps on L0, L1, L5 reference terminal, Git, build-make.
**Projects (ladder touch):** prj.L0.blink-led, prj.L1.divider-rc, prj.L5.kicad (tooling steps)
**Checkpoints / assessment:** Module checkpoint includes Git/make workflow items.
**Hard task (unaided):** Given a repo with a broken shell script and deleted work, use log, diff and restore to recover the work and name the commit that broke the script, with no notes.
**Confusable set:** none
**Template plan [P]:** ~10 templates (MC + short command recognition); code grading deferred to D3.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `sw.tools.build-make` | Build with Make | L1 | 30 | no | code_tests, multiple_choice |  |
| `sw.tools.git-basics` | Git: commit and history | L1 | 30 | no | code_tests, multiple_choice |  |
| `sw.tools.shell-pipes` | Shell pipes and search | L1 | 25 | no | code_tests, multiple_choice |  |
| `sw.tools.terminal-basics` | Terminal basics | L1 | 25 | no | code_tests, multiple_choice |  |

### `elec.dc` — DC circuits

**Order:** 3 · **Node:** `elec` · **Skills:** 11 · **Core:** ~4.8 h [P]

**Outcomes (after this module):**
- Analyze series, parallel, divider, and network circuits numerically and symbolically.
- Apply KVL/KCL, Thevenin/Norton, and loading effects at L1 depth.

**Evidence path:** L0–L2 project steps; multimeter reconciliation with Ohm's law.
**Projects (ladder touch):** L0 blink (divider calc), L1 divider/RC, L2 switch/regulator prerequisites
**Checkpoints / assessment:** Constructed-response numeric/symbolic items.
**Hard task (unaided):** From given voltage readings of an unknown black-box source under two loads, derive its Thevenin model and predict a third load within tolerance.
**Confusable set:** dc-network-methods (Kirchhoff vs nodal vs Thevenin/Norton)
**Template plan [P]:** Lean: 8 skills in slice → ~10 templates (BL-0066). Full: ~11 skills.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `elec.dc.charge-current-voltage` | Charge, current and voltage | L0 | 20 | yes | exact_numeric, multiple_choice… | yes |
| `elec.dc.kirchhoff-laws` | Kirchhoff laws | L1 | 30 | yes | exact_numeric, multiple_choice | yes |
| `elec.dc.loading-effect` | Source loading and output resistance | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `elec.dc.nodal-analysis` | Nodal analysis | L1 | 40 | yes | exact_numeric, multiple_choice | yes |
| `elec.dc.ohms-law` | Ohm law | L1 | 20 | yes | exact_numeric, multiple_choice | yes |
| `elec.dc.power-energy` | Power and energy | L1 | 20 | yes | exact_numeric, multiple_choice | yes |
| `elec.dc.resistor-values` | Resistor values and tolerance | L1 | 20 | yes | multiple_choice, exact_numeric |  |
| `elec.dc.series-parallel` | Series and parallel resistors | L1 | 25 | yes | exact_numeric, multiple_choice | yes |
| `elec.dc.superposition` | Superposition | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.dc.thevenin-norton` | Thevenin and Norton equivalents | L1 | 35 | yes | exact_numeric, multiple_choice | yes |
| `elec.dc.voltage-divider` | Voltage divider | L1 | 25 | yes | exact_numeric, multiple_choice | yes |

### `math.prob` — Probability and uncertainty

**Order:** 4 · **Node:** `math` · **Skills:** 5 · **Core:** ~2.2 h [P]

**Outcomes (after this module):**
- Propagate measurement uncertainty on sums, products, and ratios.
- Use mean and standard deviation to summarise repeat measurements and predict the effect of averaging.

**Evidence path:** Exempt math module; feeds elec.meas.measure-vs-simulate and firmware filtering.
**Projects (ladder touch):** L3 sensor path (indirect)
**Checkpoints / assessment:** Unaided items on uncertainty rules.
**Hard task (unaided):** From a table of 50 given readings, report value and uncertainty, separate systematic from random error, and say what 100 times more samples cannot fix.
**Confusable set:** none
**Template plan [P]:** ~14 templates when module is authored.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `math.prob.averaging-noise` | Averaging and standard error | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `math.prob.expectation` | Random variables and expectation | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `math.prob.measurement-uncertainty` | Measurement uncertainty | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `math.prob.probability-rules` | Probability rules | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `math.prob.variance` | Variance and standard deviation | L1 | 25 | yes | exact_numeric, multiple_choice |  |

### `elec.meas` — Measurement and SPICE basics

**Order:** 5 · **Node:** `elec` · **Skills:** 9 · **Core:** ~4.2 h [P]

**Outcomes (after this module):**
- Use DMM and scope safely; read schematics and datasheets.
- Compare bench measurements to SPICE within stated tolerance.

**Evidence path:** Heavy project coverage L0–L5; lab-safety-esd root skill.
**Projects (ladder touch):** All foundation ladder projects touch measurement skills
**Checkpoints / assessment:** Measurement_check items when D3 ships; numeric compare in lean.
**Hard task (unaided):** From a seeded fault circuit and a misleading capture, identify the measurement artefacts and re-measure correctly.
**Confusable set:** none
**Template plan [P]:** ~18 templates including SPICE-compare (post-D3).

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `elec.meas.breadboard-build` | Build on a breadboard | L1 | 30 | no | measurement_check, multiple_choice… |  |
| `elec.meas.datasheet-reading` | Reading a datasheet | L1 | 25 | yes | multiple_choice, exact_numeric |  |
| `elec.meas.lab-safety-esd` | Lab safety and ESD | L0 | 20 | yes | multiple_choice, rubric_llm | yes |
| `elec.meas.measure-vs-simulate` | Compare measurement with simulation | L1 | 30 | no | measurement_check, multiple_choice… |  |
| `elec.meas.multimeter` | Multimeter measurements | L1 | 30 | no | measurement_check, multiple_choice… |  |
| `elec.meas.oscilloscope` | Oscilloscope measurements | L1 | 40 | no | measurement_check, multiple_choice… |  |
| `elec.meas.schematic-reading` | Reading schematics | L1 | 25 | yes | multiple_choice, exact_numeric | yes |
| `elec.meas.soldering-safety` | Soldering and bench safety | L0 | 20 | yes | multiple_choice, rubric_llm |  |
| `elec.meas.spice-dc` | SPICE DC simulation | L1 | 35 | no | spice_compare, exact_numeric |  |

### `elec.dig` — Digital logic

**Order:** 6 · **Node:** `elec` · **Skills:** 8 · **Core:** ~4.0 h [P]

**Outcomes (after this module):**
- Design combinational logic from spec; understand latches, FSMs, and logic levels.
- Relate gate truth tables to firmware bit operations.

**Evidence path:** L3–L5 project steps for logic and debug.
**Projects (ladder touch):** L3 I2C/UART, L4 FSM device
**Checkpoints / assessment:** MC + symbolic logic items.
**Hard task (unaided):** From a written spec, design a 3-bit FSM, checked by exhaustive next-state equivalence.
**Confusable set:** none
**Template plan [P]:** ~18 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `elec.dig.binary-hex` | Binary, hexadecimal and two's complement | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.dig.combinational-design` | Combinational design | L1 | 35 | yes | multiple_choice, exact_numeric |  |
| `elec.dig.counters-registers` | Registers and counters | L1 | 30 | yes | multiple_choice, exact_numeric |  |
| `elec.dig.fsm-from-spec` | State machines from a spec | L1 | 35 | yes | multiple_choice, exact_numeric |  |
| `elec.dig.gates-truth-tables` | Gates and truth tables | L1 | 25 | yes | multiple_choice, exact_numeric |  |
| `elec.dig.latch-flipflop` | Latches and flip-flops | L1 | 35 | yes | multiple_choice, exact_numeric |  |
| `elec.dig.logic-levels` | Logic levels and noise margin | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `elec.dig.pullups-open-drain` | Pull-ups and open-drain lines | L1 | 25 | yes | exact_numeric, multiple_choice |  |

### `sw.c` — C basics

**Order:** 7 · **Node:** `sw` · **Skills:** 10 · **Core:** ~5.0 h [P]

**Outcomes (after this module):**
- Write structured C: types, control flow, functions, arrays, strings.
- Read and modify small embedded programs.

**Evidence path:** L0, L3, L4, L5 code paths.
**Projects (ladder touch):** Blink, I2C sensor, FSM capstone
**Checkpoints / assessment:** code_tests when D3 enabled; MC read-code in lean.
**Hard task (unaided):** Write a tested bit-field pack and unpack module with no warnings under -Wall -Wextra, passing hidden edge cases and UBSan.
**Confusable set:** none
**Template plan [P]:** ~20 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `sw.c.arrays-strings` | Arrays and strings | L1 | 30 | yes | code_tests, multiple_choice |  |
| `sw.c.bitwise-ops` | Bitwise operations | L1 | 35 | yes | code_tests, multiple_choice |  |
| `sw.c.control-flow` | Control flow | L1 | 30 | yes | code_tests, multiple_choice |  |
| `sw.c.functions` | Functions | L1 | 30 | yes | code_tests, multiple_choice |  |
| `sw.c.headers-macros` | Headers and macros | L1 | 25 | no | code_tests, multiple_choice |  |
| `sw.c.program-structure` | C program structure | L1 | 30 | no | code_tests, multiple_choice |  |
| `sw.c.reading-errors` | Reading errors and bisecting bugs | L1 | 30 | yes | multiple_choice, exact_numeric |  |
| `sw.c.structs-enums` | Structs and enums | L1 | 25 | yes | code_tests, multiple_choice |  |
| `sw.c.types-ints` | Types and fixed-width integers | L1 | 30 | yes | code_tests, multiple_choice |  |
| `sw.c.unit-testing` | Unit testing C code | L1 | 35 | no | code_tests, multiple_choice |  |

### `sw.mem` — Memory and pointers

**Order:** 8 · **Node:** `sw` · **Skills:** 5 · **Core:** ~2.6 h [P]

**Outcomes (after this module):**
- Explain stack vs heap, pointers, and memory-mapped I/O at working depth.
- Use volatile correctly for device registers.

**Evidence path:** L4 ISR/shared-data path.
**Projects (ladder touch):** L4 state machine + UART
**Checkpoints / assessment:** debug_case and code_tests.
**Hard task (unaided):** Given a short C program that corrupts its stack, draw its frames, predict which write overruns which variable, and fix it unaided.
**Confusable set:** value-vs-address
**Template plan [P]:** ~8 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `sw.mem.machine-model` | Machine model: registers, stack and ISR entry | L0 | 35 | yes | multiple_choice, exact_numeric |  |
| `sw.mem.memory-mapped-registers` | Memory-mapped registers and volatile | L1 | 30 | yes | exact_numeric, multiple_choice… |  |
| `sw.mem.memory-model` | Stack, heap and static memory | L1 | 25 | yes | multiple_choice, rubric_llm |  |
| `sw.mem.pointers` | Pointers | L1 | 35 | yes | code_tests, multiple_choice |  |
| `sw.mem.pointers-arrays` | Pointers and arrays | L1 | 30 | yes | code_tests, multiple_choice |  |

### `math.trig` — Trigonometry

**Order:** 9 · **Node:** `math` · **Skills:** 6 · **Core:** ~2.3 h [P]

**Outcomes (after this module):**
- Use sin/cos/tan on right triangles and basic wave parameters.

**Evidence path:** Math exempt; supports RC and AC intuition.
**Projects (ladder touch):** none
**Checkpoints / assessment:** Unaided numeric/symbolic.
**Hard task (unaided):** From a plotted waveform with marked samples, read amplitude, frequency and phase, and predict the next zero crossing.
**Confusable set:** none
**Template plan [P]:** ~12 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `math.trig.angles-radians` | Degrees and radians | L1 | 15 | yes | exact_numeric, multiple_choice |  |
| `math.trig.inverse-trig` | Inverse trigonometric functions | L1 | 20 | yes | exact_numeric, multiple_choice |  |
| `math.trig.right-triangle` | Right-triangle trigonometry | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `math.trig.sinusoid-sum` | Adding sinusoids | L1 | 25 | yes | symbolic_equivalence, exact_numeric |  |
| `math.trig.sinusoids` | Sinusoid amplitude, period and phase | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `math.trig.unit-circle` | The unit circle | L1 | 25 | yes | exact_numeric, multiple_choice |  |

### `math.cplx` — Complex numbers and phasors

**Order:** 10 · **Node:** `math` · **Skills:** 4 · **Core:** ~1.8 h [P]

**Outcomes (after this module):**
- Convert rectangular ↔ polar; multiply/divide complex numbers for impedance.

**Evidence path:** Math exempt.
**Projects (ladder touch):** none
**Checkpoints / assessment:** Symbolic equivalence.
**Hard task (unaided):** Derive the magnitude and phase of 1/(1 + jx) by hand, then use a phasor to predict the output sinusoid at a value of x you were not given in advance.
**Confusable set:** complex-forms
**Template plan [P]:** ~8 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `math.cplx.complex-arithmetic` | Complex arithmetic | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `math.cplx.euler-formula` | Euler formula | L1 | 25 | yes | symbolic_equivalence, exact_numeric |  |
| `math.cplx.phasors` | Phasors | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `math.cplx.polar-form` | Rectangular and polar form | L1 | 25 | yes | exact_numeric, multiple_choice |  |

### `math.calc` — Calculus basics

**Order:** 11 · **Node:** `math` · **Skills:** 8 · **Core:** ~4.1 h [P]

**Outcomes (after this module):**
- Interpret derivatives and integrals for RC exponentials and sensitivity.
- Apply product/chain rules needed for filter analysis.

**Evidence path:** Math exempt; L1 RC project references exp decay.
**Projects (ladder touch):** L1 RC step response
**Checkpoints / assessment:** Constructed response.
**Hard task (unaided):** Solve dy/dt = (u - y)/T for constant u and nonzero y(0), then take one Euler step and show it has the form y += a(u - y).
**Confusable set:** calculus-operations
**Template plan [P]:** ~16 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `math.calc.antiderivatives` | Basic antiderivatives | L1 | 30 | yes | symbolic_equivalence, exact_numeric |  |
| `math.calc.definite-integrals` | Definite integrals | L1 | 30 | yes | symbolic_equivalence, exact_numeric |  |
| `math.calc.derivative-functions` | Derivatives of exp, ln, sin, cos | L1 | 30 | yes | symbolic_equivalence, exact_numeric |  |
| `math.calc.derivative-meaning` | Meaning of the derivative | L1 | 25 | yes | multiple_choice, rubric_llm |  |
| `math.calc.derivative-rules` | Derivative rules | L1 | 35 | yes | symbolic_equivalence, exact_numeric |  |
| `math.calc.exp-growth-decay` | Exponential growth and decay | L1 | 40 | yes | symbolic_equivalence, exact_numeric |  |
| `math.calc.integral-meaning` | Meaning of the integral | L1 | 25 | yes | multiple_choice, rubric_llm |  |
| `math.calc.numerical-methods` | Finite differences and trapezoids | L1 | 30 | no | code_tests, multiple_choice |  |

### `elec.rc` — Capacitors and RC filters

**Order:** 12 · **Node:** `elec` · **Skills:** 11 · **Core:** ~6.0 h [P]

**Outcomes (after this module):**
- Predict RC time constants, step response, and simple filter behaviour.
- Run and compare SPICE netlists for RC circuits.

**Evidence path:** L1–L2 projects; filter-bench skill.
**Projects (ladder touch):** L1 divider/RC, L2 switch
**Checkpoints / assessment:** SPICE + numeric (D3).
**Hard task (unaided):** Identify R and C in a sealed filter from step and sweep measurements alone, with uncertainty.
**Confusable set:** rc-filter-type
**Template plan [P]:** ~20 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `elec.rc.bode-db` | Decibels and Bode plots | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.rc.capacitor-basics` | Capacitor basics | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.rc.decoupling-return` | Decoupling and return paths | L1 | 30 | yes | multiple_choice, exact_numeric |  |
| `elec.rc.filter-bench` | Measure a filter on the bench | L1 | 40 | no | measurement_check, multiple_choice… |  |
| `elec.rc.impedance` | Reactance and impedance | L1 | 35 | yes | exact_numeric, multiple_choice |  |
| `elec.rc.inductor-basics` | Inductor basics | L0 | 25 | yes | multiple_choice, rubric_llm |  |
| `elec.rc.rc-highpass` | RC high-pass filter | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.rc.rc-lowpass` | RC low-pass filter | L1 | 40 | yes | exact_numeric, multiple_choice |  |
| `elec.rc.rc-step-response` | RC step response | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.rc.rc-time-constant` | RC time constant | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.rc.spice-rc` | SPICE transient and AC runs | L1 | 40 | no | spice_compare, exact_numeric |  |

### `elec.semi` — Diodes, transistor switches, regulators

**Order:** 13 · **Node:** `elec` · **Skills:** 11 · **Core:** ~4.8 h [P]

**Outcomes (after this module):**
- Size LED current, use BJT/MOSFET switches, and linear regulators safely.
- Diagnose simple semiconductor failures on the bench.

**Evidence path:** L0, L2 projects; battery-safety gates.
**Projects (ladder touch):** L0 blink, L2 transistor/regulator
**Checkpoints / assessment:** Numeric + measurement.
**Hard task (unaided):** Choose and justify a 3.3 V-driven load switch from real datasheets for a 1 A inductive load, including dissipation, then predict bench Vds.
**Confusable set:** transistor-switches, regulator-types
**Template plan [P]:** ~16 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `elec.semi.battery-budget` | Battery life budget | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `elec.semi.battery-safety` | Battery safety | L0 | 20 | yes | multiple_choice, rubric_llm |  |
| `elec.semi.bjt-switch` | Transistor as a switch (BJT) | L1 | 35 | yes | exact_numeric, multiple_choice |  |
| `elec.semi.diode-circuits` | Diode circuits | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.semi.diode-concept` | Diode concept | L0 | 20 | yes | multiple_choice, rubric_llm |  |
| `elec.semi.inductive-load` | Switching inductive loads | L1 | 25 | yes | multiple_choice, rubric_llm |  |
| `elec.semi.led-current-limit` | LED current-limiting resistor | L1 | 20 | yes | exact_numeric, multiple_choice |  |
| `elec.semi.linear-regulator` | Linear regulator | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.semi.mosfet-switch` | MOSFET switch | L1 | 35 | yes | exact_numeric, multiple_choice |  |
| `elec.semi.regulator-dissipation` | Regulator power dissipation | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `elec.semi.switching-regulator` | Switching regulator idea | L0 | 20 | yes | multiple_choice, rubric_llm |  |

### `sw.fsm` — State machines in code

**Order:** 14 · **Node:** `sw` · **Skills:** 5 · **Core:** ~2.7 h [P]

**Outcomes (after this module):**
- Implement table-driven and event-driven state machines in C.
- Test FSM timing and non-blocking behaviour.

**Evidence path:** L3–L4 projects.
**Projects (ladder touch):** L4 capstone FSM
**Checkpoints / assessment:** code_tests + debug_case.
**Hard task (unaided):** Add one new state to an unfamiliar FSM from a spec change, preserving hidden timing tests.
**Confusable set:** fsm-styles
**Template plan [P]:** ~8 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `sw.fsm.fsm-testing` | Testing a state machine | L1 | 30 | no | code_tests, multiple_choice |  |
| `sw.fsm.function-pointers` | Function pointers | L1 | 30 | no | code_tests, multiple_choice |  |
| `sw.fsm.nonblocking-timing` | Non-blocking timing | L1 | 30 | yes | code_tests, multiple_choice |  |
| `sw.fsm.switch-fsm` | State machine in C | L1 | 35 | yes | code_tests, multiple_choice |  |
| `sw.fsm.table-driven` | Table-driven state machine | L1 | 35 | no | code_tests, multiple_choice |  |

### `elec.opamp` — Op-amp basics

**Order:** 15 · **Node:** `elec` · **Skills:** 7 · **Core:** ~3.5 h [P]

**Outcomes (after this module):**
- Configure inverting/non-inverting amps, comparators, and summing stages for sensors.

**Evidence path:** Exempt v1 from module project gate (00a E2); checkpoints only.
**Projects (ladder touch):** none in v1
**Checkpoints / assessment:** Primary L1 evidence path for this module.
**Hard task (unaided):** Design a single-supply stage mapping a sensor's real range onto 0–3 V, choose a real part, and name from its datasheet which limit is hit first.
**Confusable set:** opamp-configurations
**Template plan [P]:** ~12 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `elec.opamp.comparator` | Comparator with hysteresis | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.opamp.ideal-rules` | Ideal op-amp rules | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.opamp.inverting` | Inverting amplifier | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.opamp.noninverting` | Non-inverting amplifier and buffer | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `elec.opamp.real-limits` | Real op-amp limits | L0 | 25 | yes | multiple_choice, rubric_llm |  |
| `elec.opamp.sensor-conditioning` | Scaling a sensor to an ADC range | L1 | 35 | yes | exact_numeric, multiple_choice |  |
| `elec.opamp.summing-level-shift` | Summing and level-shift amplifier | L1 | 30 | yes | exact_numeric, multiple_choice |  |

### `sw.fw` — Firmware: I/O, interrupts, buses, filtering

**Order:** 16 · **Node:** `sw` · **Skills:** 18 · **Core:** ~10.4 h [P]

**Outcomes (after this module):**
- Drive GPIO, timers, ADC, I2C, UART; ISRs, debounce, filters, calibration.
- Integrate sensor read → filter → log on a real MCU.

**Evidence path:** All projects L0–L5; capstone sensor path.
**Projects (ladder touch):** Full ladder
**Checkpoints / assessment:** code_tests, measurement, debug.
**Hard task (unaided):** With a fresh sensor datasheet and no walkthrough, bring up a driver, report an unplugged bus as a failed transfer without hanging, log at a fixed rate with measured jitter, and justify the rate against aliasing.
**Confusable set:** serial-protocols (I2C vs UART)
**Template plan [P]:** ~28 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `sw.fw.adc-scaling` | ADC reading and scaling | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `sw.fw.debounce` | Debouncing | L1 | 35 | no | code_tests, multiple_choice |  |
| `sw.fw.exponential-filter` | Exponential smoothing filter | L1 | 35 | no | code_tests, multiple_choice |  |
| `sw.fw.gdb-swd` | Debug with GDB over SWD | L1 | 40 | no | multiple_choice, measurement_check |  |
| `sw.fw.gpio-input` | GPIO input | L1 | 30 | no | measurement_check, multiple_choice… |  |
| `sw.fw.gpio-output` | GPIO output | L1 | 30 | no | measurement_check, multiple_choice… |  |
| `sw.fw.i2c-protocol` | I2C protocol | L1 | 40 | yes | multiple_choice, rubric_llm |  |
| `sw.fw.i2c-sensor-read` | Reading an I2C sensor | L1 | 40 | no | code_tests, multiple_choice |  |
| `sw.fw.isr-basics` | Interrupts and ISRs | L1 | 40 | no | code_tests, multiple_choice |  |
| `sw.fw.isr-shared-data` | Sharing data with an ISR | L1 | 35 | no | multiple_choice, exact_numeric |  |
| `sw.fw.logic-analyzer` | Decoding buses with a logic analyzer | L1 | 40 | no | measurement_check, multiple_choice… |  |
| `sw.fw.moving-average` | Moving-average filter | L1 | 35 | no | code_tests, multiple_choice |  |
| `sw.fw.pwm` | PWM | L1 | 30 | no | exact_numeric, multiple_choice |  |
| `sw.fw.sampling-rate` | Sample rate and aliasing | L1 | 35 | yes | exact_numeric, multiple_choice |  |
| `sw.fw.sensor-calibration` | Sensor calibration | L1 | 35 | no | code_tests, multiple_choice |  |
| `sw.fw.timers-tick` | Hardware timers and the system tick | L1 | 35 | no | exact_numeric, multiple_choice |  |
| `sw.fw.uart-framing` | UART framing and baud rate | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `sw.fw.uart-logging` | UART and logging | L1 | 35 | no | code_tests, multiple_choice |  |

### `math.vec` — Vectors and matrices

**Order:** 17 · **Node:** `math` · **Skills:** 7 · **Core:** ~3.0 h [P]

**Outcomes (after this module):**
- Solve linear systems in matrix form and use the dot product for angles and projections.

**Evidence path:** Math exempt; stub promotion for physics/control.
**Projects (ladder touch):** none
**Checkpoints / assessment:** Numeric/symbolic.
**Hard task (unaided):** Fit gain and offset to noisy calibration data in code, using the normal equations as given, and report the residuals.
**Confusable set:** none
**Template plan [P]:** ~14 templates.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|
| `math.vec.det-inverse` | Determinant and inverse | L1 | 20 | yes | exact_numeric, multiple_choice |  |
| `math.vec.dot-product` | Dot product | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `math.vec.least-squares` | Least-squares line fit | L1 | 30 | yes | exact_numeric, multiple_choice |  |
| `math.vec.linear-systems` | Linear systems as Ax = b | L1 | 35 | yes | exact_numeric, multiple_choice |  |
| `math.vec.matrix-basics` | Matrix basics | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `math.vec.matrix-vector` | Matrix-vector products | L1 | 25 | yes | exact_numeric, multiple_choice |  |
| `math.vec.vector-basics` | Vector basics | L1 | 20 | yes | exact_numeric, multiple_choice |  |

### `pwr.batt` — Battery safety and runtime budget

**Order:** 18 · **Node:** `pwr` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `pwr.emc` — Practical EMC for high-current harnesses

**Order:** 19 · **Node:** `pwr` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sw.rel` — Firmware reliability

**Order:** 20 · **Node:** `sw` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `pwr.conv` — Power conversion

**Order:** 21 · **Node:** `pwr` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `pwr.bldc` — BLDC motors and ESC on the bench

**Order:** 22 · **Node:** `pwr` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `phys.thermal` — Thermal management for power electronics

**Order:** 23 · **Node:** `phys` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `elec.pcb` — High-current PCB layout (spine)

**Order:** 24 · **Node:** `elec` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `mech.cad` — Parametric CAD workflow

**Order:** 25 · **Node:** `mech` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `mech.draw` — Engineering drawings and tolerancing

**Order:** 26 · **Node:** `mech` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `mech.struct` — Structures and vibration

**Order:** 27 · **Node:** `mech` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `matl.select` — Materials selection

**Order:** 28 · **Node:** `matl` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `matl.print` — Fabrication processes

**Order:** 29 · **Node:** `matl` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `mech.tol` — Tolerances and fit

**Order:** 30 · **Node:** `mech` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `matl.mfg` — Fabrication processes

**Order:** 31 · **Node:** `matl` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `phys.mech` — Mechanics foundation for control

**Order:** 32 · **Node:** `phys` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ctl.sys` — Dynamic systems mathematics

**Order:** 33 · **Node:** `ctl` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sig.freq` — Frequency-domain intuition

**Order:** 34 · **Node:** `sig` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sig.sampling` — Sampling, aliasing and digital filters

**Order:** 35 · **Node:** `sig` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sig.imu` — IMU frames and calibration

**Order:** 36 · **Node:** `sig` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ctl.pid` — PID control

**Order:** 37 · **Node:** `ctl` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ctl.est` — Complementary filter and estimation literacy

**Order:** 38 · **Node:** `ctl` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ctl.adv` — Advanced control and estimation (L2)

**Order:** 39 · **Node:** `ctl` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sens.meas` — Sensor error budgets

**Order:** 40 · **Node:** `sens` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `robo.uav` — EU UAS operational literacy (default region)

**Order:** 41 · **Node:** `robo` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `net.proto` — Telemetry, IP and link budget

**Order:** 42 · **Node:** `net` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `rf.basics` — Telemetry, IP and link budget

**Order:** 43 · **Node:** `rf` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sys.req` — Requirements and verification

**Order:** 44 · **Node:** `sys` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sys.telemetry` — Edge-to-cloud telemetry contracts

**Order:** 45 · **Node:** `sys` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sw.cloud` — Cloud integration patterns (extend `sw`)

**Order:** 46 · **Node:** `sw` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ml.core` — ML foundations for telemetry

**Order:** 47 · **Node:** `ml` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sys.twin` — Digital twin modelling

**Order:** 48 · **Node:** `sys` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ml.pred` — Prognostics and anomaly detection

**Order:** 49 · **Node:** `ml` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ml.ops` — Production ML ops literacy

**Order:** 50 · **Node:** `ml` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ml.edge` — Edge inference and quantization

**Order:** 51 · **Node:** `ml` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `ml.llm` — Production LLM systems

**Order:** 52 · **Node:** `ml` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `prof.law` — Export-control literacy

**Order:** 53 · **Node:** `prof` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `def.export` — Export control scenarios

**Order:** 54 · **Node:** `def` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sec.hw` — Embedded threat modelling

**Order:** 55 · **Node:** `sec` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `sec.ot` — OT zones and cloud backhaul

**Order:** 56 · **Node:** `sec` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `prof.integrator` — Defense integrator documentation

**Order:** 57 · **Node:** `prof` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `econ.cost` — Programme economics

**Order:** 58 · **Node:** `econ` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `prof.data` — Data and AI law

**Order:** 59 · **Node:** `prof` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

### `prof.eu` — EU product compliance

**Order:** 60 · **Node:** `prof` · **Skills:** 0 · **Core:** ~0.0 h [P]

**Outcomes (after this module):**
- (Authoring pending — apply doc 05 §10 checklist.)

**Evidence path:** See doc 10 §8.3.
**Projects (ladder touch):** —
**Checkpoints / assessment:** Module-end unaided checkpoint (D4).
**Confusable set:** none
**Template plan [P]:** ~2 verified templates per gated skill.

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Lean |
|-----------|-------|------|-----|-------|---------|------|

## Capstone skill map (doc 05 §6.3)

| Ladder | Terminal skills |
|--------|-----------------|
| L0 blink | `elec.semi.led-current-limit`, `sw.fw.gpio-output`, `elec.meas.breadboard-build` |
| L1 RC/divider | `elec.rc.filter-bench`, `elec.rc.spice-rc`, `elec.meas.measure-vs-simulate` |
| L2 switch/reg | `elec.semi.mosfet-switch`, `elec.semi.regulator-dissipation`, `elec.semi.inductive-load` |
| L3 sensor | `sw.fw.i2c-sensor-read`, `sw.fw.uart-logging`, `sw.fw.logic-analyzer`, `sw.fsm.nonblocking-timing` |
| L4 FSM/ISR | `sw.fsm.fsm-testing`, `sw.fw.isr-shared-data`, `sw.fw.debounce` |
| L5 filter/cal | `sw.fw.exponential-filter`, `sw.fw.moving-average`, `sw.fw.sensor-calibration` |
| L5 KiCad | `elec.pcb.kicad-schematic-erc` (stub until promoted) |
