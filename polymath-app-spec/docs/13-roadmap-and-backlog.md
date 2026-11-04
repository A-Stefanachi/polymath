# 13 - Roadmap and backlog

Status: v1.1, 31 Oct 2026 (lean slice and founder-attention model added). Binding upstream: `00-contract.md` and `00a-change-decisions.md` (00a wins on conflicts). Companions: `00d-lean-slice-plan.md` (the lean slice, the Phase -1 pre-experiment and the go/no-go checkpoint, which are the first deliverable), `lean-build-gate.md`, `factory-wave-manifest.md`, `content-authoring-runbook.md`, `content-population-roadmap.md`, `01-PRD.md` (milestones M0 to M5), `03-architecture.md` (repository layout, ADRs), `backlog/backlog.yaml` (the machine-readable task list this document explains), `14-risk-register.md`, `CLAUDE.md` (rules for coding agents).

Evidence tags follow the contract: **[P]** design proposal or inference. **Every hour figure, date and ratio in this document is [P] and unvalidated.** No source measured how long this product takes one person to build. The numbers exist so that decisions can be made and so that the first weeks of real work can falsify them (section 9).

## 1. Purpose and how to read this document

This document turns the specification package into a build plan for one person: a founder with a full-time job, about 8 hours a week, using AI coding agents. It answers five questions: what to build in which order, what is shippable at each milestone, how long it might take, what to cut when time runs short, and how to hand a task to an agent safely.

Read sections 2 and 3 for the plan and the timeline (3.3 for the honest founder-hour model, 3.4 for the lean slice), section 5 for the cut list, section 8 for the agent workflow, and section 10 for the weekly routine. The backlog file holds the detail: 195 tasks, 1,095.5 hours of task size (modelled at about 768 founder hours, range 523 to 1,180, section 3.3). 83 of the tasks are tagged `lean: true` and form the first deliverable: about 233 founder hours of building (range 156 to 351), described in `00d-lean-slice-plan.md`. Review pass 3 (31 Oct 2026) added 13 tasks (BL-0183 to BL-0195, ten lean) and about 20 modelled founder hours to the lean slice. **The full plan remains a multi-year project for one part-time person; the lean slice is the part that can be finished and used within one year.**

## 2. Planning assumptions [P]

| ID | Assumption | Consequence if wrong |
|---|---|---|
| PA-1 | The founder can spend **8 hours a week** on this project, all weeks, for the whole period | At 6 hours the dates in section 3 move out by one third |
| PA-2 | An estimate (`estimate_h`) is the **size of a task** for an AI-assisted solo developer, one working session (PA-3). It was originally described as founder attention hours. Section 3.3 separates the two: founder attention for an agent task is a fixed hand-off and merge cost plus a fraction of the task size for review and rework; agent compute and waiting time costs the founder nothing. The original reading (task size equals founder hours) is the high end of the modelled range | If agents need more rework than assumed, founder hours are higher; if the original reading is right, every figure here is about 1.5 times the central case |
| PA-3 | Agent tasks are sized 0.5 to 8 hours so that one task fits one working session and one pull request | Larger tasks must be split before they start |
| PA-4 | From M1 the founder also **uses** the app to learn. That use is not build time. The 8 hours in PA-1 cannot be spent twice | If learning takes 3 of the 8 hours, build time is 5 hours and the timeline stretches (scenario C below) |
| PA-5 | Hosting, vendor and legal costs are as in doc 03 section 12 (recalled prices [R]) and are not a constraint on time | A price change can force work (R-13) |
| PA-6 | Estimates assume the reference code in `reference/` is reused as the specification and test oracle; ports are not re-designed | If the TypeScript ports diverge from the vectors, rework is large (R-19) |
| PA-7 | Content authoring (templates) is founder time at roughly 45 to 60 minutes per verified template with an AI draft assistant (the model uses 45, 60 and 90 minutes for low, central and high) | The slice needs 70 to 95 templates; at 90 minutes each the content work alone grows by about 40 hours. The lean slice needs 30 to 40 |
| PA-8 | The lean slice (section 3.4) is built first, after the Phase -1 pre-experiment, and nothing tagged `lean: false` starts before the go decision of BL-0181 | If deferred work is started early the lean slice slips and the learning hours erode (R-22, R-23) |
| PA-9 | Learning hours are reserved before building hours: 2.5 of 8 hours a week (1.5 of 5), plus 0.75 (0.5) for the weekly review and slack. Building gets the rest: 4.75 h (3.0 h) | If learning is cut to protect build speed the product is validated by nobody (R-22) |

Cut tiers in the backlog (`cut_tier`): **1 = core** (needed for a founder-only product with honest measurement and the safety guards), **2 = important** (needed for measurement-grade evidence or external users), **3 = stretch** (cut first without harming the core).

## 3. Milestone plan M0 to M5

The milestones, FR sets and exit criteria come from doc 01 section 10 and are not changed here. This section adds the shippable result, the task count and the estimated hours.

| Milestone | Tasks | Est. hours [P] (task size) | Agent h | Founder-owned h | Tier 1 h | PRD window | Finish at 8 h/wk build (A) | Finish at 6.4 h/wk (B) | Finish if 5 h/wk build from M1 (C) |
|---|---|---|---|---|---|---|---|---|---|
| M0 | 36 | 147 | 131 | 16 | 147 | Nov-Dec 2026 | Mar 2027 (week 18) | Apr 2027 | Mar 2027 |
| M1 | 48 | 244.5 | 200.5 | 44 | 230.5 | Jan-Feb 2027 | Oct 2027 (week 48) | Jan 2028 | Feb 2028 |
| M2 | 44 | 263 | 233 | 30 | 162 | Mar-Apr 2027 | May 2028 (week 81) | Oct 2028 | Feb 2029 |
| M3 | 31 | 189 | 130 | 59 | 127 | May-Jun 2027 | Nov 2028 (week 105) | May 2029 | Nov 2029 |
| M4 | 20 | 138 | 62 | 76 | 0 | Jul-Aug 2027 | Mar 2029 (week 122) | Oct 2029 | May 2030 |
| M5 | 16 | 114 | 53 | 61 | 0 | Sep 2027 onward | Jun 2029 (week 136) | Feb 2030 | Oct 2030 |
| **Total** | **195** | **1095.5** | **809.5** | **286** | **666.5** | | Jun 2029 | Feb 2030 | Oct 2030 |

Start date for all projections: Monday 2 November 2026. **These columns read each task size as founder hours (the original PA-2 reading, the pessimistic end of the model in section 3.3) and give no time to learning**, so they are an upper bound on speed, not a forecast. Scenario A is the literal reading of the brief (8 build hours a week, no slack). Scenario B uses 6.4 hours (80 percent productive weeks after holidays, illness and interruptions). Scenario C assumes 5 build hours and 3 learning hours from M1 (PA-4). All are [P].

### 3.1 The honest finding: the PRD windows do not fit these estimates

