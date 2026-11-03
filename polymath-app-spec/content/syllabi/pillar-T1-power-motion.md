# Pillar Power & motion (T1)

Status: v1.0, 1 Nov 2026. **Spine planning only** — ships after first-walk L1 + go/no-go (doc 15, `00d` §8). Not loaded by v1 `content:sync`. Module plan: `content/syllabi/spine-module-plan.yaml`.

**Track key:** `power-motion` · **Order:** 1 · **Prerequisites:** foundation (first-walk L1 evidenced)

## Competence artifact

Accepted L6 evidence: bench BLDC/ESC + thrust or load measurement with battery safety gates.

## Primary ladder project(s)

L6 — prj.L6.bldc-esc-bench

## Pillar purpose

- Li-ion cell safety, C-rate, charging boundaries (extends elec.semi.battery-safety).
- BLDC motor theory, ESC PWM, thrust/load measurement on bench.
- High-current wiring, connectors, EMC awareness at practical level.
- Propulsion matching intuition for later UAV track.

## Pillar totals [P]

| Node | Skills | Core hours (sum est_minutes) | Modules |
|------|--------|------------------------------|---------|
| `elec` | 7 | 3.6 h | 2 |
| `phys` | 4 | 2.0 h | 1 |
| `pwr` | 29 | 17.8 h | 4 |
| `sw` | 4 | 2.1 h | 1 |
| **Track total** | **44** | **25.4 h** | **8** |

**Table note:** Core hours sum `est_minutes` from this syllabus plan (minimum contact-time sketch). The planning band above includes projects, rework, and review overlap [P].

Planning band (projects/review overlap): **40–80 core skill hours + 8–15 h L6 project [P]**

## Promote from MVP stubs

- `elec.semi.battery-safety`
- `phys.thermal.heat-transfer`

## New module keys (authoring) [P]

- `pwr.batt.li-ion-safe`
- `pwr.bldc.esc`
- `pwr.emc.practical`

## Graders & evidence [P]

measurement_check, numeric, human_review for high-current steps; no flight.

## Boundaries

Bench only until T4; no manned flight.

## Discipline overview

### `elec`

7 skills across modules: `elec.semi.battery-spine`, `elec.pcb`.

### `phys`

4 skills across modules: `phys.thermal`.

### `pwr`

29 skills across modules: `pwr.batt.li-ion-safe`, `pwr.emc.practical`, `pwr.conv`, `pwr.bldc.esc`.

### `sw`

4 skills across modules: `sw.rel`.

## Module syllabi

### `elec.semi.battery-spine` — Battery safety and runtime budget

**Order:** 1 · **Node:** `elec` · **Skills:** 4 · **Core:** ~1.7 h [P]

**Outcomes (after this module):**
- State handling, charging and storage rules before wiring any cell pack.
- Estimate flight or bench runtime from capacity, C-rate and regulator efficiency.

**Evidence path:** Safety ack gates (doc 10); L6 project steps; numeric budget items.
**Projects (ladder touch):** prj.L6.bldc-esc-bench; foundation L2 regulator path
**Checkpoints / assessment:** Scenario MC + numeric budget; battery safety ack before L6 unlock
**Hard task (unaided):** From a datasheet and a duty profile, choose series and parallel count, fuse and wire, then predict endurance within 10% of a logged run.
**Confusable set:** alkaline-vs-lithium, series-parallel-packs
**Template plan [P]:** ~12 templates; rubric_llm on handling scenarios

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `elec.semi.battery-budget` | Battery life budget | L1 | 25 | yes | exact_numeric, multiple_choice | draft |  |
| `elec.semi.battery-safety` | Battery safety | L0 | 20 | yes | multiple_choice, rubric_llm | draft |  |
| `pwr.batt.charge-storage` | Charging profiles and storage state of charge | L1 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `pwr.batt.pack-wiring` | Series/parallel pack wiring and fuse placement | L1 | 30 | yes | multiple_choice, exact_numeric | needs_human_review |  |

