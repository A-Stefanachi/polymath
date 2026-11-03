# 14 - Risk register

Status: v1.0, 31 Oct 2026. Binding upstream: `00-contract.md` and `00a-change-decisions.md`. Companions: `13-roadmap-and-backlog.md` (milestones, cut tiers), `backlog/backlog.yaml` (task ids), `12-security-privacy-compliance.md` (security risks in depth).

Evidence tags follow the contract. **Every likelihood and impact rating below is a design proposal [P] by the author, not a measured value.** Ratings: L = low, M = medium, H = high. Risks R-26 to R-29 were added on 31 Oct 2026 in review pass 3. Risks R-22 to R-25 were added on 31 Oct 2026 with the lean slice plan (`00d-lean-slice-plan.md`). Review the register at every milestone exit and in the weekly review when an early-warning indicator fires.

## 1. How to use this register

- Each risk has an owner. A solo project has one decision maker, so the owner column names who acts: the founder, or the founder with counsel; agents implement but do not own risks.
- The linked tasks are backlog ids. Backlog tasks cite risk ids in their `risk_notes` and `other_ids`; `python3 reference/validate_backlog.py` checks that every cited risk id exists here.
- A risk is closed only by evidence (a passing test, a completed drill, a counsel answer), never by a decision to stop worrying.

## 2. Summary matrix

| ID | Category | Likelihood | Impact | Owner |
|---|---|---|---|---|
| R-01 | Product / evidence | M | H | founder |
| R-02 | Technical / security | L | H | founder (agent implements) |
| R-03 | Technical / cost | M | M | founder |
| R-04 | Product / learning | M | H | founder |
| R-05 | Technical / learning | M | M | founder (agent implements) |
| R-06 | Founder capacity / planning | H | H | founder |
| R-07 | Evidence | H | M | founder |
| R-08 | Safety | L | H | founder |
| R-09 | Evidence / integrity | M | M | founder |
| R-10 | Founder capacity | H | H | founder |
| R-11 | Legal / licence | L | M | founder |
| R-12 | Scope | H | M | founder |
| R-13 | Vendor | M | M | founder |
| R-14 | Operations | L | H | founder |
| R-15 | Legal / regulatory | M | M | founder with counsel |
| R-16 | Technical | M | M | founder (agent implements) |
| R-17 | Security / privacy | L | H | founder (agent implements) |
| R-18 | Supply chain / hardware | M | M | founder |
| R-19 | Engineering process | M | H | founder |
| R-20 | Claims | L | M | founder |
| R-21 | Technical / evidence | M | M | founder |
| R-22 | Founder capacity / learning | H | H | founder |
| R-23 | Product / planning | H | H | founder |
| R-24 | Founder capacity / planning | H | M | founder |
| R-25 | Operations / data | M | M | founder |
| R-26 | Product / learning | M | M | founder (agent implements) |
| R-27 | Product / adherence | M | H | founder |
| R-28 | Privacy / process | L | M | founder |
| R-29 | Legal / licence | L | M | founder |

## 3. Register

### R-01 Content error rate

- **Category:** Product / evidence
- **Description:** Content error rate: a wrong answer key, ambiguous statement or bad unit gets served as verified; learners (first the founder) learn something false and lose trust.
- **Likelihood [P]:** M  **Impact [P]:** H
- **Early-warning indicator:** Learner reports (OM-09 item_reported rate); nightly G6 anomaly flags; founder disagreeing with a key during dogfooding; fuzz failures in CI.
- **Mitigation:** Verification gate (contract 7.8, doc 07): generator and independent recomputation must agree, fuzz of 200 samples, human spot-check (G3) per template, quarantine on report within 1 s, retirement rules, provenance hash voids review on edit. Never serve unverified items. Founder re-solves 50 served items at M4. Target defect thresholds in doc 07 section 8.1 are [P].
- **Owner:** founder
- **Linked tasks:** BL-0031, BL-0017, BL-0051, BL-0052, BL-0056, BL-0057, BL-0110, BL-0157, BL-0065
- **Linked documents:** 07 section 7, 07 section 8, 08 section 4

### R-02 Sandbox escape

