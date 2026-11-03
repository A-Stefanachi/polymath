# Pillar UAV integration (T4)

Status: v1.0, 1 Nov 2026. **Spine planning only** — ships after first-walk L1 + go/no-go (doc 15, `00d` §8). Not loaded by v1 `content:sync`. Module plan: `content/syllabi/spine-module-plan.yaml`.

**Track key:** `robo` · **Order:** 4 · **Prerequisites:** T1, T2 and the T3 modules (not the L9 build)

## Competence artifact

L8 maiden under checklist; L12 mission slice with geofence/RTL.

## Primary ladder project(s)

L8 prj.L8.kit-quad-maiden; L12 prj.L12.mission-geofence-rtl

## Pillar purpose

- Legal vehicle route first, then assembly and one chosen flight stack (default PX4).
- Real multirotor physics, flight test method and manual recovery.
- Propulsion/weight/CG integration test matrix.
- Companion computer, telemetry, lossy IP.
- EU UAS ops module (default DE/EU) [P].
- Link budget literacy (stub rf.basics.link-budget).

## Pillar totals [P]

| Node | Skills | Core hours (sum est_minutes) | Modules |
|------|--------|------------------------------|---------|
| `net` | 5 | 3.1 h | 1 |
| `robo` | 27 | 18.7 h | 6 |
| `sens` | 2 | 0.9 h | 1 |
| **Track total** | **34** | **22.7 h** | **8** |

**Table note:** Core hours sum `est_minutes` from this syllabus plan (minimum contact-time sketch). The planning band above includes projects, rework, and review overlap [P].

Planning band (projects/review overlap): **60–120 core hours + L8/L12 projects [P]**

## Promote from MVP stubs

- `sens.meas.calibration-uncertainty`
- `net.proto.ip-and-sockets`
- `rf.basics.link-budget`

## New module keys (authoring) [P]

- `robo.uav.physics`
- `robo.uav.propulsion`
- `robo.uav.ops-eu`
- `robo.uav.test`

## Graders & evidence [P]

checklist + log + human_review; flight_line safety acks.

## Boundaries

Integration literacy; not airworthiness certification.

## Discipline overview

### `net`

5 skills across modules: `net.rf`.

### `robo`

27 skills across modules: `robo.uav.ops-eu`, `robo.uav.physics`, `robo.uav.propulsion`, `robo.uav.fc`, `robo.uav.flight-test`, `robo.uav.test`.

### `sens`

2 skills across modules: `sens.meas`.

## Module syllabi

### `robo.uav.ops-eu` — EU UAS operational literacy (default region)

**Order:** 1 · **Node:** `robo` · **Skills:** 6 · **Core:** ~3.8 h [P]

**Outcomes (after this module):**
- Complete ops acknowledgement for DE/EU default rules [P].
- Identify when registration, insurance or geographic restrictions apply.

**Evidence path:** Ops module ack gate (AC-SP-3); scenario MC only — not legal advice
**Projects (ladder touch):** prj.L8.kit-quad-maiden; prj.L12.mission-geofence-rtl
**Checkpoints / assessment:** Scenario set with required ack
**Hard task (unaided):** Given three real sites and two vehicles, decide category, restrictions and paperwork, or say not permitted. Not legal advice.
**Confusable set:** open-vs-specific-category
**Template plan [P]:** ~10 scenario templates; human sign-off on ack

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `robo.uav.ops-airspace` | Airspace and NOTAM literacy | L0 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `robo.uav.ops-eu` | EU UAS category and operator responsibilities | L0 | 60 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `robo.uav.ops-germany` | German duties: insurance, geozones, registration | L1 | 35 | no | multiple_choice, human_review | needs_human_review |  |
| `robo.uav.ops-legal-route` | Legal route for your vehicle: class, private build, A3 | L1 | 45 | no | multiple_choice, human_review | needs_human_review |  |
| `robo.uav.ops-privacy` | Privacy and data from onboard cameras | L0 | 20 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `robo.uav.ops-specific-sora` | Specific category and SORA literacy | L1 | 40 | no | multiple_choice, rubric_llm | needs_human_review |  |

### `robo.uav.physics` — Multirotor physics and weight budget

**Order:** 2 · **Node:** `robo` · **Skills:** 6 · **Core:** ~3.6 h [P]

**Outcomes (after this module):**
- Build a weight/CG budget table linking arms, battery and payload.
- Relate thrust margin to safe hover and climb [P].