### `pwr.batt.li-ion-safe` — Li-ion packs for bench and UAV

**Order:** 2 · **Node:** `pwr` · **Skills:** 7 · **Core:** ~3.2 h [P]

**Outcomes (after this module):**
- Choose cell format and C-rate limits for propulsion vs housekeeping loads.
- Interpret BMS basics and when to stop a test.

**Evidence path:** L6 preflight checklist; measurement reconciliation on pack voltage sag
**Projects (ladder touch):** prj.L6.bldc-esc-bench
**Checkpoints / assessment:** Unaided items on C-rate and thermal runaway literacy
**Hard task (unaided):** Fit R0 and one RC pair from pulse data, then predict sag for an unseen pulse within 5%.
**Confusable set:** nominal-vs-cutoff-voltage
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `pwr.batt.bms-literacy` | BMS on protected packs (optional branch) | L1 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `pwr.batt.c-rate-limits` | C-rate and continuous vs burst current | L1 | 25 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `pwr.batt.cell-formats` | Cell format versus chemistry | L1 | 20 | yes | multiple_choice | needs_human_review |  |
| `pwr.batt.damage-disposal` | Damaged packs, storage and disposal | L1 | 25 | no | multiple_choice, human_review | needs_human_review |  |
| `pwr.batt.equivalent-circuit` | OCV, R0 and RC pack model | L1 | 45 | no | measurement_check, exact_numeric | needs_human_review |  |
| `pwr.batt.high-discharge-packs` | Rules for unprotected high-discharge packs | L1 | 30 | no | multiple_choice, human_review | needs_human_review |  |
| `pwr.batt.preflight-checklist` | Pre-energize inspection for high-current bench | L1 | 20 | no | multiple_choice, human_review | needs_human_review |  |

### `pwr.emc.practical` — Practical EMC for high-current harnesses

**Order:** 3 · **Node:** `pwr` · **Skills:** 5 · **Core:** ~2.4 h [P]

**Outcomes (after this module):**
- Route power and signal grounds; use twisted pairs and ferrites where appropriate.
- Recognize when bench noise invalidates a measurement.

**Evidence path:** Checklist on harness build; optional scope screenshot rubric [P]
**Projects (ladder touch):** prj.L6.bldc-esc-bench; feeds T4 telemetry noise topics
**Checkpoints / assessment:** MC + checklist items
**Hard task (unaided):** Diagnose a seeded noise fault, prove the measurement is valid with a shorted-probe test, then show a before-and-after reduction.
**Confusable set:** ground-loop-vs-shield
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `pwr.emc.connector-current` | Connector and wire gauge for burst current | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `pwr.emc.dc-link-inductance` | Loop area, DC-link inductance and spikes | L1 | 35 | no | exact_numeric, measurement_check | needs_human_review |  |
| `pwr.emc.grounding-harness` | Return paths, loop area and when star ground fits | L1 | 25 | yes | multiple_choice, human_review | needs_human_review |  |
| `pwr.emc.motor-noise` | Motor/ESC noise on sensors and UART | L1 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `pwr.emc.probe-validity` | Prove a noisy measurement is real | L1 | 30 | no | measurement_check, human_review | needs_human_review |  |

### `phys.thermal` — Thermal management for power electronics

**Order:** 4 · **Node:** `phys` · **Skills:** 4 · **Core:** ~2.0 h [P]

**Outcomes (after this module):**
- Use thermal resistance models for regulators, ESCs and motors at literacy depth.
- Relate bench measurements to derating decisions.