- **Category:** Technical / security
- **Description:** Sandbox escape or resource abuse: learner code or a crafted netlist reads secrets, reaches the network, or exhausts the worker.
- **Likelihood [P]:** L  **Impact [P]:** H
- **Early-warning indicator:** Sandbox egress attempts or syscall kills logged (alert RB-7); weekly ST-SBX run fails; unusual job durations.
- **Mitigation:** Separate sandbox app with no secrets and no network (ADR-006), nsjail limits, netlist screening, 20-case escape suite run weekly and on every sandbox change, kill switch for code grading, code grading limited to the founder's account until Fly isolation assumptions (OA-1) are verified.
- **Owner:** founder (agent implements)
- **Linked tasks:** BL-0081, BL-0082, BL-0083, BL-0084, BL-0109, BL-0154
- **Linked documents:** 12 section 3, 08 section 3, 03 section 14

### R-03 LLM cost and prompt injection

- **Category:** Technical / cost
- **Description:** LLM cost overrun or abuse, and prompt injection that makes the tutor or rubric grader misbehave (leak answers, burn budget, grade falsely).
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** LLM spend alert at 80 percent of the daily cap; leak-filter hits; adversarial suite regressions; rate-limit 429 spikes.
- **Mitigation:** Per-user and global daily budgets enforced before every call, rate limits, delimited untrusted input, deterministic leak filter, attempt-first gate, static fallback, kill switch; rubric grading never sole grader and not mastery-eligible until calibrated. Prices in doc 03 are recalled [R]; verify on the day.
- **Owner:** founder
- **Linked tasks:** BL-0073, BL-0075, BL-0077, BL-0080, BL-0100, BL-0140, BL-0072
- **Linked documents:** 12 section 4, 08 section 8, 03 section 12

### R-04 Tutor causes dependence

- **Category:** Product / learning
- **Description:** The tutor causes dependence: practice scores rise while unaided performance does not (the aided/unaided gap).
- **Likelihood [P]:** M  **Impact [P]:** H
- **Early-warning indicator:** Aided/unaided gap metric (doc 08 section 9.3) widening; high share of level 3-4 hints; checkpoint scores below practice scores; EXP-001 result.
- **Mitigation:** Attempt-first gate, hint ladder, reveal ends credit, tutor disabled in checkpoints, unaided checkpoints at least every 14 days, strict-unaided view (00a B1), EXP-001 tests tutor on versus off. Any tutor benefit claim waits for data.
- **Owner:** founder
- **Linked tasks:** BL-0074, BL-0076, BL-0092, BL-0079, BL-0107, BL-0135
- **Linked documents:** 08 section 9.3, 02, 11 section 5

### R-05 Scheduler miscalibration for fresh variants

- **Category:** Technical / learning
- **Description:** Scheduler miscalibration for fresh variants: FSRS defaults tuned on flashcards may mispredict recall when each review is a new generated variant of a procedural skill; small parameter spaces cause repeated seeds and pool starvation.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Predicted-versus-observed recall (OM-12, view v_scheduler_calibration) off by more than 10 points [P]; lapse rate far from 1 minus target retention; verified pool stock alarms.
- **Mitigation:** FSRS behind a single adapter with contract test, default parameters until 1,000 reviews, max interval 180 days, parameter-space size recorded in verification reports, pre-generation job with shortage trigger, calibration dashboard, option to fall back to simpler fixed intervals via a flag.
- **Owner:** founder (agent implements)
- **Linked tasks:** BL-0041, BL-0043, BL-0042, BL-0110, BL-0148, BL-0147, BL-0187
- **Linked documents:** 06 section 3.8, 06 section 12, 06 section 1

### R-06 Unvalidated hour estimates

- **Category:** Founder capacity / planning
- **Description:** Hour estimates are unvalidated: the backlog total, the 150 to 300 hours per node to L1 (00a E3) and the 64-hour graph minutes total may all be wrong by a large factor.
- **Likelihood [P]:** H  **Impact [P]:** H
- **Early-warning indicator:** Actual versus estimated hours on the first 10 backlog tasks differing by more than 30 percent; the weekly log shows less than 6 productive hours in 3 of 4 weeks.
- **Mitigation:** Treat every estimate as [P]; measure velocity on M0, re-baseline at the end of M0 and at each milestone (doc 13 section 9), publish dates only as ranges, keep a tier-based cut list, never promise L1 across all three nodes in a short window. Since 31 October 2026 the unit question is modelled separately (founder-attention model, doc 13 section 3.3; R-24), the lean slice is built first and measured at the go/no-go checkpoint (BL-0181; 00d).
- **Owner:** founder
- **Linked tasks:** BL-0032, BL-0070, BL-0069, BL-0108, BL-0181, BL-0182
- **Linked documents:** 13, 00a

