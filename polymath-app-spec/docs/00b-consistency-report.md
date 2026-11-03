# 00b — Consistency report (contract v1.1 reconciliation)

Date: 31 Oct 2026. Author: document integrator. Inputs: `00-contract.md` v1.1, `00a-change-decisions.md` (binding), documents 01, 02, 05 to 12, `content/`, `reference/`. Documents 03, 04, `schemas/schema.sql` and `schemas/api.openapi.yaml` were read only (the schema integrator was editing them concurrently); `00c-route-rename-map.md` did not exist when this report was written, and document 13 and `backlog/backlog.yaml` were being written by another agent. Document 14 (risk register) was read for terms only.

Evidence tags follow the contract. Nothing here is new evidence: the tables list what the package already claims.

## 1. What was changed

| Area | Files changed |
|---|---|
| Contract | `docs/00-contract.md` rewritten as v1.1 (changelog, §5 enums, §6 tables, §7 behaviours 1 to 15, §9, §10, new §13 document index). Sections §1 to §12 keep their numbers |
| Documents | `01`, `02`, `05`, `06`, `07`, `08`, `09`, `10`, `11`, `12`: each CONTRACT CHANGE REQUESTS section replaced by "Resolved by 00a (v1.1)"; contradicting statements fixed (section 3) |
| Content | `content/mvp-skill-graph.yaml` (+2 skills), `content/project-ladder.yaml` (safety skills wired into 3 projects and 6 steps) |
| Code | `reference/scheduler_reference.py` (placement grace, `project_credit_applied`), `reference/scheduler_test_vectors.json` (regenerated, 95 to 102 vectors; no existing vector changed), `reference/validate_projects.py` (module coverage with the 00a E2 exemption; safety-skill wiring checks), `schemas/problem-template.schema.json` (open interval for `difficulty_prior`; four hoisted optional fields) |

## 2. Validation results (run 31 Oct 2026 after the last edit)

| Command | Result |
|---|---|
| `python3 reference/validate_graph.py` | PASS, 0 errors, 0 warnings. At pass 3: 142 real skills + 18 stubs; 247 edges (239 hard, 8 soft); 4060 min = 67.7 core hours; elec 57 / math 45 / sw 40 skills (pass 1: 138 real skills, 238 edges); 4 roots; longest hard chain 14; 3890 min = 64.8 core hours (x2.5 = 162 planning hours, unvalidated); elec 56 / math 45 / sw 37 skills |
| `python3 reference/validate_projects.py` | 0 errors, 0 warnings. 6 projects, 69 steps, 63.6 hours (review pass 3; was 68 steps, 62.8 hours at pass 1). Note: 34 substeps are 21 to 30 min (allowed for substeps; steps themselves obey the 20 / 45 rule). New checks pass: module coverage (math and `elec.opamp` exempt; with the exemption removed the validator reports `elec.opamp`), soldering and battery wiring |
| `python3 reference/validate_templates.py` | 7/7 templates valid (after the schema change) |
| `python3 -I reference/scheduler_reference.py selftest` | `selftest ok` |
| `python3 -I reference/scheduler_reference.py check reference/scheduler_test_vectors.json` | 102/102 vectors pass at pass 1; 161/161 at the end of review pass 3 (see the `count` field; regenerated; the 95 earlier vectors have identical expected values; 7 added: `mast-project-credit`, `mast-no-project-credit`, `mast-project-credit-only`, `tier-project-no-l2`, `frontier-placement-grace`, `frontier-placement-expired`, `frontier-placement-verified`) |
| `cd reference/verifiers && python3 -m pytest tests -q` | 119 passed, 6 skipped (same as before; the skips are by design, doc 07 section 12) |

## 3. Cross-document checks

