# Pillar Cloud twin (T5)

Status: v1.0, 1 Nov 2026. **Spine planning only** — ships after first-walk L1 + go/no-go (doc 15, `00d` §8). Not loaded by v1 `content:sync`. Module plan: `content/syllabi/spine-module-plan.yaml`.

**Track key:** `cloud-twin` · **Order:** 5 · **Prerequisites:** foundation + T4 recommended

## Competence artifact

Accepted L11: device telemetry → replayable schema + a validated twin with state estimation, an uncertainty-based residual alert and one human-approved decision.

## Primary ladder project(s)

L11 — prj.L11.telemetry-lakehouse

## Pillar purpose

- Edge → secure uplink → lakehouse pipeline.
- Schema versioning, replay, alerting SLOs.
- Production ML/MLOps: evals, monitoring, cost/latency.
- A real digital twin: state model, calibration, residual alerts.
- Production LLM systems: structured outputs, retrieval, agent evals, prompt injection.
- Edge inference / quantization at device boundary.

## Pillar totals [P]

| Node | Skills | Core hours (sum est_minutes) | Modules |
|------|--------|------------------------------|---------|
| `ml` | 21 | 11.6 h | 5 |
| `sw` | 4 | 2.2 h | 1 |
| `sys` | 19 | 11.8 h | 3 |
| **Track total** | **44** | **25.5 h** | **9** |

**Table note:** Core hours sum `est_minutes` from this syllabus plan (minimum contact-time sketch). The planning band above includes projects, rework, and review overlap [P].

Planning band (projects/review overlap): **65–120 core hours (leverages founder cloud strength) + L11 [P]**

## Promote from MVP stubs

- `sys.req.requirements`
- `ml.core.linear-regression`
- `ml.edge.quantization`

## New module keys (authoring) [P]

- `sys.telemetry.contracts`
- `sys.twin`
- `ml.ops.evals`
- `ml.llm`
- `ml.edge.deploy`

## Graders & evidence [P]

repo + log verification, rubric on eval reports, automated schema tests.

## Boundaries

No unverified AI efficacy claims (NG-07).

## Discipline overview

### `ml`

21 skills across modules: `ml.core`, `ml.pred`, `ml.ops`, `ml.edge`, `ml.llm`.

### `sw`

4 skills across modules: `sw.cloud`.

### `sys`

19 skills across modules: `sys.req`, `sys.telemetry`, `sys.twin`.

## Module syllabi

### `sys.req` — Requirements and verification

**Order:** 1 · **Node:** `sys` · **Skills:** 3 · **Core:** ~1.5 h [P]

**Outcomes (after this module):**
- Write testable requirements and map each to a verification method.
- Maintain requirements ↔ test matrix for vehicle and cloud slice.

**Evidence path:** L11 and L13 documentation rubric
**Projects (ladder touch):** prj.L11.telemetry-lakehouse; prj.L13.field-test-campaign
**Checkpoints / assessment:** Requirements traceability MC + rubric
**Hard task (unaided):** From a vague L11 brief, write 15 requirements with methods, then trace a planted interface defect to the requirement that should have caught it.
**Confusable set:** requirement-vs-spec
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sys.req.icd-basics` | Interface control document habits | L1 | 25 | no | multiple_choice, human_review… | needs_human_review |  |
| `sys.req.requirements` | Requirements and verification | L0 | 35 | yes | multiple_choice, rubric_llm… | needs_human_review |  |
| `sys.req.vv-matrix` | Verification and validation matrix | L1 | 30 | yes | multiple_choice, rubric_llm | needs_human_review |  |

### `sw.cloud` — Cloud integration patterns (extend `sw`)

**Order:** 2 · **Node:** `sw` · **Skills:** 4 · **Core:** ~2.2 h [P]

**Outcomes (after this module):**
- Structure firmware/companion repos for CI and secret hygiene.
- Wire device provisioning narrative to cloud twin [P].

**Evidence path:** Repo checklist on L11 submission
**Projects (ladder touch):** prj.L11.telemetry-lakehouse
**Checkpoints / assessment:** Checklist + MC on secrets handling
**Hard task (unaided):** Cut power at a random point in OTA, serve an old signed image and a tampered image; the device must end healthy or recover each time, with logs.
**Confusable set:** none
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sw.cloud.ci-firmware` | CI for firmware and companion services | L1 | 35 | no | multiple_choice, human_review… | needs_human_review |  |
| `sw.cloud.device-provisioning` | Device identity and provisioning flow | L1 | 30 | yes | multiple_choice, human_review | needs_human_review |  |
| `sw.cloud.incident-response` | Incident response and postmortems | L1 | 30 | no | multiple_choice, human_review… | needs_human_review |  |
| `sw.cloud.ota-rollback` | Signed OTA updates with A/B rollback | L1 | 35 | no | multiple_choice, measurement_check… | needs_human_review |  |