### R-07 Product thesis unproven and evaluation underpowered

- **Category:** Evidence
- **Description:** The product thesis is unproven: a 12-week beta of 10 to 50 learners is underpowered and cannot test time to L1; effects may be small or confounded by expectation.
- **Likelihood [P]:** H  **Impact [P]:** M
- **Early-warning indicator:** Pre-registration power check shows wide intervals; attrition above 40 percent; arms not balanced.
- **Mitigation:** Narrow claims (claims gate in doc 11 section 14.3), within-person experiments first (EXP-001), active control, pre-registration filed before enrolment, publish absolute hours with intervals. Product still valuable to the founder without a positive result.
- **Owner:** founder
- **Linked tasks:** BL-0107, BL-0160, BL-0174, BL-0177
- **Linked documents:** 11 section 7, 11 section 14, 11 section 16

### R-08 Learner safety in hardware builds

- **Category:** Safety
- **Description:** Learner safety in hardware builds: battery, soldering, mains, ESD and eye hazards; a learner follows a step badly and is hurt or damages property.
- **Likelihood [P]:** L  **Impact [P]:** H
- **Early-warning indicator:** Learner reports of hazards; safety_ack skips; steps that require mains or lithium cells; incident reports.
- **Mitigation:** Safety gates with versioned briefs and acknowledgement before hazardous steps (T-PRJ-9), no mains work in v1, battery-safety and soldering-safety skills as prerequisites (00a E1), hazards listed first on resume, plain disclaimers reviewed by counsel; the founder performs every golden build first.
- **Owner:** founder
- **Linked tasks:** BL-0112, BL-0118, BL-0125, BL-0116, BL-0156
- **Linked documents:** 10 section 5.3, 10 section 5.7, 12 section 9

### R-09 Remote-verification cheating and false verification

- **Category:** Evidence / integrity
- **Description:** Remote-verification cheating and false verification: photos reused, logs fabricated, thresholds too loose or too tight, so project credit does not reflect a real build.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Duplicate photo hashes; false-positive and false-negative marks above 10 percent per check; audit-sample disagreement in the first 10 beta learners.
- **Mitigation:** Nonce challenges (a deterrent, not proof; doc 10 section 7.4.9), layered checks, founder review for key steps, pending credit until accepted, no L2 or L3 from projects, audit sampling at 100 percent for the first 10 learners, calibration from golden builds, honest display of assurance level.
- **Owner:** founder
- **Linked tasks:** BL-0119, BL-0121, BL-0122, BL-0123, BL-0124, BL-0114, BL-0115
- **Linked documents:** 10 section 7.4, 10 section 7.5, 10 section 12

### R-10 Founder burnout and the realistic timeline

- **Category:** Founder capacity
- **Description:** Founder burnout and the realistic timeline: 8 hours a week alongside a full-time job, shared between building, content authoring, review and the learning itself; the backlog sums to roughly 1,000 hours.
- **Likelihood [P]:** H  **Impact [P]:** H
- **Early-warning indicator:** Two consecutive weeks under 4 hours; review queue older than 7 days; skipping the weekly review; sessions of the app not used by the founder.
- **Mitigation:** Cut tiers (tier 3 first), thin vertical slices with a demo each milestone, a weekly cadence with a fixed stop time, no on-call (alerts routed by severity), AI agents for typed work, a pause rule (document 13 section 11), reduce scope to one node before extending the date. Planning range is documented in doc 13 section 3; the PRD windows are optimistic by about 2x at current estimates.
- **Owner:** founder
- **Linked tasks:** BL-0070, BL-0123, BL-0177, BL-0104
- **Linked documents:** 13 section 3, 13 section 11, 01 section 10

### R-11 Licence problems