| # | Check | Result | What was fixed or decided |
|---|---|---|---|
| 1 | Session types and ranges (`micro` ≤20, `focus` 45–120, `lab` 120–240) in 00, 01, 02, 06, 09, 10, 12, schema | Consistent after fixes | 21–44 min rule (A1) added to contract 5/7.6, 01 FR-021, 02 PRM-14, 06 §7.1, 09 §2 chips and note, 10 §3 and §14. 09 no longer offers a single 30-minute `focus`. 12 ST-RLS-18 already rejects a 30-minute micro |
| 2 | RESOLVED (review pass 2): docs 07, 09 and 10 now use the OpenAPI routes, 00c is kept as history, and `check_package.py` check (d) enforces it. Two open route decisions (session preview, progress) are findings F-02, F-03. Original item: Project step durations vs the 21–44 rule | Pass | Validator rejects steps outside 1–20 / 45–120 / 120–240. Substeps (≤30 min) are a different object and remain allowed |
| 3 | Diagnostic storage (A2) in 01, 05, 06, 09 | Fixed | 05 said "micro-sized chunks over 2–3 days / three micro sessions"; now one pausable `focus` session. 09 notes no longer call it a stand-in. `diagnostic` and `checkpoint` are session-level kinds (contract 5) |
| 4 | Diagnostic duration | Open (see section 5, item 6) | 01/06 say about 25 minutes, 05 capped at 45; unified as "expected about 25, hard cap 45" |
| 5 | Enums: `tier`, `task_kind`, `grader_type` (no `structural_check`), `mastery_state`, `edge_strength`, `evidence_*`, `hint_level` smallint 0–4, `experiment_arm` | Consistent | 10 and the contract now state D1; 10 `measurement_check` column kept as the nearest item-grader family, explicitly not a grader type of the evidence |
| 6 | Skill status `stub` and `content_status` | Fixed | Contract says skills use the value set including `stub`; schema implements it as the separate enum `skill_status` (noted in contract 5) |
| 7 | PARTLY CONFIRMED (review pass 2): job kinds named in 07 and 08 (`grade_attempt`, `pregenerate_items`, `verify_evidence`, `content_postprocess`) match doc 03 and the schema CHECK, per 00a section C. Still open: the nightly calibration, decay and `fsrs_calibration` tasks have no registered kind or scheduled call; see finding F-05. Original item: `attempts.unaided` (B1) in 00, 01, 02, 06, 08, 11, 12, schema | Consistent | Scheduler flag = `max_hint_level <= 1` and not revealed (schema constraint `attempts_unaided_rule` agrees). Strict-unaided = `max_hint_level = 0` and no tutor panel opened, view `v_attempts_strict_unaided` (schema places it in `app_private`). Document 11 now uses "strict-unaided" in every outcome measure, hypothesis, stopping rule and dashboard; 01 SM-03/SM-04/G-3 and FR-073, 02 LS-034, 08 §9.3 aligned. Event prop `unaided` in 11 §9 remains the raw column |
| 8 | Mastery rule (B3): correct ≥ 0.8; 3 attempts / 2 local days / 2 variants; last two not failures; constructed response; applied for L1+ | Fixed | Contract 7.5 now carries all six conditions; 01 FR-042 and 02 PRM-09 updated; 05 tier L0 rule now defers to 06 §4.6 (it said "after one correct retrieval") |
| 9 | RESOLVED (review pass 2): `check_package.py` check (e) compares every event name of 06, 08, 09, 10 and the backlog with doc 11 section 9; the catalogue was extended (11 section 9.1) and the overlaps with 06 are finding F-06. Original item: Frontier, priority (overdue checkpoint first, 70% review cap, one review row per skill per session) | Consistent | Contract 7.1–7.3 copy 06 |
| 10 | EXPLAINED (review pass 2): doc 10 Quick reference states the two readings (projects inside the 2.5x multiplier, or projects extra) and the rule that nobody adds them; doc 05 needs a one-line cross-note, finding F-07. Still unvalidated. Original item: Project credit (B5) between 06 and 10 | Fixed | 10 §8.2 rewritten: per verified step, L0 immediate, L1+ pending until evidence `accepted`, only the "applied" condition and module-level L1, no L2/L3; T-PRJ-10 and T-PRJ-11 reworded (IDs kept). 06 §4.2/§4.6/§3.2 and the reference code (`project_credit_applied`) implement it. Schema `project_grants` (unique on `(user_project_id, skill_key)`, tier L0/L1) matches |
| 11 | Placement credit (B6) between 05, 06, 09 | Fixed | 06 §3.6/§5.5/§6.1 and the reference frontier now implement `source = placement`, `reviewing` with a 14-day grace and a `verify` re-check; 05 §11.3 dropped the "L1 if the item was a problem" row (placement `tier_attained` ≤ L0); 09 S05 data line updated |
| 12 | RESOLVED (review pass 2): document 13 and `backlog/backlog.yaml` exist and are covered by checks (a), (b), (d), (e), (f). Remaining reference problems are findings F-08 to F-12. Original item: `grade.status` and `mastery_eligible` (B4, D2) in 06, 07, 08 | Consistent | 06 §4.1 now states the scheduler ignores non-`graded` attempts and non-eligible grades; 07/08 map `grade.status` to `grade_status` identically to the schema enum (`pending`, `graded`, `error`) |
| 13 | `jobs.kind` (C: follow doc 03) in 06, 07, 08 | Fixed, with open item | 07 and 08 used `grade`, `generate_item`, `verify_template`, `human_review`, `triage_item_report`, `nightly_calibration`; now `grade_attempt`, `pregenerate_items`, `content_postprocess`; human review and triage are queues over `grade_status` and `item_reports`. Schema CHECK list matches doc 03. See section 5, item 7 |
| 14 | Item reports (D5) | Fixed | 07 §8 now writes an `item_reports` row plus an `events` row; free text only in `item_reports` |
| 15 | `difficulty_prior` (D3) | Fixed | 07 states (0,1) float; `problem-template.schema.json` uses exclusive bounds; sample templates (0.3 to 0.55) pass |
| 16 | Template status vocabulary (D4) | Consistent | Files: `draft`/`ready`/`retired`; DB `verified` only by the pipeline |
| 17 | FSRS model (B7) | Consistent | 06 pins FSRS-6 (`fsrs_model` default `'fsrs-6'`, `fsrs_extra`); contract §3 and §6 say the same; schema has both columns. The `FsrsConfig` type no longer offers `'fsrs-7'` |
| 18 | Offline answer keys and mastery (C, arch CCR-8) in 00, 01, 06, 08, 09, 12 | Fixed | Numeric and multiple-choice keys only; offline attempts count after server verification; 09 no longer lists symbolic items for local grading; 08's salted-hash note downgraded to optional hardening; 12 T-OFF-1 and ST-OFF-05 already agreed |
| 19 | `notification_prefs` table rejected (C) | Fixed | 09 S19, the notifications section and the §12 table now use `profiles.reminder_prefs`; 06 §2 states the rejection |
| 20 | API route names in 07, 09, 10 vs `schemas/api.openapi.yaml` | Mismatch, deferred | Routes differ (for example `/api/session-preview` vs `/sessions/build`). 09 §12 and the two route mentions in 07/10 now point to `00c-route-rename-map.md`; routes were not edited. `00c` did not exist at report time |
| 21 | Nonce format | Fixed | 09 said "6 characters"; now `PM-XXXX-XXXX` as in 03 and 10 |
| 22 | `video/quicktime`, evidence status flow, `projects.spec`, `bench_state`, `evidence_challenges` (C) | Consistent | 10 §6/§7 updated; schema contains the tables and columns |
| 23 | Skill counts, edges, hours after E1 | Fixed | 05 and 10 updated: 138 skills (elec 56), 238 edges (232 hard), 3890 min, 64.8 core hours, 162 planning hours, `elec.meas` 9 skills / 255 min, `elec.semi` 11 / 285 min, 107 phone-suitable skills. 10 §8.3 coverage table regenerated (`elec.meas` touched 9, `elec.semi` touched 8) |
| 24 | Safety skills wired (E1) | Pass | `elec.semi.battery-safety` (prereq `elec.meas.lab-safety-esd`, `elec.dc.power-energy`) in project L2 prerequisites and steps s02, s06; `elec.meas.soldering-safety` (prereq `elec.meas.lab-safety-esd`) in L3 (s02, s03, s04) and L5 (s11) and both projects' prerequisites. 10 §5 and the "Skills:" lines of steps regenerated from the YAML |
| 25 | `elec.opamp` exemption (E2) | Pass | Stated in 05 §3 and 10 §8.3 and contract 9; enforced in `validate_projects.py` (`MODULE_EXEMPT`; `validate_graph.py` has no project rule so needed no change) |
| 26 | Hour estimates (E3) | Pass | 05 §6.2 and contract 9 state the estimates are unvalidated; 01 A-04 already declines to promise L1 in a short window |
| 27 | L5 ordering (A3) in 01, 05, 10, contract | Fixed | 01 G-1 and M5 row, 05 §6.3, 10 §1, contract 9 say L5 is specified and built last (M5) |
| 28 | Milestones M0–M5 across 01 and 11 (13 not available) | Consistent | Names and windows in 01 §10 agree with the timeline table and EXP rows in 11 (M1 Jan–Feb 2027, M2 Mar–Apr, M3 May–Jun, M4 Jul–Aug, M5 from Sep 2027). Document 13 was not available to compare; 14 cites it |
| 29 | Event names (D6) | Consistent | 11 §9 is stated as the normative catalogue (contract 6 and 11 §17). 10 §8.6 and 06 §12 list event names not checked one by one against 11 §9 (see section 5, item 9) |
| 30 | Control arm (D7) | Consistent | 11 §7.4 already describes an active control; the CCR note now cites 00a D7 |
| 31 | ID integrity (no renumbering) | Pass; one collision, resolved afterwards by renaming the doc 11 rubric rows to `DR-01`…`DR-14` | FR 74, US 50, LS 57, PRM 20, EXP/BETA 5+1, T-PRJ 20, SM 15, H 12, OM 13, ADR, R rows unchanged in number; no duplicates inside any one document. The prefix `R-` is used by 11 (decision rubric, R-01 to R-14) and 14 (risk register); see section 5, item 1 |
| 32 | Schema vs contract tables and columns (read only) | Pass at the time of reading | All tables and columns of contract §6 were found in `schemas/schema.sql`: `modules`, `weekly_plans`, `plan_slots`, `checkpoints`, `cohorts`, `admin_users`, `item_secrets`, `idempotency_keys`, `content_sync_runs`, `llm_calls`, `push_subscriptions`, `privacy_requests`, `item_reports`, `app_private.rate_limits`, `evidence_challenges`, `project_grants`, `analysis_exclusions`, plus the column additions. Not re-checked after later schema edits |
| 33 | Document 03 vs 00a (read only) | Minor | 03 §15 says contract change requests are listed at the end of 04 (CCR-1 to CCR-8); these are now resolved by 00a. No job kind exists in 03 for the nightly calibration (section 5, item 7). Otherwise no contradiction found on offline keys, nonce format, job kinds or FSRS |