### `sys.telemetry` — Edge-to-cloud telemetry contracts

**Order:** 3 · **Node:** `sys` · **Skills:** 9 · **Core:** ~5.2 h [P]

**Outcomes (after this module):**
- Define versioned telemetry schema with replay and retention rules.
- Implement secure uplink from device to lakehouse [P].

**Evidence path:** L11 accepted artifact — schema + replay job + alert firing
**Projects (ladder touch):** prj.L11.telemetry-lakehouse
**Checkpoints / assessment:** Automated schema tests + log verification
**Hard task (unaided):** Replay a log with duplicates, an outage, a clock-resetting reboot and two schema versions; output must be identical across runs with every record accounted for.
**Confusable set:** schema-version-vs-api-version
**Template plan [P]:** ~14 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sys.telemetry.data-slos` | Freshness, correctness and coverage SLOs | L1 | 35 | no | multiple_choice, measurement_check | needs_human_review |  |
| `sys.telemetry.idempotent-replay` | Idempotent replay and backfill | L1 | 45 | no | code_tests, measurement_check | needs_human_review |  |
| `sys.telemetry.lakehouse-partition` | Partitioning and cost-aware ingestion | L1 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `sys.telemetry.mqtt-semantics` | MQTT QoS and store-and-forward | L1 | 30 | no | multiple_choice, measurement_check | needs_human_review |  |
| `sys.telemetry.replay-alert` | Replay pipeline and alert SLO definition | L1 | 35 | no | measurement_check, code_tests | needs_human_review |  |
| `sys.telemetry.schema-version` | Versioned telemetry schema design | L1 | 35 | no | code_tests, rubric_llm… | needs_human_review |  |
| `sys.telemetry.secure-uplink` | TLS/mTLS and device identity for uplink | L1 | 30 | yes | multiple_choice, human_review | needs_human_review |  |
| `sys.telemetry.time-model` | Event time, ingest time, sequence and boot counter | L1 | 40 | no | multiple_choice, code_tests | needs_human_review |  |
| `sys.telemetry.tls-basics` | TLS and certificate basics | L1 | 35 | yes | exact_numeric, multiple_choice | needs_human_review |  |

### `ml.core` — ML foundations for telemetry

**Order:** 4 · **Node:** `ml` · **Skills:** 4 · **Core:** ~2.2 h [P]

**Outcomes (after this module):**
- Fit and evaluate linear models on tabular flight/telemetry features.
- Interpret metrics without over-claiming causal effect (NG-07).

**Evidence path:** Eval report rubric on L11 dataset [P]
**Projects (ladder touch):** prj.L11.telemetry-lakehouse
**Checkpoints / assessment:** Numeric eval + short answer on leakage
**Hard task (unaided):** Find three planted leaks, then show MASE below 1 on a rolling origin, or state that no model is justified.
**Confusable set:** train-test-leakage
**Template plan [P]:** ~12 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ml.core.feature-leakage` | Detect label leakage in time-series splits | L1 | 30 | yes | multiple_choice, code_tests | needs_human_review |  |
| `ml.core.linear-regression` | Linear regression | L1 | 40 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `ml.core.metrics-interpret` | Interpret RMSE/MAE for ops alerts | L1 | 25 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `ml.core.rolling-validation` | Rolling-origin validation and scaled errors | L1 | 40 | no | exact_numeric, code_tests… | needs_human_review |  |