- **Category:** Legal / licence
- **Description:** Licence problems: a dependency (ts-fsrs, KiCad libraries, fonts), third-party content (OCW is non-commercial; OpenStax per title) or imagery has terms incompatible with the product.
- **Likelihood [P]:** L  **Impact [P]:** M
- **Early-warning indicator:** Licence audit script flags copyleft or non-commercial; a template without license or source; a vendor licence change.
- **Mitigation:** Original content only (contract section 11), license and source required fields enforced by sync, licence audit script, THIRD_PARTY_NOTICES, FSRS adapter replaceable, check ts-fsrs terms at build time, original or licence-checked KiCad libraries.
- **Owner:** founder
- **Linked tasks:** BL-0040, BL-0161, BL-0018, BL-0168, BL-0049
- **Linked documents:** 00 section 11, 07 section 11, 06 section 3.7

### R-12 Scope creep

- **Category:** Scope
- **Description:** Scope creep to all disciplines and too many experiments or features: the vertical slice grows before M2 proves the loop; five experiments on one subject; beta recruitment falls short.
- **Likelihood [P]:** H  **Impact [P]:** M
- **Early-warning indicator:** Backlog items added without removing others; more than one new node started before M3 exit; experiments registered above the 2 the founder can run.
- **Mitigation:** Contract section 9 scope fence, stub nodes only, an intake rule (a new item must displace one of equal size), experiment priority order in doc 11 section 6, beta size minimum 10 stated as feasibility not power.
- **Owner:** founder
- **Linked tasks:** BL-0049, BL-0137, BL-0175
- **Linked documents:** 00 section 9, 11 section 6, 01 section 4.2

### R-13 Vendor and price changes

- **Category:** Vendor
- **Description:** Vendor and price changes: Supabase, Vercel, Fly or LLM pricing and terms move; free tiers end; a model is deprecated.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Billing alerts; vendor deprecation emails; changed model ids; monthly cost review above the budget.
- **Mitigation:** Interfaces (LlmClient, queue in Postgres, plain Docker), pinned versions, prices re-verified on the day of use, model ids in config, portable Postgres schema, monthly cost review in the weekly cadence, Cloud Run as documented fallback for Fly.
- **Owner:** founder
- **Linked tasks:** BL-0001, BL-0073, BL-0029, BL-0109, BL-0140
- **Linked documents:** 03 section 12, 03 section 14, 03 section 15

### R-14 Loss of data

- **Category:** Operations
- **Description:** Loss of data: bad migration, deleted project, failed backup, or evidence files lost.
- **Likelihood [P]:** L  **Impact [P]:** H
- **Early-warning indicator:** Backup-stale alert (over 26 hours); restore drill failure; migration errors in staging.
- **Mitigation:** Daily backups verified by restore drills (RB-8) at M2 and M4, storage export, migrations only through reviewed files applied to staging first, deletion jobs tested, no manual production edits.
- **Owner:** founder
- **Linked tasks:** BL-0103, BL-0155, BL-0104, BL-0150
- **Linked documents:** 12 section 10, 04 section 12

### R-15 Regulatory uncertainty

- **Category:** Legal / regulatory
- **Description:** Regulatory uncertainty: GDPR-style duties, DPIA need, LLM data-processing terms, EU AI Act education category if credentials are ever issued, minors, health or medical claims.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Counsel's answers change a design decision; a beta participant under 18; a request to issue certificates.
- **Mitigation:** Minimum data collection, EU region by default, exclusion of minors, no credentials in v1 (OQ-07), no biometric or neural data, claims policy, a bounded legal and ethics review before the first external user (task in M4). All legal statements in doc 12 are marked unverified.
- **Owner:** founder with counsel
- **Linked tasks:** BL-0156, BL-0165, BL-0164, BL-0151, BL-0149
- **Linked documents:** 12 section 8, 12 section 9, 12 section 14

### R-16 Offline and iOS limitations

- **Category:** Technical
- **Description:** Offline and iOS PWA limitations: push, background sync and storage eviction behave differently on iOS; offline attempts could be lost or double counted.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Failed push delivery on the founder's devices; sync mismatch counts in offline_sync_completed; storage eviction reports.
- **Mitigation:** Test on the founder's real devices in M1 and M2 (OA-7), outbox with idempotency keys, server re-verification, email reminders as fallback, document unsupported behaviours.
- **Owner:** founder (agent implements)
- **Linked tasks:** BL-0063, BL-0095, BL-0096, BL-0097, BL-0162
- **Linked documents:** 03 section 5.8, 09 section 8

### R-17 RLS failure or secret leak

