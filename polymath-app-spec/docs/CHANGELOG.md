# Specification and build decisions log

Record go/no-go outcomes, lean-gate releases, and scope-down choices here before starting deferred backlog groups (D1–D9). Format: date, decision, evidence (metrics or task ids), next three tasks.

---

<!-- Entries appear newest first. -->

## 2026-11-03: worker heartbeat table and function default privileges (00a I3)

Decision: the founder delegated the two schema questions of the Wave 2 review (PR #4) to the build agent's judgment. Both are recorded as 00a I3: `app_private.worker_heartbeat` (the one-row heartbeat doc 03 sections 8.4 and 8.6 call for, read by `GET /health`) and a global default-privileges entry so new functions are not executable by PUBLIC (a baseline gap found by ST-RLS-19).

- Evidence: migrations `20261103000000_default_privileges_functions` and `20261103000100_worker_heartbeat`; `pnpm db:diff-reference` matches `schemas/schema.sql`; ST-RLS-19's function check passes (it was a pgTAP `todo`); a pgTAP test covers the heartbeat grants and the one-row rule; the worker writes the row every 5 minutes.
- Not decided here: the staging run of the OA-9 / ST-RLS-19 probe (`infra/VERIFIED.md`) happens when migrations are first pushed to staging (BL-0029).
- Next three tasks: BL-0021 (email-code sign-in), BL-0022 (API skeleton), BL-0019 (grading-core).

## 2026-11-03: data region London for now (OQ-02); BL-0001 started

Decision: the founder keeps the staging Supabase project in `eu-west-2` (London) for the moment. This is a UK jurisdiction, not the EU default of OQ-02; the UK has an EU adequacy decision. Revisit before the study history grows or before any beta learner has an account, when a move means migrating data. The non-EU choice keeps `deepseek/deepseek-v4.1-flash` as the strong model; `z-ai/glm-5.3` on Mistral's EU endpoint stays the alternative if the region moves to the EU.

- BL-0001 started in parallel with Phase -1 at the founder's choice: Supabase staging project created (Postgres 17.11, Free plan), OpenRouter key with a $50 monthly limit. Record in `infra/ACCOUNTS.md`.
- Still open in BL-0001: Vercel, Docker Desktop on the laptop, optional domain and SMTP.

## 2026-11-03: OpenRouter open-weights models; laptop worker in the lean slice

Decision: the founder chose OpenRouter with open-weights models as the LLM provider (00a I1) and the founder's laptop as the lean-slice worker host in queue-only mode (00a I2). The OpenRouter key is in the cloud environment's network secrets and has a $50 monthly limit (checked 3 Nov 2026). Fly.io and Anthropic accounts drop out of BL-0001.

- Edited to match: contract LLM line, doc 01 D-02, doc 03 (context diagram, 9 and 9.1, 12, ADR-011, OA-5), doc 12 (REG-17, ST-SEC-02), CLAUDE.md layout, BL-0001, BL-0029, BL-0054 and BL-0073 (title and a data-collection test; slug `llm-anthropic` kept as a stable key).
- Models (founder's choice, 3 Nov 2026): strong tier `deepseek/deepseek-v4.1-flash` (MIT), cheap tier `z-ai/glm-5.3-flash` (MIT). Evidence: both on OpenRouter's zero-data-retention endpoint list (checked 3 Nov 2026); Artificial Analysis index about equal to GLM-5.3 at a tenth of the price (vendor-reported benchmarks [R]). Alternative kept: `z-ai/glm-5.3` on Mistral's EU endpoint if EU residency is required (OQ-02). BL-0073 reads both LICENSE files, pins one provider and quantisation for rubric repeatability, verifies prices into `pricing.json` and runs the doc 08 adversarial suite before either model is relied on.
- Next three tasks: BL-0001 (founder: Supabase staging, Vercel), BL-0002 (repo scaffold), BL-0003.

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
