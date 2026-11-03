# Human-review research pass: T2 (control) and T2-bridge, 3 Nov 2026

Scope: the 6 T2 rows in `OPEN-CHECKS.md`, the 3 bracket notes its pattern missed (they sit in rows 2, 4 and 6), a hedge scan of `T2.yaml` and `T2-bridge.yaml`, and founder items 1 to 10 of `review-T2.md`.
Files edited: `content/syllabi/skill-specs/T2.yaml`, `content/syllabi/skill-specs/T2-bridge.yaml`, `content/safety/prj.L7.imu-ground-logger.md`.
No `status` changed. Checks run after editing: YAML parses; `validate_skill_specs.py` gives 247 specs and 0 errors; `validate_safety_briefs.py` passes. The OPEN-CHECKS regex now finds no match in either file's entries. The one match left is the header comment on line 2 of T2.yaml.

## 1. Summary counts

| Outcome | OPEN-CHECKS rows (6) | Extra hedge found (1) | Founder items (10) |
|---|---|---|---|
| confirmed | 2 | 1 | — |
| corrected | 4 | 0 | — |
| convention | 0 | 0 | 3 (items 1, 5, 6: thresholds) |
| decided (brief text) | — | — | 3 (items 2, 3, 4) |
| already applied | — | — | 2 (items 9, 10) |
| settled by research | — | — | 2 (items 7, 8) |
| open | 0 | 0 | 0 |

Total over the rows and the extra hedge: 3 confirmed, 4 corrected, 0 convention, 0 open.

## 2. OPEN-CHECKS rows

| Skill | Outcome | Source used | What changed |
|---|---|---|---|
| `sig.sampling.imu-rate-selection` | corrected | TDK DS-000347 rev 1.2 (04/19/2020), section 5 Signal Path (Fig. 8), 5.1, 5.3 Anti-Alias Filter, Tables 1-2. Read in full from a distributor mirror (static.chipdip.ru), because the TDK download page loads only through a script. Also the PX4 driver `ICM42688P.hpp` lines 191-222 (main branch, 3 Nov 2026) and the PX4 filter tuning page | The datasheet confirms a 32 kHz decimation stage, a notch filter (gyro only), a 2nd-order AAF programmable from 42 to 3979 Hz that can be bypassed (`GYRO_AAF_DIS`, `ACCEL_AAF_DIS`), and an ODR up to 32 kHz (gyro 12.5 Hz to 32 kHz). The PX4 claim was wrong for this chip. PX4's docs say on-chip low-pass filters are disabled where possible, but the ICM-42688-P driver clears `AAF_DIS` and sets the AAF to 585 Hz at an 8 kHz ODR (585 Hz is a row of the datasheet AAF table). The core idea now states this and says to read the driver. Hedge removed; datasheet and driver added as sources |
| `sig.imu.quaternions` | corrected | ArduPilot "Extended Kalman Filter (EKF)" page (Plane): introduction and "EKF3 Fallback to DCM" | The old text said only "ArduPilot reports a DCM path". It now says that EKF3 is primary, that DCM runs in the background, and that ArduPlane falls back to DCM when EKF3 stops using GPS. Hedge removed; source added |
| `sig.imu.allan-variance` | confirmed | MathWorks "Inertial Sensor Noise Analysis Using Allan Variance" (bias instability: B read with scaling sqrt(2 ln2/pi) ≈ 0.664). Inertial Sense IMX manual, "Allan deviation" (reports "using the IEEE Std 952-1997 convention" as the minimum AD divided by 0.664) | Arithmetic: sqrt(2 × 0.693147 / 3.141593) = sqrt(0.441271) = 0.66428. The claim is correct. Text now names it the flicker-noise plateau factor and says to state the convention. Hedge removed; both sources added. IEEE 952 is paywalled. Also, 952-1997 has been superseded by 952-2020, so the text says "IEEE 952-style" and does not name a year |
| `sig.imu.multi-position-calibration` | corrected | Pretto and Grisetti, IMEKO TC4 2014, pp. 429-434 (open PDF), section II, eq. 9-11. It is the same method as Tedaldi et al., ICRA 2014; the imu_tk README links the two | The old line said gyro scale "needs a known rotation, not gravity", which is wrong for this method. The method integrates the gyro between static poses and compares the result with the gravity direction from the calibrated accelerometer (eq. 11). The text now says a static pose cannot give gyro scale, and that a rotation of known size can come from a turntable or from the change in gravity direction. Hedge removed; source added |
| `ctl.pid.anti-windup` | corrected | Åström, *Control System Design*, ch. 6 PID Control, section 6.5 Windup, pp. 229-230 (Caltech CDS101 copy). Åström and Murray, *Feedback Systems* (FBS, 24 Jul 2020 PDF), section 11.4 Integral Windup, pp. 11-16 to 11-17 | Åström says Tt should be larger than Td and smaller than Ti, and suggests Tt = sqrt(Ti·Td) as a rule of thumb: confirmed. "Or Ti for PI" had no source, so it was removed. For PI it now gives FBS's rule: choose kaw (= 1/Tt in this spec's form) as a multiple of ki. Both texts warn that too small a Tt or too large a kaw lets noise or spurious errors reset the integrator. Hedge removed; both sources added with pages |
| `ctl.est.mahony-madgwick` | confirmed | ahrs library source on GitHub: `mahony.py` (k_P = 1.0, k_I = 0.3) and `madgwick.py` (gain_imu 0.033, gain_marg 0.041, and the docstring β = sqrt(3/4)·ω_β) | The flagged line is about library defaults, and the library code is the primary source for that. 0.041 for MARG was added. The β formula also follows from Madgwick's definition: for unit q, ‖0.5·q⊗(0, ω, ω, ω)‖ = 0.5·sqrt(3)·ω = sqrt(3/4)·ω. Hedge removed; source files added. Madgwick's 2010 report could not be fetched (x-io returns 202, the UW copy needs a login, the Parallax copy returns 202), but no line depends on it now |
| `T2-bridge` `math.prob...` OpenStax source (hedge "licence not checked") | confirmed | OpenStax *Introductory Business Statistics 2e*, section 6.1, licence line | The licence is CC BY-NC-SA. The link stays as a benchmark only; the note now says no text or figures are copied (CLAUDE.md section 12.8: no non-commercial content) |

