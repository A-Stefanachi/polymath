# Pillar Control & estimation (T2)

Status: v1.0, 1 Nov 2026. **Spine planning only** — ships after first-walk L1 + go/no-go (doc 15, `00d` §8). Not loaded by v1 `content:sync`. Module plan: `content/syllabi/spine-module-plan.yaml`.

**Track key:** `control` · **Order:** 2 · **Prerequisites:** foundation + T1 recommended

## Competence artifact

Accepted L7: ground IMU logger + attitude plot + calibration log + closed-loop rig response against prediction.

## Primary ladder project(s)

L7 — prj.L7.imu-ground-logger

## Pillar purpose

- Differential equations, poles, transfer functions and phase margin.
- PID on a real one-axis plant: identification, anti-windup, cascades.
- Quaternions, specific force, complementary filter, 1-D Kalman, EKF usage.
- IMU calibration, frame conventions, ground-only logging.
- Fourier/Nyquist literacy for sampling (stub promotion).
- Newton laws / rigid-body intuition (stub).

## Pillar totals [P]

| Node | Skills | Core hours (sum est_minutes) | Modules |
|------|--------|------------------------------|---------|
| `ctl` | 40 | 27.7 h | 4 |
| `phys` | 4 | 2.2 h | 1 |
| `sig` | 15 | 8.5 h | 3 |
| **Track total** | **59** | **38.3 h** | **8** |

**Table note:** Core hours sum `est_minutes` from this syllabus plan (minimum contact-time sketch). The planning band above includes projects, rework, and review overlap [P].

Planning band (projects/review overlap): **80–130 core hours + L7 project and rig [P]**

## Promote from MVP stubs

- `ctl.pid.pid-controller`
- `sig.freq.fourier-intuition`
- `sig.sampling.nyquist-aliasing`
- `phys.mech.newton-laws`

## New module keys (authoring) [P]

- `ctl.sys`
- `ctl.pid.tuning`
- `ctl.est.complementary`
- `sig.imu.frames`

## Graders & evidence [P]

log parsing, numeric compare on logged series, rubric on tuning write-ups.

## Boundaries

Ground-only for L7; loops run on a clamped rig with commanded setpoints, never in flight. No seekers, target tracking, pursuit, intercept or terminal guidance.

## Discipline overview

### `ctl`

40 skills across modules: `ctl.sys`, `ctl.pid`, `ctl.est`, `ctl.adv`.

### `phys`

4 skills across modules: `phys.mech`.

### `sig`

15 skills across modules: `sig.freq`, `sig.sampling`, `sig.imu`.

## Module syllabi

### `ctl.sys` — Dynamic systems mathematics

**Order:** 1 · **Node:** `ctl` · **Skills:** 16 · **Core:** ~11.0 h [P]

**Outcomes (after this module):**
- Solve first- and second-order differential equations and read damping from them.
- Use eigenvalues and poles to judge stability.
- Move between time response, transfer function and Bode plot.

**Evidence path:** Constructed-response items; predictions reused on the one-axis rig
**Projects (ladder touch):** prj.L7.imu-ground-logger
**Checkpoints / assessment:** Unaided derivation and numeric set
**Hard task (unaided):** Given L(s) with an unstable pole and a delay, sketch Nyquist unaided, count encirclements, find the maximum delay, and check by simulation.
**Confusable set:** laplace-vs-fourier, damping-vs-natural-frequency
**Template plan [P]:** ~14 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ctl.sys.discrete-time` | Discrete-time models and the z-domain | L1 | 50 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.sys.eigenvalues-stability` | Eigenvalues, poles and stability | L1 | 45 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.sys.feedback-basics` | Feedback loops and 1 + L | L1 | 40 | no | exact_numeric, symbolic_equivalence… | needs_human_review |  |
| `ctl.sys.frequency-response` | Frequency response and Bode by hand | L1 | 45 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.sys.laplace-transfer` | Laplace transforms and transfer functions | L1 | 60 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.sys.linearisation` | Linearise at an operating point | L1 | 40 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.sys.nyquist-criterion` | Nyquist stability criterion | L1 | 45 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `ctl.sys.ode-first-second` | First- and second-order differential equations | L1 | 60 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.sys.sensitivity-functions` | Sensitivity, complementary sensitivity and Ms | L1 | 40 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.sys.state-space` | State-space form and modes | L1 | 40 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `math.calc.partial-derivatives-jacobians` | Partial derivatives and Jacobians | L1 | 35 | yes | exact_numeric, symbolic_equivalence… | needs_human_review |  |
| `math.calc.partial-fractions` | Partial fractions | L1 | 35 | yes | exact_numeric, symbolic_equivalence… | needs_human_review |  |
| `math.prob.conditional-bayes` | Conditional probability and Bayes | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `math.prob.normal-distribution` | Normal distribution | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `math.vec.cross-product` | Cross product in 3D | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `math.vec.rotation-matrices` | Rotation matrices | L1 | 35 | yes | exact_numeric, multiple_choice | needs_human_review |  |