### `sys.twin` — Digital twin modelling

**Order:** 5 · **Node:** `sys` · **Skills:** 7 · **Core:** ~5.1 h [P]

**Outcomes (after this module):**
- Run a physical model of the device beside live telemetry.
- Calibrate it from bench data and report its error.
- Alert on the residual between model and measurement.

**Evidence path:** L11 accepted artifact: predicted against measured trace plus a residual alert fired by a real fault
**Projects (ladder touch):** prj.L11.telemetry-lakehouse
**Checkpoints / assessment:** Log verification on a replayed run
**Hard task (unaided):** Calibrate on one run, predict a different profile with intervals before seeing it, then detect a blind fault and report latency and false alarms.
**Confusable set:** dashboard-vs-twin
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sys.twin.closed-decision` | Closed decision: twin changes a limit with human approval | L1 | 45 | no | measurement_check, human_review | needs_human_review |  |
| `sys.twin.model-calibration` | Calibrate a twin from bench data | L1 | 50 | no | measurement_check, exact_numeric | needs_human_review |  |
| `sys.twin.residual-alert` | Residual monitoring and alerts | L1 | 30 | no | measurement_check, code_tests | needs_human_review |  |
| `sys.twin.state-estimation` | Twin state estimation with a Kalman filter | L1 | 50 | no | code_tests, measurement_check | needs_human_review |  |
| `sys.twin.state-model` | State model of a physical subsystem | L1 | 50 | no | multiple_choice, exact_numeric… | needs_human_review |  |
| `sys.twin.uncertainty-thresholds` | Residual thresholds from uncertainty | L1 | 35 | no | exact_numeric, measurement_check | needs_human_review |  |
| `sys.twin.vvuq` | Verification, validation and uncertainty for twins | L1 | 45 | no | multiple_choice, rubric_llm… | needs_human_review |  |

### `ml.pred` — Prognostics and anomaly detection

**Order:** 6 · **Node:** `ml` · **Skills:** 4 · **Core:** ~2.1 h [P]

**Outcomes (after this module):**
- Beat a trivial baseline before claiming a detector works.
- Score anomaly detectors honestly, without point adjustment.
- Combine physics residuals with data on real device logs.

**Evidence path:** Eval report on L6 and L11 logs with a labelled injected fault and a trivial baseline
**Projects (ladder touch):** prj.L11.telemetry-lakehouse
**Checkpoints / assessment:** Numeric eval plus rubric_llm with human sign-off
**Hard task (unaided):** Compare a detector with a trivial baseline on a blind log using event-level precision, recall and delay, and report it if the baseline wins.
**Confusable set:** point-vs-event-scoring, anomaly-vs-prognosis
**Template plan [P]:** ~10 templates; sources are listed in SYLLABUS-GUIDE.md

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ml.pred.anomaly-evaluation` | Honest anomaly detection evaluation | L1 | 35 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ml.pred.baselines` | Trivial baselines for telemetry | L1 | 25 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `ml.pred.physics-residuals` | Physics residuals as model features | L1 | 35 | no | measurement_check, exact_numeric | needs_human_review |  |
| `ml.pred.rul-literacy` | Remaining useful life literacy | L1 | 30 | no | multiple_choice, rubric_llm | needs_human_review |  |

### `ml.ops` — Production ML ops literacy

**Order:** 7 · **Node:** `ml` · **Skills:** 5 · **Core:** ~2.7 h [P]

**Outcomes (after this module):**
- Document evals, monitoring and rollback for a deployed model slice.
- Relate cloud cost and latency to batch vs streaming inference [P].

**Evidence path:** L11 eval report + monitoring checklist
**Projects (ladder touch):** prj.L11.telemetry-lakehouse
**Checkpoints / assessment:** Rubric_llm with human sign-off
**Hard task (unaided):** Given a degraded model and logs, locate the cause among skew, recalibration and drift, then ship a rollback decision with evidence.
**Confusable set:** offline-vs-online-metrics
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ml.ops.cost-latency` | Cost and latency trade-offs in production | L1 | 25 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `ml.ops.evals` | Eval suites and acceptance thresholds | L1 | 35 | no | multiple_choice, rubric_llm… | needs_human_review |  |
| `ml.ops.monitoring-drift` | Data drift monitoring basics | L1 | 30 | yes | multiple_choice, measurement_check | needs_human_review |  |
| `ml.ops.shadow-canary` | Versioning, shadow and canary releases | L1 | 35 | no | multiple_choice, human_review | needs_human_review |  |
| `ml.ops.training-serving-skew` | Training-serving skew and feedback loops | L1 | 35 | no | multiple_choice, measurement_check | needs_human_review |  |