Numbers recomputed (all match the YAML unless shown as changed):
- Rate selection: |H| = 1/sqrt(1 + (f/fc)^(2n)). For n = 2 at 900 Hz: 1 + 4.5^4 = 411.06, so -26.14 dB. At 1900 Hz: 1 + 9.5^4 = 8146.1, so -39.11 dB. For n = 3: 4.5^6 = 8303.8, so -39.19 dB; 9.5^6 = 735 092, so -58.66 dB.
- Allan: 0.0632 × sqrt(0.1) = 0.01999 deg/s. ARW: 0.02 × 60 = 1.2 deg/sqrt(h). Drift: 0.02 × sqrt(60) = 0.155 deg. Bias instability: 0.002 deg/s = 7.2 deg/h, and 7.2/0.664 = 10.84 deg/h. Unaided check: 0.01 × sqrt(300) = 0.1732 deg.
- Multi-position: 19.64/19.62 = 1.00102; 0.30/19.62 = 0.01529; asin(0.01529) = 0.876 deg; 0.20/19.62 = 0.01019; bias 0.10 from all three pairs.
- Anti-windup: 8 - 0.4t - 0.2 = 1 gives t = 17 s. With back-calculation, u_cmd = 1 + 4 × 1 × 0.1 = 1.4, so I = -0.6. Unaided check: u_cmd = 2 and I = 0.
- Mahony and Madgwick: the roots of s² + s + 0.1 are -0.1127 and -0.8873, so the time constant is 8.87 s. Bias step: 0.1 × 0.1 × 0.01 = 1e-4. β = 0.866025 × 0.087266 = 0.07557.
- Quaternion step: cos(0.005) = 0.9999875 and sin(0.005) = 0.00499998.
- Bridge: P(z > 1.5) = 0.0668. sqrt(9 + 16) = 5, and ±5 is ±1σ, so the probability is 0.6827. 0.0027 × 86 400 = 233.

## 3. Founder items

