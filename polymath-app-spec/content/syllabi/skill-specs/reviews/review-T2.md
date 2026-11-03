# Review of pillar T2 and bridge skills

Date: 2026-11-02. This is an AI review and does not replace human G3 sign-off. No status was set and nothing was marked verified.

Files reviewed: `T2.yaml` (52 skills), `T2-bridge.yaml` (9 skills), `pillar-T2-control.md`, the T2 rows of `OPEN-CHECKS.md`, `content/safety/prj.L7.imu-ground-logger.md`.

## Pass count

- 61 skills reviewed. 40 passed with no edit. 21 were edited (20 in `T2.yaml`, 1 in `T2-bridge.yaml`, the latter only to add a source link).
- Numbers: the worked examples and unaided checks were recomputed by hand or in numpy and scipy. All key answers held except the three items marked "number" below. Loop scans for Ms, Mt, sm, PM and GM, the SIMC step simulation (4.05% overshoot, 0.142 s peak, 0.182 s settling, 0.057 s rise), LQR and LQG, MPC, ARX and two-state Kalman values all reproduced.
- Safety: one real conflict found and fixed (discrete PID enable against the L7 brief). No seeker, target tracking, pursuit or intercept content. The only MPC reference text says setpoints come from the operator's script, never from a sensed moving object. The only grep hits for "target" or "terminal" are unrelated (tier_target, round targets, terminal cost, oscillation target).
- Locked fields (`key`, `est_minutes`, `task_kinds`, `grader_types`, `phone_suitable`) were compared against a pre-edit copy and are unchanged.
- YAML loads. `py -3 -B reference/validate_skill_specs.py` reports 247 specs checked, 0 errors. `validate_safety_briefs.py` passes.
- `pillar-T2-control.md` minutes and phone flags match the specs for all 59 skills in it. Module and pillar totals re-add correctly. `ml.core.neural-network-basics` and `sys.telemetry.tls-basics` are not in this syllabus, as expected for bridge skills that belong elsewhere.

## Fixes made