Doc 01 section 10 gives indicative windows that end M5 in September 2027, about 45 weeks or 360 hours at 8 hours a week. The backlog totals 1095.5 hours of task size, about 3.0 times that. Read through the founder-attention model of section 3.3 the total is about 768 founder hours (central; 523 to 1,180), which is still 2.1 times the PRD window at the central estimate and 1.5 times at the low estimate: **no modelled case fits the PRD windows for the full plan**. Three readings are possible, and the founder should pick one explicitly (see the open questions in the README):

1. **The estimates are too high.** AI agents may make typed work much faster than assumed. This is plausible but untested; section 9 describes how to find out in the first four weeks.
2. **The PRD windows are too optimistic.** The windows were written as indicative before the backlog existed (doc 01 section 10 says they move with reality).
3. **The scope is too large for one part-time person.** Then use the cut list in section 5.

A velocity sensitivity makes the point concrete. If real hours are half of the task sizes, the core (tier 1) through M3 takes 333 hours, about 42 weeks at 8 hours a week. If real hours equal the task sizes it takes about 83 weeks. If real hours are 1.5 times the task sizes, about 125 weeks. Finishing M5 on the PRD's schedule would require real hours at roughly one third of the task sizes [P].

**Time to first daily use.** The first point at which the founder can run a real phone micro session (task BL-0060, the micro session runner) has 47 tasks and 219.5 hours of task size as prerequisites (itself included), about 27 weeks at 8 hours a week if all of it went to building. With the model and the learning hours reserved (section 3.3), the lean slice reaches first daily use after about 168 founder hours of building (110 to 253), which is week 40 (August 2027) at 8 hours a week and week 60 (December 2027) at 5. Until then the founder keeps learning with the tools they already use; the no-build Phase -1 experiment of `00d-lean-slice-plan.md` is the way to start that now. Doc 01 describes dogfooding from M1; this is when it can start.

### 3.2 What is shippable at each milestone

The lean slice (section 3.4) delivers M0 and M1 of this list, with the changes named there; the milestones M2 to M5 are the deferred groups.

#### M0 Walking skeleton

- **Shippable:** Sign in by magic link, set a weekly target, answer one verified numeric item rendered from a git template with 3 seeds, see the attempt logged; content syncs from git; RLS suite and claims lint run in CI; a staging site and worker are deployed.
- **FRs demonstrable:** FR-001, 002, 010, 060, 061, 067, 110, 122, 126; FR-004 founder record
- **Exit criteria:** One template rendered with 3 seeds, all verified; RLS tests green; claims lint zero hits (SM-06)
- **Demo and gate task:** Founder demo on the staging site from the phone; task BL-0032
- **Size:** 36 tasks, 147 estimated hours [P] (131 agent-task hours, 16 founder hours; the added tasks are BL-0182, the Phase -1 pre-experiment, BL-0183, the guided week-1 blink preparation, and BL-0194 and BL-0195, claims-lint allow-context and package checks).

#### M1 Practice core

- **Shippable:** Phone micro sessions from the 15 to 20 skill math and elec slice: worked example, faded problems, same-day retrieval, FSRS reviews with fresh variants, confidence ratings, frontier map with reasons, due inbox, progress page, installable PWA, review console and report-a-problem. About 30 verified templates.
- **FRs demonstrable:** FR-011 to 013, 020, 021, 023 to 025, 030, 031, 040 to 044, 062, 066, 071, 090, 100, 124, 125
- **Exit criteria:** All scheduler vectors pass (the `count` field of `reference/scheduler_test_vectors.json` is authoritative; the applied-gap, span, template-diversity, placement-grace and retention vectors are delivered by BL-0184 to BL-0187); two weeks of founder use; SM-02 and SM-09 met; zero unverified serves (SQL audit)
- **Demo and gate task:** Two weeks of real phone sessions; task BL-0069 and BL-0070
- **Size:** 48 tasks, 244.5 estimated hours [P] (200.5 agent-task hours, 44 founder hours; the added tasks are BL-0178, 0180, 0181 and, from review pass 3, BL-0184 to 0187, 0190, 0191 and 0193).

#### M2 Guarded tutor and execution grading

- **Shippable:** Focus blocks on desktop; attempt-first tutor with hint ladder and leak filter; code and SPICE grading in a production sandbox; unaided checkpoints; diagnostic; offline micro tasks; reminders; first n-of-1 experiment (EXP-001) pre-registered and running; backups drilled; production environment. About 50 templates.
- **FRs demonstrable:** FR-003, 022 (focus), 026, 032, 033, 050 to 056, 063 to 065, 070, 101 to 104, 111, 112, 123
- **Exit criteria:** Tutor policy audit passed (SM-13); the 25 adversarial cases and the 20 sandbox escape cases pass; latency targets recorded; EXP-001 pre-registered before the first assignment
- **Demo and gate task:** Tutor session and a code-graded task on the founder's phone and desktop; task BL-0108
- **Size:** 44 tasks, 263 estimated hours [P] (233 agent-task hours, 30 founder hours; review pass 3 added BL-0188, 0189 and 0192).

#### M3 Projects and evidence

- **Shippable:** Lab blocks with parts list and safety gates; evidence upload with nonce challenges; automatic checks and the founder review queue; credit ledger; perceptual drills, explain-back, debug cases; delayed tests begin; ladder projects L0 to L2 built once as golden builds.
- **FRs demonstrable:** FR-022 (lab), 034 to 037, 072, 073, 080 to 085, 091
- **Exit criteria:** Founder completes project L0 with accepted evidence (SM-05); first delayed tests scheduled
- **Demo and gate task:** Evidence accepted for L0 in the app; task BL-0139
- **Size:** 31 tasks, 189 estimated hours [P] (130 agent-task hours, 59 founder hours; the added task is BL-0179).

#### M4 Measurement-grade

- **Shippable:** Transfer tasks; projects L3 and L4; analysis export and dashboards; data export and deletion; privacy and security release gate; legal and ethics review; restore drill on production; KiCad checks as a stretch.
- **FRs demonstrable:** FR-068 (stretch), 074, 113, 120, 121
- **Exit criteria:** Pre-registered analysis of EXP-001 runs end to end on real data; privacy features pass tests; security test log complete
- **Demo and gate task:** Analysis report from real data and a clean release gate; task BL-0160
- **Size:** 20 tasks, 138 estimated hours [P] (62 agent-task hours, 76 founder hours).

#### M5 Closed beta (10 to 50)

- **Shippable:** Consent flow, cohorts, randomisation to an active control, beta onboarding, offline hardening, accessibility audit, L5 first KiCad board (last item built), 12-week intervention and 8-week delayed test.
- **FRs demonstrable:** FR-004 (full), 114
- **Exit criteria:** Beta pre-registration filed before first enrolment; at least 10 learners enrolled; decision rubric of doc 11 section 14 applied
- **Demo and gate task:** Beta cohort running; task BL-0176
- **Size:** 16 tasks, 114 estimated hours [P] (53 agent-task hours, 61 founder hours).

External users: none before M4 exit (doc 01 section 10). Production is created in M2 for the founder only.

### 3.3 Founder-attention model: what the hours really are [P]