- **Category:** Security / privacy
- **Description:** Row Level Security failure or secret leak exposes another user's data, answer keys or hidden tests.
- **Likelihood [P]:** L  **Impact [P]:** H
- **Early-warning indicator:** RLS suite failure in CI; gitleaks hit; unexpected 200 on cross-user requests in ST-API; secrets in logs.
- **Mitigation:** RLS enabled by default with a table allow-list test, ST-RLS and ST-API suites on every push, privileged code isolated in one directory with lint, secret scanning, redaction, release gate (doc 12 section 13.8).
- **Owner:** founder (agent implements)
- **Linked tasks:** BL-0011, BL-0012, BL-0101, BL-0005, BL-0153, BL-0173
- **Linked documents:** 12 section 7, 12 section 13, 04 section 8

### R-18 Starter-kit cost and supply

- **Category:** Supply chain / hardware
- **Description:** Starter-kit cost and supply: BOM figures in doc 10 are unverified, parts go out of stock, the kit costs more than a beta learner will pay.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Quoted kit total above the founder's stated limit; out-of-stock parts; substitute parts changing measurements.
- **Mitigation:** Founder buys the kit first (OQ-04), BOM tracked in the ladder file, substitutions documented, learner buys their own kit in v1, golden builds on the actual kit.
- **Owner:** founder
- **Linked tasks:** BL-0071, BL-0113, BL-0114, BL-0115
- **Linked documents:** 10 section 5.4, 10 section 5.1, 01 section 12

### R-19 AI-agent code quality drift

- **Category:** Engineering process
- **Description:** AI-agent code quality drift: plausible but subtly wrong code in the scheduler, graders or RLS; divergence between Python reference and TypeScript ports.
- **Likelihood [P]:** M  **Impact [P]:** H
- **Early-warning indicator:** Vector or parity failures; boundary lint exceptions accumulating; large diffs merged without tests.
- **Mitigation:** Reference vectors and parity vectors as the contract, property tests, boundary lints, small PRs with the review checklist in CLAUDE.md and doc 13 section 8, no merging with red CI, stop-and-ask list.
- **Owner:** founder
- **Linked tasks:** BL-0003, BL-0004, BL-0039, BL-0019, BL-0015
- **Linked documents:** 03 section 13.1, 06 section 13, 08 section 4

### R-20 Claims-policy violation

- **Category:** Claims
- **Description:** Claims-policy violation: hype or unsupported claims enter UI copy, prompts, content or documents (neuroplasticity windows, top 1 percent, 2 sigma, medical claims).
- **Likelihood [P]:** L  **Impact [P]:** M
- **Early-warning indicator:** claims-lint CI failures; reviewer flags; beta feedback quoting claims.
- **Mitigation:** Claims lint over copy, content, prompts and docs, allowed-strings list, honest tier display, claims gate before any public statement (doc 11 section 14.3).
- **Owner:** founder
- **Linked tasks:** BL-0006, BL-0127, BL-0174
- **Linked documents:** 00 section 8, 01 section 11, 11 section 14

### R-21 Grader errors beyond the deterministic cases

- **Category:** Technical / evidence
- **Description:** Grader errors outside the deterministic cases: rubric_llm drift, SPICE and measurement thresholds [P], false rejections of correct work.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Calibration kappa below threshold; learner reports on graded items; false-positive marks in the review UI.
- **Mitigation:** Rubric grading never sole grader (FR-065), mastery_eligible false until calibrated, double-run stability, mutation checks on code harnesses, SPICE tolerance bands calibrated with founder-made wrong netlists, human review fallback.
- **Owner:** founder
- **Linked tasks:** BL-0086, BL-0106, BL-0084, BL-0133, BL-0083
- **Linked documents:** 08 section 2, 08 section 4, 07 section 5

### R-22 Founder time contention between building and learning