| Skill | What was wrong | Kind | Source |
|---|---|---|---|
| `ctl.pid.discrete-pid-code` | "Bumpless enable" said to set I to match the last applied output, next to a statement that the brief needs a zeroed integrator. These conflict, and re-enabling at a stale output after a stop can lunge. Now follows the brief; back-solving I is limited to running mode or gain changes. | Safety | L7 brief, Safe enable rule |
| `ctl.pid.delay-budget` | PT1 formula sat beside PX4's 8, 3.8, 1.9 ms as if they matched. PT1 gives 5.3, 2.65, 1.33 ms; second-order Butterworth gives 7.5, 3.75, 1.88 ms. | Claim | PX4 filter tuning page; computed |
| `ctl.est.innovation-checks` | Said a smaller innovation may mean inflated R. Inflated R lowers NIS by inflating S; it does not shrink raw innovations. Restated in terms of NIS. Also "too small Q/R" read as a ratio; now "a Q or R". | Claim | Follows from the optimal gain minimising innovation variance |
| `ctl.est.two-state-kalman` | "Equivalent tau of 0.312 s" was dt/K0, but it was attached to the poles. The poles give 0.316 s and about 10 s. | Number | Computed |
| `ctl.est.kalman-1d` | Time constant dt/K is only a small-K form: 0.055 s against an exact 0.050 s for the unaided check. An exact_numeric item could fail a correct answer. Also added "among linear estimators" to the minimum-variance claim. | Number, claim | Computed |
| `ctl.adv.system-identification` | "Free-run fit 99.3%" named no pulse and no fit formula, so it could not be reproduced. It appears only with a 10-on, 10-off pulse and no mean removal. With the usual mean-removed fit the value is 98.0%. | Number | Computed |
| `sig.freq.fft-log-reading` | "Two main-lobe half-widths, about 2/T": a Hann half-width is already two bins, 2/T. Two half-widths would be 4/T and change the answer. Answer T >= 2 s is kept; a simulation resolved 1 Hz at N = 1600 for all 16 phases tried. | Claim | Computed |
| `phys.mech.newton-laws` | "dp/dt when mass changes" is a known error for open systems. | Claim | https://en.wikipedia.org/wiki/Variable-mass_system |
| `sig.imu.calibration-two-step` | "Scale" meant reading/true for the accelerometer and true/reading for the gyro, with no warning. Now named apart. | Claim | Computed |
| `sig.freq.windowing-spectrogram` | -28.6 and -70.8 dB are relative to the displayed peak bin, not to amplitude 1 (those are -31.0 and -71.8 dB). The reference is now stated. | Clarity | Computed |
| `ctl.adv.lqr-lqg` | Flag settled. Added that asymptotic recovery needs a minimum-phase plant. | Flag | MathWorks ltru docs and Niemann et al. 1991, search snippets only |
| `ctl.est.ekf-literacy` | Flag settled: 25 stored numbers, 24 in the covariance, since `sf.Rot3` has 3 tangent dimensions. | Flag | https://raw.githubusercontent.com/PX4/PX4-Autopilot/main/src/modules/ekf2/EKF/python/ekf_derivation/derivation.py |
| `ctl.est.ekf-literacy` | Flag settled: `estimator_aid_src` test_ratio is squared; status getters return its filtered square root. Both forms exist. | Flag | PX4 `EKF/ekf.h` line 1155, `EKF/ekf_helper.cpp`, https://docs.px4.io/main/en/msg_docs/EstimatorAidSource1d.html |
| `ctl.sys.sensitivity-functions` | Flag settled: 28.96 degrees from FBS eq. 10.7; the FBS exercise's 30 degrees is a rounding. | Flag | FBS section 10.3 and the Ms = 2 exercise |
| `ctl.pid.cascade-intuition` | Flag settled, and the ratio corrected from "about 5" to Skogestad's 4 to 10. | Flag | https://skoge.folk.ntnu.no/prosessregulering/lectures/2024/SiS8Advanced%20control.pdf |
| `ctl.pid.delay-budget` | Flag settled: published rules vary, about 6 to 25 times bandwidth. | Flag | https://arxiv.org/pdf/2406.07073 (search snippet), other snippets vary |
| `ctl.pid.anti-windup` | Flag narrowed: the rule is in teaching notes; added the glitch risk of a small Tt. Astrom and Hagglund is still unopened, so the note stays. | Flag, partial | https://www.calerga.com/contrib/1/PIDWindup.pdf |
| `ctl.pid.plant-identification` | Unlisted flag settled by derivation: 28.3% at theta + tau/3 (1 - exp(-1/3) = 0.2835), 63.2% at theta + tau. | Flag | Derived |
| `sig.imu.allan-variance` | Confidence flag settled with a NIST bound, 1/sqrt(M - 1). Monte Carlo on white noise gave 0.30, 0.15, 0.075 at M = 9, 33, 129, so this bound holds, and the secondary 1/sqrt(2(M - 1)) understates it. | Flag | https://tf.nist.gov/phase/Properties/four.htm |
| `sig.imu.allan-variance` | 0.664 is now given as sqrt(2 ln 2/pi). IEEE 952 is still unopened, so that note stays. | Flag, partial | https://www.mathworks.com/help/nav/ug/inertial-sensor-noise-analysis-using-allan-variance.html |
| `sig.sampling.anti-alias-practice` | Flag settled: vibration rectification is a documented DC shift. | Flag | https://www.analog.com/en/resources/technical-articles/vibration-rectification-in-mems-accelerometers.html (full page timed out; content seen through search) |
| `ctl.adv.mpc-constraints` | Flag settled from chapter 2 of the book, and the claim was narrowed: optimality holds on a set of initial states. | Flag | https://sites.engineering.ucsb.edu/~jbraw/mpc/ |
| `phys.mech.euler-rigid-body` | The "uncertain" note was an instruction, not a doubtful fact. Rewritten as one. | Flag | None needed |
| `sys.telemetry.tls-basics` | Named RFC 9525 with no link. Text is correct ("MUST NOT"). Link added. | Source | https://www.rfc-editor.org/rfc/rfc9525.html |

Confirmed with no change: FBS N = 5 to 20, margin ranges, Fig 11.11, 0.6z; PX4 FRD, NED, Hamilton, on-chip filter, spectrum and vibration notes; Woodman's 12 hour log, minimum reading and 60 s white-noise result; Higgins; Doyle; Trawny; ahrs defaults and equations; SIMC rules and margins; Foley theta/2 and improved theta/3 (Skogestad page); Betaflight; ArduPilot notches.

