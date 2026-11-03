# 15 — Cyber-physical capability spine (long-term product direction)

Status: v1.0, 1 Nov 2026. Owner: product. **Planning document, not a contract change.** It adds no enum, table, route or lean-slice task. Binding rules remain `00-contract.md` and `00a-change-decisions.md`. The lean slice, milestones M0–M1 and deferred groups D1–D9 are unchanged.

Companion: `docs/16-capability-outcomes.md` (what the founder can credibly do after the spine). Machine-readable track list: `content/capability-tracks.yaml`. Project ladder sketch: `content/extended-project-ladder-sketch.yaml`. **Hardware and tools:** `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.

Evidence tags as in the contract. Hour and skill-count figures are **[P]** until measured.

---

## 1. Purpose

The founder’s long-term intent is to become a **solo cyber-physical systems engineer**: build real hardware and firmware, connect it to secure cloud and production AI, and work credibly on **dual-use–adjacent** and **defense-industrial** integration—without claiming clearance, export licensing authority, or weapons design competence.

Polymath v1 remains the **foundation walk** (first-walk L1 in `math`, `elec`, `sw`, project ladder L0–L5). This document defines the **next product spine**: curriculum tracks, ladder rungs L6–L13, graders and UX to add later, and hard content boundaries.

---

## 2. Five outcome areas (founder goals)

| ID | Goal | What Polymath must teach (engineering + literacy) | What Polymath must not teach |
|---|---|---|---|
| G-F1 | **Build dual-use technology** | Product decomposition; EU Annex I category literacy [P]; classification **workflow** with counsel; crypto/infosec embedded in products; technical file habits | Legal classification outcomes; evasion; munitions or EW design |
| G-F2 | **Work on defense tech** | Secure integration, OT/embedded hardening, test evidence, supply-chain/SBOM narrative, architecture for integrators and primes | Classified program content; weapon lethality labs |
| G-F3 | **Work on AI projects** | Production ML/MLOps, LLM apps (RAG, agents, evals, guardrails), edge inference basics | Unverified “AI improves learning” claims (NG-07) |
| G-F4 | **Work on cybersecurity projects** | Cloud security (extend founder strength), OT/ICS foundation [R/V frameworks], embedded threat modelling | Unauthorized offensive operations |
| G-F5 | **Build real things** | Bench → PCB → CAD assembly → field test → documented V&V | Simulation-only L1 (NG-10) |

These goals share one stack (see `16-capability-outcomes.md` §2). The founder’s existing cloud/data profile covers much of G-F3 and the IT half of G-F4; this spine closes the **physical** and **OT/embedded** gaps.

---

## 3. Learning tracks (package order)

Tracks ship **after** first-walk L1 is evidenced and the go/no-go (00d §8) passes. Order is risk-reducing: foundation already in v1, then power and motion, then control, mechanical, integration, cloud twin, governance.

| Track | Key | Nodes (primary) | Ladder anchor | Competence artifact (L1 display) [P] |
|---|---|---|---|---|
| T0 Foundation | `foundation` | `math`, `elec`, `sw` | L0–L5 | Capstone sensor path + unaided checkpoints (existing) |
| T1 Power & motion | `power-motion` | `pwr`, extend `elec` | L6 | Accepted L6 evidence: bench BLDC/ESC + thrust or load measurement |
| T2 Control & estimation | `control` | `ctl`, `sig`, `phys` | L7 | Accepted L7: ground IMU logger + attitude plot + calibration log + closed-loop rig response against prediction |
| T3 Mechanical | `mechanical` | `mech`, `matl` | L9 | Accepted L9: drawing + CAD assembly + fab fit + predicted vs measured deflection and first mode |
| T4 UAV integration | `robo` | `robo`, `sens`, `net`, `rf` | L8, L12 | Accepted L8: configured open FC maiden under checklist; L12: mission slice with geofence/RTL |
| T5 Cloud twin | `cloud-twin` | `sys`, `ml`, `sw` | L11 | Accepted L11: device telemetry → lakehouse schema + replay + validated twin with state estimation, an uncertainty-based residual alert and one human-approved decision |
| T6 Governance | `governance` | `def`, `prof`, `sec`, `econ` | (modules) | Module checkpoints: export scenario set + own-design classification memo + device threat model + CRA and CE applicability map |

Default vehicle path: **multirotor first**, **EU UAS operational rules** as the default ops module [P] (founder in DE/EU).

Details and stub-promotion list: `content/capability-tracks.yaml`.

---

## 4. Knowledge inventory (summary)

Full research notes live in chat and external frameworks (ISAGCA OT, EU 2021/821, ASSETs+ blueprint, MLOps stack)—not duplicated here. The spine adds these **domains** beyond the MVP graph:

1. **Math & physics:** rigid-body kinematics, linear/state-space intuition, discrete control, battery and prop models, uncertainty.
2. **Power:** Li-ion safety, BLDC/ESC, high-current harnessing, EMC awareness.
3. **Embedded at scale:** RTOS, motor PWM, fusion consumption/tuning, autopilot architecture literacy (PX4/ArduPilot/Betaflight as systems), SITL/HIL intro.
4. **Control:** PID cascades, anti-windup, complementary filter → EKF usage, blackbox tuning workflow.
5. **Mechanical:** parametric CAD, tolerances, airframe integration, DFM for print/CNC.
6. **Robotics/UAV:** propulsion matching, weight/CG budget, integration test matrix, GCS/telemetry contracts.
7. **Networking/RF:** link budget literacy, lossy IP on companion computers.
8. **Systems:** requirements ↔ V&V matrix, ICDs, golden vehicle/build discipline.
9. **Security:** secure boot, signing, SBOM; OT zones/conduits with cloud backhaul.
10. **AI production & edge:** evals, monitoring, quantization/latency on device.
11. **Governance:** export-control and UAS ops literacy; ethics boundaries.

**Promote from MVP stubs** (to `draft` when authored): `phys.*`, `sig.*`, `ctl.pid.*`, `sens.meas.*`, `net.proto.*`, `sec.hw.*`, `mech.cad.*`, `matl.mfg.*`, `ml.*`, `sys.req.*`, `prof.law.export-control-literacy`, `econ.cost.*`, `rf.basics.*`.

**New nodes** (graph minor version bump when added): `robo`, expanded `pwr`, `mech`, `ctl` modules as in `capability-tracks.yaml`. Scale **[P]**: +150–300 skills and dozens of project steps over years—not in v1 graph.

---

## 5. Project ladder extension (L6–L13)

Authoritative sketch: `content/extended-project-ladder-sketch.yaml`. Doc 10 §4 table aligns with these keys.

| Level | Project key | One-line | Tier gate |
|---|---|---|---|
| L6 | `prj.L6.bldc-esc-bench` | BLDC + ESC on bench; thrust/load; battery safety gates | L1 |
| L7 | `prj.L7.imu-ground-logger` | IMU calibration, fusion, ground-only attitude logging, PID on a clamped one-axis rig | L1 |
| L8 | `prj.L8.kit-quad-maiden` | Legal route first (00a H9); assemble privately built or class-marked quad; PX4 config; maiden under test card | L1 |
| L9 | `prj.L9.custom-frame-cad` | Custom frame CAD → print/CNC → fit on L8 electronics | L1 |
| L10 | `prj.L10.pdb-4layer` | Power distribution / 4-layer PCB; high-current layout | L1 |
| L11 | `prj.L11.telemetry-lakehouse` | Companion or edge telemetry → secure cloud pipeline + replay + twin residual alert | L1 |
| L12 | `prj.L12.mission-geofence-rtl` | GPS waypoint slice; geofence; RTL on PX4/ArduPilot class stack | L1 |
| L13 | `prj.L13.field-test-campaign` | Field test matrix; golden vehicle doc; regression habit | L1 |

L6–L13 are **not specified** at L0–L5 step granularity in v1.0 of this document; golden builds and BOMs follow the same evidence philosophy as doc 10.

---

## 6. Product changes when tracks ship (deferred epics)

These are **not** lean-slice work. Group as expansion epics E-CPS-1… after D7/D9 as appropriate.

| Area | Change [P] |
|---|---|
| **PRD / NG** | NG-05: v1 *ships* the first walk only; tracks in §3 ship incrementally. NG-06: allow governance/defense-**integration** literacy; still no weapon/EW enablement. NG-03: allow **CAD evidence** (STEP/STL + checklist + human review); FEA remains human-reviewed L2 only. |
| **Contract enums** | Optional later CCR: extend `context` (e.g. workshop, flight line) and `session_type` (field work uses `lab` until a CCR adds values); new grader kinds for log/CAD manifests—only when implementing. |
| **Graders** | Log/blackbox numeric checks; CAD manifest checklist; optional PX4 SITL smoke job (heavy). |
| **UX (09)** | Vehicle project view, test card, CAD revision, EU UAS checklist, BOM cost. |
| **Content** | Templates for link budget, weight budget, PID step response, export **scenario** MC/short answer (not legal advice). |

---

## 7. Acceptance criteria (EARS, spine-level)

- **AC-SP-1:** When the founder has first-walk L1 evidenced, the app **shall** show track T0 complete and T1–T6 as locked or available per prerequisites in `capability-tracks.yaml`.
- **AC-SP-2:** When a track module is promoted from `stub` to `verified`, the **shall** use the same mastery, checkpoint and strict-unaided rules as the MVP (contract §7, doc 02).
- **AC-SP-3:** When content touches batteries above v1 S9 rules or flight line, the app **shall** require the relevant safety module acknowledgement before serving project steps (extend doc 10 safety briefs).
- **AC-SP-4:** When a learning item covers export or defense topics, it **shall** be tagged governance-only and **shall not** include step-by-step weapon, munitions or EW construction.
- **AC-SP-5:** When the founder completes L11, the **shall** exist accepted evidence linking a physical device run to a reproducible cloud dataset schema (artifact for G-F5 + G-F3).

---

## 8. Non-goals (spine)

- Replacing lawyers on export licensing or national controls.
- Cleared/classified curriculum.
- Certifying airworthiness or medical devices.
- Promising calendar time to “one-man army” (no new SM targets without doc 11 evidence).
- Adding spine content to the lean slice or M0–M1 demo.

---

## 9. Open questions

| ID | Question | Default |
|---|---|---|
| OQ-SP-1 | Fixed-wing parallel track after multirotor? | Multirotor only until L8 accepted |
| OQ-SP-2 | FreeCAD vs Fusion as canonical CAD tool | Founder choice; grader is format + checklist |
| OQ-SP-3 | Which cloud stack is canonical for L11 | Azure/Databricks (founder profile) [inf] |

---

## 10. Cross-references

- Outcomes narrative: `16-capability-outcomes.md`
- MVP graph stubs: doc 05 section 6.4
- Ladder L0–L5: `10-build-projects-and-verification-spec.md` §4
- Lean slice boundary: `00d-lean-slice-plan.md` §2