- **Category:** Founder capacity / learning
- **Description:** The 8 hours a week are one budget. Every hour spent reviewing agent diffs is an hour not spent studying, and the product exists to make the founder learn. If the build takes most of the week the founder stops learning, the first user stops being a user, and the app is validated by nobody. At the full-plan estimate the build would take several years, so this is not a corner case.
- **Likelihood [P]:** H  **Impact [P]:** H
- **Early-warning indicator:** Learning hours in the weekly log below the reserved amount (2.5 h at 8 h/week, 1.5 h at 5 h/week) in 2 of 4 weeks; the founder describes study as "after the build"; no study done with any tool for 7 days.
- **Mitigation:** Learning hours are reserved first and are not borrowed for building (docs/00d-lean-slice-plan.md section 6); learning continues with the Phase -1 deck while the app is built; the lean slice is the first deliverable so the app starts carrying the learning itself within about 5 to 7 months at 8 h/week [P]; the go/no-go checkpoint after 4 weeks of use (00d section 8) decides whether to build further.
- **Owner:** founder
- **Linked tasks:** BL-0182, BL-0070, BL-0181
- **Linked documents:** 13 section 2 (PA-4), 13 section 10, 00d (lean slice plan)

### R-23 Building the whole product before validating the loop

- **Category:** Product / planning
- **Description:** The package describes six milestones and about 180 tasks before anyone has shown that the founder will study daily with the loop (worked example, faded problems, spaced retrieval with fresh variants). A great deal of work (tutor, sandbox, projects, beta) would be built on an unvalidated habit assumption and an unvalidated FSRS-with-variants assumption (R-05).
- **Likelihood [P]:** H  **Impact [P]:** H
- **Early-warning indicator:** Phase -1 adherence below the threshold in 00d section 4; more than 8 weeks of building with no study session run in the app; scope added to the lean set without removing something of similar size.
- **Mitigation:** Phase -1 no-build pre-experiment of 3 to 4 weeks before the first line of code (BL-0182); the lean slice (tasks tagged `lean: true`) is a strict subset of the full plan; deferred work has named re-entry points (D1 to D9 in 00d) and is started only after the go decision (BL-0181).
- **Owner:** founder
- **Linked tasks:** BL-0182, BL-0181, BL-0032, BL-0070
- **Linked documents:** 00d (lean slice plan), 13 section 3, 11 section 5

### R-24 Founder-hour conversion error

- **Category:** Founder capacity / planning
- **Description:** Backlog estimates were defined as founder attention hours (doc 13 PA-2) but were sized as one task per working session (PA-3). The conversion from task size to founder review, decision and manual hours is unmeasured. Review of security-critical diffs, rework cycles and hardware debugging can be larger than assumed; agent wait time is not counted. This differs from R-06 (the estimates themselves may be wrong) in that it concerns what the unit means.
- **Likelihood [P]:** H  **Impact [P]:** M
- **Early-warning indicator:** Median ratio of logged founder hours to modelled central hours above 1.3 over the first 10 tasks; PR review taking more than 45 minutes on typical agent tasks.
- **Mitigation:** The low/central/high model in doc 13 section 3.3 and `backlog/backlog.yaml` meta states the conversion assumptions; log founder hours separately from agent wait time in `docs/time-log.csv`; re-fit the model after the first 10 lean tasks and at the end of L1 (00d section 8).
- **Owner:** founder
- **Linked tasks:** BL-0032, BL-0069, BL-0181
- **Linked documents:** 13 section 3.3, 13 section 9

### R-25 Lean slice runs on staging without the full operations set

- **Category:** Operations / data
- **Description:** The lean slice deliberately defers production environment, alerting, runbooks, load tests and most security suites (D1). The founder's study history (FSRS state, review log) lives in a staging project. Loss or corruption of that data, or an undetected outage, would cost weeks of learning history.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** Backup drill (BL-0103) not done by week 4 of use; a failed deploy that is noticed only when the founder opens the app; no export of the founder's history for 30 days.
- **Mitigation:** BL-0103 (backup and restore drill) is in the lean set; a weekly CSV or SQL export of `review_log` and `skill_state` by the founder in L3; no external user until D1 and D8 are done (the PRD rule of no external users before M4 exit is unchanged).
- **Owner:** founder
- **Linked tasks:** BL-0103, BL-0029, BL-0070
- **Linked documents:** 03 section 10, 00d (lean slice plan)

### R-26 Placement grace lets a learner skip content they have not mastered

