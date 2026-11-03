# Polymath app - implementation specification package

Version 1.1, 31 October 2026 (lean slice plan added). An implementation-ready specification for a mobile-first adaptive learning app (PWA) that takes one adult learner from near-zero to working knowledge in a vertical slice of hardware and software engineering, using spaced retrieval, graded feedback, a guarded AI tutor, execution-based grading and guided physical builds. The builder is a solo founder (full-time job, about 8 hours a week) working with AI coding agents.

The app makes no neuroscience, neurostimulation or "top 1 percent" claims (contract section 8).

Evidence tags used everywhere: **[V]** source opened and read, **[S]** snippet only, **[R]** recalled and unverified, **[P]** or **[inf]** design proposal or inference. Anything not tagged [V] is a hypothesis for the evaluation plan, never a fact in product copy.

## Recommended path

Do not build the whole package. The estimates say the full plan is a multi-year project for one part-time person (about 770 founder hours central, range 520 to 1,180; doc 13 section 3.3), and nothing yet shows that the loop works for the one user who matters. Recommended order [P]:

1. **Phase -1, four weeks, no code** (`docs/00d-lean-slice-plan.md` section 4, task BL-0182): an Anki deck with FSRS, problem sheets from the Python generators in `reference/verifiers`, a spreadsheet log. It tests the habit and the shape of retention and costs about 6 hours beyond the study itself. Its result decides go, adjust or stop.
2. **Build the lean slice** (the 83 tasks with `lean: true` in `backlog/backlog.yaml`, plan in `docs/00d-lean-slice-plan.md`): about 233 founder hours of building (156 to 351), first daily use after about 170 of them. At 8 h/week with 2.5 h reserved for learning that is first use in August 2027 and completion in October 2027; at 5 h/week, December 2027 and May 2028. Learning hours are reserved before building hours (R-22).
3. **Go/no-go four weeks after first use** (BL-0181, scorecard in 00d section 8). Record the outcome in **`docs/CHANGELOG.md`**. Only then start one deferred group (D1 to D9), chosen by the largest pain logged in use. Automated builds follow **`docs/lean-build-gate.md`** and **`docs/factory-wave-manifest.md`** until BL-0181 closes.

Everything else in this package stays valid as the specification of the full product; the lean slice is a strict subset of it (same schema, IDs and contract).

## 1. Index of documents

"Owner" is the role that decides changes to the document; in this project the founder approves everything.