| # | Decision or finding | Reasoning and source | Edit |
|---|---|---|---|
| 1 | **Flywheel: guard, eye protection and an energy cap.** A guard encloses the rim. Eye protection whenever the motor is powered with an arm or flywheel fitted (the old wording, "at speed", was vague). A firmware speed cap keeps stored energy at or below 1 J | 0.5 × 8e-5 × 500² = 10 J in the spec's example. 1 J is about a 100 g mass dropped 1 m (0.1 × 9.81 × 1 = 0.98 J). [project convention: there is no external threshold; it is chosen low because the guard is home-made and unrated.] Speed limit: sqrt(2/8e-5) = 158.1 rad/s ≈ 1510 rpm | Brief: new "Cap flywheel speed" rule and check question 6. T2.yaml `phys.mech.inertia-torque` worked example: it now gives the 10 J figure and the 158 rad/s rig limit |
| 2 | **Stops apply to the arm by name.** "Limit arm and beam travel", and "firmware limits do not replace the stops" | The main rig is an arm, so a rule that names only the beam leaves the main rig uncovered | Brief rule rewritten; the duplicate stop wording was merged |
| 3 | **Power-off state is covered.** Before power-up, check where a gravity-loaded arm falls. It must rest on a stop or be counterbalanced, with nothing in its arc. Cover open gears and belts. Never hold the arm by hand while powered | Cutting power is the brief's own stop action, so its result must be safe | Brief: new "Plan the power-off state" rule and check question 5 |
| 4 | **Electrical: both added.** (a) Stall: set the supply current limit before first power-up, at or below the motor's rated continuous current and the driver rating. Firmware stops when the output is at its limit with no motion for more than 0.5 s. (b) Regeneration: a bench supply cannot absorb energy, so braking raises the rail voltage. Ramp speed down, keep the driver's input capacitor fitted, and add a TVS diode or brake-resistor clamp below the driver's maximum voltage when braking hard | Standard motor-drive practice: a stall at a stop is a continuous-current case, and a unidirectional supply cannot sink regenerated current. 0.5 s is a [project convention] stall-detect window, short against motor thermal time constants | Brief: "Limit stall current" and "Expect regenerated voltage" rules rewritten |
| 5 | **Margin is never found by raising gain to oscillation.** It comes from the fitted model or a small-amplitude loop measurement inside the abort limits | Safety first: a gain-to-oscillation test (the Ziegler-Nichols ultimate-gain style) needs the growing motion the stops exist to prevent | T2.yaml `ctl.pid.closed-loop-rig`: new core idea tagged [project convention]. Brief: "No gain-to-oscillation tests" rule |
| 6 | **Chirp output abort.** Stop the input and cut drive at half the travel to the nearest stop, or at the firmware rate clamp. Start at low amplitude and sweep slowly near a predicted resonance | A lightly damped arm amplifies a bounded input near resonance. Half the travel leaves room for overshoot after the abort. [project convention] | T2.yaml `ctl.adv.system-identification` core idea. Brief: "Abort limits on test inputs" rule |
| 7 | **DS-000347 read** (rev 1.2). See row 1 | The TDK page is a script-only download. TDK lists rev 1.8 (27 Jul 2023) as current | Done in T2.yaml. See section 4 for the rev 1.8 cross-check |
| 8 | **Åström read** (Åström ch. 6 and FBS 11.4). **IEEE 952** settled through two manufacturer documents and the derivation | IEEE 952 is paywalled and superseded by 952-2020 | Done in T2.yaml |
| 9 | **Already applied.** `mvp-skill-graph.yaml` lists `exact_numeric` first in `grader_types` for `sig.freq.fft-log-reading` (line ~5087) and `sig.freq.notch-rpm` (line ~7362). T2.yaml agrees | — | None needed |
| 10 | **Already applied.** The graph description of `ctl.pid.discrete-pid-code` (line 9452) reads "safe enable with a zeroed integrator" and matches T2.yaml | — | None needed |

The brief's `brief_version` changed from "2026-11-02-1" to "2026-11-03-1" because its content changed (doc 10 section 5.3: a new version invalidates old acknowledgements). L7 is not yet in `project-ladder.yaml`, so no acknowledgements exist and the validator does not check this file.

Proposed edits outside my scope: none for the graph. Item 11 (rebuild OPEN-CHECKS) is for the orchestrator. `py -3 -B reference/build_open_checks.py` should now list 0 T2 rows.

## 4. Still open (none blocking)

| Item | What closes it |
|---|---|
| DS-000347 rev 1.8 cross-check. I read rev 1.2 (marked pre-production). PX4's production driver uses the same AAF table (its 585 Hz preset), so the figures are very likely unchanged | Founder downloads rev 1.8 from invensense.tdk.com (it may need a free login) and checks sections 5 and 5.3 and Tables 1-2: AAF 42-3979 Hz, 2nd order, bypass bits, ODR to 32 kHz |
| IEEE 952-2020 text (Allan annex) | Buy it, or read it through a library, only if the founder wants the standard itself cited. The claim already rests on two manufacturer documents and the derivation |
| Madgwick 2010 report | Not needed for any current line. If wanted, get the PDF from x-io.co.uk in a browser |
| Brief values (1 J, 0.5 s stall window, half-travel abort) | Founder sign-off as project conventions when L7 is promoted |