## 4. Rulings made by the integrator where 00a is silent (please confirm or reverse)

| # | Ruling | Why |
|---|---|---|
| a | 01 CCR-07 (delayed-test scheduling and CSV export are in the experiment framework) accepted as a clarification in contract 9 | 00a says it resolves every CCR but lists no decision; the evaluation plan cannot run without it |
| b | 10 CR-5 (phone-suitable `project_step`; short bench session) and CR-11 (decoders, ARM runner, escalate-only vision, per-step TTL) not ratified | Not in 00a; the interim behaviour of 10 §5.5 stays. Contract text for CR-5 was not added |
| c | Placement `tier_attained` capped at L0 | 06 §4.6 gives L1 only through the full rule; 00a B6 grants provisional credit only |
| d | Project credit is written per verified step but stored once per `(user_project_id, skill_key)` | The schema unique constraint; 00a B5 says "step" |
| e | Credit suspension after a failed unaided checkpoint kept | 00a B5 neither requires nor forbids it; it only removes credit |
| f | Diagnostic time: expected about 25 min, hard cap 45 min, one `focus` session | Reconciles 01/06 (25) with 05 (45) and the `focus` minimum of 45 (A2) |

## 5. Remaining mismatches and open questions that need a human decision

| # | Item | Documents | Needed decision |
|---|---|---|---|
| 1 | RESOLVED: the doc 11 decision-rubric rows are now `DR-01`…`DR-14`; `R-` is reserved for the risk register (14) | 11, 14 | none |
| 2 | API routes in 09 (and two routes in 07, 10) differ from `schemas/api.openapi.yaml`; `00c` not yet written | 07, 09, 10, OpenAPI | Schema integrator to deliver 00c; then 09 §12 should be regenerated from it |
| 3 | CR-5: a micro session cannot hold a bench step (schema `sessions_micro_not_bench`) and 06 §7.3 excludes `project_step` from phone; 10 §5.5 uses a 45-minute `focus` workaround for a 20-minute bench visit | 06, 09, 10, 04 | Founder: ratify CR-5 or accept the workaround |
| 4 | CR-11: additions to doc 03 (Python decoders, optional ARM runner, escalate-only vision assist, per-step nonce TTL 24 h / 72 h) | 03, 10 | Architecture owner to adopt or reject |
| 5 | Suspension of applied project credit after a failed unaided checkpoint | 10 §8.2 rule 4 | Confirm keep or delete |
| 6 | Diagnostic length (about 25 min expected, 45 min cap) and the 12–20 item vs 40 item bound | 01 FR-003, 05 §11.2, 06 §5.5 | Founder: single number; 06 also requires constructed-response only while 05's probe allows any deterministic item |
| 7 | Job kinds needed but absent from 03 and the schema CHECK: nightly calibration (07, 06 §12, 11 D5), nightly decay evaluation (06 §4.3), human-review and triage notifications | 03, 04, 06, 07 | Schema integrator: register the nightly tasks (scheduled `pg_cron` calls or additional kinds) |
| 8 | 03 §15 and 04 still cite their own CCR lists | 03, 04 | Schema integrator: replace with "Resolved by 00a" |
| 9 | Event names in 06 §12, 10 §8.6, 08 and 09 were not matched one by one with 11 §9 | 06, 08, 09, 10, 11 | Run a lint that checks every `events.name` string against the catalogue |
| 10 | Project hours (62.8 h across L0 to L5) and the skill planning hours (162 h, which assumes a 2.5x multiplier that is meant to include project steps) may double count | 05, 10 | Founder: treat both as unvalidated until the golden builds (10 §12) |
| 11 | 34 project substeps are 21–30 min | 10, validator | Confirm that substeps are out of scope of A1 (current reading) |
| 12 | Document 13 and `backlog/backlog.yaml` were not available to compare milestone and task references | 13, 14 | Re-run check 28 when 13 exists; the contract §13 index lists it |
| 13 | `ts-fsrs` licence: 06 records MIT as read ([V]) and 03 OA-3 and 07 item 4 still say not examined | 03, 06, 07 | Fixed in wording by 00a B7 (re-verify at build time); keep one source of truth in 06 |
| 14 | 05 module hours: 05 §6.2 per-module planning hours were recomputed by hand (x2.5) for the two changed modules | 05 | Spot check |