**Evidence path:** Compare IR thermometer or thermistor readings to predicted rise [P]
**Projects (ladder touch):** prj.L6.bldc-esc-bench; L2 regulator dissipation (foundation)
**Checkpoints / assessment:** Numeric thermal resistance items
**Hard task (unaided):** Predict the temperature-time curve of an ESC or motor under a step load, then match it within 10 °C.
**Confusable set:** r-theta-ja-vs-jc
**Template plan [P]:** ~8 templates when stub promoted + 4 planned

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `phys.thermal.esc-motor-hotspot` | ESC and motor hotspot awareness | L1 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `phys.thermal.heat-transfer` | Heat transfer for electronics | L1 | 30 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `phys.thermal.heatsink-sizing` | Heatsink and airflow trade-offs | L1 | 30 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `phys.thermal.transients` | Thermal time constants and burst ratings | L1 | 35 | no | exact_numeric, measurement_check | needs_human_review |  |

### `sw.rel` — Firmware reliability

**Order:** 5 · **Node:** `sw` · **Skills:** 4 · **Core:** ~2.1 h [P]

**Outcomes (after this module):**
- Log the reset cause on every boot and survive a crash with evidence.
- Use a watchdog that proves every critical task is alive.
- Handle brown-outs from motor load without corrupting state.