### `ml.edge` — Edge inference and quantization

**Order:** 8 · **Node:** `ml` · **Skills:** 4 · **Core:** ~2.4 h [P]

**Outcomes (after this module):**
- Quantize a small model for microcontroller or companion SBC class hardware.
- Compare accuracy vs latency on device [P].

**Evidence path:** Bench log + before/after metrics
**Projects (ladder touch):** prj.L11.telemetry-lakehouse (edge slice optional)
**Checkpoints / assessment:** Numeric compare on INT8 vs FP32 [P]
**Hard task (unaided):** Deploy under stated RAM, flash and deadline budgets, prove worst-case timing with hardware, and report on-device accuracy.
**Confusable set:** quantization-calibration
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ml.core.neural-network-basics` | Neural network basics for inference | L1 | 40 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `ml.edge.deploy` | Deploy quantized model to edge runtime | L1 | 40 | no | code_tests, measurement_check | needs_human_review |  |
| `ml.edge.quantization` | Quantization for edge inference | L1 | 40 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `ml.edge.tensor-memory` | Tensor memory budget on device | L1 | 25 | yes | exact_numeric, multiple_choice | needs_human_review |  |

### `ml.llm` — Production LLM systems

**Order:** 9 · **Node:** `ml` · **Skills:** 4 · **Core:** ~2.2 h [P]

**Outcomes (after this module):**
- Build an LLM feature with structured outputs and an offline eval set.
- Evaluate retrieval and agents with measurable criteria.
- Treat all retrieved and user text as untrusted.

**Evidence path:** Eval report and adversarial test results for an LLM feature over L11 logs
**Projects (ladder touch):** prj.L11.telemetry-lakehouse (optional analysis slice)
**Checkpoints / assessment:** Rubric_llm with human sign-off
**Hard task (unaided):** Run an agent over L11 logs with one write tool and a planted injection; the unauthorised action must be impossible by design, with a repeated-trial regression eval.
**Confusable set:** prompt-injection-vs-jailbreak, retrieval-vs-generation-failure
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `ml.llm.agent-evals` | Evaluating agents and tool use | L1 | 35 | no | rubric_llm, human_review… | needs_human_review |  |
| `ml.llm.prompt-injection` | Prompt injection and least privilege | L1 | 30 | no | multiple_choice, code_tests… | needs_human_review |  |
| `ml.llm.retrieval-evals` | Retrieval design and evals | L1 | 35 | no | rubric_llm, exact_numeric | needs_human_review |  |
| `ml.llm.structured-outputs` | Structured outputs and schema validation | L1 | 30 | no | code_tests, multiple_choice… | needs_human_review |  |

## Ladder skill map [P]

| Ladder | Terminal skills / modules |
|--------|---------------------------|
| L11 lakehouse and twin | `sys.twin.residual-alert`, `sys.telemetry.schema-version`, `ml.ops.evals`, secure uplink checklist |

## Sequencing notes

- Same pedagogy as foundation: verified templates, strict-unaided checkpoints, project credit caps (contract §7).
- Hardware phases: `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.
- Sketch projects: `content/extended-project-ladder-sketch.yaml`.
- Regenerate this file after editing `spine-module-plan.yaml` or promoting stubs in `mvp-skill-graph.yaml`.