## 6. Unverified claims the package relies on

Owner is the person who must act; verification steps are concrete.

| # | Claim | Where | Tag | Owner | Verification step |
|---|---|---|---|---|---|
| U1 | Prices of every BOM item (about 86, 182, 82, 181, 20, 87 USD per project), lead times (14, 21, 28 days), Pico idle current, bounce times | 10 §4, `project-ladder.yaml` | [R], unverified estimates | Founder | Price the kit from two sellers on one date and replace `price_status`; measure idle current during the golden build |
| U2 | `ts-fsrs` MIT licence for the pinned npm version; v6 API shape; Node ≥ 24; default FSRS-7 model (confirmed, 00a H3) | 06 §3.7, 03 OA-3 | [V] for repo files, unverified for the pinned version | Builder | At dependency pinning read the published package licence and run the adapter contract test (`review` then `retrievability`) |
| U3 | Licence status of OpenStax per title, Khan Academy, Feynman Lectures; MIT OCW is CC BY-NC-SA; PhET HTML sims before 29 Mar 2026 are CC BY 4.0 | contract 11, 12 REG-10 | OCW and PhET [V], others unverified | Founder with counsel | Read each licence page before any reuse; CI keeps blocking NC and unknown licences |
| U4 | Licences and distribution of KiCad, ffmpeg, ngspice; Monaco, MathLive, d3, ELK, KaTeX | 12 OI-5, 09 §14 | [R] | Builder | Record each licence in `THIRD_PARTY_NOTICES` when added; legal check for invocation model |
| U5 | EU AI Act (Art. 5 emotion recognition, Annex III education, Art. 50, Art. 4, timeline), Cyber Resilience Act, European Accessibility Act applicability, neural-data statutes, FTC / Lumosity | 12 OI-2, OI-3, REG-13, REG-14; 01; 11 §16 | Report-sourced, not independently checked | Founder with counsel | Counsel review before beta enrolment (M4 exit) |
| U6 | Jurisdiction, data residency, GDPR / UK GDPR scope, lawful basis, DPIA, sub-processors, erasure versus backups | 12 OI-1, OI-7, OI-8, contract 12 | Open decision | Founder | Choose jurisdiction; write privacy notice and records of processing |
| U7 | LLM provider terms: retention, training opt-out, region, DPA, prompt caching; model names and prices | 12 OI-6, 03 OA-5, 08 §12 | [R] | Founder | Read the provider's current terms and pricing page at integration; log the date in `llm_calls` config |
| U8 | Supabase features (transaction pooler, signed upload URLs, storage limits, `pg_cron`, PITR cost, SMTP limits, JWT claims, link expiry, backup retention) | 03 OA-2, 12 OI-9 | Unverified | Builder | Build a staging project and test each feature before M0 exit |
| U9 | Fly Machines isolation and egress options; nsjail fields; ngspice control-command behaviour (`.control`, `shell`); sandbox escape resistance | 03 OA-1, 08 §12, 12 OI-9 | [P] | Builder | Red-team the sandbox with the malicious-input suite before enabling code graders (M2) |
| U10 | Vercel Hobby versus Pro terms for a beta | 03 OA-4 | Unverified | Founder | Read the terms before enrolling beta users |
| U11 | iOS Web Push and Background Sync behaviour; PWA install on iOS | 03 OA-7, 09 §14 | [R] | Builder | Test on the founder's phone in week 1 of M2 |
| U12 | ngspice 42 behaviour (`.meas`, `.save`); `kicad-cli` flags and `--format spice`; KiCad major version equality; Gerber determinism across versions; `.sr` parsing | 08 §12, 10 §11 | Partly run (ngspice 42), rest [R] | Builder | Pin versions in the worker image; run reproduction tests on the golden board |
| U13 | Graders and verifiers were run (numeric, symbolic, code, SPICE linter); lint rules L03, L05, L06, L08, L10–L12, L14–L26 are specified but not implemented; Node and Python safe-expression parity fixtures not written | 07 §13 | Run vs specified | Builder | Implement the lint rules and shared fixtures (T1/T2) before M0 exit |
| U14 | Every numeric default of the scheduler (Elo K, thresholds 0.8 / 0.5 / 0.7, 70% review share, 14-day grace, checkpoint intervals); 3 / 2 / 2 mastery thresholds relation to delayed performance | 06 §11, 02 register | [P] | Founder | Calibration monitor and evaluation question 1 (11 H1); tune after 8 pairs |
| U15 | FSRS fresh-variant reviews are well calibrated; FSRS optimiser needs about 1000 reviews | 06 unverified list | Hypothesis / [R] | Founder | Calibration monitor (11 OM-12) |
| U16 | Reference scheduler was checked only against its own vectors; no independent implementation | 06 | Self-checked | Builder | The TypeScript port must pass the same vectors |
| U17 | Learning-science effect sizes (Bastani 48% / −17%, Brunmair and Richter g = 0.42, self-explanation d about 0.55, Harvard physics tutor, Khanmigo 14.5%, Jordan 2014 completion), the 150–300 h time-to-L1 baseline and the 25–40% saving | 01, 02, 08, 11 | Mixed [V], [S], [R], [P] | Founder | Check each cited source against the tag before any public statement; the claims policy (contract 8, 11 §15) already forbids using unchecked figures in copy |
| U18 | Hour figures: 64.8 core hours, 2.5x planning multiplier, 160–300 h plausible range, 450–900 h for three nodes, project hours (62.8 h) | 05 §6.2, 01 A-04, 10 | [P] | Founder | Replace with median observed times after 10 learners (05 §10) and after the founder's golden builds |
| U19 | Remote verification of physical builds (nonce, assurance ladder, perceptual-hash reuse, blink decoding, audit rates) and every expected measurement and tolerance | 10 §7, §11 | [P], not run on hardware | Founder | Golden build of each project with stored fixtures (10 §12) |
| U20 | WCAG contrast pairs beyond the listed ones; no usability testing | 09 §14 | Partly computed | Designer or founder | Run axe-core in CI and a five-user walkthrough at M2 |
| U21 | Retention periods in 04 §10, rate limits, cost caps, hint timing (60 s), alert thresholds | 04, 08, 12 OI-11 | [P] | Founder | Review at beta start; adjust from logged data |
| U22 | Statistical power, SD = 0.175, 12-pair feasibility, 80% completion target, pre-registration plan | 11 | [P] | Founder | Recompute power from observed variance after 8 pairs (11 §16) |
| U23 | Placement accuracy and the ability of a 12–20 item diagnostic to place a learner | 05 §11, 06 §5.5 | [P] | Founder | First unaided checkpoint includes at least 2 placed skills per module (05 §11.3); compare predicted with observed |