## Open items for the founder

1. **Brief, flywheel:** `phys.mech.inertia-torque` uses 500 rad/s (about 10 J), yet the brief requires eye protection only with a propeller and no flywheel guard. Decide: add a guard, eye protection or a speed cap for the flywheel.
2. **Brief, stops:** the brief says "beam travel", but the main rig is an arm. Decide whether stops apply to the arm by name.
3. **Brief, power cut:** cutting power lets a gravity-loaded arm drop. Decide whether the brief covers the fall path and gear pinch points.
4. **Brief, electrical:** no stated current limit for a stall at a stop, and nothing on regenerated voltage into a bench supply. Decide whether to add both.
5. **Rig margin test:** `ctl.pid.closed-loop-rig` grades "margin" on hardware. Decide that margin comes from model or small-signal data, never from raising gain until oscillation.
6. **Chirp near resonance:** a bounded input can still give a large output on a lightly damped arm (`ctl.adv.system-identification`). Decide on an output abort limit.
7. **Open check:** read DS-000347 directly for `sig.sampling.imu-rate-selection`. I could not get the official PDF, and that flag stays.
8. **Open check:** IEEE 952 and Astrom and Hagglund are unopened; the notes remain.
9. **Graders:** `sig.freq.notch-rpm` and `sig.freq.fft-log-reading` have numeric unaided checks with no `exact_numeric` grader. Decide whether to add it (I may not change this field).
10. **Wording:** `ctl.pid.discrete-pid-code` description still says "bumpless enable". Decide whether to reword it to match the corrected core idea.
11. **OPEN-CHECKS:** run `reference/build_open_checks.py`; this file is now stale, and I was not allowed to edit it. Its pattern also misses bracket notes such as "snippet only" and "could not be opened" (`sig.imu.quaternions`, `sig.imu.multi-position-calibration`, `ctl.est.mahony-madgwick`).

## Curriculum weaknesses, ranked

1. **Time.** The 60-minute cap understates the `ctl.adv` skills badly: LQG, error-state filters and MPC are each many hours. The pillar's 38.3 h sits far below its own 80 to 130 h band, so a learner sees misleading figures.
2. **Thin unaided checks.** `ctl.sys.sensitivity-functions` is formula recall. `ctl.est.ekf-literacy` rests on explain-back, and a rubric grade is not mastery-eligible until calibrated. `sig.imu.static-test-fixture` needs human review for a 20-minute skill with five task kinds, which is implausible.
3. **Hard checks with hidden bands.** Several rig checks say "stated band" with no value (`ctl.pid.closed-loop-rig`, `ctl.pid.delay-budget`, `sig.imu.calibration-two-step`). They cannot be judged until those bands exist.
4. **Depth label mismatch.** The syllabus says "literacy depth" for `ctl.est` and `phys.mech`, while the specs go to Euler equations and blind filters.
5. **Missing expert point.** `ctl.adv.robustness-limits` stops at crossover windows. For p = 5, z = 20 the bound Ms >= (z + p)/(z - p) = 1.67 would make the "doubtful" verdict quantitative.
6. **Weak references.** Many facts rest on Wikipedia or a PX4 page that changes over time. The Mahony and Madgwick originals were not read.
7. **Windowed resolution.** The leakage check depends on bin alignment that is hard to do unaided; an envelope estimate of about -30 dB should also be accepted.

## What I could not check

- ICM-42688-P figures: the TDK link returned a web page, and one mirror held a different chip.
- IEEE 952, Astrom and Hagglund, Madgwick's report and Tedaldi's paper were not opened.
- The Analog Devices page timed out, and the Lund slides returned 404; those claims rest on search text.
- The direct FBS fetch failed on its certificate. A download that skipped certificate checks was blocked, and I did not bypass it. FBS, SIMC, Doyle, Higgins and Trawny were read from PDFs already in this session's scratchpad, whose origin I did not confirm.
- PX4 code is the main branch as of today, and older releases may differ. The second-order type of PX4's gyro filter is not stated on its page; the fix states only that the numbers fit that formula.
- ArduPilot's DCM note and the Keras formula were not separately confirmed. No rig or hardware was run.
- Hidden test vectors, stated bands and rubrics do not exist yet, so those parts were judged from the spec text only.