| File | Purpose in one line | Owner role |
|---|---|---|
| `docs/00-contract.md` | Shared contract: stack, ids, enums, entities, behaviours, claims policy (v1.1). Source of truth | Product / architecture |
| `docs/00a-change-decisions.md` | Binding rulings on every contract change request; wins over any document | Product / architecture |
| `docs/00b-consistency-report.md` | What the reconciliation changed and which checks were run | Integrator |
| `docs/00d-lean-slice-plan.md` | Lean slice (walking skeleton), Phase -1 no-build pre-experiment, week-by-week plans at 8 and 5 h/week, deferred groups D1 to D9 with re-entry points, go/no-go scorecard. A plan, not a contract change | Planning |
| `docs/lean-build-gate.md` | Factory rule: only `lean: true` backlog tasks until BL-0181; one D-group after go/no-go | Planning |
| `docs/factory-wave-manifest.md` | Ordered build waves (lean 83 tasks) and green commands per wave | Planning |
| `docs/content-authoring-runbook.md` | Template G0–G3 workflow, LLM policy, factory content rules | Content |
| `docs/architecture-index.md` | Navigation hub for architecture, data, API, content oracles | Architecture |
| `docs/spine-promotion-policy.md` | When spine-only skills enter `mvp-skill-graph.yaml` | Curriculum |
| `docs/00e-founder-operating-rules.md` | Founder dark-factory weekly rules (planning) | Planning |
| `docs/content-population-roadmap.md` | Counts and skill slice from zero templates to MVP pool | Content |
| `docs/CHANGELOG.md` | Go/no-go and scope decisions (required before D1–D9) | Planning |
| `content/REVIEW-LOG.md` | G3 and hand-solve log for verified templates | Content |
| `docs/01-PRD.md` | At a glance, problem, personas, epics, user stories (US-), functional requirements (FR-), NFRs, milestones M0 to M5 with honest timelines, open questions | Product |
| `docs/02-learning-science-spec.md` | Mechanisms (M01 to M13), parameters (PRM-), evidence tags and what may not be claimed | Learning science |
| `docs/03-architecture.md` | Containers, flows, job queue, environments, cost model, repository layout, ADRs | Architecture |
| `docs/04-data-model.md` | Tables, enums, indexes, RLS, retention, migration strategy | Data |
| `docs/05-skill-graph-and-curriculum-spec.md` | What a skill is, tiers L0 to L3, graph rules, the MVP graph, diagnostic design | Curriculum |
| `docs/06-learner-model-and-scheduler-spec.md` | FSRS usage, mastery rule, Elo model, frontier, session builder, weekly plan (canonical for these) | Scheduler |
| `docs/07-content-pipeline-and-verification-spec.md` | Template format, generation, independent verification, QA gates, content:sync | Content |
| `docs/08-grading-and-tutor-spec.md` | Graders, sandbox requirements, tutor policy, hint ladder, adversarial suite | Grading / tutor |
| `docs/09-ux-and-flows.md` | Information architecture, screens S01 to S20, wireframes, flows, accessibility, copy guide | UX |
| `docs/10-build-projects-and-verification-spec.md` | Project ladder L0 to L5, safety rules, evidence verification, nonce challenges, golden builds | Projects |
| `docs/11-evaluation-and-experiment-plan.md` | Hypotheses, outcome measures, n-of-1 and beta designs, event catalogue, decision rubric | Evaluation |
| `docs/12-security-privacy-compliance.md` | Threat model, sandbox, LLM security, RLS testing, privacy, incident response, security tests (ST-) | Security |
| `docs/13-roadmap-and-backlog.md` | Build strategy, milestones with hours, founder-attention model and sensitivity table, lean slice, build order, cut list, definition of done, agent workflow, cadence | Planning |
| `docs/14-risk-register.md` | 25 risks with indicators, mitigations, owners and linked tasks | Planning |
| `docs/15-cyber-physical-capability-spine.md` | Long-term tracks (dual-use, defense context, AI, cyber, physical builds), ladder L6–L13, spine ACs (planning) | Product |
| `docs/16-capability-outcomes.md` | Credible outcomes after the full spine (planning) | Product |
| `docs/17-hardware-tools-and-bom.md` | Phased hardware, tools and BOM (foundation + spine) | Curriculum / projects |
| `backlog/backlog.yaml` | Machine-readable backlog: epics and tasks (BL-) with dependencies, references, acceptance tests, estimates, `lean` and `lean_phase` tags, the founder-attention model | Planning |
| `CLAUDE.md` | Rules for AI coding agents; copy to the root of the app repository | Planning |
| `schemas/schema.sql` | Postgres baseline schema with RLS and functions | Data |
| `schemas/api.openapi.yaml` | HTTP API (operationIds referenced by the backlog) | Architecture |
| `schemas/*.schema.json` | JSON Schemas for skill nodes, problem templates and projects | Content / projects |
| `content/mvp-skill-graph.yaml`, `content/project-ladder.yaml`, `content/lean-skill-slice.yaml` | Curriculum, project ladder, BL-0067 lean skill keys | Curriculum / projects |
| `content/syllabi/` | **Pillar syllabi** (T0 foundation + T1–T6 spine); regenerate with `reference/generate_pillar_syllabi.py` | Curriculum |
| `content/capability-tracks.yaml`, `content/extended-project-ladder-sketch.yaml`, `content/hardware-phases.yaml` | Long-term tracks, L6–L13 keys, phased buying (planning; not synced in v1) | Curriculum / projects |
| `content/sample-problem-templates/`, `content/templates/`, `content/lean-template-manifest.yaml`, `content/safety/` | Sample templates, lean production pool (BL-0065/0066), safety briefs | Content / tutor |
| `content/prompts/` | Tutor, rubric and drafting prompts | Content / tutor |
| `reference/` | Reference implementations, validators and test vectors that act as oracles for ports | Various |