- **Category:** Product / learning
- **Description:** Placement grace (00a G1) lets a placement-marked skill satisfy `min_tier` up to L1 for the frontier test for 14 days, so that a diagnosed learner is not blocked by prerequisites they plausibly know. If the diagnostic is noisy, the learner skips real content, meets skills whose prerequisites are shaky, fails, and loses trust in the plan. Grace never sets `mastered`, but it does change what is offered.
- **Likelihood [P]:** M  **Impact [P]:** M
- **Early-warning indicator:** First-attempt accuracy on grace-unlocked skills more than 15 points below accuracy on normally unlocked skills; learners reporting "too hard" on skills reached through grace; many grace skills lapsing before day 14.
- **Mitigation:** Grace is limited to the frontier test, to L1, and to 14 days, and never sets mastered (G1); an applied-gap check and a span condition still apply before mastery (G2, G3); the diagnostic is constructed-response only (G7); the grace window and tier cap are scheduler parameters with test vectors; on repeated failure the node falls back to a normal prerequisite path.
- **Owner:** founder (agent implements)
- **Linked tasks:** BL-0186, BL-0184, BL-0185, BL-0192
- **Linked documents:** 00a section G, 06 (scheduler), 09 section S05

### R-27 Adherence gap before the first physical win

- **Category:** Product / adherence
- **Description:** The first hands-on result (a blinking LED) comes only after the kit has arrived and the safety brief is done, which can be weeks after the start. Over that period the experience is screen-only maths, and adherence may fall before the motivating physical win. The guided week-1 blink step (`prj.L0.blink-led#s09`) mitigates this but depends on a kit being in hand.
- **Likelihood [P]:** M  **Impact [P]:** H
- **Early-warning indicator:** Sessions per week falling by more than a third between weeks 1 and 3; the blink step not started by day 14 after the kit arrives; learners without a kit at day 7.
- **Mitigation:** Guided week-1 blink variant with a mini-kit and a ready-made file (BL-0183, doc 10 section 3.2), offered before the skill gate and granting L0 credit only; Phase -1 measures whether the habit survives four weeks without the app (BL-0182); starter-kit shipping time stated before sign-up; dropout reasons collected at the go/no-go checkpoint.
- **Owner:** founder
- **Linked tasks:** BL-0183, BL-0182, BL-0181
- **Linked documents:** 10 section 3.2, 00d section 4, 09 section S06

### R-28 Time-limited founder-only exception for evidence logging

- **Category:** Privacy / process
- **Description:** The lean slice logs project evidence (notes and photos) through an admin-only log written by the founder (BL-0179), without the automated verification, retention and deletion machinery of the full evidence system. This is a time-limited exception (00a G17) and is acceptable only while the only user is the founder; if it persists after an outside user is invited, uploaded photos would be held without the intended controls.
- **Likelihood [P]:** L  **Impact [P]:** M
- **Early-warning indicator:** A second user account created before the exception is closed; BL-0179 data still in use after M3 evidence tasks are delivered; photos with faces or location data found in storage.
- **Mitigation:** The exception ends at the first outside invitation or at the delivery of the evidence upload tasks, whichever is first; the evidence tasks migrate the log into `evidence` rows; photo uploads respect the 50 MB Supabase Free cap (G14) and strip metadata; the PRD rule of no external users before M4 exit is unchanged.
- **Owner:** founder
- **Linked tasks:** BL-0179, BL-0103
- **Linked documents:** 00a section G (G17), 12 (privacy), 00d (lean slice plan)

### R-29 Sources and licensing: OpenStax is NonCommercial-ShareAlike

- **Category:** Legal / licence
- **Description:** OpenStax titles are licensed CC BY-NC-SA 4.0 (00a G10). Copying or adapting their text, figures or problems into the product would carry NonCommercial and ShareAlike terms that conflict with a commercial product and with the repository licence. Link-out is permitted; reuse is not. PhET simulations are usable only under the pre-29 March 2026 terms recorded in doc 07, and later versions must be checked.
- **Likelihood [P]:** L  **Impact [P]:** M
- **Early-warning indicator:** A template or lesson with an OpenStax or OCW source field and no link-out-only flag; copied figures; licence audit output listing NC or SA terms; a PhET embed added without the date check.
- **Mitigation:** Original content only (contract section 11); OpenStax and OCW appear only as link-out references in `sources`; the licence audit and claims lint flag NC and SA licences; the licence note in doc 07 section 11 states the rule and the PhET date; counsel review before any commercial launch.
- **Owner:** founder with counsel
- **Linked tasks:** BL-0040, BL-0161, BL-0168, BL-0018
- **Linked documents:** 07 section 11, 00a section G (G10), 00 section 11