**Evidence path:** Fault-injection log showing a hung task, a brown-out and the recorded reset cause
**Projects (ladder touch):** prj.L6.bldc-esc-bench
**Checkpoints / assessment:** Log verification plus debug cases
**Hard task (unaided):** An outsider injects a hidden hang or brown-out, and you find the cause from logs alone.
**Confusable set:** hardware-vs-task-watchdog, reset-vs-brownout
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sw.rel.brownout` | Brown-out behaviour under motor load | L1 | 30 | no | measurement_check, exact_numeric | needs_human_review |  |
| `sw.rel.crash-capture` | Crash capture that survives a reset | L1 | 35 | no | code_tests, multiple_choice… | needs_human_review |  |
| `sw.rel.reset-causes` | Reset causes and boot logging | L1 | 25 | no | code_tests, multiple_choice… | needs_human_review |  |
| `sw.rel.watchdog-supervisor` | Supervised watchdog for critical tasks | L1 | 35 | no | code_tests, exact_numeric… | needs_human_review |  |

### `pwr.conv` — Power conversion

**Order:** 6 · **Node:** `pwr` · **Skills:** 6 · **Core:** ~4.8 h [P]

**Outcomes (after this module):**
- Design a buck converter from volt-second and charge balance.
- Split MOSFET loss into conduction, switching and dead time.
- Explain what an ESC half-bridge and DC link do.

**Evidence path:** Low-voltage, current-limited synchronous buck with predicted efficiency
**Projects (ladder touch):** prj.L6.bldc-esc-bench
**Checkpoints / assessment:** Unaided design set before the buck lab
**Hard task (unaided):** Closed book, design a buck for a given ripple, predict the loss split, then measure efficiency within 3 points.
**Confusable set:** duty-vs-current, conduction-vs-switching-loss
**Template plan [P]:** ~14 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `pwr.conv.balance-principles` | Volt-second and charge balance | L1 | 45 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `pwr.conv.buck-design` | Buck converter design | L1 | 60 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `pwr.conv.buck-lab` | Build a low-voltage buck and measure efficiency | L1 | 60 | no | measurement_check, human_review | needs_human_review |  |
| `pwr.conv.dc-link` | DC-link ripple and capacitors | L1 | 35 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `pwr.conv.half-bridge-gate-drive` | Half-bridge, dead time and gate drive | L1 | 45 | no | multiple_choice, exact_numeric | needs_human_review |  |
| `pwr.conv.mosfet-losses` | MOSFET conduction and switching loss | L1 | 45 | no | exact_numeric, multiple_choice | needs_human_review |  |

### `pwr.bldc.esc` — BLDC motors and ESC on the bench

**Order:** 7 · **Node:** `pwr` · **Skills:** 11 · **Core:** ~7.3 h [P]

**Outcomes (after this module):**
- Explain BLDC commutation and ESC PWM at working depth.
- Run a motor on a fixture with thrust or load measurement and logged telemetry.

**Evidence path:** L6 accepted evidence — log + measurement_check + human_review on high-current steps
**Projects (ladder touch):** prj.L6.bldc-esc-bench
**Checkpoints / assessment:** Module checkpoint before full L6 credit
**Hard task (unaided):** Given an unlabelled motor, measure R, Kv and I0, then predict current and RPM on a stated prop within 10% before the first loaded run; the no-prop, current-limited spins that give Kv and I0 come first.
**Confusable set:** kv-vs-kt, pwm-vs-duty
**Template plan [P]:** ~16 templates; log parser grader [P] when implemented

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `pwr.bldc.current-sense-amp` | Build and calibrate a shunt current amplifier | L1 | 45 | no | measurement_check, exact_numeric | needs_human_review |  |
| `pwr.bldc.current-sensing-foc` | Current sensing and field-oriented control literacy | L1 | 35 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `pwr.bldc.efficiency-map` | Build a grams-per-watt efficiency map | L1 | 35 | no | measurement_check, exact_numeric | needs_human_review |  |
| `pwr.bldc.esc-modes` | ESC protocols: PWM, DShot and telemetry | L1 | 35 | no | multiple_choice, code_tests… | needs_human_review |  |
| `pwr.bldc.foc-lab` | FOC lab: dq frame and motor identification | L1 | 60 | no | measurement_check, human_review | needs_human_review |  |
| `pwr.bldc.motor-basics` | BLDC poles, KV and mechanical load | L1 | 30 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `pwr.bldc.motor-model` | Predict current and RPM from the motor equations | L1 | 60 | no | exact_numeric, measurement_check | needs_human_review |  |
| `pwr.bldc.phase-vs-battery-current` | Phase current versus battery current | L1 | 30 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `pwr.bldc.prop-matching-intro` | Prop diameter/pitch vs current draw intuition | L1 | 25 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `pwr.bldc.thrust-measurement` | Thrust stand or load cell measurement method | L1 | 40 | no | measurement_check, human_review | needs_human_review |  |
| `pwr.bldc.torque-measurement` | Measure torque and separate motor from prop losses | L1 | 45 | no | measurement_check, exact_numeric | needs_human_review |  |

### `elec.pcb` — High-current PCB layout (spine)

**Order:** 8 · **Node:** `elec` · **Skills:** 3 · **Core:** ~1.9 h [P]

**Outcomes (after this module):**
- Capture schematic with ERC and layout 2–4 layer PDB with correct copper weight [P].
- Bring up PDB with current and thermal checks.

**Evidence path:** L10 repo + photo + measurement_check
**Projects (ladder touch):** prj.L10.pdb-4layer
**Checkpoints / assessment:** ERC/layout checklist before fab order
**Hard task (unaided):** Build a PDB, then predict and measure voltage drop and temperature rise at a defined current.
**Confusable set:** none
**Template plan [P]:** ~12 templates when kicad stub promoted

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `elec.pcb.copper-weight` | Copper weight and via current capacity | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `elec.pcb.kicad-schematic-erc` | KiCad schematic and ERC | L1 | 45 | no | drc_erc, human_review | needs_human_review |  |
| `elec.pcb.pdb-layout` | PDB layout for ESC/motor feeds | L1 | 40 | no | drc_erc, human_review | needs_human_review |  |

## Ladder skill map [P]

| Ladder | Terminal skills / modules |
|--------|---------------------------|
| L6 BLDC bench | `pwr.bldc.motor-model`, `pwr.bldc.esc-modes`, `pwr.bldc.thrust-measurement`, `elec.semi.battery-safety`, `phys.thermal.heat-transfer` |
| L10 PDB (optional cross-track) | `matl.mfg.pcb-fabrication`, high-current layout skills [P] |

## Sequencing notes

- Same pedagogy as foundation: verified templates, strict-unaided checkpoints, project credit caps (contract §7).
- Hardware phases: `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.
- Sketch projects: `content/extended-project-ladder-sketch.yaml`.
- Regenerate this file after editing `spine-module-plan.yaml` or promoting stubs in `mvp-skill-graph.yaml`.