**Evidence path:** Numeric budget template; human_review on maiden margin
**Projects (ladder touch):** prj.L8.kit-quad-maiden
**Checkpoints / assessment:** Budget MC + numeric
**Hard task (unaided):** From bench data, predict hover power, throttle and endurance within 10%, then confirm by log.
**Confusable set:** thrust-margin-vs-hover-throttle
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `robo.uav.mixer-allocation` | Mixer, allocation and yaw authority | L1 | 40 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `robo.uav.momentum-theory` | Thrust coefficients, momentum theory, figure of merit | L1 | 50 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `robo.uav.propulsion-match` | Motor/prop/ESC compatibility matrix | L1 | 30 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `robo.uav.rotor-limits` | Rotor drag, ground effect and descent limits | L1 | 40 | no | multiple_choice, exact_numeric… | needs_human_review |  |
| `robo.uav.thrust-margin` | Thrust-to-weight and hover throttle margin | L1 | 25 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `robo.uav.weight-cg-budget` | Weight and CG budget worksheet | L1 | 30 | no | exact_numeric, human_review | needs_human_review |  |

### `robo.uav.propulsion` — Quad propulsion integration

**Order:** 3 · **Node:** `robo` · **Skills:** 3 · **Core:** ~1.5 h [P]

**Outcomes (after this module):**
- Mount motors/props with correct rotation and torque arms.
- Run ground tests before flight line.

**Evidence path:** Checklist + photo evidence on L8
**Projects (ladder touch):** prj.L8.kit-quad-maiden; builds on L6 bench learning
**Checkpoints / assessment:** Pre-maiden checklist sign-off
**Hard task (unaided):** Diagnose seeded motor-order and prop-direction errors from logs and a props-off test.
**Confusable set:** cw-ccw-motor-order
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `robo.uav.esc-calibration-quad` | PWM-only ESC calibration note | L1 | 25 | no | multiple_choice, human_review | needs_human_review |  |
| `robo.uav.ground-test-props-off` | Props-off ground test procedure | L1 | 45 | no | human_review, measurement_check | needs_human_review |  |
| `robo.uav.motor-direction` | Motor rotation and prop pairing | L1 | 20 | no | multiple_choice, human_review | needs_human_review |  |

### `robo.uav.fc` — Flight controller configuration literacy

**Order:** 4 · **Node:** `robo` · **Skills:** 3 · **Core:** ~2.4 h [P]

**Outcomes (after this module):**
- Configure and tune one chosen flight stack (default PX4) at integrator depth.
- Verify sensor orientation and failsafe basics.

**Evidence path:** Config export + checklist on L8
**Projects (ladder touch):** prj.L8.kit-quad-maiden
**Checkpoints / assessment:** FC config quiz + checklist
**Hard task (unaided):** Rebuild a safe configuration from scratch, justify every changed parameter, and pass a seeded-misconfiguration audit.
**Confusable set:** failsafe-severity-order
**Template plan [P]:** ~12 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `robo.uav.failsafe-basics` | Failsafe, RTL and geofence literacy | L1 | 60 | yes | multiple_choice, exact_numeric… | needs_human_review |  |
| `robo.uav.fc-config` | Open FC stack configuration workflow | L1 | 60 | no | human_review, multiple_choice | needs_human_review |  |
| `robo.uav.sensor-orientation` | IMU/magnetometer orientation in FC | L1 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |

### `robo.uav.flight-test` — Flight test and piloting

**Order:** 5 · **Node:** `robo` · **Skills:** 3 · **Core:** ~2.4 h [P]

**Outcomes (after this module):**
- Write test cards with build-up, abort criteria and stop rules.
- Analyse hazards before each new test.
- Recover manually from a failed automatic mode.

**Evidence path:** Test cards plus logged simulator hours and a manual-recovery check, with an outside reviewer where possible
**Projects (ladder touch):** prj.L8.kit-quad-maiden; prj.L12.mission-geofence-rtl
**Checkpoints / assessment:** Manual-recovery check before the maiden
**Hard task (unaided):** Write a test card for your own mission with computed fence margin and stop rules, and pass a manual-recovery check in simulation.
**Confusable set:** test-card-vs-checklist
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `robo.uav.hazard-analysis` | Hazard analysis for a flight test | L1 | 40 | no | multiple_choice, human_review | needs_human_review |  |
| `robo.uav.manual-recovery` | Simulator hours and manual recovery | L1 | 60 | no | measurement_check, human_review | needs_human_review |  |
| `robo.uav.test-cards` | Test cards, build-up and stop rules | L1 | 45 | no | multiple_choice, human_review | needs_human_review |  |

### `robo.uav.test` — Integration test matrix

**Order:** 6 · **Node:** `robo` · **Skills:** 6 · **Core:** ~5.0 h [P]