The backlog's `estimate_h` is the size of a task, sized so that one task fits one working session and one pull request (PA-3). It was described as founder attention hours (PA-2), but a task size is not the same as the founder's time when an agent writes the code: the agent's generation, test runs, CI and deploys are compute and waiting time that costs the founder nothing, and the founder's time is hand-off, review, decisions and the work only the founder can do. This section separates the two. **Every figure is [P] and unvalidated; no source measured these ratios.** The parameters are stored in `backlog/backlog.yaml` (`meta.founder_attention_model`) and `python3 reference/validate_backlog.py` computes every total below from them.

| Component | What it covers | Low | Central | High |
|---|---|---|---|---|
| Agent task, fixed | Assemble the hand-off (doc 13 section 8.3), start the agent, run the headline acceptance test, merge, log the hours | 0.3 h | 0.5 h | 0.8 h |
| Agent task, variable | Review the diff with the section 8.5 checklist, request changes, fix red tests, answer the agent's questions; a fraction of the task size | 25 percent | 40 percent | 60 percent |
| Agent compute and waiting | Generation, test runs, CI, deploys | not counted | not counted | not counted |
| Template authoring (BL-0065, 0066, 0105, 0138, 0158, 0180) | AI draft, solve by hand, lint and fuzz fixes, G3 spot check; the tasks are sized at 48 minutes a template | 0.94 times (45 min) | 1.25 times (60 min) | 1.88 times (90 min) |
| Golden builds and starter repositories | Bench work, rebuilds, captures, measurement spread; first-time hardware | 1.0 times | 1.5 times | 2.5 times |
| Legal, ethics and security preparation (BL-0153, 0156, 0174) | Founder-side preparation only; counsel's own time and waiting are calendar time, not hours | 1.0 times | 1.5 times | 2.5 times |
| Other founder tasks | Accounts, decisions, reviews, pre-registrations, operations | 0.9 times | 1.0 times | 1.4 times |

Unit costs that follow (founder hours per task, low / central / high): an agent task of size 0.5 h costs 0.4 / 0.7 / 1.1; of 2 h, 0.8 / 1.3 / 2.0; of 5 h, 1.6 / 2.5 / 3.8; of 8 h, 2.3 / 3.7 / 5.6. Security-critical diffs that are reviewed line by line (RLS, privileged module, sandbox, tutor filter, mastery rule; section 8.1) belong in the high column. A verified template costs 45 / 60 / 90 minutes. Golden build of L0 (size 6 h): 6 / 9 / 15 h. Legal preparation (BL-0156, size 10 h): 10 / 15 / 25 h. Per week, 0.75 h (at 8 h/week) or 0.5 h (at 5 h/week) goes to the weekly review and slack (section 10) and 2.5 h or 1.5 h to learning (PA-9), leaving 4.75 h or 3.0 h for building.

**Scenarios** (founder hours; modelled from the task sizes of the current backlog):

| Scenario | Full plan (195 tasks) | Lean slice (83 tasks) | Lean core (78 tasks) | Lean through first daily use |
|---|---|---|---|---|
| Low | 523 | 161 | 147 | 115 |
| Central | 768 | 239 | 218 | 174 |
| High | 1,180 | 359 | 328 | 261 |
| Original reading (task size equals founder hours) | 1,095.5 | 395.5 | 366.5 | 303.5 |

**Calendar** (weeks of building; start Monday 2 November 2026; no allowance for lost weeks, add about 25 percent):

| Weekly plan | Build h/week | Full plan low / central / high | Lean slice low / central / high |
|---|---|---|---|
| 8 h/week, all hours but review on building (no learning) | 6.75 | 77 / 114 / 175 | 24 / 35 / 53 |
| 8 h/week, learning reserved | 4.75 | 110 / 162 / 248 | 34 / 50 / 76 |
| 5 h/week, learning reserved | 3.0 | 174 / 256 / 393 | 54 / 80 / 120 |

**Sensitivity of the central lean total (239 h) to one assumption at a time:**

| Assumption changed | Lean total | Full plan |
|---|---|---|
| Agent variable fraction 25 percent instead of 40 | 188 | 646 |
| Agent variable fraction 60 percent instead of 40 | 306 | 930 |
| Agent fixed cost 0.3 h / 0.8 h instead of 0.5 | 224 / 261 | 736 / 816 |
| Template minutes 45 / 90 instead of 60 | 229 / 259 | 744 / 817 |
| Other founder tasks 0.9 / 1.4 times | 236 / 250 | 759 / 804 |
| Task sizes themselves 0.5 / 0.75 / 1.5 / 2.0 times | 138 / 188 / 340 / 441 | 424 / 596 / 1,112 / 1,456 |

**Is the answer still large? Yes.** The most sensitive assumptions are the review fraction and whether the task sizes themselves are right. The full plan needs about 770 founder hours at the central estimate, and even the low case (523 hours) is 1.5 times what the PRD windows imply (about 360). At 8 hours a week with learning protected that is about three years (week 162, December 2029); with every non-review hour spent on building it is about 114 weeks (January 2029). The honest conclusion is that M2 to M5 are not a 2027 plan for one part-time person; the lean slice is. Hours spent are logged per task id in `docs/time-log.csv` with a separate column for founder hours and an optional one for agent waiting minutes, and the model is re-fitted after the first 10 lean tasks, at the end of L1 (BL-0032) and at the go/no-go checkpoint (BL-0181; R-24).

### 3.4 The lean slice is the first deliverable

Every task in `backlog/backlog.yaml` carries `lean` (true or false) and `lean_phase`. Lean tasks are L0 (Phase -1, BL-0182, and the guided blink preparation BL-0183), L1 foundation, L2 learning loop to first daily use, L3 use while building; deferred tasks are labelled D1 to D9. The lean slice is a strict subset of the backlog (same schema, IDs, contract); five tasks were added at the end (BL-0178 to BL-0182) and review pass 3 added thirteen more (BL-0183 to BL-0195, ten of them lean); the validator rejects any lean task that depends on a non-lean task or on a later lean phase. Full definition, the Phase -1 protocol, the week-by-week plans at 8 and 5 hours a week with the learning split, the deferred groups with re-entry points and the go/no-go scorecard are in `00d-lean-slice-plan.md`.

| Phase | Tasks | Task size h | Founder h low / central / high [P] |
|---|---|---|---|
| L0 Phase -1 and guided blink preparation (no app build) | 2 | 11 | 10 / 11 / 15 |
| L1 Foundation (M0) | 32 | 130 | 45 / 70 / 106 |
| L2 Learning loop to first daily use | 32 | 162.5 | 61 / 93 / 140 |
| L3 Use while building | 17 | 92 | 46 / 65 / 98 |
| **Lean total** | **83** | **395.5** | **161 / 239 / 359** |
| Deferred D1 to D9 | 112 | 700 | 362 / 529 / 821 |

Nothing tagged `lean: false` starts before the go decision of BL-0181. The lean slice covers every M0 and M1 requirement of doc 01 section 10 (the settings screen BL-0062 is deferred) and the deferred groups are, in effect, the rest of M1's operations, M2 to M5.

## 4. Build order and critical path

The order below follows dependencies, not document numbers. Layers 0 to 6 (plus BL-0103, 0117, 0118, 0178 to 0181) are the lean slice; layers 7 to 15 are deferred (groups D1 to D9, `00d-lean-slice-plan.md` section 7). Each layer lists backlog tasks. A layer's milestone is when it must be finished; some layers have a first slice earlier and a hardening slice later (marked).

