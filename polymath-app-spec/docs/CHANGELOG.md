# Specification and build decisions log

Record go/no-go outcomes, lean-gate releases, and scope-down choices here before starting deferred backlog groups (D1–D9). Format: date, decision, evidence (metrics or task ids), next three tasks.

---

<!-- Entries appear newest first. -->

## 2026-11-03: research pass on the needs_human_review skills

Decision: at the founder's request, agents researched the open checks and founder items for all 247 T1 to T6 and bridge skills against primary sources (00a H19, H20). The reports are in `content/syllabi/skill-specs/reviews/human-review-T*-2026-11-03.md`. No skill is `verified`.

- OPEN-CHECKS: 151 flags down to 11. `build_open_checks.py` no longer flags ordinary words such as "uncertainty".
- Safety: the L6 and L7 briefs are now `2026-11-03-1`. Changes: rotating parts, fire response, a flywheel guard and 1 J cap, stall limits, and a ban on gain-to-oscillation tests.
- Corrections:
  - 6061-T6 extrusion minimum Sut is 262 MPa, used in the fatigue check.
  - DC-link capacitance is sized by charge balance.
  - The PX4 anti-alias filter description and the gyro-calibration method are fixed.
  - The NASA-STD-7009B factors, § 9 AWV scope and product-liability dates are fixed.
- Lab bands: beam and tap test now calibrate the clamp, and both pass at 1.00 in simulation.
- Graph: seven UAV `est_minutes` raised, capped at the 60-minute schema limit. `robo.uav.manual-recovery`, `fc-config` and `sitl-first` are candidates to split. The `prof.eu.product-liability` description now says "from 9 Dec 2026".
- Still open: the LBA letter (ready to send in the T4 report), two vendor PDFs, paid standards (ISO 8015, ISO 286-2, ASME Y14.5, IPC-2221, VDI 2230, Shigley 11th Table 6-2), counsel questions in the T6 report, stopwatch runs, and founder sign-off on project conventions.

## 2026-11-02: final spec gaps

Decision: applied the founder's rule to research when unsure and implement best practice. H15 is accepted: FSRS guidance supports counting one review per day. Added H16 (tutor reports), H17 (FR-113 is a CLI), H18 (00d additions go through 00a).

- `is_service_role()` also checks `current_user`, because secret keys are not JWTs. Still to confirm on staging.
- L1#s05 no longer lists firmware skills, because the learner only flashes starter code.
- Spine skills without a calculus prerequisite were reviewed and left as they are: they use closed forms and working-level estimates, not derivations.

## 2026-11-02: bridge skills

Decision: added nine bridge skills in T2 and T5 (00a H14). Graph 0.9.0: 142 draft, 247 needs_human_review, 4 stubs.

## 2026-11-02: weakest points addressed

Decision: curated prerequisites into graph 0.8.0 (00a H13), synced spec metadata, added `OPEN-CHECKS.md`, `lab-band-checks`, and read the Recommendation 2019/1318 annex and other official legal text.

## 2026-11-02: T1 to T6 skills expanded

Decision: all 238 T1 to T6 skills are authored, with specs in `content/syllabi/skill-specs/` (00a H12). Graph 0.7.0: 142 draft, 238 needs_human_review, 7 stubs. None is verified.

## 2026-11-02: syllabus review applied

Decision: applied the ranked changes in `SYLLABUS-REVIEW-2026-11-02.md`, with decisions 00a H8 to H11. This does change the first walk: six skill swaps, still 142 skills, lean slice unchanged.

- All 65 modules now have an unaided hard task.
- T1 power conversion, T2 loop analysis and an L2 advanced module, T3 drawings and materials, T4 real physics and flight test, T5 validated twin and data SLOs, T6 export, data and AI law.
- `elec.pcb` moved to T1. T1, T3, T4 and T5 were reordered.

## 2026-11-02: remaining syllabus gaps, researched first

Decision: added 14 stubs (graph 0.5.0: 142 real plus 158 stubs). The first walk and lean slice are unchanged.

- T1: new `sw.rel` firmware reliability module, a shunt current amplifier as op-amp bench proof, and high-discharge pack skills, with a draft L6 safety brief (00a H6).
- T5: new `ml.pred` module on baselines, honest anomaly evaluation, physics residuals and remaining useful life.
- T6: stop and escalate drill, a threat model of the founder's own device, and IoT baselines.
- T3 and T4 order settled: T3 modules before T4, the L9 build after L8 (00a H7).

## 2026-11-02: spine curriculum upgrades

Decision: added 31 planned skills to T2, T3, T5 and T6 in `spine-module-plan.yaml`. Scope stays planning only: the first walk, lean slice and M0 to M1 are unchanged.

- T2: new `ctl.sys` module, quaternions, Allan variance, plant identification, phase margin, 1-D Kalman, and a clamped one-axis rig in L7.
- T3: new `mech.struct` module, with predicted and measured deflection and first mode in L9.
- T5: new `sys.twin` and `ml.llm` modules, OTA rollback, and a residual alert in L11.
- T6: new `prof.eu` module for the Cyber Resilience Act, CE and radio rules, and product liability.
- Differential equations and eigenvalues sit at the start of T2, so the 142-skill first walk does not change.
- T1 and T4: added the motor model, efficiency map, FOC literacy, SITL, fault injection and log analysis (6 more skills).
- All 37 new skills are now stubs in graph 0.4.0: 142 real plus 144 stubs. They stay unserved until promoted.
- `sens.meas.calibration-uncertainty` moved from L2 to L1, and its 6 prerequisite edges with it, to match the ladder's L1 gate.
- Draft safety brief added for the L7 rig (`content/safety/prj.L7.imu-ground-logger.md`).

## 2026-11-02: repository review fixes

Decision: amended the specification after the review of 2 November 2026 (00a section H). Not a go/no-go.

- Phase -1 protocol rebuilt (00d section 4): nine skills, per-skill 14-day re-tests, first-match outcome table.
- All 30 script-written G3 stamps removed. No lean template is reviewed yet.
- The 30-template pool rewritten: 27 parameterised, 3 `concept_static`. 19 of 19 skills pass `validate_lean_pool.py`.
- Multiple-choice option ids are opaque per item.
- L2 reversed-diode drill removed, L0 s07 check corrected.
- FSRS default, Claude sampling parameters, serve gate and function revoke corrected.
- Scheduler oracle fixed; 3 vectors added, no existing expected value changed.