**Outcomes (after this module):**
- Run propulsion, sensors, failsafe and mission slices in a documented matrix.
- Produce regression notes for golden vehicle config [P].

**Evidence path:** prj.L13.field-test-campaign habits start here; L12 mission evidence
**Projects (ladder touch):** prj.L12.mission-geofence-rtl; prj.L13.field-test-campaign
**Checkpoints / assessment:** Test matrix checklist + human_review
**Hard task (unaided):** Given an unseen flight log with a hidden fault, identify the cause, evidence and fix.
**Confusable set:** none
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `robo.uav.fault-injection` | Fault injection, SITL first | L1 | 60 | no | measurement_check, human_review | needs_human_review |  |
| `robo.uav.log-analysis` | Flight log analysis | L1 | 60 | no | measurement_check, human_review | needs_human_review |  |
| `robo.uav.mission-geofence` | Waypoint mission with geofence and RTL | L1 | 60 | no | human_review, measurement_check | needs_human_review |  |
| `robo.uav.preflight` | Written preflight for maiden and mission flights | L1 | 25 | no | multiple_choice, human_review | needs_human_review |  |
| `robo.uav.sitl-first` | Rehearse missions and failsafes in software-in-the-loop | L1 | 60 | no | measurement_check, human_review | needs_human_review |  |
| `robo.uav.test` | Integration test matrix design | L1 | 35 | no | multiple_choice, human_review… | needs_human_review |  |

### `sens.meas` — Sensor error budgets

**Order:** 7 · **Node:** `sens` · **Skills:** 2 · **Core:** ~0.9 h [P]

**Outcomes (after this module):**
- Combine offset, gain, noise and drift into one error budget.
- Tie budgets to calibration logs from foundation and L7.

**Evidence path:** Error budget template on L8/L12 logs
**Projects (ladder touch):** prj.L8.kit-quad-maiden; prj.L12.mission-geofence-rtl
**Checkpoints / assessment:** Numeric budget submission
**Hard task (unaided):** From a real log, build the error budget, set a mission margin, and defend it.
**Confusable set:** none
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sens.meas.calibration-uncertainty` | Sensor error budgets | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `sens.meas.gps-error-literacy` | GPS horizontal error and mission planning margin | L1 | 25 | yes | exact_numeric, multiple_choice… | needs_human_review |  |

### `net.rf` — Telemetry, IP and link budget

**Order:** 8 · **Node:** `net` · **Skills:** 5 · **Core:** ~3.1 h [P]

**Outcomes (after this module):**
- Set up lossy IP between companion and ground station at literacy depth.
- Read a simple link budget for telemetry radio [P].

**Evidence path:** L11/L12 log connectivity checklist; link budget numeric items
**Projects (ladder touch):** prj.L11.telemetry-lakehouse; prj.L12.mission-geofence-rtl
**Checkpoints / assessment:** MC + numeric link budget
**Hard task (unaided):** Choose a legal radio setup, predict range margin, then log RSSI against the prediction on the ground.
**Confusable set:** tcp-vs-udp-mission
**Template plan [P]:** ~12 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `net.proto.companion-bridge` | Companion computer bridge to FC | L1 | 60 | no | human_review, measurement_check | needs_human_review |  |
| `net.proto.ip-and-sockets` | IP and sockets | L0 | 30 | no | multiple_choice, exact_numeric… | needs_human_review |  |
| `net.proto.telemetry-contract` | Telemetry message contract versioning | L1 | 30 | no | multiple_choice, code_tests… | needs_human_review |  |
| `rf.basics.eu-bands` | EU radio bands, limits and legal setups | L1 | 30 | no | multiple_choice, exact_numeric… | needs_human_review |  |
| `rf.basics.link-budget` | Wireless link basics | L0 | 35 | yes | exact_numeric, multiple_choice… | needs_human_review |  |

## Ladder skill map [P]

| Ladder | Terminal skills / modules |
|--------|---------------------------|
| L8 maiden | `robo.uav.sitl-first`, `robo.uav.fc-config`, `robo.uav.preflight`, `robo.uav.ops-eu` ack |
| L12 mission | `robo.uav.mission-geofence`, `robo.uav.fault-injection`, `robo.uav.log-analysis`, `net.proto.ip-and-sockets`, telemetry contract |

## Sequencing notes

- Same pedagogy as foundation: verified templates, strict-unaided checkpoints, project credit caps (contract §7).
- Hardware phases: `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.
- Sketch projects: `content/extended-project-ladder-sketch.yaml`.
- Regenerate this file after editing `spine-module-plan.yaml` or promoting stubs in `mvp-skill-graph.yaml`.