| Layer | What | Backlog tasks | Milestone |
|---|---|---|---|
| 0 | Phase -1 no-build pre-experiment and the guided week-1 blink preparation (lean, L0) | BL-0182, BL-0183 | before M0 |
| 1 | Repository, CI, boundaries, secrets, claims lint, package checks | BL-0002, BL-0003, BL-0004, BL-0005, BL-0006, BL-0194, BL-0195 | M0 |
| 2 | Data model and content sync (migrations, RLS suite, schemas, template engine, verification, queue, sync) | BL-0007, BL-0008, BL-0009, BL-0010, BL-0011, BL-0012, BL-0013, BL-0014, BL-0015, BL-0016, BL-0017, BL-0018 | M0 |
| 3 | Auth, API skeleton, numeric and multiple-choice grading, first served item | BL-0021, BL-0022, BL-0023, BL-0024, BL-0019, BL-0025, BL-0026, BL-0027 | M0 |
| 4 | Scheduler (vectors first), FSRS adapter, apply-attempt, item pool, session builder, learning loop | BL-0033, BL-0034, BL-0035, BL-0036, BL-0037, BL-0038, BL-0039, BL-0040, BL-0041, BL-0042, BL-0043, BL-0044, BL-0045, BL-0184, BL-0185, BL-0186, BL-0187, BL-0191 | M1 |
| 5 | Symbolic grading, content lint, verifier kinds, fuzz, report and review | BL-0054, BL-0055, BL-0050, BL-0051, BL-0052, BL-0053, BL-0056, BL-0057 | M1 |
| 6 | Learner UI: Today, runner, map, progress, review inbox, settings, PWA shell, accessibility; getProgress and the graph-content sync | BL-0058, BL-0059, BL-0060, BL-0061, BL-0062, BL-0063, BL-0064, BL-0190, BL-0193 | M1 |
| 7 | Tutor: LlmClient, policy, filter, route, adversarial suite, UI, audit | BL-0073, BL-0074, BL-0075, BL-0076, BL-0077, BL-0078, BL-0079, BL-0080 | M2 |
| 8 | Code-test and SPICE grading in a production sandbox; grade_attempt job; rubric grader | BL-0081, BL-0082, BL-0083, BL-0084, BL-0085, BL-0086 | M2 |
| 9 | Focus sessions, diagnostic, checkpoints, delayed tests | BL-0087, BL-0090, BL-0091, BL-0092, BL-0093, BL-0128 | M2 (delayed tests M3) |
| 10 | Experiments and event logging (framework M2; analysis export and dashboards M4) | BL-0024, BL-0094, BL-0135, BL-0147, BL-0148 | M0 to M4 |
| 11 | Offline basics, reminders (first slice) | BL-0095, BL-0096, BL-0097 | M2 |
| 12 | Projects and evidence: sync, API, challenges, upload, verifiers, review UI, credit ledger, lab UI | BL-0117, BL-0118, BL-0119, BL-0120, BL-0121, BL-0122, BL-0123, BL-0124, BL-0125, BL-0126 | M3 |
| 13 | Privacy, export and delete, security release gate, legal review, restore drill | BL-0149, BL-0150, BL-0151, BL-0153, BL-0156, BL-0155, BL-0154 | M4 |
| 14 | Offline and PWA hardening, beta machinery | BL-0162, BL-0164, BL-0165, BL-0166, BL-0167, BL-0163, BL-0172, BL-0173 | M5 |
| 15 | L5 and KiCad (last item built, 00a A3) | BL-0152, BL-0168, BL-0169, BL-0170, BL-0171 | M4 (wrapper stretch) and M5 |

Deviation from a purely linear order, with reasons: the experiment framework (layer 10) starts with event logging in M0 because every later task emits events (FR-110 is a Must in M0); experiments are assigned in M2 so EXP-001 can start while the founder is already using the app; offline basics (layer 11) are needed in M2 for phone micro use and are hardened in M5 once real use has shown the failure modes.

### 4.1 Critical path

The longest dependency chain by estimated hours has 38 tasks and 253 hours (BL-0112 now depends on BL-0070 instead of BL-0108, so the safety briefs and golden builds no longer wait for the tutor and sandbox milestone). For one person working serially, total hours matter more than the chain, but the chain shows which tasks block everything else and so should never be started late or left half done:

| Order | Task | Title | Milestone | Hours |
|---|---|---|---|---|
| 1 | BL-0001 | Create hosting and vendor accounts and choose the data region | M0 | 3 |
| 2 | BL-0002 | Scaffold the pnpm monorepo per the repository layout | M0 | 4 |
| 3 | BL-0005 | Secrets scanning, .env.example and log redaction helper | M0 | 3 |
| 4 | BL-0014 | Worker service scaffold: FastAPI, Dockerfile, HMAC middleware, healthz | M0 | 4 |
| 5 | BL-0015 | Port safe_expr and tplkit to the worker content package | M0 | 5 |
| 6 | BL-0017 | Verification engine and report writer for numeric templates | M0 | 6 |
| 7 | BL-0025 | Serve gate: getTask and getItem return only verified, sanitised items | M0 | 4 |
| 8 | BL-0026 | submitAttempt for numeric and multiple-choice items (inline grading) | M0 | 6 |
| 9 | BL-0027 | Minimal item page: render, answer, feedback (M0 demo) | M0 | 5 |
| 10 | BL-0032 | M0 exit test: walking skeleton end to end | M0 | 4 |
| 11 | BL-0033 | Scheduler package scaffold and test-vector runner | M1 | 3 |
| 12 | BL-0035 | Scheduler: masteryRule, masteryState, tierAttained, aggregateAttempts | M1 | 7 |
| 13 | BL-0036 | Scheduler: computeAvailable, computeFrontier, frontierScores, projectPull | M1 | 6 |
| 14 | BL-0037 | Scheduler: packSession, interleaveStage, checkpointStatus, isStuck, traceBack, hintReliance | M1 | 8 |
| 15 | BL-0044 | buildSession, startSession, getSession, completeSession, listSessions | M1 | 8 |
| 16 | BL-0059 | Screens S01, S02, S06, S07: sign-in, onboarding, Today, session preview | M1 | 7 |
| 17 | BL-0060 | Screens S08, S09: micro session runner and summary | M1 | 8 |
| 18 | BL-0063 | Installable PWA shell and start-time budget | M1 | 4 |
| 19 | BL-0069 | M1 exit test and zero-unverified-serves audit | M1 | 4 |
| 20 | BL-0070 | Founder dogfoods M1 for two weeks and logs defects | M1 | 6 |
| 21 | BL-0071 | Decide the bill of materials and buy the starter kit | M2 | 4 |
| 22 | BL-0113 | Build starter repositories l0-blink, l1-signal, l2-switch | M3 | 14 |
| 23 | BL-0114 | Golden build of project L0 (blink an LED) with all captures | M3 | 6 |
| 24 | BL-0115 | Golden build of project L1 (divider and RC filter measured vs SPICE) | M3 | 8 |
| 25 | BL-0116 | Golden build of project L2 (transistor switch and regulator) | M3 | 8 |
| 26 | BL-0139 | M3 exit: founder completes L0 with accepted evidence | M3 | 4 |
| 27 | BL-0143 | Build starter repositories l3-bme280 and l4-fsm | M4 | 14 |
| 28 | BL-0144 | Golden build of project L3 (I2C sensor with UART log) | M4 | 10 |
| 29 | BL-0145 | Golden build of project L4 (state machine with interrupts) | M4 | 8 |
| 30 | BL-0159 | Review thresholds from golden builds and update step specs | M4 | 4 |
| 31 | BL-0160 | M4 exit: end-to-end analysis and privacy tests | M4 | 4 |
| 32 | BL-0168 | Build starter repository l5-kicad and BOM for the carrier board | M5 | 12 |
| 33 | BL-0169 | KiCad verifiers for L5: ERC, DRC, gerber reproduction | M5 | 8 |
| 34 | BL-0170 | Golden build of project L5 (first KiCad board) | M5 | 16 |
| 35 | BL-0171 | Mark L5 verified and enable it in the ladder | M5 | 2 |
| 36 | BL-0176 | M5 exit: beta-ready end to end | M5 | 4 |
| 37 | BL-0177 | Beta weekly operations and decision-rubric review at week 12 | M5 | 20 |