## 7. Findings for other owners (review pass 2, 31 Oct 2026)

Found by `reference/check_package.py` or while editing. The reviewer did not edit these files (not in reviewer 2's list). "Fix" is the proposed change; ids are never renumbered.

| # | File and place | Problem | Proposed fix |
|---|---|---|---|
| F-01 | `docs/03-architecture.md` lines 256, 270, 297 (section 5.2 to 5.4 sequence diagrams) | `GET /attempts/id` is not an OpenAPI path | Write `GET /attempts/{attempt_id}` (operation `getAttempt`) |
| F-02 | `schemas/api.openapi.yaml` `POST /sessions/build`; doc 09 S06/S07 | There is no session preview route; S07 needs a proposal the learner can accept or change, and `build` persists a `planned` session | Add a `dry_run` boolean to `BuildSessionRequest` (no row written, no item reserved) or accept that S07 calls `build` and relies on the 2-hour auto-abandon. Doc 09 now says the second |
| F-03 | `schemas/api.openapi.yaml`; doc 09 S15 | No progress route (00c: composed client-side from `/skills`, `/checkpoints`, `/project-grants`) | Confirm the composition is acceptable (three calls on the Progress screen) or add `GET /progress` |
| F-04 | `docs/02-learning-science-spec.md` lines 3, 25, 35, 228, 246 | `EXP-006` is cited but doc 11 defines EXP-001 to EXP-005 and BETA-001; line 246 also says `OM-01…OM-10` while doc 11 has OM-01 to OM-13 | Replace `EXP-006` by the intended id (probably EXP-005) or ask doc 11's owner to add a row; change `OM-10` to `OM-13` |
| F-05 | `docs/03-architecture.md` (jobs, scheduler) and `schemas/schema.sql` `jobs.kind` CHECK | Nightly calibration (07 G5/G6, 06 section 12 `fsrs_calibration`, 11), nightly decay evaluation (06 section 4.3), the weekly tutor audit (08 section 8.2) and human-review notifications have no job kind and no scheduled task | Owner of doc 03: decide between `pg_cron` calling a handler or extra job kinds (for example `nightly_calibration`, `nightly_decay`, `weekly_tutor_audit`) and update the schema CHECK and doc 03 |
| F-06 | `docs/06-learner-model-and-scheduler-spec.md` section 12 (table around lines 609 to 626) | Events `task_started`, `task_submitted`, `mastery_changed` duplicate the meaning of catalogue events `task_shown`, `attempt_submitted`, `skill_state_changed`; the other 06 events are now in 11 section 9.1 | Rename the three to the catalogue names (or ask 11's owner to drop the catalogue row); also add `params_version` and `experiment_snapshot` to the catalogue props if they are really sent on every event |
| F-07 | `docs/05-skill-graph-and-curriculum-spec.md` section 6.2 (planning-hours paragraph) | The 2.5x multiplier is described as including project steps, while doc 10 has 62.8 h of project steps; the two may double count | Add: "Project hours (doc 10 section 4: 62.8 h, 47.3 h for L0 to L4) are an independent estimate; it is unknown how much of the 97 h overhead they replace; do not add or subtract them (00b item 10)" |
| F-08 | `docs/14-risk-register.md` lines 282, 292, 304 and `backlog/backlog.yaml` lines 24, 6163, 6205, 6239, 6254, 6256 | They cite a lean-slice plan (file name starting 00d, cited sections 4, 6, 8 and 9) but no such file is in the package, and the contract index (section 13) does not list it | Add the document (and its index row) or change the references to an existing document; if 00d is added, check it with `check_package.py` |
| F-09 | `docs/04-data-model.md` line 285 | "section 12.4" does not exist (section 12 is Migration strategy) | Point to the real section for granting admin by SQL or add the subsection |
| F-10 | `docs/12-security-privacy-compliance.md` line 192 | "List in section 13.9" but section 13 ends at 13.8 | Use 13.4 (sandbox tests) or add 13.9 |
| F-11 | `docs/04-data-model.md` line 662 | Mentions `tutor_messages.model`, `tutor_messages.attempt_id`, `items.pool` as not added; correct, kept as history (the checker ignores it because the line says "not") | none |
| F-12 | `docs/00-contract.md` section 13 | Index row 13 says "not yet written as a numbered document" but `docs/13-roadmap-and-backlog.md` and `docs/14-risk-register.md` exist | Update the index rows (13 and 14 paths) |

## 8. Review pass 2 (31 Oct 2026): consistency and agent-readability

Reviewer 2 added `reference/check_package.py` and fixed everything it found in documents 07 to 11 and 00c.

**What `check_package.py` covers** (stdlib and PyYAML; `python3 reference/check_package.py`; exit 1 on any finding; `--only a,d` selects checks; `--files docs/09` filters the report):

| Check | What it does |
|---|---|
| (a) | Cross-references of the forms `06 section 4.2`, `06 §3`, `(03 §15)`, `09§S02`, `docs/03 section 5.8`, `section 9.1 of 03-...md`, `contract §7.5`, `00a section C` must resolve to a numbered heading (contract: also a numbered list item). File paths `docs/NN-name.md` must exist. |
| (a2) | Bare `§N.M` and `section N.M` are checked against the same document (skipped inside fenced blocks and when a document is named). |
| (b) | FR-, US-, SM-, NFR- (home 01), LS-, PRM- (02), EXP-, BETA-, H<n>, OM-, DR- (11), T-PRJ- (10), ADR- (03), R- (14), BL- (backlog) must be defined in the home document (line start, table cell, heading or bold). |
| (c) | Backticked table names in table context or near misses (`session_task`), `table.column` pairs, stale names (`notification_prefs`, `structural_check`), and enum values next to `session_type`, `task_kind`, `grader_type`, `mastery_state`, `evidence_kind`, `evidence_status`, `tier`, `context`, `pool`, `assessment_kind`; sample template enums. |
| (d) | `METHOD /path` in docs and backlog against OpenAPI path and method (parameter names ignored; `/api` and `/api/v1` stripped); old routes are reported with the 00c replacement. 00b and 00c are exempt. |
| (e) | Catalogue names in 11 section 9 are unique; names in the event lists of 06 section 12 and 10 section 8.6, after "Events:", and in event mentions (docs 06, 08, 09, 10 and backlog) must be in the catalogue. |
| (f) | Skill keys in docs 07 to 10, sample templates and backlog must exist in `content/mvp-skill-graph.yaml`. |

Deliberate whitelists (documented in the script): lines that retire a name ("not", "rejected", "replaced"), worker-only routes such as `/healthz`, Postgres role names, 00b and 00c as history.

**Results.** First run (after removing false positives of the first draft, which reported 115 raw lines): 80 findings, 40 of them in files owned by reviewer 2 (07: 1, 08: 5, 09: 18, 10: 14, 11: 2) and 40 in other files. After the fixes: 0 findings in documents 07 to 11, 00b and 00c; 26 remain, all in files of other owners and listed above (F-01, F-04, F-08, F-09, F-10; check (a) 13, (a2) 5, (b) 5, (d) 3).

**Fixed in reviewer-2 files.** Doc 09 section 12 now lists the real routes and the screens S06, S12, S14 use real routes; `notification_sent`/`notification_opened` became `reminder_sent`/`reminder_opened`; doc 07 and 10 route names; doc 10 section 8.6 now points at the catalogue; doc 11 section 9.1 adds the events used by docs 06, 08 and 10 (25 rows); doc 08 cross-references to 07 section 14 are explicit; doc 00c corrected (`PATCH /profile`) and marked as history. Event props of `evidence_submitted` in 10 were aligned to the catalogue.

**Agent-readability.** Docs 07, 08, 09, 10 and 11 start with an "At a glance" box and a linked table of contents; doc 10 also has a Quick reference for implementers (rules that bite, build order, task to section map, the hours explanation). No content was deleted or renumbered.

**What remains.** Findings F-01 to F-12 for other owners; the open human decisions of section 5 (CR-5, CR-11, credit suspension, diagnostic length, hours validation). The checker cannot verify meaning (for example that a section reference points at the right topic), numbers (hours, prices) or references to sections written as list items; it is a lint, not a review.

## 9. Review pass 3 (31 Oct 2026): product pass

Scope: the product-pass files (docs 01, 07 to 11, 13, 14, 00b, 00d, README, the backlog, `validate_backlog.py`, `validate_projects.py`, `check_package.py`, the project ladder, sample templates and the project and template schemas). Decisions G1 to G18 of `00a-change-decisions.md` and the findings of 00e and 00f were applied where they touch those files. IDs were not renumbered.

**What changed**

| Area | Change |
|---|---|
| Doc 07 | Licence note (OpenStax CC BY-NC-SA link-out only; PhET only before 29 March 2026); new section 2.2 (at least 2 verified templates per skill, constructed-response-only diagnostic, stopwatch `expected_s`, assessment pool) |
| Doc 08 | Model-tier prices from `pricing.json` with a dated example; KiCad exit codes (`--exit-code-violations` exits 5, ERC undocumented, netlist export unverified); ngspice version recorded |
| Doc 09 | `needs_applied` state, diagnostic in two sittings, reviews-only micro, per-answer-type time defaults (6.6), lab slot served as a focus session when no step is eligible, tutor over-reliance mode, WCAG 2.5.8 and 3.3.8 |
| Doc 10 | Guided week-1 blink appended as step `prj.L0.blink-led#s09` (flag `guided_variant`, no renumbering); safety-gated steps locked without briefs; Pico 2 price and KiCad facts; totals now 69 steps, 63.6 h; Skills and Prerequisite skills lines checked against the graph (no change needed after the engine pass) |
| Doc 11 | OM-14 (nightly maintenance), four new events (checkpoint gap, tutor-mode switch, calibration buckets, nightly maintenance), parameter flags |
| Docs 01, 13, 00d, README | 5 to 7 new skills a week planning rate (A-07), honest timelines, no hard-coded vector counts; totals refreshed to 195 tasks, 1,095.5 h; lean slice 83 tasks, 395.5 h, 233 founder hours central (156 to 351) |
| Doc 14 | R-26 (placement grace), R-27 (adherence gap before the first physical win), R-28 (time-limited founder-only evidence log, G17), R-29 (OpenStax licensing); R-05 links BL-0187 |
| Backlog | BL-0183 to BL-0195 added (13 tasks, 10 lean); BL-0003, 0006, 0033 to 0037, 0039, 0041, 0059, 0061, 0090, 0112 to 0114, 0117, 0179 amended; version 1.1 |
| Tools | `check_package.py` and `validate_backlog.py` accept documents 00a to 00f; `validate_projects.py` checks the guided variant; `project.schema.json` gains `guided_variant` |

**Lean versus deferred.** Lean: BL-0183 (guided blink preparation), BL-0184 to 0187 (scheduler rules), BL-0190 (`getProgress`), BL-0191 (`dry_run`), BL-0193 (graph sync), BL-0194 and 0195 (claims lint port, package checks in CI). Deferred: BL-0188 (tutor over-reliance, needs the tutor), BL-0189 (`nightly_maintenance`, absence keeps retention at the safe 0.85), BL-0192 (diagnostic in two sittings, needs the diagnostic).

**Validation at the end of pass 3.** `validate_backlog.py` PASS (195 tasks, critical path 38 tasks, 253 h); `validate_projects.py` 0 errors, 0 warnings; `validate_templates.py` 7/7; `validate_graph.py` PASS; scheduler reference 161/161; verifiers 119 passed, 6 skipped; `lint_claims.py` 0 violations; `check_package.py` see the table below.

**Findings and requests for other owners**

| # | Owner | Request |
|---|---|---|
| P3-01 | Engine | Doc 09 sections S06 and S07 refer to a reviews-only builder option. Until `POST /sessions/build` has an explicit option (for example `reviews_only: boolean`) the UI uses the ordinary build call with a 5 minute budget and a new-skill cap of 0; please add it to the OpenAPI file or confirm that this composition is acceptable |
| P3-02 | Platform | `jobs.kind` must contain `nightly_maintenance` (G15) and the worker must register it; BL-0189 depends on that |
| P3-03 | Platform | Doc 03 still cites `GET /attempts/id` (F-01) and doc 04 / 12 section references (F-09, F-10); re-run `check_package.py` after the platform pass |
| P3-04 | Engine | Scheduler parameter docs (doc 06) should list `mastery_min_span_days` (2), `mastery_min_templates` (2), `latency_min_obs` (20), `placement_grace_max_tier` (L1) with the test vector names |
| P3-05 | Founder | OpenStax and PhET terms (R-29) and the Supabase Free 50 MB upload cap (G14) are as of the dates in doc 07 and 00e; re-check before launch |

`check_package.py` ends at 0 findings (21 documents, 160 skill keys, 72 catalogue events); the references to "00b section 9" in doc 09 resolve to this section.