### `phys.mech` — Mechanics foundation for control

**Order:** 2 · **Node:** `phys` · **Skills:** 4 · **Core:** ~2.2 h [P]

**Outcomes (after this module):**
- Apply Newton's laws to single-body forces relevant to drones and fixtures.
- Relate mass, inertia and reaction torque at literacy depth.

**Evidence path:** Numeric word problems; no flight closed-loop
**Projects (ladder touch):** prj.L7.imu-ground-logger (indirect)
**Checkpoints / assessment:** Constructed-response mechanics items
**Hard task (unaided):** Derive the arm's nonlinear model, linearise at 0 and 30 degrees, predict how natural frequency differs, then measure it.
**Confusable set:** none
**Template plan [P]:** ~10 templates when stub promoted + 3 planned

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `phys.mech.euler-rigid-body` | Euler equations and gearbox reflected inertia | L1 | 45 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `phys.mech.forces-body-frame` | Body vs inertial frame for forces | L1 | 25 | yes | multiple_choice, exact_numeric… | needs_human_review |  |
| `phys.mech.inertia-torque` | Inertia and reaction torque intuition | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `phys.mech.newton-laws` | Newton's laws | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |

### `sig.freq` — Frequency-domain intuition

**Order:** 3 · **Node:** `sig` · **Skills:** 5 · **Core:** ~2.5 h [P]

**Outcomes (after this module):**
- Read magnitude plots and relate them to RC and filter behaviour already learned.
- Identify dominant frequency content in a logged sensor trace [P].

**Evidence path:** Bode/plot reading MC; L7 log interpretation items
**Projects (ladder touch):** prj.L7.imu-ground-logger
**Checkpoints / assessment:** Unaided plot reading set
**Hard task (unaided):** From an unlabelled bench log, identify fundamental, blade-pass, harmonics and one aliased tone, then design a filter stack and state its lag at crossover.
**Confusable set:** fourier-vs-laplace-literacy
**Template plan [P]:** ~12 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sig.freq.fft-log-reading` | Read a simple FFT of IMU noise | L1 | 30 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `sig.freq.filter-cutoff-choice` | Choose cutoff given sample rate and noise | L1 | 25 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `sig.freq.fourier-intuition` | Fourier intuition | L1 | 30 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `sig.freq.notch-rpm` | Notch filters and RPM-tracked vibration | L1 | 30 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `sig.freq.windowing-spectrogram` | Windowing, leakage, spectrograms and group delay | L1 | 35 | no | exact_numeric, measurement_check | needs_human_review |  |

### `sig.sampling` — Sampling, aliasing and digital filters

**Order:** 4 · **Node:** `sig` · **Skills:** 3 · **Core:** ~1.4 h [P]

**Outcomes (after this module):**
- Set the sample rate above twice the highest frequency left after the anti-alias chain.
- Explain aliasing symptoms in logged data.

**Evidence path:** L7 logger configuration checklist; numeric Nyquist items
**Projects (ladder touch):** prj.L7.imu-ground-logger
**Checkpoints / assessment:** Module-end unaided set
**Hard task (unaided):** Given a sensor filter chain and vibration spectrum, predict alias frequencies, then confirm at two output data rates.
**Confusable set:** nyquist-sampling-vs-nyquist-stability
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sig.sampling.anti-alias-practice` | Detect aliasing and fix the acquisition chain | L1 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `sig.sampling.imu-rate-selection` | IMU ODR and filter bandwidth trade-offs | L1 | 30 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `sig.sampling.nyquist-aliasing` | Sampling and aliasing | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |

### `sig.imu` — IMU frames and calibration

**Order:** 5 · **Node:** `sig` · **Skills:** 7 · **Core:** ~4.6 h [P]

**Outcomes (after this module):**
- Apply right-hand frame conventions (body, NED/ENU literacy).
- Run two-step bias/scale calibration and document residuals.

**Evidence path:** L7 calibration log + plot rubric
**Projects (ladder touch):** prj.L7.imu-ground-logger
**Checkpoints / assessment:** human_review on calibration write-up
**Hard task (unaided):** From an overnight log and six-face data, produce ARW, bias instability, a calibration matrix and residuals, then predict and measure tilt drift at 60 s.
**Confusable set:** ned-vs-enu
**Template plan [P]:** ~12 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sig.imu.allan-variance` | Allan variance for gyro noise and bias | L1 | 60 | no | measurement_check, exact_numeric | needs_human_review |  |
| `sig.imu.calibration-two-step` | Two-reference calibration for accel/gyro | L1 | 40 | no | measurement_check, rubric_llm | needs_human_review |  |
| `sig.imu.frames` | Body and world frames for IMU | L1 | 30 | yes | multiple_choice, symbolic_equivalence | needs_human_review |  |
| `sig.imu.multi-position-calibration` | Multi-position calibration with misalignment | L1 | 45 | no | measurement_check, exact_numeric | needs_human_review |  |
| `sig.imu.quaternions` | Quaternions and rotation composition | L1 | 60 | no | exact_numeric, code_tests | needs_human_review |  |
| `sig.imu.specific-force` | Specific force and what an accelerometer measures | L1 | 20 | yes | multiple_choice, exact_numeric… | needs_human_review |  |
| `sig.imu.static-test-fixture` | Ground-only fixture and motion constraints | L1 | 20 | no | multiple_choice, human_review… | needs_human_review |  |

### `ctl.pid` — PID control

**Order:** 6 · **Node:** `ctl` · **Skills:** 11 · **Core:** ~6.8 h [P]

**Outcomes (after this module):**
- Tune P, PI and PID loops on a real plant, with anti-windup, and predict the response first.
- Relate step response metrics to gain choices [P].

**Evidence path:** Simulation or ground fixture step logs; rubric on tuning narrative
**Projects (ladder touch):** prj.L7.imu-ground-logger (one-axis ground rig, not flight)
**Checkpoints / assessment:** Numeric + plot response items
**Hard task (unaided):** On a held-out rig setup, fit a model from one step, lock predicted overshoot, settling time, margin and saturated recovery, then pass within stated bands.
**Confusable set:** pi-vs-pid, derivative-kick
**Template plan [P]:** ~14 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ctl.pid.anti-windup` | Integrator windup and saturation | L1 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `ctl.pid.cascade-intuition` | Cascade loops (rate vs angle) intuition | L1 | 30 | yes | multiple_choice, exact_numeric… | needs_human_review |  |
| `ctl.pid.closed-loop-rig` | Close a loop on a one-axis rig and compare with prediction | L1 | 60 | no | measurement_check, human_review | needs_human_review |  |
| `ctl.pid.delay-budget` | Measure the loop delay budget | L1 | 35 | no | measurement_check, exact_numeric | needs_human_review |  |
| `ctl.pid.discrete-pid-code` | Code-tested discrete PID | L1 | 45 | no | code_tests | needs_human_review |  |
| `ctl.pid.feedforward-scheduling` | Feedforward and gain scheduling | L1 | 40 | no | exact_numeric, measurement_check | needs_human_review |  |
| `ctl.pid.margins-delay` | Phase margin, gain margin and delay | L1 | 35 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ctl.pid.pid-controller` | PID control | L1 | 25 | no | code_tests, multiple_choice | needs_human_review |  |
| `ctl.pid.plant-identification` | Identify a plant from a logged step response | L1 | 35 | no | measurement_check, exact_numeric | needs_human_review |  |
| `ctl.pid.simc-tuning` | Model-based tuning with SIMC | L1 | 40 | no | exact_numeric, measurement_check | needs_human_review |  |
| `ctl.pid.tuning-step-response` | Step response and manual tuning workflow | L1 | 35 | no | measurement_check, rubric_llm | needs_human_review |  |

### `ctl.est` — Complementary filter and estimation literacy

**Order:** 7 · **Node:** `ctl` · **Skills:** 7 · **Core:** ~3.9 h [P]

**Outcomes (after this module):**
- Implement complementary fusion for attitude at literacy depth.
- Compare complementary vs full EKF trade-offs without deriving EKF.

**Evidence path:** L7 attitude plot acceptance criteria
**Projects (ladder touch):** prj.L7.imu-ground-logger
**Checkpoints / assessment:** Log numeric compare on fused angle
**Hard task (unaided):** Implement a two-state filter blind on a log with a bias step and an accelerometer fault, show NIS consistency, detect the fault, and beat a reference RMS against encoder truth.
**Confusable set:** complementary-vs-kalman
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ctl.est.complementary-filter` | Complementary filter for attitude | L1 | 40 | no | code_tests, measurement_check | needs_human_review |  |
| `ctl.est.ekf-literacy` | EKF role on modern FC stacks (literacy) | L1 | 20 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `ctl.est.gyro-integration-drift` | Gyro integration drift and bias effects | L1 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `ctl.est.innovation-checks` | Innovations and bad-sensor detection | L1 | 25 | no | multiple_choice, code_tests | needs_human_review |  |
| `ctl.est.kalman-1d` | Derive a one-dimensional Kalman filter | L1 | 40 | no | exact_numeric, code_tests | needs_human_review |  |
| `ctl.est.mahony-madgwick` | Mahony and Madgwick filters | L1 | 35 | no | code_tests, multiple_choice… | needs_human_review |  |
| `ctl.est.two-state-kalman` | Two-state Kalman filter with bias | L1 | 50 | no | code_tests, measurement_check | needs_human_review |  |