The chain goes through the repository and database foundations, content sync, the scheduler vectors, the session builder, the micro runner, the M1 exit and dogfooding, the starter kit and golden builds, the privacy and release gates, KiCad and the beta machinery. Items off the chain (UI polish, dashboards, most templates) can be moved to fill short weeks.

### 4.2 Parallel lanes for a solo founder

There is one person, so "parallel" means interleaving by session length: use the two 90-minute weekday slots for small agent tasks that fit (0.5 to 3 hours), the weekend block for the large ones (4 to 8 hours) and for hardware or content work that needs the bench. Do not run more than two tasks in flight (section 8.6).

## 5. What to cut if time runs short

Cut in this order. Each row is a decision the founder can take at any milestone boundary without breaking the layers below it. Hours are the backlog estimates [P].

| Cut | What | Tasks | Hours saved | Consequence |
|---|---|---|---|---|
| C1 | Drop L5 and KiCad (project L5, kicad wrapper, L5 verifiers) | BL-0152, BL-0169, BL-0170, BL-0168, BL-0171 | 46 | Contract 00a A3 already makes L5 last. FR-068 is a Could. |
| C2 | Drop Web Push; use email reminders only | BL-0097 | 6 | FR-103 is Should. Reminders by email reuse the SMTP setup. Removes the iOS push uncertainty (OA-7). |
| C3 | Drop the weekly plan screen and rebalance UI (keep the pure functions) | BL-0099 | 5 | Not in the PRD's M2 FR list. Today still works from the session builder. |
| C4 | Drop perceptual drills, explain-back, self-explanation and expertise reversal | BL-0129, BL-0130, BL-0089, BL-0132 | 18 | FR-035, 036, 032, 034 (Should or Could). EXP-003 and EXP-004 are dropped with them. |
| C5 | Reduce the dashboards to D1 and the SQL views, drop the cost report page | BL-0148, BL-0140 | 9 | Keep the views; read them with SQL. |
| C6 | Defer transfer tasks and the extra template batch | BL-0142, BL-0158, BL-0137 | 25 | FR-074 (Should); EXP-002 to EXP-005 pre-registration deferred. |
| | **Subtotal C1 to C6** | | **109** | |

If that is still not enough, scope-down options change what the product is. Each needs a decision recorded in `docs/CHANGELOG.md`, and S3 and S4 need a contract change request because they remove Must requirements.