**Documentation overview (HTML, local file; no server):**

- **`docs-site/index.html`** — reader-oriented overview, topic summaries, specification index
- **`docs-site/concept.html`** — plain-language concept explainer (tabs, ladder demo)
- **`docs-site/architecture-explainer.html`** — build/architecture explainer (containers, grading paths)

Implementation agents use `docs/*.md`, `backlog/backlog.yaml`, and `CLAUDE.md` as authoritative sources.

## 2. How to read this in 30 minutes

| Minutes | Read | Why |
|---|---|---|
| 5 | `docs/00-contract.md` sections 1, 5, 7, 8, 9 | The product in one paragraph, the enums, the behaviours and the claims policy |
| 3 | `docs/00a-change-decisions.md` | Where the contract was amended |
| 5 | `docs/01-PRD.md` sections 1.3, 1.4, 4, 10, 12 | What is unproven, concept refinements, goals and non-goals, milestones, open questions |
| 5 | `docs/13-roadmap-and-backlog.md` sections 3, 5, 8 | The plan, the honest timeline finding, the cut list, the agent workflow |
| 5 | `docs/00d-lean-slice-plan.md` sections 1, 4, 6, 8 | The lean slice, Phase -1, the time split, the go/no-go |
| 4 | `docs/architecture-index.md` then `docs/03-architecture.md` §1–3, §13 | Architecture navigation and containers |
| 3 | `docs/06-learner-model-and-scheduler-spec.md` section 4 | The mastery rule, the heart of the product |
| 3 | `docs/14-risk-register.md` section 2 | The risk matrix |
| 2 | this README sections 6 to 8 | What is validated, what is not, what you must decide |

## 3. Build order

This is the order of the full plan. The recommended path above builds only the lean slice (layers 1 to 6 and a few project and operations tasks) first and defers the rest to groups D1 to D9.

Summary (details, task ids and the critical path are in `docs/13-roadmap-and-backlog.md` section 4):

1. Repository, CI, boundary lint, secrets scan, claims lint.
2. Data model (migrations from `schemas/schema.sql`), RLS suite, content schemas, template engine, verification, job queue, `content:sync`.
3. Auth, API skeleton, numeric and multiple-choice grading in TypeScript, the first served verified item. **M0 exit.**
4. Scheduler (all reference vectors), FSRS adapter, apply-attempt, item pool, session builder, learning loop.
5. Symbolic grading, content lint and fuzz, report and review console; learner UI and the PWA shell. **M1 exit.**
6. Guarded tutor with the attempt-first gate and adversarial suite; sandbox with code-test and SPICE grading; diagnostic, checkpoints, focus sessions; experiments; offline basics. **M2 exit.**
7. Projects, nonce challenges, evidence upload and verification, founder review UI, lab blocks; delayed tests. **M3 exit.**
8. Transfer tasks, analysis export, privacy export and delete, security release gate, legal and ethics review. **M4 exit.**
9. Offline and PWA hardening, beta machinery, then L5 and KiCad last. **M5.**

## 4. Using the package with AI coding agents

1. Put the whole package in the app repository: `docs/`, `schemas/`, `reference/`, `content/`, `backlog/`, and `CLAUDE.md` at the root.
2. Hand the agent one backlog task at a time (`backlog/backlog.yaml`, `owner: agent`). Attach what `docs/13-roadmap-and-backlog.md` section 8.2 lists for the kind of task. Always attach `CLAUDE.md`, `docs/00-contract.md`, `docs/00a-change-decisions.md` and the task's YAML block.
3. The agent writes the failing acceptance test first, implements, runs the commands and pastes the output. The founder reviews the diff with the checklist in section 8.5 of doc 13.
4. The reference oracles that agents port against: `reference/scheduler_test_vectors.json` (scheduler), `reference/verifiers/tests/grader_vectors.json` (graders), `reference/verifiers/*` (graders, template engine, SPICE and code runners), the sample templates and the validators.

