# 00d - Lean slice plan (walking skeleton) and no-build pre-experiment

Status: v1.0, 31 Oct 2026. This document is a **plan, not a contract change**. It adds no entity, enum, table, operationId or ID to the contract. The lean slice is a strict subset of the full backlog: the same schema, the same IDs, the same contract (`00-contract.md`), the same rulings (`00a-change-decisions.md`, which wins on any conflict). New backlog tasks added for it are BL-0178 to BL-0182; review pass 3 (31 Oct 2026) added BL-0183 to BL-0195, ten of them lean (section 5). Companions: `13-roadmap-and-backlog.md` (estimates, the founder-attention model in doc 13 section 3.3, the cut list), `14-risk-register.md` (R-22 to R-25), `01-PRD.md` (milestones), `backlog/backlog.yaml` (fields `lean` and `lean_phase` on every task), `lean-build-gate.md` and `factory-wave-manifest.md` (automated build order until BL-0181), `content-authoring-runbook.md` and `content-population-roadmap.md` (templates), `CHANGELOG.md` (go/no-go record).

Evidence tags follow the contract. **Every hour, week, date, threshold and probability in this document is [P], an unvalidated proposal.** No source measured how long this product takes one person to build or whether a four-week pilot predicts a habit. The numbers exist so that decisions can be made and falsified early.

## 1. At a glance

| Question | Answer [P] |
|---|---|
| What is the lean slice? | The smallest build that lets the founder study daily with the real loop: skill graph from `content/mvp-skill-graph.yaml`, per-skill FSRS review, frontier selection, the session builder (micro and focus), numeric, symbolic and multiple-choice grading in the web app, worked example then faded problem then retrieval, a progress view for the founder, 30 to 40 hand-verified templates, and a manual notes-and-photo project log. 83 backlog tasks are tagged `lean: true`, including a guided week-1 blink build (BL-0183, step `prj.L0.blink-led#s09`) so that the first physical win comes in the first weeks. |
| What does it leave out? | The LLM tutor, sandboxed code and SPICE grading, KiCad, automated evidence verification and nonce challenges, the experiment framework UI, offline pack and push, the diagnostic, checkpoints, the beta. Nine named deferred groups (D1 to D9, section 7) with exact tasks and re-entry points. |
| Before building anything | **Phase -1** (section 4): a 4-week no-build pre-experiment with an Anki deck, problem sheets from the sample template generators and a spreadsheet. About 6 founder hours plus the study itself; BL-0183 adds 5 hours of bench preparation (kit order, ready-made blink file, one-page safety brief) in the same weeks. |
| Honest cost of the lean build | **233 founder hours central, range 156 to 351** (model in doc 13 section 3.3; excludes the 6 hours of Phase -1; review pass 3 added about 20 hours). Without the five optional tasks: **212 hours central, range 142 to 320**. The target was raised from 100-200 to 100-225 hours when the review pass added tasks; the core meets it at the central estimate (218 h including Phase -1), not at the high estimate. |
| First daily use of the app | About **168 founder hours** of building (110 to 253): week 40 (Monday 2 August 2027) at 8 h/week, week 60 (20 December 2027) at 5 h/week, with learning time reserved. |
| Lean slice complete | Week 52 (late October 2027) at 8 h/week; week 80 (May 2028) at 5 h/week. Add about 25 percent for holidays and illness. |
| Learning time | Reserved first: 2.5 h/week of 8, 1.5 h/week of 5. Until the app can carry the learning the Phase -1 stack does. |
| Go/no-go | Four calendar weeks after the first day of use (task BL-0181), with the scorecard of section 8. |
| What is still large | The full plan: about 768 founder hours central (523 to 1,180), which is 162 weeks (about 3 years) at 8 h/week with learning reserved. The lean slice does not fix that; it makes the decision to continue evidence-based. |

## 2. Why a lean slice, and what it is not

The package describes six milestones and 195 tasks. A fully honest reading of the estimates (doc 13 section 3.3) says the full product is a multi-year solo project, and nothing in it has yet shown that the founder will study daily with the loop. R-22 (the 8 hours cannot be spent twice) and R-23 (building everything before validating the loop) are the reason for this document.