| Option | What | Tasks | Hours saved | Consequence |
|---|---|---|---|---|
| S1 | Drop the closed beta (keep n-of-1 experiments and the founder's own use) | BL-0164, BL-0165, BL-0166, BL-0167, BL-0174, BL-0175, BL-0177, BL-0172, BL-0176, BL-0173, BL-0163 | 70 | Product becomes a personal tool plus an n-of-1 study. Consent (FR-004 full) and FR-114 are then not needed. |
| S2 | Drop the guarded tutor (static worked solutions only) and EXP-001 | BL-0073, BL-0074, BL-0075, BL-0076, BL-0077, BL-0078, BL-0079, BL-0080, BL-0107 | 59 | Removes the largest known risk (R-03, R-04) but also the product's main hypothesis. Fallback hints remain static. |
| S3 | Drop code-test and SPICE graders and the sandbox | BL-0081, BL-0082, BL-0083, BL-0084, BL-0133 | 38 | Keeps numeric, symbolic and multiple-choice only. Removes R-02. Contract FR-063 and FR-064 are Must, so this needs a contract change. |
| S4 | Drop offline mode | BL-0095, BL-0096, BL-0162 | 22 | FR-101 is a Must in the PRD, so this needs a contract change. Online-only micro sessions remain. |

**Lean-slice cuts before anything else:** if the logged hours run ahead of the model, drop the five optional lean tasks first (BL-0180, 0179, 0118, 0117, 0178; about 20 modelled founder hours), then reduce the first 15 templates to 10 and the second batch accordingly; see `00d-lean-slice-plan.md`.

**Never cut** (these protect learners and the integrity of the data): the verification gate and the serve gate (FR-060, FR-067); the RLS suite and the secret scanning; the claims lint; unaided checkpoints and the strict-unaided view (the lean slice defers BL-0092 because it has no tutor and no hints, so every attempt is unaided; it must ship no later than the tutor, `00d-lean-slice-plan.md` section 2); the attempt-first gate if the tutor ships; sandbox isolation tests if code grading ships; safety gates and briefs for any hardware step; the backup and restore drill; the scheduler vector tests.

**Degrade rather than cut:** a reduced slice (fewer skills, 30 templates instead of 50) before dropping a layer; email reminders instead of push; a fixed-interval fallback scheduler flag if FSRS calibration is poor (R-05); founder-only code grading until the sandbox is independently reviewed (R-02).

## 6. Definition of done by task type

A task is done only when every row for its type is true. "CI green" always means lint, typecheck, unit tests, boundary lint, claims lint and the reference validators.

| Task type | Definition of done |
|---|---|
| Database migration | New file in `supabase/migrations/` (never edit applied ones); `supabase db reset` passes; `pnpm db:diff-reference` clean or `schemas/schema.sql` and doc 04 updated in the same PR; RLS enabled on new user tables with a test in `supabase/tests/rls`; generated types updated; indexes for new query paths; rollback note in the PR. |
| Pure-function package (scheduler, grading-core, tutor-policy) | Functions match names in the owning doc; no I/O, clock or environment access (lint); reference vectors or table vectors pass; property tests for invariants; coverage on branches of the rule; no change to vector files without a doc change. |
| Route handler / domain function | Under 60 lines of handler, logic in a domain module; input validated by schema from the OpenAPI file; response contains no secret fields (allow-list serialiser); idempotency and ownership tests; rate limit where it writes; OpenAPI updated if the shape changed; events emitted per doc 11 section 9; an ST-API test where doc 12 lists one. |
| UI screen | Follows doc 09 screen spec and copy guide; axe zero critical and serious issues; keyboard-only path tested; works at 360 px and 1280 px; math has a text alternative; strings pass claims lint; empty, loading and error states present; Playwright scenario for the main path. |
| Worker grader / verifier | Python tests including the shared vectors; time and memory limits; deterministic output for the same input; typed failure for invalid input; runs through the sandbox if it executes learner input; latency measured against the contract targets; verification report fields written. |
| Sandbox or isolation change | The full escape suite passes against staging in nsjail mode; no secrets in the sandbox environment (test); new capability documented in doc 12; rollback plan; founder reviews the diff personally. |
| Tutor prompt, filter or model change | Adversarial suite passes in mock mode and in real-model mode with the budget cap; version bump of the prompt file; leak filter fixtures updated; policy flags verified; cost per call recorded. |
| Content template | Passes G0 schema and G1 lint; passes the 200-sample fuzz; independent recomputation agrees; founder spot-check (G3) recorded with date after the last edit; `license` and `source` filled; difficulty prior set; status `verified` only through the pipeline. |
| Project step or evidence check | Step has safety fields and a brief where needed; check has a golden fixture that passes and at least one perturbed fixture that fails; threshold derivation recorded; T-PRJ test added or updated; project stays `draft` until its golden build exists. |
| Security test | Test is automated where doc 12 says CI or PRE; a deliberate failure was demonstrated once (mutation check); result recorded in `docs/security-test-log.md` for MAN and PRE tests. |
| Founder task | The listed artifact exists in the repository or a decision is recorded in `docs/CHANGELOG.md` or `infra/ACCOUNTS.md`; the proof test in the backlog task passes; time spent logged against the task id. |
| Operations task (deploy, alert, backup) | Done in staging first; drill performed and logged with times; runbook exists with trigger, first steps and rollback; alert reaches the founder's phone. |
| Documentation / spec change | Edit the owning document; update IDs only by addition, never renumber; record a contract change request if a contract item changes; `python3 reference/validate_backlog.py` still passes. |

## 7. Founder-only work

These tasks cannot be done by an agent because they need the founder's hands, money, judgement or legal standing. Hours are [P]. Several have long lead times outside the 8-hour budget (shipping, fabrication, counsel availability); start them early.

| Task | Title | Milestone | Hours | Needs |
|---|---|---|---|---|
| BL-0001 | Create hosting and vendor accounts and choose the data region | M0 | 3 | - |
| BL-0031 | Founder reviews the first template: G3 checklist and 3-seed spot check | M0 | 2 | BL-0017 |
| BL-0182 | Phase -1 no-build pre-experiment, 3 to 4 weeks of the daily loop with existing tools | M0 | 6 | - |
| BL-0065 | Author and review 15 math templates (algebra, trig, complex, calculus) | M1 | 12 | BL-0050, BL-0052, BL-0031 |
| BL-0066 | Author and review 15 electronics DC and measurement templates | M1 | 12 | BL-0065 |
| BL-0067 | Review the 15-20 skill slice: descriptions, tiers, prerequisites | M1 | 4 | BL-0049 |
| BL-0070 | Founder dogfoods M1 for two weeks and logs defects | M1 | 6 | BL-0069 |
| BL-0180 | Author and review 10 more templates for the lean pool | M1 | 8 | BL-0066 |
| BL-0181 | Lean slice go/no-go checkpoint four weeks after first use | M1 | 2 | BL-0060, BL-0065 |
| BL-0071 | Decide the bill of materials and buy the starter kit | M2 | 4 | BL-0070 |
| BL-0072 | Decide LLM monthly budget and caps | M2 | 1 | BL-0001 |
| BL-0105 | Author and review 20 templates: code, SPICE, MC, assessment pool | M2 | 16 | BL-0083, BL-0084, BL-0066 |
| BL-0106 | Calibrate the rubric grader with 40 hand-graded responses | M2 | 4 | BL-0086 |
| BL-0107 | Pre-register EXP-001 and review the tutor policy audit | M2 | 5 | BL-0094, BL-0077 |
| BL-0112 | Write and review safety briefs for all safety_gate steps | M3 | 5 | BL-0070 |
| BL-0113 | Build starter repositories l0-blink, l1-signal, l2-switch | M3 | 14 | BL-0071 |
| BL-0114 | Golden build of project L0 (blink an LED) with all captures | M3 | 6 | BL-0113, BL-0112 |
| BL-0115 | Golden build of project L1 (divider and RC filter measured vs SPICE) | M3 | 8 | BL-0114 |
| BL-0116 | Golden build of project L2 (transistor switch and regulator) | M3 | 8 | BL-0115 |
| BL-0137 | Define EXP-002 to EXP-005 units and schedule | M3 | 4 | BL-0094, BL-0107 |
| BL-0138 | Author templates for projects: debug cases, drills, transfer set start | M3 | 14 | BL-0131, BL-0129, BL-0105 |
| BL-0143 | Build starter repositories l3-bme280 and l4-fsm | M4 | 14 | BL-0139 |
| BL-0144 | Golden build of project L3 (I2C sensor with UART log) | M4 | 10 | BL-0143 |
| BL-0145 | Golden build of project L4 (state machine with interrupts) | M4 | 8 | BL-0144 |
| BL-0153 | Manual security tests and release gate log | M4 | 6 | BL-0151, BL-0101 |
| BL-0156 | Legal and ethics review: privacy notice, consent text, DPIA need, disclaimers | M4 | 10 | BL-0150 |
| BL-0157 | Content review pass and defect-rate measurement | M4 | 8 | BL-0139 |
| BL-0158 | Author transfer and L3/L4-supporting templates (about 25) | M4 | 16 | BL-0142, BL-0138 |
| BL-0159 | Review thresholds from golden builds and update step specs | M4 | 4 | BL-0145, BL-0146 |
| BL-0168 | Build starter repository l5-kicad and BOM for the carrier board | M5 | 12 | BL-0160 |
| BL-0170 | Golden build of project L5 (first KiCad board) | M5 | 16 | BL-0169 |
| BL-0174 | Pre-register BETA-001 and file before first enrolment | M5 | 5 | BL-0156, BL-0157 |
| BL-0175 | Recruit 10 to 50 beta learners and brief them | M5 | 8 | BL-0174, BL-0167 |
| BL-0177 | Beta weekly operations and decision-rubric review at week 12 | M5 | 20 | BL-0175, BL-0176 |

Five groups deserve emphasis (the first is new):

0. **Phase -1 and the go/no-go checkpoint** (BL-0182, BL-0181): the decisions that decide whether the rest of the backlog is built at all (`00d-lean-slice-plan.md`).

1. **Accounts and decisions** (BL-0001, BL-0072): region and data residency (OQ-02), LLM budget (OQ-06), hosting terms. Do the first in week 1 of building (after Phase -1).
2. **Hardware and golden builds** (BL-0071, BL-0114, BL-0115, BL-0116, BL-0144, BL-0145, BL-0170): buy the starter kit once, then build each project one time as the golden build. The golden build produces the fixtures, the measured spreads and the real step times that replace the provisional thresholds and `est_min` values in doc 10 section 12. No project may move from `draft` to `verified` without it.
3. **Content** (BL-0065, BL-0066, BL-0105, BL-0138, BL-0158): author and spot-check the first 30 to 50 verified templates by M2 and about 95 by M4, plus module reviews (BL-0067) and the rubric calibration (BL-0106). The founder is the only content reviewer, which is the main reason R-01 stays at medium likelihood.
4. **Legal, ethics and safety** (BL-0112, BL-0156, BL-0174): safety briefs, a bounded counsel review (privacy, DPIA need, LLM terms, consent, disclaimers) and the independent advisory review of the beta protocol (OQ-03). Nothing in this package is legal advice.

## 8. AI-agent workflow

### 8.1 Principles

- One task, one branch, one pull request. The task id is the unit of work and of traceability.
- The agent works from the specification, not from memory: it reads the files listed in the task's `references` before writing code.
- Tests come first when the task names a vector file or a test id; the agent runs them and pastes the output in the PR.
- The founder reviews every diff. For security-critical areas (RLS, privileged module, sandbox, tutor filter, mastery rule) the review is line by line.

### 8.2 Context files to attach, by kind of task

Always attach: `CLAUDE.md`, `docs/00-contract.md`, `docs/00a-change-decisions.md`, the backlog entry for the task (copy the YAML block) and the sections named in its `references.documents`.

| Kind of task | Also attach |
|---|---|
| Repository, CI, tooling | `docs/03-architecture.md` sections 9, 13; `.github/workflows/*` |
| Database, RLS | `schemas/schema.sql`, `docs/04-data-model.md` sections 5, 8, 11, 12; `docs/12-security-privacy-compliance.md` sections 7, 13.2 |
| Content pipeline, templates | `docs/07-content-pipeline-and-verification-spec.md`; `schemas/problem-template.schema.json`; `reference/verifiers/*`; `content/sample-problem-templates/*` |
| Skill graph, curriculum | `docs/05-skill-graph-and-curriculum-spec.md`; `content/mvp-skill-graph.yaml`; `schemas/skill-node.schema.json`; `reference/validate_graph.py` |
| Scheduler, learner model | `docs/06-learner-model-and-scheduler-spec.md`; `reference/scheduler_reference.py`; `reference/scheduler_test_vectors.json` |
| Grading (TypeScript or Python) | `docs/08-grading-and-tutor-spec.md` sections 1 to 4; `reference/verifiers/numeric_grader.py`, `symbolic_equiv.py`, `tests/grader_vectors.json` |
| Sandbox, code and SPICE | `docs/08` section 3; `docs/12` section 3; `reference/verifiers/code_runner.py`, `spice_check.py` and their tests |
| Tutor | `docs/08` sections 5 to 10; `content/prompts/tutor_v1.md`; `docs/12` section 4 |
| UI | `docs/09-ux-and-flows.md` (the screen, its wireframe, sections 3, 7, 10, 11); `schemas/api.openapi.yaml` operations used |
| API route handlers | `schemas/api.openapi.yaml`; `docs/03` sections 5, 11; `docs/12` section 12 |
| Projects and evidence | `docs/10-build-projects-and-verification-spec.md` (the project, sections 7, 9); `content/project-ladder.yaml`; `schemas/project.schema.json`; `reference/validate_projects.py` |
| Experiments, events | `docs/11-evaluation-and-experiment-plan.md` sections 5, 9, 10; `docs/06` section 12 |
| Offline, notifications | `docs/03` section 5.8; `docs/09` sections 8, 9; `docs/12` section 13.3 |
| Security tests | `docs/12` sections 13.x for the test ids in the task |

### 8.3 Hand-off prompt template

```
Task: BL-xxxx <title>
Read first: CLAUDE.md, docs/00-contract.md, docs/00a-change-decisions.md, then the sections listed in the task's references.
Paste: the task's YAML block (description, dependencies, acceptance_tests, risk_notes).
Rules: do not change files outside the task's scope; do not edit reference vectors; do not renumber IDs;
       if the spec and the code disagree, stop and ask (see the stop-and-ask list in CLAUDE.md).
Do: write the failing test first where the acceptance test names one; implement; run every acceptance test
    and paste the exact command output; list files changed; list anything you could not verify.
```

### 8.4 Branch, commit and PR conventions

- Branch: `bl-0123-short-slug` from an up-to-date `main`. One task per branch; split large tasks into `bl-0123a` style sub-branches only when the task exceeds 8 hours.
- Commits: `BL-0123: imperative summary` (72 characters), small commits, no unrelated reformatting. Git trailers for co-authorship follow the harness instructions.
- Pull request title: `BL-0123 <task title>`. Body: what changed, how each acceptance test was run (command and result), risks, docs updated, follow-ups. Use squash merge.
- No merge unless `pnpm ci:local` passed on the head commit (00a L1: CI runs locally only). No force push to `main`. Database migrations are never edited after merge; add a new one.

### 8.5 Review checklist (founder, before merging)

1. Does the diff do what the task says and nothing more? Any file outside the stated scope?
2. Were the acceptance tests run, and does the pasted output show them passing? Run the headline one yourself.
3. Contract and 00a respected: names, enums, IDs, claims policy?
4. Security: is there any new place that reads a secret, serves an answer key, calls an LLM, runs learner input, or bypasses RLS?
5. Tests: would they fail if the code were wrong (try one mutation)? Property or vector tests where a rule is involved?
6. Docs and OpenAPI updated if the behaviour or shape changed? Migration added rather than edited?
7. Logging: no secret, no learner free text in logs or job payloads?
8. Is the time spent recorded against the task (section 9)?

### 8.6 Work-in-progress limits

At most two tasks in flight, and only one touching the same package. Finish or park before opening a third. End every working session with `main` green and the task's branch pushed with a short note of where it stopped.

## 9. Re-baselining the estimates

Estimates are unvalidated, so measure. Record actual hours per task id in `docs/time-log.csv` (task, start, end, hours, notes). At the end of the first four working weeks and again at each milestone exit compute the velocity factor = actual hours divided by estimated hours over finished tasks (use the median of per-task ratios, not the mean).

| Velocity factor | Action |
|---|---|
| 0.6 or less | Keep the plan; consider pulling tier 2 items forward |
| 0.6 to 1.3 | Keep the plan; update the dates |
| 1.3 to 2.0 | Apply cuts C1 to C6 now; re-plan M2 onward from the new factor |
| Above 2.0 | Stop and take the scope-down decision (S1 to S4) in the next weekly review; record it |

At the M0 exit (task BL-0032) rewrite the dates in section 3 with the measured factor and replace this document's table. Until then, quote only ranges.

Two factors are separated from the first lean task on: the **velocity factor** above (logged founder hours divided by modelled central hours of section 3.3, median of per-task ratios) and the **size factor** (logged agent calendar time versus task size, optional). Re-fit the model parameters after the first 10 lean tasks, at BL-0032 and at BL-0181. The lean go/no-go (`00d-lean-slice-plan.md` section 8) uses the velocity factor with the thresholds 1.3 and 2.0 of the table above.

## 10. Weekly cadence

Eight hours is the whole budget. A suggested split [P], adjusted to real life:

| Slot | Length | Use |
|---|---|---|
| Sunday evening | 45 min | Weekly review: read `docs/time-log.csv`, move the board, pick next week's tasks (at most 4), check alerts and spend, review the cut list triggers |
| Two weekday evenings | 2 x 90 min | Small agent tasks (0.5 to 3 h): hand off, review the diff, run tests, merge |
| Weekend block | 3.5 to 4 h | One large task (4 to 8 h) or bench and content work: golden builds, template authoring, legal or account chores |
| Reserve | 30 min | Fix a red build, answer an alert, update docs |

Learning comes first: reserve 2.5 hours of the 8 (1.5 of 5) for study, with the Phase -1 stack until the app can carry it and then with the app; the week then has 0.75 h review and slack and 4.75 h of building (PA-9, `docs/00d-lean-slice-plan.md` section 6.2). In the table above, drop one weekday slot and shorten the weekend block accordingly. Decide this in week 1 and write it down; do not leave it implicit. Scenario C in section 3 is the same trade from M1.

Rules: (1) plan at most 80 percent of available hours; (2) the weekly review is never skipped, it is what keeps the plan honest; (3) one demo per milestone to a real device; (4) no new scope enters the backlog without removing something of similar size; (5) two weeks below 4 hours triggers the pause rule.

### 10.1 Weekly review agenda (about 45 minutes)

1. Hours spent versus 8, by task id. 2. Tasks finished, tasks stuck, why. 3. Velocity factor update (if a milestone closed). 4. Early-warning indicators in `docs/14-risk-register.md` that fired. 5. Spend: LLM cost view and vendor bills. 6. Choose next week's tasks. 7. Decide any cut.

## 11. Pause rule and burnout guard

A solo part-time project dies of fatigue before it dies of technical debt. Guard against it explicitly (R-10):

- If two consecutive weeks fall below 4 hours, the next weekly review decides between: (a) continue unchanged, (b) apply cuts C1 to C6, (c) apply a scope-down option, or (d) pause for up to four weeks with `main` green and a note of the next three tasks.
- Never work more than 10 hours in a week to "catch up"; the plan has no catch-up, only re-planning.
- Keep the app's own learning use going even in a pause; the founder's learning is the product's first purpose.
- Alerts follow the severity routing in doc 03 section 10.5; the founder is not on call.

## 12. How the backlog is organised and validated

`backlog/backlog.yaml` has `meta`, `epics` and `tasks`. Each task has: `id` (BL-0001 onward, never reused), `slug`, `title`, `milestone`, `epic`, `owner` (`agent` or `founder`), `cut_tier`, `estimate_h` and `estimate_status` (always `unvalidated [P]`), `description`, `dependencies` (task ids), `references` (`documents` as `NN` or `NN§section`, `requirements` as FR-, US- or NFR- ids, `tables`, `operations` as OpenAPI operationIds, `other_ids` such as ST-, T-PRJ-, ADR-, OQ- and R- ids), `acceptance_tests` and `risk_notes`, `lean` (true or false) and `lean_phase` (L0 to L3 when lean, D1 to D9 when deferred). `meta` also holds the lean slice definition (`lean_slice`: phases, deferred groups, optional tasks, first-use task, target range), the founder-attention model (`founder_attention_model`) and the weekly split (`weekly_split_h`).

Run `python3 reference/validate_backlog.py`. It checks unique ids, dependency existence, cycles, that no task depends on a later milestone, that every FR, US and NFR id exists in doc 01, document numbers and section numbers exist, table names exist in `schemas/schema.sql`, operationIds exist in `schemas/api.openapi.yaml`, every task has acceptance tests, agent estimates are within 0.5 to 8 hours, every risk id exists in doc 14, and that every Must-priority FR in doc 01 is referenced by at least one task. It also checks the lean fields (every task has `lean` and a valid `lean_phase`; lean tasks depend only on lean tasks and never on a later lean phase; the first-use task and the optional tasks are lean). It prints totals per milestone, the cut-tier totals, the critical path, the lean totals per phase with low/central/high founder hours and weeks at 8 and 5 hours a week, the full-plan range and the deferred totals per group.

When the schema or OpenAPI file changes, re-run the validator; a failing reference means the task needs updating, not the validator.

## 13. Epic summary

| Epic | Title | PRD epics | Tasks | Hours [P] |
|---|---|---|---|---|
| EP-REPO | Repository, CI and tooling | E13 | 11 | 44 |
| EP-DB | Database, migrations and RLS | E13 | 4 | 11 |
| EP-CONTENT | Content pipeline and verification | E2/E7 | 11 | 60 |
| EP-AUTH | Account, onboarding and consent | E1 | 4 | 14 |
| EP-SCHED | Scheduler, learner model and mastery | E5 | 11 | 55.5 |
| EP-GRADE | Grading (TypeScript and worker) | E7 | 6 | 32 |
| EP-SESSION | Sessions and learning loop | E3/E4 | 12 | 61 |
| EP-UI | Learner UI | E2/E3/E10 | 15 | 78 |
| EP-TUTOR | Guarded tutor | E6 | 8 | 51 |
| EP-WORKER | Worker service and job queue | E7 | 3 | 15 |
| EP-SANDBOX | Sandbox, code and SPICE graders | E7 | 5 | 38 |
| EP-REVIEW | Review consoles and admin | E13/E9 | 3 | 19 |
| EP-PROJ | Projects, evidence and review | E9 | 12 | 76 |
| EP-CHECK | Checkpoints, diagnostic and metacognition | E8 | 7 | 38 |
| EP-EXP | Experiments, events and analytics | E12 | 6 | 32 |
| EP-OFFLINE | PWA, offline and notifications | E11 | 5 | 32 |
| EP-OBS | Observability, backup and operations | E13 | 11 | 42 |
| EP-SEC | Security test suites | E13 | 11 | 56 |
| EP-PRIV | Privacy, export and delete | E13 | 2 | 11 |
| EP-FOUNDER | Founder-owned work | all | 33 | 275 |
| EP-BETA | Closed beta | E12 | 2 | 10 |

## 14. Assumptions, unverified items and open points

- All estimates, velocity thresholds, ratios, dates and the founder-attention model are [P] and unvalidated (sections 2, 3, 9). The conversion from task size to founder hours (section 3.3) is the least certain number in the package (R-24).
- Vendor behaviour (Fly isolation, Supabase limits, iOS Web Push) is unverified (OA-1, OA-2, OA-7 in doc 03); tasks that verify it are named in the backlog (deploy-staging, push-notifications, sandbox-service).
- The ts-fsrs licence and FSRS-6 parameters must be checked at build time (task BL-0040).
- Counsel was not consulted for this package; legal items are routed to task BL-0156.
- The 8 build hours versus learning hours conflict (PA-4, PA-9) is resolved in the plan by reserving learning first (section 10) and is a founder decision recorded in the README open questions.
- The lean slice defers unaided checkpoints (an exception to the never-cut list, section 5) and uploads without worker validation for the founder-only project log (BL-0179); both are recorded in `00d-lean-slice-plan.md` section 9 for confirmation.
- This document adds no contract change request.