Which files to attach, in short:

| Task kind | Attach |
|---|---|
| Scheduler, session builder | docs 06, `reference/scheduler_reference.py`, vectors |
| Graders | doc 08 sections 1 to 4, `reference/verifiers/` |
| Tutor | doc 08 sections 5 to 10, `content/prompts/tutor_v1.md`, doc 12 section 4 |
| Content pipeline | doc 07, `schemas/problem-template.schema.json`, sample templates |
| Database, RLS | `schemas/schema.sql`, doc 04, doc 12 section 7 |
| UI | doc 09 (the screen), `schemas/api.openapi.yaml` |
| Projects, evidence | doc 10, `content/project-ladder.yaml`, `reference/validate_projects.py` |
| Security tests | doc 12 section 13 |

## 5. Validation commands (run from the package root)

```
python3 reference/validate_graph.py
python3 reference/validate_projects.py
python3 reference/validate_templates.py
python3 reference/verifiers/verify_template.py
(cd reference/verifiers && python3 -m pytest tests -q)
python3 reference/scheduler_reference.py selftest
python3 reference/scheduler_reference.py check reference/scheduler_test_vectors.json
python3 reference/validate_backlog.py
python3 reference/validate_lean_manifest.py
python3 reference/validate_safety_briefs.py
python3 reference/check_package.py
```

`validate_backlog.py` also validates the lean fields and prints the lean totals.

Python 3 with PyYAML, jsonschema, SymPy, pint, NumPy and pytest is needed; ngspice must be installed for the SPICE tests. `validate_backlog.py` reads the PRD, the schema, the OpenAPI file, the risk register and the backlog, prints totals per milestone, cut-tier totals, the critical path, the lean slice totals (tasks, founder hours low/central/high, weeks at 8 and 5 h/week), the full-plan range and the deferred groups, checks that lean tasks depend only on lean tasks, and exits non-zero on any inconsistency. Re-run it after any change to those files.

## 6. Status of the package (re-run validators after edits)

**Validated by running code in this environment** (re-run the commands in section 5 before relying on them):

| Check | Result (typical when green) |
|---|---|
| `check_package.py` | 0 findings (checks a–i) |
| `validate_graph.py` | PASS, 0 errors, 0 warnings |
| `validate_projects.py` | 0 errors, 0 warnings (6 projects, 69 steps) |
| `validate_templates.py` | all sample + `content/templates/` YAML valid |
| `validate_lean_manifest.py` | 30 templates ↔ 19 lean skills |
| `validate_safety_briefs.py` | L0 brief present (`content/safety/`) |
| Lean templates G2 | 200-sample fuzz pass via `reference/verifiers/verify_template.py` |
| `reference/verifiers` pytest | 119 passed, 6 skipped by design |
| `scheduler_reference.py` | selftest ok; all vectors in `scheduler_test_vectors.json` pass |
| `validate_backlog.py` | PASS |
| **Founder G3** | `REVIEW-LOG.md` hand-solve rows still **your** attestation |
| `schemas/schema.sql` | Per doc 04 section 14, parsed and applied on PostgreSQL 16 with stubbed Supabase schemas (when run) |

**Only written, not executed or checked by a tool:**

- All prose documents (their internal consistency was reviewed by hand and in `00b-consistency-report.md`, not by a tool).
- `schemas/api.openapi.yaml` consistency with the handlers (no handlers exist yet).
- Everything about the future TypeScript code, the worker service, the sandbox, the tutor with a real model, Supabase-specific behaviour, Fly.io isolation, Web Push on iOS.
- KiCad checks (kicad-cli is not installed here), all hardware thresholds (provisional until golden builds exist), BOM prices (unverified).
- All hour estimates, dates, probabilities and ratings in docs 13, 14 and 00d, including the founder-attention model and the Phase -1 thresholds ([P], unvalidated).

**Unverified external facts** (verify when building): vendor prices and limits (doc 03 section 12, recalled), Supabase and Fly.io feature behaviour (OA-1, OA-2), `ts-fsrs` licence and FSRS-6 parameters (OA-3), Anthropic model names, prices and data terms (OA-5), iOS Web Push behaviour (OA-7), all legal statements in doc 12 (marked for legal review).