The lean slice is **not** a new product and not a fork. It is almost exactly M0 plus M1 of the existing plan, with five tasks removed (BL-0020, 0030, 0053, 0062, 0068), three tasks pulled from later milestones (BL-0103 backup drill; BL-0117 and 0118, project sync and routes, which the project log needs), and five tasks added (BL-0178 to BL-0182), plus ten lean tasks added by review pass 3 (BL-0183 guided blink preparation; BL-0184 to BL-0187 scheduler ports of the applied-gap, span, template-diversity, placement-grace and retention rules; BL-0190 getProgress; BL-0191 dry_run; BL-0193 graph-content sync; BL-0194 and BL-0195 claims-lint and package checks). Every M0 and M1 functional requirement in doc 01 section 10 remains demonstrable, except that the settings screen (BL-0062, FR-024's UI) is deferred; the new-material cap itself (BL-0046) is in. What this document adds to the existing plan:

1. a no-build experiment first (Phase -1);
2. honest founder-hour estimates and a week-by-week plan that protects learning time;
3. a go/no-go checkpoint with a scorecard;
4. named re-entry points for everything deferred, so that deferral is a decision and not an accident.

PRD section 1.4 (concept refinements) is positioning and later UX. It does not add lean tasks, tables or a simulator. The lean progress page (BL-0061) shows the next competence artifact using existing project-log and skill-state data.

**Rules for the lean slice**

1. A strict subset: no new tables, columns, enums, event names or routes, except those added by a 00a decision (H18). Where a lean task is smaller than its full counterpart (BL-0178 versus BL-0087; BL-0179 versus BL-0119 to BL-0126), the full task later extends it without a migration.
2. Never serve an unverified item (FR-060, SM-06). Claims lint, secrets scan and the RLS suite are in the lean set. Not cut: the verification and serve gates, RLS suite, secrets scan, claims lint, scheduler vector tests, backup drill (BL-0103).
3. One recorded exception to doc 13's "never cut" list: unaided checkpoints (BL-0092) are deferred to D4. The lean slice has no tutor and no hint ladder, so every attempt is unaided by construction (00a B1), and the checkpoint's integrity purpose is not yet at risk. Rule: **D4's checkpoint tasks must ship no later than the tutor (D2).**
4. No external user before D1 and D8 (the PRD rule of no external users before M4 exit is unchanged).

## 3. What the lean slice contains

### 3.1 Capabilities and the tasks that deliver them

| Capability the founder gets | Delivered by (lean tasks) |
|---|---|
| Sign in on the phone, set a weekly target | BL-0021, BL-0023, BL-0028, BL-0059 |
| Skill graph loaded from `content/mvp-skill-graph.yaml` (160 entries: 142 skills and 18 stubs; a 15 to 20 skill slice reviewed) | BL-0013, BL-0018, BL-0049, BL-0067 |
| Frontier selection with reasons | BL-0036, BL-0048, BL-0061 |
| Per-skill FSRS review, review log, mastery rule | BL-0034, BL-0035, BL-0040, BL-0041, BL-0042 |
| Session builder, micro (5 to 20 min) and focus (45 to 120 min), daily new-material cap | BL-0037, BL-0044, BL-0046, BL-0178 |
| Worked example, faded problems, same-day retrieval, fresh variants, confidence before feedback | BL-0043, BL-0045, BL-0047, BL-0060 |
| Numeric, multiple-choice and symbolic grading in the web app | BL-0019, BL-0026, BL-0054, BL-0055 |
| Verification before serving, quarantine on report | BL-0015, BL-0017, BL-0025, BL-0050 to BL-0052, BL-0056, BL-0057 |
| 30 verified templates (40 with the optional top-up) | BL-0031, BL-0065, BL-0066, BL-0180 |
| Founder view of progress: map, due inbox, progress page with the next competence artifact (01 section 1.4 / FR-090; no new task) | BL-0061 |
| Installable PWA, accessibility baseline | BL-0063, BL-0064 |
| Manual project evidence (notes and photos, no automated verification, no credit), including the guided week-1 blink (steps s01, s02, s09; a safety-gated step stays locked until its brief exists) | BL-0117, BL-0118, BL-0179, BL-0183 |
| Scheduler rules added by the review pass: applied-gap and `needs_applied`, mastery span and template diversity, placement grace, retention default | BL-0184, BL-0185, BL-0186, BL-0187 |
| Session preview without side effects (`dry_run`), one-call progress view (`getProgress`) | BL-0191, BL-0190 |
| Corrected skill graph loaded (new skills, module order, confusable sets) | BL-0193 |
| Claims lint with allow-context, package checks as required CI checks | BL-0194, BL-0195 |
| Backup and restore drill, staging deployment used as the founder's environment | BL-0029, BL-0103 |
| Phase -1 and the go/no-go checkpoint | BL-0182, BL-0181 |

The lean slice grades only what the TypeScript grading core and the symbolic endpoint of the worker can grade (`exact_numeric`, `multiple_choice`, `symbolic_equivalence`). Skills whose only graders are `code_tests`, `spice_compare` or `measurement_check` appear in the graph but the session builder serves them only through their other task kinds (worked example, retrieval, multiple choice) until D3. The 15 to 20 skill slice reviewed in BL-0067 should be chosen from math and `elec.dc` skills, where numeric and symbolic grading cover most task kinds.

### 3.2 Not in the lean slice

The authoritative list is the tasks with `lean: false` in the backlog; section 7 groups them. In short: tutor, rubric grader, sandbox and graders for code and SPICE, KiCad, evidence upload with validation and verification, nonce challenges, credit ledger, lab runner, experiment framework and dashboards, offline pack, outbox and push, diagnostic, checkpoints and delayed tests, weekly plan screen, extra task kinds (pattern gym, explain-back, debug cases), transfer tasks, production environment, alerting, runbooks, load tests, security suites beyond the RLS suite, privacy export and delete, legal and ethics review, beta machinery.

## 4. Phase -1: the no-build pre-experiment (BL-0182)

### 4.1 Purpose

Test the core habit and the core loop with existing tools before writing code: can the founder study about 2.5 hours a week (the lean learning reserve) on a schedule of short sessions for four weeks, and does what is learned in week 1 survive to weeks 3 and 4? The experiment is also the founder's real learning during the months of building (section 6), so it is not wasted effort if the answer is "continue".

### 4.2 Set-up (about 4 hours in week 1)

1. **Scope.** Nine skills from the lean slice in prerequisite order, three new skills a week:
   - Week 1: `math.alg.order-of-operations`, `math.alg.units-and-prefixes`, `math.alg.solve-linear`.
   - Week 2: `math.alg.rearrange-formulas`, `elec.dc.charge-current-voltage`, `elec.dc.ohms-law`.
   - Week 3: `elec.dc.power-energy`, `elec.dc.series-parallel`, `elec.dc.voltage-divider`.

   Week 4 adds no new skills. Each skill has one generator with real variants (item 3).
2. **Anki deck with FSRS.** One note per idea: formula and when to use it, unit conversions, worked-example steps ("what is the first step and why"). Enable the built-in FSRS scheduler (recent Anki versions include it [R]; confirm in the version installed) with default parameters and a requested retention of 0.85, matching the first-8-weeks rule of 00a G5. Cards are hand-written: **the founder must solve or check each one**, because there is no verification pipeline in Phase -1 (R-01). Target 40 to 60 cards.
3. **Problem sheets with fresh variants.** `reference/phase_minus1_sheet.py` writes a sheet of new-seed problems to the screen and the answer key to stderr, using one template per skill from `content/templates/`. Each of the nine templates draws real parameters. Do not open the key until you have answered.

   Before week 1, hand-solve the 9 templates with `reference/g3_review.py` (about 10 minutes each). Phase -1 relies on that hand-solve; it does not make a template `verified` for the app, which also needs the fuzz job.

   ```bash
   py -3 reference/phase_minus1_sheet.py 20261102 2 > sheet.md 2> key.txt      # baseline: 2 problems for each of the 9 skills
   py -3 reference/phase_minus1_sheet.py 20261116 3 1 > sheet.md 2> key.txt    # week 3 re-test of the week-1 skills
   py -3 reference/phase_minus1_sheet.py 20261123 3 2 > sheet.md 2> key.txt    # week 4 re-test of the week-2 skills
   ```

   Use a new date for every sheet so that seeds never repeat. If the lack of worked examples or wider variants is itself the friction, that is a finding (section 4.6), not a failure.
4. **Log.** A spreadsheet with one row per attempt: date, session start and end, session type (micro or focus), skill key, source (Anki, sheet, own), first-attempt correct (0 or 1), confidence before checking (1 to 5), hint used (0 or 1), and a free "friction" column. A second sheet with one row per session: planned or unplanned, minutes, skipped reason.
5. **Plan.** Four micro sessions of 15 to 20 minutes on different days (about 70 minutes) and one focus session of 60 minutes at the weekend: about 2.5 hours per week, the same dose as the lean learning reserve. Anki reviews are done inside the micro sessions. Put the sessions in the calendar in week 1; a session not done is logged as skipped with the reason.
6. **Rules.** New material at most 3 skills per week (the PRD default cap is 3 per day; this is stricter on purpose because there is no schedule beyond Anki's). Order skills by the prerequisites in the graph. No hints in the sheets: look at the key only after answering. Study is from material the founder trusts; do not use Phase -1 to test an LLM tutor.

### 4.3 Schedule

| Week | Do | Founder time besides study |
|---|---|---|
| 1 | Set-up; hand-solve the 9 templates; baseline: 18 problems (2 for each skill, seeds recorded) before any study | 4 h |
| 2 | Study per plan | weekly check 0.75 h (adherence so far, friction) |
| 3 | Study per plan; delayed re-test of the week-1 skills: 9 fresh-seed problems (3 per skill), unaided, 14 days after each skill's first study | weekly check 0.75 h |
| 4 | Study per plan; delayed re-test of the week-2 skills (9 problems, 3 per skill), 14 days after first study; end-of-pilot rating | analysis and decision 2 h |

Week-3 skills get no 14-day re-test inside the four weeks. R1 and R2 use the six skills of weeks 1 and 2.

### 4.4 Indicators and decision thresholds [P]

Adherence (the habit):

| ID | Indicator | How computed | Go threshold |
|---|---|---|---|
| A1 | Planned sessions completed | completed / planned, over 4 weeks | at least 75 percent (at least 15 of 20 micro sessions) |
| A2 | Active days | days per week with at least one session, mirrors SM-02 | at least 4 in at least 3 of 4 weeks |
| A3 | Minutes versus plan | weekly minutes / planned minutes, mirrors SM-01 | at least 75 percent in at least 3 of 4 weeks |
| A4 | Wants to continue | rating 1 to 5 on "I would keep doing this tomorrow without a reminder" in week 4 | at least 4 |
| A5 | Week 4 versus week 1 | A1 in week 4 divided by A1 in week 2 | at least 0.8 (novelty fade check) |

Retention (the loop):

| ID | Indicator | How computed | Go threshold |
|---|---|---|---|
| R1 | Delayed re-test accuracy | correct / attempted on the 18 fresh-seed problems of weeks 3 and 4 | at least 0.60 (heuristic; the PRD aspiration for 8-week strict-unaided retention is 0.70, SM-03) |
| R2 | Retention drop | sheet accuracy in the last study session of each skill minus its delayed re-test accuracy, same templates | at most 0.25 |
| R3 | Anki recall at due | share of due cards answered Good or Easy | between 0.80 and 0.95 (below 0.80 the intervals are too long or the cards too hard; above 0.95 the material is too easy) |
| R4 | Calibration gap | mean confidence rescaled to 0 to 1 minus accuracy | report only; exploratory (SM-15) |
| R5 | Item defects | wrong or ambiguous items found in own material | at most 1 in 50 |

### 4.5 What changes the plan

Read the rows in order. The first row that matches decides, so each result has exactly one outcome. Record the outcome in `docs/CHANGELOG.md`.

| Order | Result | Reading | Plan change |
|---|---|---|---|
| 1 | A1 below 50 percent in two consecutive weeks, or A4 at 2 or below | The habit does not hold; an app will not create it | **Stop building**. Hold a decision on the premise (R-22, R-23); consider a smaller target (for example 1.5 h/week), a different content area, or a different support (study partner, fixed class). Re-run Phase -1 after the change. |
| 2 | R1 below 0.50, or R3 below 0.70, with correct material | The loop at this dose is not retaining; build will not fix that | **Adjust**: repeat two weeks changing one thing (session length, interval, more retrieval, fewer new skills). Do not start B5 (scheduler) until retention is understood; revisit doc 02 mechanisms and R-05. |
| 3 | A1 below 75 percent, or A2, A3 or A5 below threshold, or A4 at 3 | Habit is partial | **Adjust** the time slots and session length for two more weeks, then re-run A1, A2 and A4. If friction is "not enough time", use the 5 h/week plan. |
| 4 | R1 from 0.50 to below 0.60, or R2 above 0.25 | Retention is marginal | **Adjust**: two more weeks with fewer new skills, then re-test before starting B5. |
| 5 | All thresholds pass and friction is low | The existing stack already works | **Option Z**: keep the Phase -1 stack for another 8 weeks and build only the part that hurts (usually fresh variants and the frontier). The lean slice is then reduced to L1 plus BL-0017, BL-0043, BL-0065. |
| 6 | All thresholds pass and friction is mostly "making problems", "checking answers" or "no variants" | The habit holds and the cost is tooling | **Go**: proceed to B1. The pool and verified templates (BL-0017, 0043, 0065) are the priority. |
| 7 | Anything else | The result does not clearly favour building | **Adjust**: two more weeks, no new scope, and write down what would change the decision. |

Separately from the order above: if R5 is above 1 in 50 for own-written items, B3 (the verification pipeline) stays first.

### 4.6 What Phase -1 can and cannot show

Can show: whether the founder keeps a 2.5 hour weekly schedule for four weeks; where the friction is (the free-text column); a rough single-person retention curve over 14 to 21 days; whether hand-made problems are a bottleneck; whether the weekly time estimate is realistic.

Cannot show: that per-skill FSRS with fresh generated variants is calibrated (R-05; Anki schedules cards, not skills); that the frontier or prerequisite ordering helps; whether the verified-template pipeline works; anything about the tutor, graders, sandbox or projects; any causal effect (n = 1, no control, the baseline and re-tests share formats so practice effects are mixed with learning); anything beyond four weeks (novelty effects often fade after the first month [inf]); and nothing about other learners. A pass is permission to build the lean slice, not evidence that the product works. A fail is a reason to change the plan before spending 200 hours.

## 5. Lean tasks by phase

Phases: **L0** Phase -1 (no app build) and the bench preparation of the guided week-1 blink (BL-0183). **L1** foundation (M0 of the plan, with the exit test BL-0032). **L2** learning loop to first daily use (the first daily use is the end of L2: the micro runner BL-0060 plus the first 15 templates BL-0065). **L3** use while building. "Est." is the backlog task size; "Founder h" is the central estimate of the model in doc 13 section 3.3. All [P].

#### L0 Phase -1 and week-1 blink preparation (2 tasks, 11 h task size, 11 h founder, central)

| Task | Title | Owner | Est. h | Founder h |
|---|---|---|---|---|
| BL-0182 | Phase -1 no-build pre-experiment - 3 to 4 weeks of the daily loop with existing tools | founder | 6 | 6.0 |
| BL-0183 | Prepare the guided week-1 blink: mini-kit, ready-made blink file, one-page L0 safety brief | founder | 5 | 5.0 |

#### L1 Foundation (32 tasks, 130 h task size, 70 h founder, central)

| Task | Title | Owner | Est. h | Founder h |
|---|---|---|---|---|
| BL-0001 | Create hosting and vendor accounts and choose the data region | founder | 3 | 3.0 |
| BL-0002 | Scaffold the pnpm monorepo per the repository layout | agent | 4 | 2.1 |
| BL-0003 | GitHub Actions ci.yml with TS, Python and reference validators | agent | 3 | 1.7 |
| BL-0004 | Enforce module boundary rules in CI | agent | 3 | 1.7 |
| BL-0005 | Secrets scanning, .env.example and log redaction helper | agent | 3 | 1.7 |
| BL-0006 | Claims-policy lint for copy, content and prompts | agent | 3 | 1.7 |
| BL-0007 | Initialise Supabase local project and environments | agent | 2 | 1.3 |
| BL-0008 | Create baseline migration from schemas/schema.sql | agent | 4 | 2.1 |
| BL-0009 | Add app_private.rate_limits and job functions check | agent | 3 | 1.7 |
| BL-0010 | Generate DB and OpenAPI types into packages/shared-types | agent | 2 | 1.3 |
| BL-0011 | RLS test harness with two users and an admin | agent | 4 | 2.1 |
| BL-0012 | Implement the full ST-RLS suite against the baseline schema | agent | 8 | 3.7 |
| BL-0013 | packages/content-schema: key regexes and Ajv validators | agent | 4 | 2.1 |
| BL-0014 | Worker service scaffold: FastAPI, Dockerfile, HMAC middleware, healthz | agent | 4 | 2.1 |
| BL-0015 | Port safe_expr and tplkit to the worker content package | agent | 5 | 2.5 |
| BL-0016 | Worker claim loop, leases, retries and handler registry | agent | 5 | 2.5 |
| BL-0017 | Verification engine and report writer for numeric templates | agent | 6 | 2.9 |
| BL-0018 | content:sync for skills, edges and templates (idempotent) | agent | 8 | 3.7 |
| BL-0019 | packages/grading-core: exact_numeric and multiple_choice graders with parity vectors | agent | 6 | 2.9 |
| BL-0021 | Email-code sign-in with link kept, session proxy and profile creation | agent | 4 | 2.1 |
| BL-0022 | API skeleton: zod from OpenAPI, error envelope, idempotency, rate limit, auth guard | agent | 6 | 2.9 |
| BL-0023 | Profile and weekly target (onboarding step 1) | agent | 3 | 1.7 |
| BL-0024 | Event logging helper and postEvents endpoint | agent | 4 | 2.1 |
| BL-0025 | Serve gate: getTask and getItem return only verified, sanitised items | agent | 4 | 2.1 |
| BL-0026 | submitAttempt for numeric and multiple-choice items (inline grading) | agent | 6 | 2.9 |
| BL-0027 | Minimal item page: render, answer, feedback (M0 demo) | agent | 5 | 2.5 |
| BL-0028 | Founder self-consent record | agent | 2 | 1.3 |
| BL-0029 | Deploy staging: Vercel app, Supabase staging, Fly worker | agent | 5 | 2.5 |
| BL-0031 | Founder reviews the first template: G3 checklist and 3-seed spot check | founder | 2 | 2.0 |
| BL-0032 | M0 exit test: walking skeleton end to end | agent | 4 | 2.1 |
| BL-0194 | Port the allow-context rule of reference/lint_claims.py to pnpm claims:lint | agent | 3 | 1.7 |
| BL-0195 | Wire check_package.py and all reference validators into CI as required checks | agent | 2 | 1.3 |

#### L2 Learning loop to first daily use (32 tasks, 162.5 h task size, 93 h founder, central)

| Task | Title | Owner | Est. h | Founder h |
|---|---|---|---|---|
| BL-0033 | Scheduler package scaffold and test-vector runner | agent | 3 | 1.7 |
| BL-0034 | Scheduler: expectedScore, kFactor, updateElo, mapRating, diagnostic init | agent | 6 | 2.9 |
| BL-0035 | Scheduler: masteryRule, masteryState, tierAttained, aggregateAttempts | agent | 7 | 3.3 |
| BL-0036 | Scheduler: computeAvailable, computeFrontier, frontierScores, projectPull | agent | 6 | 2.9 |
| BL-0037 | Scheduler: packSession, interleaveStage, checkpointStatus, isStuck, traceBack, hintReliance | agent | 8 | 3.7 |
| BL-0038 | Scheduler: weeklyPlanSlots and rebalance | agent | 4 | 2.1 |
| BL-0039 | All scheduler vectors pass and the doc 06 acceptance criteria are met | agent | 2 | 1.3 |
| BL-0040 | Verify ts-fsrs licence and API; record decision | agent | 1.5 | 1.1 |
| BL-0041 | FSRS-6 adapter with contract test | agent | 5 | 2.5 |
| BL-0042 | Domain service: apply graded attempt to review_log and skill_state | agent | 8 | 3.7 |
| BL-0043 | Pre-generated verified item pool and pregenerate_items job | agent | 6 | 2.9 |
| BL-0044 | buildSession, startSession, getSession, completeSession, listSessions | agent | 8 | 3.7 |
| BL-0045 | New-skill learning loop state machine and fresh variants | agent | 6 | 2.9 |
| BL-0047 | Confidence rating capture before feedback | agent | 3 | 1.7 |
| BL-0049 | Load the full MVP graph and run validators in CI | agent | 3 | 1.7 |
| BL-0050 | Template lint rules L01 to L26 | agent | 8 | 3.7 |
| BL-0051 | Verifier registry with the 14 implemented kinds | agent | 8 | 3.7 |
| BL-0052 | G2 fuzz run (200 samples) in worker and CI | agent | 4 | 2.1 |
| BL-0054 | Symbolic equivalence grader endpoint (worker) and TS client | agent | 6 | 2.9 |
| BL-0055 | Multiple-choice server-side key and shown-options validation | agent | 2 | 1.3 |
| BL-0056 | Report a problem, quarantine and retire | agent | 6 | 2.9 |
| BL-0058 | Design tokens, layout shell and core components | agent | 5 | 2.5 |
| BL-0059 | Screens S01, S02, S06, S07: sign-in, onboarding, Today, session preview | agent | 7 | 3.3 |
| BL-0060 | Screens S08, S09: micro session runner and summary | agent | 8 | 3.7 |
| BL-0065 | Author and review 15 math templates (algebra, trig, complex, calculus) | founder | 12 | 15.0 |
| BL-0067 | Review the 15-20 skill slice: descriptions, tiers, prerequisites | founder | 4 | 4.0 |
| BL-0184 | Scheduler: applied-gap rule (needs_applied flag and the applied_gap packer slot) | agent | 3 | 1.7 |
| BL-0185 | Scheduler: mastery span (2 calendar days) and template-diversity conditions | agent | 3 | 1.7 |
| BL-0186 | Scheduler: placement grace satisfies min_tier up to L1 for the frontier test | agent | 2 | 1.3 |
| BL-0187 | Scheduler: desired-retention default switch (0.85 for 8 weeks) and latency rows off until 20 observations | agent | 3 | 1.7 |
| BL-0191 | dry_run on POST /sessions/build (session preview) | agent | 2 | 1.3 |
| BL-0193 | content:sync carries the corrected graph (new skills, module order, confusable sets) | agent | 3 | 1.7 |

#### L3 Use while building (17 tasks, 92 h task size, 65 h founder, central)

| Task | Title | Owner | Est. h | Founder h |
|---|---|---|---|---|
| BL-0046 | Daily new-material cap, session length guard, backlog flag | agent | 3 | 1.7 |
| BL-0048 | listSkills, getSkill, getGraph, getFrontier, getReviewQueue | agent | 5 | 2.5 |
| BL-0057 | Content review console: queue, render five items, approve or retire | agent | 8 | 3.7 |
| BL-0061 | Screens S14, S15, S17: skill map, progress, due-review inbox | agent | 8 | 3.7 |
| BL-0063 | Installable PWA shell and start-time budget | agent | 4 | 2.1 |
| BL-0064 | Accessibility baseline: axe in CI and manual audit checklist | agent | 3 | 1.7 |
| BL-0066 | Author and review 15 electronics DC and measurement templates | founder | 12 | 15.0 |
| BL-0069 | M1 exit test and zero-unverified-serves audit | agent | 4 | 2.1 |
| BL-0070 | Founder dogfoods M1 for two weeks and logs defects | founder | 6 | 6.0 |
| BL-0103 | Backup and restore drill #1 (runbook RB-8) | agent | 4 | 2.1 |
| BL-0117 | content:sync for projects and project_steps | agent | 5 | 2.5 |
| BL-0118 | Project routes: list, get, start, user projects | agent | 5 | 2.5 |
| BL-0178 | Lean focus session (45-120 min) on the micro runner, desktop width | agent | 5 | 2.5 |
| BL-0179 | Lean manual project log - notes and photos per project step, no automated verification | agent | 6 | 2.9 |
| BL-0180 | Author and review 10 more templates for the lean pool (numeric, symbolic, multiple choice) | founder | 8 | 10.0 |
| BL-0181 | Lean slice go/no-go checkpoint after four weeks of use | founder | 2 | 2.0 |
| BL-0190 | GET /progress (operationId getProgress): aggregated progress and tier view | agent | 4 | 2.1 |

Totals (from `python3 reference/validate_backlog.py`): see section 6.1.

## 6. Time: building hours versus learning hours

### 6.1 Honest hours for the lean slice

| Scenario [P] | L0 | L1 | L2 | L3 | Total | Core (without BL-0117, 0118, 0178, 0179, 0180) | Through L2 (first daily use, including L0) |
|---|---|---|---|---|---|---|---|
| Low | 10 | 45 | 60 | 46 | 161 | 147 | 115 |
| Central | 11 | 70 | 93 | 65 | 239 | 218 | 174 |
| High | 15 | 106 | 140 | 98 | 359 | 328 | 261 |

Assumptions behind the columns are in doc 13 section 3.3; the main ones: an agent task costs the founder 0.5 h (0.3 to 0.8) fixed for hand-off, running the headline test, merge and log, plus 40 percent (25 to 60) of its task size for review and rework; a template takes 60 minutes (45 to 90); the rest of the task size is agent compute and waiting, which costs the founder nothing. Raw task sizes total 395.5 h for the 83 lean tasks. **If the founder-attention model is right, the lean slice is about 240 hours of founder attention (233 excluding Phase -1); if the unit of the backlog really is founder hours as originally written (PA-2), it is about 395 hours.** This is the main uncertainty and the first 10 tasks measure it (section 8).

The lean target of 100 to 225 hours (raised from 200 when review pass 3 added ten lean tasks and about 20 hours) is met by the core at the central estimate (218 h including Phase -1, 212 h without). The low estimate (147 h) is inside it; the high estimate (328 h) is not. The optional tasks are the first things to drop if the logged hours run ahead of the model.

### 6.2 The split of the week

The 8 hours cannot be spent twice. Reserve in this order: learning, review, building.

| Plan | Learning | Weekly review and slack | Building | Notes |
|---|---|---|---|---|
| 8 h/week | 2.5 h | 0.75 h (45-minute review per doc 13 section 10 and a short reserve) | 4.75 h | Learning is about a third of the week; study with the Phase -1 stack until the app can carry it, then in the app |
| 5 h/week | 1.5 h | 0.5 h | 3.0 h | Same order of priority; learning falls to 1.5 h and the plan roughly doubles in length |
| After the lean slice (steady state, 8 h) | about 6 h | 0.5 h | about 1.5 h (content, defects, one deferred group at a time) | Only after the go decision |

If learning is cut to 1.5 h at 8 h/week, building becomes 5.75 h and the lean slice finishes about 8 weeks earlier. Do not make that trade silently: R-22 says the learning hours are the first thing to erode.

Calendar sensitivity of the central lean total (233 h of build, excluding BL-0182): at 8 h/week with all non-review time on building (6.75 h), 35 weeks; with learning reserved (4.75 h), 49 weeks; at 5 h/week with learning reserved (3 h), 78 weeks; add 4 weeks for Phase -1 and about 25 percent for lost weeks.

### 6.3 Build blocks

Blocks group the lean tasks in dependency order. Hours are central founder hours; weeks are calendar week numbers (week 1 is Monday 2 November 2026) with the plan of section 6.2.

| Block | Content | Founder h (central) | Weeks at 8 h/week | Weeks at 5 h/week |
|---|---|---|---|---|
| B1 | Accounts, repository, CI, secrets scan, claims lint, package checks | 14.9 | 5.0 to 8.1 | 5.0 to 10.0 |
| B2 | Database, RLS test suite, generated types | 12.2 | 8.1 to 10.7 | 10.0 to 14.0 |
| B3 | Content engine, verification, content:sync, first template reviewed | 17.8 | 10.7 to 14.5 | 14.0 to 20.0 |
| B4 | Auth, API skeleton, serve gate, numeric and multiple-choice grading, first item, staging, M0 exit | 25.1 | 14.5 to 19.7 | 20.0 to 28.3 |
| B5 | Scheduler package, all vectors (including applied-gap, span, grace, retention), FSRS adapter | 27.9 | 19.7 to 25.6 | 28.3 to 37.6 |
| B6 | Graph load and graph-content sync, template lint, verifier kinds, fuzz, skill-slice review | 16.9 | 25.6 to 29.2 | 37.6 to 43.3 |
| B7 | Apply attempt, item pool, session builder, learning loop, report-a-problem | 16.1 | 29.2 to 32.6 | 43.3 to 48.6 |
| B8 | Symbolic grading, confidence, dry_run preview, UI shell, Today, micro runner, first 15 templates (FIRST DAILY USE at the end) | 31.7 | 32.6 to 39.2 | 48.6 to 59.2 |
| B9 | Daily cap, graph, progress (getProgress) and review views, review console, PWA shell, a11y baseline | 17.5 | 39.2 to 42.9 | 59.2 to 65.0 |
| B9b | Go/no-go checkpoint (4 weeks after first use) | 2.0 | 42.9 to 43.3 | 65.0 to 65.7 |
| B10 | Templates 16-30, M1 exit test, defect log | 23.1 | 43.3 to 48.2 | 65.7 to 73.4 |
| B11 | Backup drill, focus session, project log, 10 more templates (optional items last) | 22.5 | 48.2 to 52.9 | 73.4 to 80.9 |

Block contents by task id: B1 BL-0001 to 0006, BL-0194, 0195. B2 BL-0007 to 0012. B3 BL-0013 to 0018, BL-0031. B4 BL-0019, 0021 to 0029, 0032. B5 BL-0033 to 0041, BL-0184 to 0187. B6 BL-0049 to 0052, 0067, 0193. B7 BL-0042 to 0045, 0056. B8 BL-0047, 0054, 0055, 0058 to 0060, 0065, 0191. B9 BL-0046, 0048, 0057, 0061, 0063, 0064, 0190. B9b BL-0181. B10 BL-0066, 0069, 0070. B11 BL-0103, 0117, 0118, 0178, 0179, 0180. Phase -1 (weeks 1 to 4): BL-0182 and BL-0183. (A block ordering is only a suggestion; the dependencies in the backlog are the rule. The validator checks that lean tasks depend only on lean tasks and never on a later lean phase.)

### 6.4 Week by week at 8 h/week

Weeks 1 to 4 are Phase -1: the "Build h" column shows the experiment's own admin hours plus the 5 hours of BL-0183 (guided blink preparation). Hours not shown are slack or the founder's own preparation (reading the contract, deciding OQ-02 and OQ-06). From week 5 the build column is the planned 4.75 hours. Learning is the Phase -1 stack until the first daily use (week 40), then the app.

**Milestones in this plan:** week 4 Phase -1 decision (the guided blink, BL-0183, is done in weeks 4 to 6 once the kit has arrived; its calendar position depends on shipping, not on the build blocks); week 19 M0 exit test (BL-0032, first verified item on the phone); week 25 all scheduler vectors pass (BL-0039); week 39 end of B8, **first daily use from week 40 (Monday 02 Aug 2027)**; week 43 go/no-go (BL-0181, 4 weeks after first use); week 49 M1 exit test and defect log; week 52 lean slice complete.

| Week | Monday | Learning h | Review h | Build h | Build blocks active |
|---|---|---|---|---|---|
| 1 | 02 Nov 2026 | 2.5 | 0.75 | 2.50 | Phase -1 (BL-0182) set-up of deck, sheets and log |
| 2 | 09 Nov 2026 | 2.5 | 0.75 | 3.00 | Phase -1 (BL-0182) weekly check; BL-0183 order the mini-kit, draw the wiring picture, write the L0 brief |
| 3 | 16 Nov 2026 | 2.5 | 0.75 | 3.50 | Phase -1 (BL-0182) weekly check; BL-0183 ready-made blink file; kit expected about two weeks after the order |
| 4 | 23 Nov 2026 | 2.5 | 0.75 | 2.00 | Phase -1 (BL-0182) analysis and go/adjust/stop decision; first guided blink (steps s01, s02, s09, about 75 minutes, counted in BL-0183) in the weekend block once the kit has arrived |
| 5 | 30 Nov 2026 | 2.5 | 0.75 | 4.75 | B1 |
| 6 | 07 Dec 2026 | 2.5 | 0.75 | 4.75 | B1 |
| 7 | 14 Dec 2026 | 2.5 | 0.75 | 4.75 | B1 |
| 8 | 21 Dec 2026 | 2.5 | 0.75 | 4.75 | B1 / B2 |
| 9 | 28 Dec 2026 | 2.5 | 0.75 | 4.75 | B2 |
| 10 | 04 Jan 2027 | 2.5 | 0.75 | 4.75 | B2 / B3 |
| 11 | 11 Jan 2027 | 2.5 | 0.75 | 4.75 | B3 |
| 12 | 18 Jan 2027 | 2.5 | 0.75 | 4.75 | B3 |
| 13 | 25 Jan 2027 | 2.5 | 0.75 | 4.75 | B3 |
| 14 | 01 Feb 2027 | 2.5 | 0.75 | 4.75 | B3 / B4 |
| 15 | 08 Feb 2027 | 2.5 | 0.75 | 4.75 | B4 |
| 16 | 15 Feb 2027 | 2.5 | 0.75 | 4.75 | B4 |
| 17 | 22 Feb 2027 | 2.5 | 0.75 | 4.75 | B4 |
| 18 | 01 Mar 2027 | 2.5 | 0.75 | 4.75 | B4 |
| 19 | 08 Mar 2027 | 2.5 | 0.75 | 4.75 | B4 / B5 |
| 20 | 15 Mar 2027 | 2.5 | 0.75 | 4.75 | B5 |
| 21 | 22 Mar 2027 | 2.5 | 0.75 | 4.75 | B5 |
| 22 | 29 Mar 2027 | 2.5 | 0.75 | 4.75 | B5 |
| 23 | 05 Apr 2027 | 2.5 | 0.75 | 4.75 | B5 |
| 24 | 12 Apr 2027 | 2.5 | 0.75 | 4.75 | B5 |
| 25 | 19 Apr 2027 | 2.5 | 0.75 | 4.75 | B5 / B6 |
| 26 | 26 Apr 2027 | 2.5 | 0.75 | 4.75 | B6 |
| 27 | 03 May 2027 | 2.5 | 0.75 | 4.75 | B6 |
| 28 | 10 May 2027 | 2.5 | 0.75 | 4.75 | B6 |
| 29 | 17 May 2027 | 2.5 | 0.75 | 4.75 | B6 / B7 |
| 30 | 24 May 2027 | 2.5 | 0.75 | 4.75 | B7 |
| 31 | 31 May 2027 | 2.5 | 0.75 | 4.75 | B7 |
| 32 | 07 Jun 2027 | 2.5 | 0.75 | 4.75 | B7 / B8 |
| 33 | 14 Jun 2027 | 2.5 | 0.75 | 4.75 | B8 |
| 34 | 21 Jun 2027 | 2.5 | 0.75 | 4.75 | B8 |
| 35 | 28 Jun 2027 | 2.5 | 0.75 | 4.75 | B8 |
| 36 | 05 Jul 2027 | 2.5 | 0.75 | 4.75 | B8 |
| 37 | 12 Jul 2027 | 2.5 | 0.75 | 4.75 | B8 |
| 38 | 19 Jul 2027 | 2.5 | 0.75 | 4.75 | B8 |
| 39 | 26 Jul 2027 | 2.5 | 0.75 | 4.75 | B8 / B9 |
| 40 | 02 Aug 2027 | 2.5 | 0.75 | 4.75 | B9 |
| 41 | 09 Aug 2027 | 2.5 | 0.75 | 4.75 | B9 |
| 42 | 16 Aug 2027 | 2.5 | 0.75 | 4.75 | B9 / B9b |
| 43 | 23 Aug 2027 | 2.5 | 0.75 | 4.75 | B9b / B10 |
| 44 | 30 Aug 2027 | 2.5 | 0.75 | 4.75 | B10 |
| 45 | 06 Sep 2027 | 2.5 | 0.75 | 4.75 | B10 |
| 46 | 13 Sep 2027 | 2.5 | 0.75 | 4.75 | B10 |
| 47 | 20 Sep 2027 | 2.5 | 0.75 | 4.75 | B10 |
| 48 | 27 Sep 2027 | 2.5 | 0.75 | 4.75 | B10 / B11 |
| 49 | 04 Oct 2027 | 2.5 | 0.75 | 4.75 | B11 |
| 50 | 11 Oct 2027 | 2.5 | 0.75 | 4.75 | B11 |
| 51 | 18 Oct 2027 | 2.5 | 0.75 | 4.75 | B11 |
| 52 | 25 Oct 2027 | 2.5 | 0.75 | 4.45 | B11 |


### 6.5 Week by week at 5 h/week

Same blocks, learning 1.5 h, review 0.5 h, building 3.0 h. **Milestones:** week 4 Phase -1 decision; week 28 M0 exit test; week 37 scheduler vectors pass; **first daily use from week 60 (Monday 20 Dec 2027)**; go/no-go around week 65; week 74 M1 exit test; week 80 lean slice complete.

| Week | Monday | Learning h | Review h | Build h | Build blocks active |
|---|---|---|---|---|---|
| 1 | 02 Nov 2026 | 1.5 | 0.5 | 2.50 | Phase -1 (BL-0182) set-up of deck, sheets and log |
| 2 | 09 Nov 2026 | 1.5 | 0.5 | 3.00 | Phase -1 (BL-0182) weekly check; BL-0183 order the mini-kit, draw the wiring picture, write the L0 brief |
| 3 | 16 Nov 2026 | 1.5 | 0.5 | 3.50 | Phase -1 (BL-0182) weekly check; BL-0183 ready-made blink file; kit expected about two weeks after the order |
| 4 | 23 Nov 2026 | 1.5 | 0.5 | 2.00 | Phase -1 (BL-0182) analysis and go/adjust/stop decision; first guided blink (steps s01, s02, s09, about 75 minutes, counted in BL-0183) in the weekend block once the kit has arrived |
| 5 | 30 Nov 2026 | 1.5 | 0.5 | 3.00 | B1 |
| 6 | 07 Dec 2026 | 1.5 | 0.5 | 3.00 | B1 |
| 7 | 14 Dec 2026 | 1.5 | 0.5 | 3.00 | B1 |
| 8 | 21 Dec 2026 | 1.5 | 0.5 | 3.00 | B1 |
| 9 | 28 Dec 2026 | 1.5 | 0.5 | 3.00 | B1 / B2 |
| 10 | 04 Jan 2027 | 1.5 | 0.5 | 3.00 | B2 |
| 11 | 11 Jan 2027 | 1.5 | 0.5 | 3.00 | B2 |
| 12 | 18 Jan 2027 | 1.5 | 0.5 | 3.00 | B2 |
| 13 | 25 Jan 2027 | 1.5 | 0.5 | 3.00 | B2 |
| 14 | 01 Feb 2027 | 1.5 | 0.5 | 3.00 | B2 / B3 |
| 15 | 08 Feb 2027 | 1.5 | 0.5 | 3.00 | B3 |
| 16 | 15 Feb 2027 | 1.5 | 0.5 | 3.00 | B3 |
| 17 | 22 Feb 2027 | 1.5 | 0.5 | 3.00 | B3 |
| 18 | 01 Mar 2027 | 1.5 | 0.5 | 3.00 | B3 |
| 19 | 08 Mar 2027 | 1.5 | 0.5 | 3.00 | B3 / B4 |
| 20 | 15 Mar 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 21 | 22 Mar 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 22 | 29 Mar 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 23 | 05 Apr 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 24 | 12 Apr 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 25 | 19 Apr 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 26 | 26 Apr 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 27 | 03 May 2027 | 1.5 | 0.5 | 3.00 | B4 |
| 28 | 10 May 2027 | 1.5 | 0.5 | 3.00 | B4 / B5 |
| 29 | 17 May 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 30 | 24 May 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 31 | 31 May 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 32 | 07 Jun 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 33 | 14 Jun 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 34 | 21 Jun 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 35 | 28 Jun 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 36 | 05 Jul 2027 | 1.5 | 0.5 | 3.00 | B5 |
| 37 | 12 Jul 2027 | 1.5 | 0.5 | 3.00 | B5 / B6 |
| 38 | 19 Jul 2027 | 1.5 | 0.5 | 3.00 | B6 |
| 39 | 26 Jul 2027 | 1.5 | 0.5 | 3.00 | B6 |
| 40 | 02 Aug 2027 | 1.5 | 0.5 | 3.00 | B6 |
| 41 | 09 Aug 2027 | 1.5 | 0.5 | 3.00 | B6 |
| 42 | 16 Aug 2027 | 1.5 | 0.5 | 3.00 | B6 |
| 43 | 23 Aug 2027 | 1.5 | 0.5 | 3.00 | B6 / B7 |
| 44 | 30 Aug 2027 | 1.5 | 0.5 | 3.00 | B7 |
| 45 | 06 Sep 2027 | 1.5 | 0.5 | 3.00 | B7 |
| 46 | 13 Sep 2027 | 1.5 | 0.5 | 3.00 | B7 |
| 47 | 20 Sep 2027 | 1.5 | 0.5 | 3.00 | B7 |
| 48 | 27 Sep 2027 | 1.5 | 0.5 | 3.00 | B7 / B8 |
| 49 | 04 Oct 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 50 | 11 Oct 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 51 | 18 Oct 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 52 | 25 Oct 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 53 | 01 Nov 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 54 | 08 Nov 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 55 | 15 Nov 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 56 | 22 Nov 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 57 | 29 Nov 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 58 | 06 Dec 2027 | 1.5 | 0.5 | 3.00 | B8 |
| 59 | 13 Dec 2027 | 1.5 | 0.5 | 3.00 | B8 / B9 |
| 60 | 20 Dec 2027 | 1.5 | 0.5 | 3.00 | B9 |
| 61 | 27 Dec 2027 | 1.5 | 0.5 | 3.00 | B9 |
| 62 | 03 Jan 2028 | 1.5 | 0.5 | 3.00 | B9 |
| 63 | 10 Jan 2028 | 1.5 | 0.5 | 3.00 | B9 |
| 64 | 17 Jan 2028 | 1.5 | 0.5 | 3.00 | B9 |
| 65 | 24 Jan 2028 | 1.5 | 0.5 | 3.00 | B9 / B9b / B10 |
| 66 | 31 Jan 2028 | 1.5 | 0.5 | 3.00 | B10 |
| 67 | 07 Feb 2028 | 1.5 | 0.5 | 3.00 | B10 |
| 68 | 14 Feb 2028 | 1.5 | 0.5 | 3.00 | B10 |
| 69 | 21 Feb 2028 | 1.5 | 0.5 | 3.00 | B10 |
| 70 | 28 Feb 2028 | 1.5 | 0.5 | 3.00 | B10 |
| 71 | 06 Mar 2028 | 1.5 | 0.5 | 3.00 | B10 |
| 72 | 13 Mar 2028 | 1.5 | 0.5 | 3.00 | B10 |
| 73 | 20 Mar 2028 | 1.5 | 0.5 | 3.00 | B10 / B11 |
| 74 | 27 Mar 2028 | 1.5 | 0.5 | 3.00 | B11 |
| 75 | 03 Apr 2028 | 1.5 | 0.5 | 3.00 | B11 |
| 76 | 10 Apr 2028 | 1.5 | 0.5 | 3.00 | B11 |
| 77 | 17 Apr 2028 | 1.5 | 0.5 | 3.00 | B11 |
| 78 | 24 Apr 2028 | 1.5 | 0.5 | 3.00 | B11 |
| 79 | 01 May 2028 | 1.5 | 0.5 | 3.00 | B11 |
| 80 | 08 May 2028 | 1.5 | 0.5 | 2.70 | B11 |


## 7. Deferred work and re-entry points

Every task with `lean: false` has `lean_phase` D1 to D9. A group re-enters only after the go decision of BL-0181, one group at a time, chosen by the largest logged pain from the use of the lean slice (section 8), and never before its prerequisites. Hours: est. is task size, central the modelled founder hours [P].

| Group | What | Tasks | Est. h | Founder h | Re-entry trigger [P] | First tasks | Needs first |
|---|---|---|---|---|---|---|---|
| D1 | Operations hardening, monitoring, security suites and production environment | 15: BL-0030, 0053, 0062, 0068, 0100, 0101, 0102, 0104, 0109, 0110, 0111, 0154, 0155, 0161, 0189 | 59 | 31 | Before any second user, or earlier if a deploy failure or data scare happens in L3; sentry and alerts are cheap to add once the founder depends on the app daily | BL-0030, then BL-0068, BL-0104 | none |
| D2 | Guarded tutor, rubric grader, EXP-001 and the M2 exit gate | 17: BL-0020, 0072, 0073, 0074, 0075, 0076, 0077, 0078, 0079, 0080, 0086, 0089, 0106, 0107, 0108, 0130, 0188 | 94 | 51 | Go decision and the founder reports being stuck without help in the logged stuck events; tutor budget decided (OQ-06) | BL-0072, then BL-0020, BL-0073, BL-0074 | D4 checkpoint tasks (BL-0092) no later than the tutor release |
| D3 | Sandboxed code and SPICE grading and the templates that need them | 7: BL-0081, 0082, 0083, 0084, 0085, 0105, 0133 | 60 | 41 | Skills in the curriculum order need code or SPICE graders (sw.c, elec.rc), and Fly isolation is verified (OA-1) | BL-0081, then BL-0082, BL-0083, BL-0084 | D1 partly (BL-0104 alerts) before exposing code grading |
| D4 | Diagnostic, checkpoints, delayed tests, weekly plan, full focus builder, extra task kinds, transfer tasks | 16: BL-0087, 0088, 0090, 0091, 0092, 0093, 0098, 0099, 0128, 0129, 0131, 0132, 0134, 0136, 0142, 0192 | 82 | 41 | Go decision; recommended first because it protects the integrity of mastery (unaided retests) and is needed before the tutor | BL-0090, BL-0092, BL-0093 (checkpoint scheduler and screen) | BL-0074 (pure tutor-policy package, in D2) first; BL-0087 needs BL-0078 (D2) and BL-0085 (D3) |
| D5 | Experiment framework, analysis export and dashboards | 6: BL-0094, 0135, 0137, 0140, 0147, 0148 | 29 | 16 | Go decision and a question worth testing (for example tutor on versus off); needs the event data of at least 8 weeks of use | BL-0094, BL-0135 | D2 for EXP-001; D4 for delayed tests |
| D6 | Offline pack, outbox and push | 4: BL-0095, 0096, 0097, 0162 | 28 | 13 | Logged sessions lost to poor connectivity, or the founder wants study on commutes | BL-0095, BL-0096 (BL-0097 push last) | none |
| D7 | Verified projects - kit, golden builds, nonce challenges, evidence verification, lab runner, credit ledger, KiCad | 28: BL-0071, 0112, 0113, 0114, 0115, 0116, 0119, 0120, 0121, 0122, 0123, 0124, 0125, 0126, 0127, 0138, 0139, 0141, 0143, 0144, 0145, 0146, 0152, 0159, 0168, 0169, 0170, 0171 | 219 | 220 | The founder has bench time and wants the physical build; buy the kit at the go decision (lead time) | BL-0071, BL-0112, BL-0113, BL-0114 | D3 for BL-0121 verifiers (SPICE runner BL-0084); D1 for production before external evidence |
| D8 | Measurement-grade release gate - privacy, legal and ethics review, security release gate, content defect audit | 9: BL-0149, 0150, 0151, 0153, 0156, 0157, 0158, 0160, 0163 | 63 | 64 | Before any external user, and before any public claim (doc 11 section 14.3) | BL-0156 (legal review lead time), BL-0149, BL-0150 | D1, and D2 to D7 as shipped |
| D9 | Multi-user closed beta | 10: BL-0164, 0165, 0166, 0167, 0172, 0173, 0174, 0175, 0176, 0177 | 66 | 52 | Go decision, D1 and D8 done, a measurable positive founder result, and counsel and ethics review done | BL-0164, BL-0174 | D1, D5, D8; D2 and D7 if the beta tests them |

Notes on ordering:

1. **D7 needs part of D3.** BL-0121 (evidence verifiers) depends on BL-0084 (SPICE runner). The parts of D7 that need no verifier are BL-0071 (kit purchase; long lead time, can be started at the go decision), BL-0112 (safety briefs; its dependency was relaxed from BL-0108 to BL-0070 on 31 October 2026), BL-0113 to 0116 (starter repositories and golden builds, founder bench work). Do not start hazardous bench work from the app before the briefs exist (R-08).
2. **BL-0108 (the M2 exit gate) closes D1 to D6 items together;** it is in D2 only for bookkeeping. It depends on tasks in D1, D2, D3, D4 and D6.
3. **D4 before D2:** BL-0092 (checkpoint scheduler) must ship no later than the tutor (section 2, rule 3). BL-0092 depends on BL-0074 (tutor-policy, a pure package with no LLM call), which is therefore the one D2 task to pull forward.
4. **D9 and any external user require D1 and D8.** D8 includes the legal review (BL-0156); counsel was not consulted for this package.

## 8. Go/no-go checkpoint (BL-0181)

When: four calendar weeks after the first day the founder studies in the micro runner. Inputs: SQL queries on `sessions`, `attempts`, `review_log`, `skill_state` and `events` (no dashboard is built in the lean slice), the time log, the Phase -1 log.

**Plan.** In this section "plan" means 150 minutes a week on the 8 h/week plan and 90 minutes on the 5 h/week plan (section 6.2). The founder sets `weekly_minutes_target` to that value in onboarding during the lean slice; the 480 default and the SM-01 figure of 360 of 480 apply to the steady state after a go decision.

| ID | Indicator [P] | Threshold |
|---|---|---|
| G1 | Weekly study minutes versus plan (SM-01 method) | at least 75 percent of plan (113 of 150, or 68 of 90 minutes) in at least 3 of the 4 weeks |
| G2 | Active days (SM-02) | at least 4 days in at least 3 of 4 weeks |
| G3 | Reserved learning hours actually spent (R-22) | at least 80 percent in at least 3 of 4 weeks |
| G4 | Reviews on skills first learned at least 14 days earlier: share rated Good or Easy at due | at least 30 reviews, share between 0.80 and 0.95, and mean predicted recall (from `skill_state`) within 10 points of observed (R-05). Always report n and the Wilson 95 percent interval beside the share. Under 30 reviews G4 is not decidable: it neither passes nor fails |
| G5 | Unverified items served (SM-06) | exactly 0; any value above 0 is a hard stop, on the day it is found |
| G6 | Reported wrong items (SM-07) | at most 1 per 500 served; each retired within 48 hours |
| G7 | Sessions ending early because the verified pool is empty or repeats the same variant | under 5 percent of sessions |
| G8 | Micro-session start (SM-09) | p95 at most 1 s on the warm PWA, measured with the BL-0063 test |
| G9 | Median ratio of logged founder hours to modelled central hours over finished tasks (velocity factor, doc 13 section 9) | at most 1.3 |
| G10 | "I would keep studying with this" (1 to 5) | at least 4 |

Apply the rules in order. The first rule whose condition is true is the outcome; later rules are not read. Rule 6 is the default, so every result has exactly one outcome.

| Rule | Outcome | Condition | Action |
|---|---|---|---|
| 1 | **Hard stop** | G5 above 0 | Stop serving from the app and study on the Phase -1 stack. Find how the item passed the gate, fix it, add a regression test, record it in `docs/CHANGELOG.md`, then restart the four-week window. No other rule is read. |
| 2 | **Fix the scheduler** | G4 has at least 30 reviews and observed recall at due below 0.70 on verified items | R-05: switch to the fixed-interval fallback flag, check item difficulty; no new feature work until fixed. |
| 3 | **Stop building, keep studying** | G1 or G2 below 50 percent in two consecutive weeks, or G10 below 3 | The app is not the bottleneck. Return to the Phase -1 stack for four weeks and revisit the premise (R-23). |
| 4 | **Change the plan** | G9 above 2.0, or G3 below 50 percent over the four weeks | Stop adding scope. Apply the scope-down decision of doc 13 section 9 (S1 to S4) or move to the 5 h/week plan. Record in `docs/CHANGELOG.md`. |
| 5 | **Go: extend** | G1, G2, G3, G4, G6, G7, G8, G9 and G10 all pass | Finish L3 (optional tasks last). Choose **one** deferred group by the largest logged pain: stuck often and unaided hints missing leads to D4 checkpoints then D2; same variants repeating leads to more templates (BL-0180 then D3); bench work ready leads to D7; phone offline failures lead to D6. Re-fit the model on the logged hours. |
| 6 | **Continue lean** (default) | Anything else, including G4 not decidable | Four more weeks of use; fix defects and content; no new group and no new scope. Apply cuts C1 to C6 of doc 13 if G9 is above 1.3. Then apply these rules again from rule 1. |

Write the decision, the measured values and the next three tasks in `docs/CHANGELOG.md` before choosing which group is more fun to build.

## 9. Deviations to confirm and open points

1. **Project log without upload validation (BL-0179).** The full path validates uploads in the worker (BL-0120, ST-UPL). The lean log allows uploads for admin users only, with size and type caps, and never parses the bytes. This departs from the CLAUDE.md rule for new upload paths; decision G17 (00a) makes it a time-limited exception for founder-only use, and it needs the founder's explicit acceptance; the owners of docs 10 and 12 should confirm. R-25.
2. **Staging as the founder's environment.** The lean slice does not create a production environment (BL-0109, D1). The founder's study history lives in the staging Supabase project; BL-0103 (backup and restore drill) is in the lean set and a weekly export is advised (R-25).
3. **Unaided checkpoints deferred** (section 2, rule 3). Doc 13's never-cut list was amended accordingly.
4. **BL-0112 dependency relaxed** (from BL-0108 to BL-0070) so that safety briefs and golden builds can be done without the tutor and sandbox milestone.
5. **Skills served by non-lean graders.** Section 3.1 states that code and SPICE skills are served through other task kinds until D3. The session builder must not serve a task kind whose grader is not enabled; if the builder cannot express that, a feature flag is needed (not specified in the package; stop and ask under the stop-and-ask list of CLAUDE.md, item 2 if it requires a schema change).
6. **Template count.** 30 verified templates cover about 15 skills at two templates per skill; the target of 30 to 50 is met at 30 (core) and 40 (with BL-0180).
7. **Guided week-1 blink is a project-first exception** (BL-0183, doc 10 section 3.2): step `prj.L0.blink-led#s09` unlocks after the kit and safety-brief steps without the skill gate, gives L0 credit only, and in the lean slice is logged by hand (BL-0179). It is a deliberate departure from the rule that the frontier decides what is available, made because the first physical win would otherwise wait until about week 8 to 14 of study (00f F-05, F-10). A safety-gated step stays locked while its brief file is missing (doc 10 section 5.3); the L0 brief is the one hazard-related document in the lean slice (R-08).
8. **Review pass 3 raised the lean hour target** from 100-200 to 100-225 hours (section 6.1) instead of dropping tasks; the cheapest cut, if logged hours run ahead, is still the five optional tasks, then BL-0193, 0194 and 0195 to the first weeks of use.
9. **Everything in this plan is [P].** The first checks of the model are the Phase -1 hours and the first 10 lean tasks; refit at the end of L1 (BL-0032) and at BL-0181.