### `ctl.adv` — Advanced control and estimation (L2)

**Order:** 8 · **Node:** `ctl` · **Skills:** 6 · **Core:** ~6.0 h [P]

**Outcomes (after this module):**
- Design state feedback with an observer, and show what the observer costs in margin.
- Identify a plant with validation data and quantify model error.
- Compare LQG and constrained MPC on the fixed ground rig.

**Evidence path:** Unaided items, code tests and held-out logs; no project grants L2
**Projects (ladder touch):** prj.L7.imu-ground-logger (rig only, after L7)
**Checkpoints / assessment:** Blind held-out rig configuration
**Hard task (unaided):** Identify the rig, design LQG and constrained MPC, predict the robustness margin, and show which fails first under added delay and saturation.
**Confusable set:** lqr-vs-lqg, identification-vs-validation
**Template plan [P]:** ~12 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ctl.adv.error-state-filter` | Error-state filter on quaternions | L2 | 60 | no | code_tests, measurement_check | needs_human_review |  |
| `ctl.adv.lqr-lqg` | LQR and LQG with their limits | L2 | 60 | no | exact_numeric, code_tests… | needs_human_review |  |
| `ctl.adv.mpc-constraints` | Constrained MPC on a rig | L2 | 60 | no | code_tests, measurement_check | needs_human_review |  |
| `ctl.adv.robustness-limits` | Robustness limits and the waterbed effect | L2 | 60 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `ctl.adv.state-feedback-observers` | State feedback and observers | L2 | 60 | no | exact_numeric, code_tests | needs_human_review |  |
| `ctl.adv.system-identification` | System identification and validation | L2 | 60 | no | measurement_check, exact_numeric | needs_human_review |  |

## Ladder skill map [P]

| Ladder | Terminal skills / modules |
|--------|---------------------------|
| L7 IMU logger and rig | `sig.imu.calibration-two-step`, `ctl.est.complementary-filter`, `ctl.pid.closed-loop-rig` |

## Sequencing notes

- Same pedagogy as foundation: verified templates, strict-unaided checkpoints, project credit caps (contract §7).
- Hardware phases: `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.
- Sketch projects: `content/extended-project-ladder-sketch.yaml`.
- Regenerate this file after editing `spine-module-plan.yaml` or promoting stubs in `mvp-skill-graph.yaml`.