## 7. Folder tree

```
polymath-app-spec/
  README.md
  CLAUDE.md
  docs/        00-contract.md  00a-change-decisions.md  00b-consistency-report.md
               01-PRD.md  02-learning-science-spec.md  03-architecture.md  04-data-model.md
               05-skill-graph-and-curriculum-spec.md  06-learner-model-and-scheduler-spec.md
               07-content-pipeline-and-verification-spec.md  08-grading-and-tutor-spec.md
               09-ux-and-flows.md  10-build-projects-and-verification-spec.md
               11-evaluation-and-experiment-plan.md  12-security-privacy-compliance.md
               13-roadmap-and-backlog.md  14-risk-register.md  15-cyber-physical-capability-spine.md
               16-capability-outcomes.md  17-hardware-tools-and-bom.md  00d-lean-slice-plan.md
  backlog/     backlog.yaml
  schemas/     schema.sql  api.openapi.yaml  skill-node.schema.json
               problem-template.schema.json  project.schema.json
  content/     mvp-skill-graph.yaml  project-ladder.yaml  capability-tracks.yaml  extended-project-ladder-sketch.yaml
               prompts/ (tutor_v1.md  rubric_grader_v1.md  template_assist_v1.md)
               sample-problem-templates/ (7 templates)
  reference/   scheduler_reference.py  scheduler_test_vectors.json
               validate_graph.py  validate_projects.py  validate_templates.py  validate_backlog.py
               verifiers/ (graders, template engine, SPICE and code runners, tests/)
```

## 8. Most important open questions for the founder

1. **Which reading of the timeline do you accept?** The backlog totals 1,095.5 hours of task size, about 768 founder hours in the central case of the model (523 to 1,180); the original PRD windows implied about 360. Doc 13 sections 3.1 and 3.3 give the readings, the sensitivity table and the cut list. Run Phase -1 first, then build the lean slice (about 233 hours), and re-fit the model after the first 10 tasks (doc 13 section 9). Decide in advance what you will cut.
2. **Build hours versus learning hours.** The 8 hours a week cannot be spent twice. The plan reserves 2.5 h for learning and 0.75 h for review at 8 h/week (1.5 h and 0.5 h at 5 h/week), leaving 4.75 h (3.0 h) for building (doc 13 PA-9, 00d section 6). Confirm the split before week 1.
3. **Region and data residency (OQ-02).** Default in the package: an EU Supabase region and no minors. Decide before creating the first project (task `f-accounts`).
4. **Monthly LLM budget (OQ-06)** and caps (doc 03 section 12).
5. **Starter-kit bill of materials and who pays (OQ-04).** BOM figures in doc 10 are unverified; order the kit before M3.
6. **Do you want the closed beta at all?** It costs about 115 hours in M5 plus the pre-registration, legal review and recruitment. Dropping it (cut option S1) leaves a personal tool and an n-of-1 study. The lean slice defers the beta (group D9) until after a go decision.
7. **Legal and ethics review budget (OQ-02, OQ-03, OQ-07).** Is a bounded counsel review affordable before the first external user? Credentials are out of scope by default.
8. **Track ordering after the first walk (OQ-08):** default is doc 15 (power → control → mechanical → UAV → cloud twin → governance); confirm multirotor-first and EU UAS ops.
9. **Does off-app study count toward the 8 hours (OQ-09)?** Default: a weekly one-question self-report.
10. **Hosting plan for a beta:** Vercel Hobby terms may exclude it; Pro is the safe assumption (OA-4).

## 9. Backlog validation output (recorded on 31 October 2026 after review pass 3)

```
MS   tasks    hours  agent_h founder_h   cum_h  cum_weeks@8h
M0      36    147.0    131.0      16.0   147.0          18.4
M1      48    244.5    200.5      44.0   391.5          48.9
M2      44    263.0    233.0      30.0   654.5          81.8
M3      31    189.0    130.0      59.0   843.5         105.4
M4      20    138.0     62.0      76.0   981.5         122.7
M5      16    114.0     53.0      61.0  1095.5         136.9
ALL    195   1095.5    809.5     286.0
cut tiers (1 = core, 2 = important, 3 = stretch, cut first): tier 1: 123 tasks 666 h (83 weeks@8h); tier 2: 55 tasks 316 h (40 weeks@8h); tier 3: 17 tasks 113 h (14 weeks@8h)
critical path (longest dependency chain by estimate): 38 tasks, 253.0 h
  BL-0001 > BL-0002 > BL-0005 > BL-0014 > BL-0015 > BL-0017 > BL-0025 > BL-0026 > BL-0027 > BL-0032 > BL-0033 > BL-0035 > BL-0036 > BL-0037 > BL-0044 > BL-0191 > BL-0059 > BL-0060 > BL-0063 > BL-0069 > BL-0070 > BL-0071 > BL-0113 > BL-0114 > BL-0115 > BL-0116 > BL-0139 > BL-0143 > BL-0144 > BL-0145 > BL-0159 > BL-0160 > BL-0168 > BL-0169 > BL-0170 > BL-0171 > BL-0176 > BL-0177

LEAN SLICE (tasks with lean: true) - hours are founder-attention hours from the model in meta.founder_attention_model [P]
phase  tasks   est_h     low  central    high
L0         2    11.0     9.9     11.0    15.4
L1        32   130.0    44.8     70.0   106.0
L2        32   162.5    60.5     92.6   140.1
  -> through L2 (first daily use): est 303.5 h; model low/central/high 115/174/261 h
L3        17    92.0    45.9     65.1    97.6
LEAN TOTAL: 83 tasks, estimate 395.5 h, founder hours low/central/high = 161/239/359
  weeks at 8 h/week, all hours on building (raw estimate / 8): 49
  weeks at 8 h/week with learning 2.5 h + review 0.75 h reserved (build 4.75 h/week): low 34 / central 50 / high 76
  weeks at 5 h/week with learning 1.5 h + review 0.5 h reserved (build 3.0 h/week): low 54 / central 80 / high 120
LEAN CORE (without the 5 optional tasks BL-0117, BL-0118, BL-0178, BL-0179, BL-0180): 78 tasks, estimate 366.5 h, founder hours low/central/high = 147/218/328
FULL PLAN: 195 tasks, estimate 1095.5 h, founder hours low/central/high = 523/768/1180
  weeks at 8 h/week with learning reserved (build 4.75 h/week): low 110 / central 162 / high 248
  weeks at 5 h/week with learning reserved (build 3.0 h/week): low 174 / central 256 / high 393
DEFERRED: 112 tasks, estimate 700.0 h, founder hours low/central/high = 362/529/821
  D1:  15 tasks, est   59.0 h, central   31.1 h  Operations hardening, monitoring, security suites and production environment
  D2:  17 tasks, est   94.0 h, central   50.6 h  Guarded tutor, rubric grader, EXP-001 and the M2 exit gate
  D3:   7 tasks, est   60.0 h, central   40.6 h  Sandboxed code and SPICE grading and the templates that need them
  D4:  16 tasks, est   82.0 h, central   40.8 h  Diagnostic, checkpoints, delayed tests, weekly plan, full focus builder, extra task kinds, transfer tasks
  D5:   6 tasks, est   29.0 h, central   16.5 h  Experiment framework, analysis export and dashboards
  D6:   4 tasks, est   28.0 h, central   13.2 h  Offline pack, outbox and push
  D7:  28 tasks, est  219.0 h, central  220.4 h  Verified projects - kit, golden builds, nonce challenges, evidence verification, lab runner, credit ledger, KiCad
  D8:   9 tasks, est   63.0 h, central   63.7 h  Measurement-grade release gate - privacy, legal and ethics review, security release gate, content defect audit
  D9:  10 tasks, est   66.0 h, central   52.2 h  Multi-user closed beta
NOTE: all estimates are unvalidated proposals [P]; weeks assume 8 h/week and one person working serially.
RESULT: PASS (0 errors, 0 warnings)
```
