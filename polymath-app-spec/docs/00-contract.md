# 00 — Shared contract (source of truth)

**Version 1.3 — 1 Nov 2026.** Status: binding for all documents, schemas and content in this package.

**Changelog**

| Version | Date | Change |
|---|---|---|
| 1.3 | 2026-11-01 | Clarifies post-MVP **capability spine** (planning docs 15–16, `content/capability-tracks.yaml`); v1 shipped curriculum unchanged. No new enums or tables. |
| 1.0 | 2026-10 | First contract, written before documents 01–12. |
| 1.2 | 2026-10-31 | Engine pass: folds in decisions G1–G9 and G11 of `00a-change-decisions.md` section G, and fixes the document index. §7 gains: the placement grace also satisfies `min_tier` up to L1 for the frontier test only (G1, item 1); the applied-gap rule and the derived `needs_applied` flag (G2, items 2 and 5); mastery conditions 7 and 8, a 2-calendar-day span and two distinct templates when two verified templates exist (G3, item 5); a lab slot with no eligible project step is served as a `focus` session (G4, item 6); `desired_retention` 0.85 for the first 8 weeks, then 0.90 only if the calibration monitor is within 0.07, and the latency rows of the rating map ignored below 20 observations of a template (G5, items 4 and 16); the tutor over-reliance trigger (G6, item 17); the diagnostic design, constructed response only, about 2.5 minutes an item, at most two sittings of 25 minutes (G7, item 12); the planning rate of 5–7 new skills a week (G8, §9). The skill graph moved to 0.2.0 (G9): 142 skills, 4 new, 11 confusable sets, every edge checked against module order. `ts-fsrs` is pinned to 6.x (G11, §3). `needs_applied` is **derived at read time and has no column** (§6). The document index (§13) lists 00d, 00e, 00f and the real paths of rows 13 and 14 (`check_package.py` finding F-12). Section numbers §1–§13 are unchanged, and no ID was renumbered. |
| 1.1 | 2026-10-31 | Folds in every ratified decision of `00a-change-decisions.md` (A1–A3, B1–B7, C, D1–D7, E1–E3, F): the session-window rule for 21–44 minutes, `stub` skill status, `unaided` and strict-unaided, the mastery, frontier, priority and tier rules of document 06, project credit, diagnostic placement, FSRS pinned to FSRS-6, the extra entities and columns at table level, the document index, and the offline answer-key rule. Section numbers §1–§12 are unchanged, so existing cross-references (for example "contract 7.5") still point at the same topic. |

Every other document in this package MUST follow this contract. `00a-change-decisions.md` records the decisions that produced v1.1 and stays a separate file; where a document or the contract and 00a differ, **00a wins** and the other text is a bug to fix. If a document needs to differ from this contract, it must say so explicitly and flag it as a **CONTRACT CHANGE REQUEST** (CCR) in a final section. Do not silently rename entities, enums or IDs, and never renumber existing IDs (FR-, US-, LS-, PRM-, EXP-, T-PRJ-, ADR-, SM-, H-, OM-, R-).

Evidence tags used across the package (inherited from the research reports in `/home/claude/reports/` and `/home/claude/research_notes/`):

- **[V]** source was opened and read; **[S]** snippet only; **[R]** recalled, unverified; **[P]/[inf]** design proposal or inference, no source says it works.
- Any requirement justified by learning science must cite the tag and, where possible, the report section. Anything tagged [R], [S], [P] or [inf] must be treated as a hypothesis to be tested by the evaluation plan, never as established fact in UI copy.

---

## 1. Product in one paragraph

A mobile-first adaptive learning app that takes one adult learner (the founder, working full time, about 8 hours a week) from near-zero to **working knowledge (tier L1)** in a vertical slice of hardware/software engineering, then widens. Learning is **active** (every task requires the learner to produce something), delivered in **micro sessions (≤20 min)**, **focus blocks (45–120 min)** and **lab blocks (120–240 min)** (a window of 21–44 minutes is served as one micro session, optionally chained to a second; see §5), driven by a **skill graph (DAG)**, **per-skill spaced retrieval (FSRS)**, a **guarded AI tutor**, **execution-based grading**, and **physical build projects** verified by evidence. It makes **no neuroscience, neurostimulation or "top 1%" claims**.

## 2. Decisions already made (from the founder)

| ID | Decision | Consequence |
|---|---|---|
| D1 | First users: **the founder first, then a small beta** (10–50) | Single-user UX in v1, but data model is multi-user, multi-tenant-ready, with cohorts and experiment arms |
| D2 | Platform: **mobile-first web app / PWA** | One codebase; installable; Web Push; desktop layout for focus blocks |
| D3 | Builder: **founder with AI coding agents** | Specs written as small agent-ready tasks with acceptance tests; boring popular tech; content-as-code |
| D4 | Package format: **separate docs plus machine-readable files** | This package |

## 3. Technology stack (decided; verify current versions and licences at build time)

- **Frontend:** TypeScript, Next.js (App Router), React, Tailwind CSS, shadcn/ui, KaTeX for math, a PWA manifest and service worker, Web Push for reminders.
- **Backend:** Supabase (Postgres, Auth with email code and magic link, Storage, Row Level Security). Light server logic in Next.js route handlers.
- **Worker service:** Python 3.12 + FastAPI in a container (Fly.io or Google Cloud Run). Hosts verifiers and graders: SymPy, pint, NumPy, **ngspice**, **kicad-cli** (ERC/DRC), and an **execution sandbox** for learner code. Jobs are rows in a Postgres `jobs` table claimed with `FOR UPDATE SKIP LOCKED` (no extra queue in v1).
- **Scheduler:** a **FSRS** implementation per skill (`ts-fsrs`, pinned **exactly to a 6.x release** (MIT licence, FSRS-6 model, Node 24 or later per its npm metadata; never float to a new major; do not assume it defaults to a later model) behind a single adapter file; `skill_state.fsrs_model` records the model; re-verify the licence and API of the exact version at build time, 00a G11). Learner model is an **Elo/IRT-lite** model, explainable, not deep knowledge tracing.
- **LLM:** behind an `LlmClient` interface. Default provider OpenRouter with open-weights models (a stronger model for tutoring and rubric grading, a cheaper one for tagging and drafting; 00a I1). Prompts are versioned files in the repo. Never trust LLM output as ground truth for correctness.
- **Content as code:** skills, templates and projects live as YAML in the repo (`content/`) and are loaded into Postgres by a `content:sync` script. Git is the source of truth for content.
- **Testing and CI:** Vitest, Playwright, pytest, GitHub Actions.
- **Analytics:** an `events` table in Postgres. No third-party tracker in v1.

## 4. Identifiers and naming

- **Node codes** (discipline groups): `math`, `phys`, `sw`, `ml`, `elec`, `sig`, `ctl`, `mech`, `sens`, `net`, `matl`, `sys`, `sec`, `econ`, `prof`; application tracks: `def` (defense applications, conceptual), `rf`, `robo`, `cv`, `pwr`.
- **Skill key:** `{node}.{module}.{slug}`, lowercase, digits and hyphens only, three dot-separated parts. Regex: `^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$`. Example: `elec.dc.voltage-divider`.
- **Item template key:** `tpl.{node}.{slug}`; **project key:** `prj.L{0-9}.{slug}`; **project step key:** `{project key}#s{NN}`.
- Database primary keys are UUIDs; content objects also carry the stable string `key` above and are joined on `key`.
- Time is stored as `timestamptz` in UTC; durations in integer seconds (`*_s`) or minutes (`*_min`) as named.
- Scores are floats in [0, 1]. Ratings for FSRS are integers 1–4 (Again, Hard, Good, Easy).

## 5. Enumerations (exact spellings)

| Enum | Values |
|---|---|
| `tier` | `L0`, `L1`, `L2`, `L3` |
| `session_type` | `micro` (≤20 min), `focus` (45–120 min), `lab` (120–240 min). There is **no session type for 21–44 minutes**: such a window is served as one `micro` session, optionally chained to a second `micro` session (the second is a separate `sessions` row). Project steps must not be authored with `est_min` in 21–44. A diagnostic is stored as a `focus` session whose tasks have `task_kind = 'diagnostic'` (00a A1, A2). |
| `context` | `phone`, `desktop`, `bench` |
| `task_kind` | `retrieval`, `worked_example`, `faded_problem`, `problem`, `perceptual_drill`, `explain_back`, `debug_case`, `project_step`, `diagnostic`, `checkpoint`. `diagnostic` and `checkpoint` are **session-level task kinds**: they are not listed per skill in `skills.task_kinds` and are drawn from any non-stub skill that has deterministic items (00a A2). |
| `grader_type` | `exact_numeric`, `symbolic_equivalence`, `multiple_choice`, `code_tests`, `spice_compare`, `drc_erc`, `rubric_llm`, `measurement_check`, `human_review`. There is no `structural_check`: structural checks on project evidence (file formats, build success, log parsing) are evidence-verification checks stored in `project_evidence.verification`, not item graders (00a D1). |
| `mastery_state` | `unseen`, `learning`, `reviewing`, `mastered`, `decayed` (precise definitions in §7.5) |
| `edge_strength` | `hard`, `soft` |
| `content_status` | `draft`, `verified`, `needs_human_review`, `retired`; for **skills** the value set is `stub`, `draft`, `verified`, `needs_human_review`, `retired` (the schema implements it as the separate enum `skill_status`) (a `stub` is never served and is never a prerequisite of a non-stub skill). Item-template files may declare only `authoring_status` of `draft`, `ready` or `retired`; only the pipeline sets the database `status = verified` (00a D4). |
| `evidence_kind` | `photo`, `video`, `log`, `scope_capture`, `measurement`, `repo`, `note` |
| `evidence_status` | `submitted`, `auto_verified`, `needs_review`, `accepted`, `rejected`. Allowed flow: `submitted → auto_verified | needs_review | rejected`, `auto_verified → accepted` (automatic unless the step requires review), `needs_review → accepted | rejected`. |
| `hint_level` | `smallint` domain restricted to 0–4 (not a Postgres enum): `0` none, `1` nudge, `2` conceptual hint, `3` worked step, `4` reveal solution (ends credit for that attempt) |
| `experiment_arm` | `control`, `treatment` (labels; named conditions of within-user experiments map onto them through `experiments.design`). The `control` arm is an **active control**: static syllabus order, blocked practice, fixed review schedule, no tutor chat, same content and time (00a D7). |
| `grade.status` | `graded`, `invalid_input`, `pending_review`, `error` (key inside `attempts.grade`; mirrored in column `attempts.grade_status`). `score` and `correct` are null unless `status = graded` (00a D2). |
| `pool` | `practice`, `assessment`, `transfer` (`item_templates.pool`, default `practice`) |
| `assessment_kind` | nullable text on `session_tasks` and `attempts`: `diagnostic`, `module_end`, `periodic`, `delayed`, `transfer` |
| `skill_state.source` | `learned`, `placement` |

## 6. Core entities (table names and key columns; the data-model document may add columns, never rename these)

`schemas/schema.sql` and `04-data-model.md` give types, constraints and RLS. The columns below are the contract; the ones marked (v1.1) were added by 00a section C.

| Table | Key columns |
|---|---|
| `profiles` | `id`, `display_name`, `timezone`, `weekly_minutes_target`, `created_at`; (v1.1) `consents` (jsonb: version, timestamps, research flag), `bedtime_local` (nullable time), `reminder_prefs` (jsonb; this replaces any separate notification-preferences table), `onboarded_at` |
| `modules` (v1.1) | `key`, `node`, `title`, `order_index`, `description` |
| `skills` | `key`, `node`, `module` (references `modules.key`), `title`, `description`, `tier_target`, `est_minutes`, `license`, `source`, `status`; (v1.1) `task_kinds` (`task_kind[]`), `grader_types` (`grader_type[]`), `phone_suitable` (boolean), `confusable_set` (nullable text) |
| `skill_edges` | `from_skill_key` (prerequisite), `to_skill_key`, `strength`, `min_tier` |
| `item_templates` | `key`, `skill_key`, `task_kind`, `grader_type`, `difficulty_prior`, `version`, `status`, `body` (jsonb); one row per `(key, version)`; (v1.1) `pool` (`practice`, `assessment`, `transfer`; default `practice`), `interleave` (boolean), `reference_time_s` (integer), `mastery_eligible` (boolean, default true; false for uncalibrated `rubric_llm`), plus the live-difficulty columns listed in 06 §2. `difficulty_prior` is a float in (0,1): 0 trivial, 1 very hard; Elo conversion `1500 + 400*log10(d/(1-d))`, owned by 06 |
| `items` | `id`, `template_key`, `seed`, `params`, `rendered`, `verification_report`, `status`, `difficulty_est`; (v1.1) `template_version` |
| `attempts` | `id`, `user_id`, `item_id`, `session_id`, `started_at`, `submitted_at`, `response`, `grade` (jsonb: `status`, `score`, `correct`, `graders`, plus the keys listed in 08), `hints_used`, `max_hint_level`, `latency_ms`, `confidence` (1–5), `unaided` (bool); (v1.1) `grade_status` (mirror of `grade.status`), `assessment_kind` (text), `active_ms` (integer), plus the scheduler columns listed in 06 §2 |
| `skill_state` | `user_id`, `skill_key`, `mastery_state`, `elo`, FSRS card fields (`stability`, `difficulty`, `due`, `last_review`, `reps`, `lapses`, `fsrs_state`), `tier_attained` (nullable); (v1.1) `fsrs_model` (text, default `'fsrs-6'`), `fsrs_extra` (jsonb), `source` (`learned`, `placement`), plus the columns listed in 06 §2 |
| `review_log` | `id`, `user_id`, `skill_key`, `attempt_id`, `rating`, `reviewed_at`, `elapsed_days`, `scheduled_days`; (v1.1) the extra columns in 06 §2 |
| `sessions` | `id`, `user_id`, `session_type`, `context`, `planned_min`, `actual_min`, `started_at`, `ended_at`; (v1.1) `graph_version` (text), plus the columns in 06 §2 |
| `session_tasks` | `id`, `session_id`, `position`, `task_kind`, `skill_key`, `item_id`, `status`; (v1.1) denormalised `user_id`, `assessment_kind` (text) |
| `weekly_plans`, `plan_slots` (v1.1) | weekly plan per user; slot per planned session (`session_type`, `planned_min`, `context`, `status` in planned, done, missed, moved); columns per 06 and 09 |
| `checkpoints` (v1.1) | `id`, `user_id`, `scope` (module or global), `module`, `scheduled_for`, `completed_at`, status |
| `projects` | `key`, `title`, `ladder_level`, `tier_gate`, `est_hours`, `bom` (jsonb), `status`; (v1.1) `spec` (jsonb) |
| `project_steps` | `key`, `project_key`, `position`, `title`, `est_min`, `session_type`, `skill_keys`, `evidence_required` (`evidence_kind[]`) |
| `user_projects` | `id`, `user_id`, `project_key`, `status`, `started_at`, `completed_at`; (v1.1) `bench_state` (jsonb) |
| `project_evidence` | `id`, `user_project_id`, `step_key`, `evidence_kind`, `storage_path`, `verification` (jsonb), `evidence_status`; (v1.1) denormalised `user_id`. Allowed upload types include `video/quicktime` |
| `evidence_challenges`, `project_grants` (v1.1) | nonce challenges for evidence; the project-credit ledger (§7.15) |
| `tutor_threads` / `tutor_messages` | thread: `id`, `user_id`, `item_id`, `skill_key`; message: `thread_id`, `role`, `content`, `hint_level`, `policy_flags` (jsonb; keys per 08 §8.2); (v1.1) denormalised `user_id` on messages |
| `experiments` / `experiment_assignments` | experiment: `key`, `description`, `started_at`; (v1.1) `design` (jsonb), `status`, `ended_at`, `preregistration_ref`; assignment: `experiment_key`, `user_id`, `arm`; (v1.1) `unit_type`, `unit_key`, `assigned_at`, `block_index`, `rng_seed`, unique on (`experiment_key`, `user_id`, `unit_type`, `unit_key`) |
| `analysis_exclusions` (v1.1) | `id`, `experiment_key`, `user_id`, `unit_key`, `reason`, `decided_by`, `decided_at` |
| `events` | `id`, `user_id`, `name`, `props` (jsonb), `at`; (v1.1) `graph_version` (text). Event names and props keys are those of the catalogue in document 11 (normative) |
| `jobs` | `id`, `kind`, `payload`, `status`, `attempts`, `locked_at`, `result`, `error`, `created_at`; `status` and `kind` values follow document 03 and 07 |
| Operational tables (v1.1) | `cohorts`, `admin_users`, `item_secrets` (answer keys, hidden tests, reference solutions; server-only), `idempotency_keys`, `content_sync_runs`, `llm_calls`, `push_subscriptions`, `privacy_requests`, `item_reports` (learner error reports, each also logged as an `events` row), `app_private.rate_limits`, and `app_private.worker_heartbeat` (00a I3) |

**Derived, not stored (v1.2):** `needs_applied` (a `reviewing` skill whose only unmet mastery condition is the applied attempt, §7.5) is computed at read time from the attempt log by the same function that evaluates the mastery rule (`mastery_rule(...).checks`), so `skill_state` gets **no column** for it. Likewise `tier_attained` for display is never changed by the placement grace (§7.1). The packer receives the flag as an input field of its skill-state snapshot (06 section 7.4). `skills.confusable_set` is optional text; interleaving only ever mixes skills of one module that share a tag.

All user-owned tables have `user_id` and Row Level Security enabled. Answer keys, hidden tests, `items.params`, `items.verification_report` and `item_templates.body` are **not readable by learner roles**; `items.rendered` is client-safe. A separate `notification_prefs` table was rejected (00a section C): reminder settings live in `profiles.reminder_prefs`. Hint levels are a 0–4 `smallint` domain, not an enum.

## 7. Core behaviours that all documents must agree on

Document 06 is canonical for the numeric detail of items 1–7, 12, 16 and 17 (00a B3, section G). Where this section states a rule in one line, 06 gives the function, parameters and test vectors.

1. **Frontier:** a skill is *available* when every `hard` prerequisite edge into it is satisfied: the prerequisite is `mastered` (regardless of current retrievability; it decays to `decayed` below 0.70) or `reviewing` with retrievability ≥ 0.8 (≥ 0.7 for a skill already in progress), **and** the prerequisite's `tier_attained` meets the edge's `min_tier` (`min_tier = null` means no tier requirement; `tier_attained` is nullable and null fails any non-null `min_tier`). `soft` prerequisites only influence ordering and never gate. **Placement grace (00a B6, G1):** a diagnostic-placement card (`skill_state.source = placement`) in `reviewing` that has had no verification review gets a 14-day grace on the frontier test (§7.12). During the grace the card satisfies the retrievability test regardless of R **and** counts as tier L1 for the `min_tier` test, so it satisfies edges with `min_tier` null, L0 or L1 (not L2). This relaxation applies **to the frontier test only**: it never sets `mastered`, `tier_attained` stays at most L0 for display and credit, and the grace ends early if a `verify` retrieval fails (and normally at the first successful verification, when the ordinary tests take over).
2. **Task selection priority** in a session: an **overdue** checkpoint (≥ 14 days) is reserved first; then (a) due FSRS reviews, plus cheap `verify` retrievals of diagnostic-inferred skills ranked with them, capped at 70% of the time budget unless the backlog flag is set; (b) the continuation of any in-progress skill, where a `reviewing` skill with `needs_applied` (§7.5, G2) counts as in progress: the packer gives it one `problem` per session ahead of new skills, at most 1 in a micro session and 3 in a focus session, ranked by the number of hard dependents it unblocks (this is a reading of (b), not a new priority class); (c) new frontier skills; (d) interleaved practice among confusable skills of the same module; (e) a checkpoint that is due but not overdue. Cross-discipline interleaving appears only in capstone `project_step` and `checkpoint` tasks. Beginners start blocked within a skill, then interleave within a module.
3. **Learning loop for a new skill:** `worked_example` → `faded_problem` (one, or two in focus blocks) → same-day `retrieval` → FSRS-scheduled reviews using **freshly generated item variants** (new seed each time). There is **one `review_log` row per skill per session** and at most one per local day.
4. **Target retention** (`desired_retention`, FSRS) is **0.85 for the learner's first 8 weeks**; after week 8 it becomes 0.90 only if the calibration monitor shows observed minus predicted recall within 0.07, otherwise it stays at 0.85 (00a G5; configurable, range 0.80–0.95). The FSRS model is pinned to **FSRS-6** behind one adapter file (§3).
5. **Mastery.** *Correct* means `score >= 0.8`. *Unaided* means `max_hint_level <= 1` and the solution was not revealed (level 4); checkpoints expose no hint UI at all (§7.14 defines the stricter evaluation term). A *qualifying attempt* is a review-eligible, correct, unaided attempt from a verified item whose tier is at least the skill's `tier_target`. A skill is **mastered** when, within the current mastery epoch, all hold: (1) at least 3 qualifying attempts; (2) on at least 2 distinct local days, **and the first and last qualifying attempts are at least 2 learner-local calendar days apart** (`mastery_min_span_days`, default 2; 00a G3); (3) across at least 2 distinct item variants, **drawn from at least 2 distinct verified templates when the skill has two or more verified templates** (00a G3); (4) the last two graded unaided attempts are not failures (score ≥ 0.5); (5) at least one qualifying attempt is constructed-response (not `multiple_choice`) when such a verified template exists; (6) for skills at `tier_target` L1 or above, at least one qualifying attempt is applied (`problem`, `debug_case`, `checkpoint`) when such a template exists. `reviewing` means at least 2 qualifying attempts on 2 days with the rule not yet met; **`needs_applied`** is true for a `reviewing` skill whose only unmet mastery condition is (6), the applied attempt (00a G2; derived at read time, §6); `decayed` means previously mastered and (retrievability < 0.70 or last rating 1). `tier_attained` is computed per 06 §4.6: L0 when conditions 1–5 hold counting attempts on items of any tier, L1 when the full rule holds at tier L1, L2 needs a qualifying checkpoint attempt and a 14-day span, L3 only by `human_review`.
6. **Session builder** takes `available_minutes`, `context`, and `session_type` and returns an ordered task list whose estimated total fits the time. Micro sessions use only tasks tagged phone-suitable. A window of 21–44 minutes is served as one micro session optionally chained to a second micro session; no session type exists for it (§5). **Lab fallback (00a G4):** a `lab` slot for which no project step is eligible (none fits the slot, or none is unlocked) is served as a `focus` session of practice tasks capped at 120 minutes: the `plan_slots` row keeps `session_type = lab`, the `sessions` row is `focus`. A lab slot with an eligible step is unchanged (steps, then at most `min(10, 10% of budget)` minutes of reviews).
7. **Unaided checkpoint:** a no-tutor, no-hints set of tasks at the end of each module (module checkpoint when ≥ 80% of the module's in-target skills are `reviewing` or `mastered`) and at least every 14 days (global checkpoint, due from day 12, overdue at day 14). Its results feed the evaluation plan and detect over-reliance on the tutor.
8. **Verification gate:** no generated item is served unless it has `status = verified` (automatic verifier agreed with an independent recomputation) or it is explicitly `needs_human_review` and shown only to the founder. Open-ended rubric grading is never the sole grader for correctness of a numeric or code answer.
9. **Tutor policy:** attempt-first (the tutor refuses to give hints before the learner submits at least one attempt or states what they tried), a hint ladder 1→4, reference solution pre-loaded in the tutor context, no answer dumping, every message logged with `hint_level`.
10. **Offline:** the PWA caches the next 24 hours of due micro tasks and answers locally. Offline packs may carry numeric and multiple-choice answer keys (never code tests, SPICE references, rubric references or other hidden material); local grading is provisional and an offline attempt counts toward mastery only **after server verification** on sync.
11. **Grade status gate:** the scheduler ignores any attempt whose `grade.status` is not `graded` (`invalid_input`, `pending_review`, `error`). `rubric_llm` grades are not mastery-eligible until the rubric is calibrated: `item_templates.mastery_eligible` is false for uncalibrated `rubric_llm` templates and the scheduler reads `grade.mastery_eligible`.
12. **Diagnostic placement:** a diagnostic gives provisional credit only and never sets `mastered`. Placement and inference write `skill_state.source = placement`; a placement card in `reviewing` has the 14-day grace of item 1 on the frontier test (retrievability and, up to L1, `min_tier`); inferred skills are re-checked by cheap `verify` retrievals ranked with due reviews. **Design (00a G7):** constructed-response items only (no multiple choice, a validator rule for diagnostic items), about 2.5 minutes an item, at most 20 items in **at most two sittings of 25 minutes each** (a sitting ends at 25 minutes or 10 items, the second sitting resumes the unresolved set at least a day later), a visible "I don't know" button, stored as `focus` sessions whose tasks have `task_kind = 'diagnostic'`; documents 05 §11 and 06 §5.5 describe the same algorithm.
13. **Tier and module attainment (derived, not stored at node level):** a node is "L1 working" for display only when ≥ 90% of its skills with `tier_target ≤ L1` have `tier_attained ≥ L1` and its L1 gate project has all required `project_evidence` at `accepted`; anything less is shown as a count.
14. **Strict-unaided (evaluation only):** `attempts.unaided` is the scheduler's definition (point 5). For outcome measures the evaluation plan uses **strict-unaided**: `max_hint_level = 0` and no tutor panel opened for the item, derived in the view `v_attempts_strict_unaided`. Document 11 uses that term for its outcomes; the plain word "unaided" always means the scheduler definition.
15. **Project credit:** completing a verified project step gives L0 credit immediately and **pending** L1+ credit. Pending credit becomes real only after the step's evidence is `accepted` (ledger in `project_grants`). Project credit counts only toward the "applied" condition of the mastery rule (point 5, condition 6) and the module-level L1 condition (point 13). **No project grants L2 or L3.**
16. **Rating latency rows (00a G5):** in the rating map the latency rows (a correct answer slower than 2.0 times the expected time is Hard; Easy needs a ratio at most 0.6) are ignored for a template until it has at least **20 observations** (`latency_min_obs`); until then the caller logs the ratio and the other rows decide, so Easy is not available. Only the latency rows are gated: score, hint level and the other rows apply from the first attempt.
17. **Tutor over-reliance trigger (00a G6, thresholds [P]):** per node, if strict-unaided checkpoint accuracy trails the accuracy of aided attempts on the same skills by more than 0.15, pooled over the last two checkpoints and with at least 10 attempts on each side, the tutor switches to post-attempt-only for that node (it answers only after the learner has submitted an attempt for the item at hand and offers no pre-attempt hints). The rule is re-evaluated at each checkpoint, so the restriction lifts by itself when the gap closes. The hint-share metric of 06 section 9 stays as an earlier warning.
18. **Graph integrity (00a G9):** the validator checks every edge, hard and soft, against module order; a backward edge is legal only if it is whitelisted with a reason in the graph file (`module_order_exceptions`). `confusable_set` tags group skills of one module; a skill without a tag is never interleaved.

## 8. Claims and language policy

The UI, marketing copy, docs and prompts must **never** claim or imply: neuroplasticity "surge windows" or critical periods, targeted memory replay or sleep-cueing, neurostimulation, "2 sigma" results, the "85% rule" as a proven human learning law, 90-minute brain cycles, "top 1%" or "mastery of all disciplines", or "novices beat experts in 16 weeks". No emotion inference, biometric or neural data in v1. No medical or health claims. Describe the app as *adaptive practice with spaced retrieval, graded feedback and guided builds*.

## 9. MVP scope (vertical slice)

**In:** `math` essentials (algebra review, trig, complex numbers, calculus basics, vectors and matrices, basic probability), `elec` (DC circuits, measurement with SPICE, RC filters, transistors and regulators, digital logic), `sw` (C basics, git/Linux basics, state machines), embedded firmware topics (GPIO, ADC, interrupts, debouncing, I2C, UART) placed in `sw`/`elec` modules as appropriate, and the **capstone project**: a sensor board that logs and filters data (project ladder L0–L4 for the early milestones; L5, the first KiCad board, is fully specified in this package but is the last item built, milestone M5). Session builder, FSRS, frontier selection, tutor, execution grading (numeric, symbolic, code tests, ngspice), evidence upload and review, unaided checkpoints, the experiment framework (assignment and logging only; this includes delayed-test scheduling and a CSV analysis export, which the evaluation plan needs).

Module `elec.opamp` is exempt in v1 from the rule "every module has a project step" (its applied evidence comes from checkpoints). **Planning rate (00a G8):** documents quote **5–7 new skills per week** for the founder at about 8 hours a week (never 20). The graph's `est_minutes` is the learner time from first exposure to first mastery (about 28.5 minutes for one practice problem in a focus session on the builder's own costs, 06 section 7.2), so 5–7 new skills use 140–200 minutes of an average 252 usable non-lab minutes, the rest going to reviews and checkpoints; the planning figure is a model output [inf] to be replaced by the orientation sessions. MVP planning-hour figures stay explicitly unvalidated: the graph's core hours are a first-pass minutes total, the planning multiplier is 2.5×, and the L1-per-node estimate of 150–300 h stands; no document may promise L1 across all three slice nodes inside a short window.

**Out of v1 (shipped product):** curriculum beyond the first walk (stub nodes remain placeholders until promoted); payments, social features, native apps, VR/AR, biometrics, multi-agent tutors, **automated** CAD/FEA grading, public marketplace, certificates.

**After v1 (planning, not yet binding enums):** the capability tracks in `docs/15-cyber-physical-capability-spine.md` and `content/capability-tracks.yaml` extend the same loop to power, control, mechanical, UAV integration, cloud twin and governance. CAD evidence may use checklist + human review before any automated CAD grader exists. Weapon, munitions and EW design enablement stay out of content (PRD NG-06).

## 10. Quality and non-functional targets

- Grading latency p95: numeric/symbolic < 2 s; code tests < 20 s; SPICE < 20 s; KiCad ERC/DRC < 60 s; rubric LLM < 30 s.
- A micro session must start within 1 s of opening on a warm PWA and work fully offline for cached tasks.
- Every verified item stores its `verification_report` so any wrong item can be traced and retired.
- Accessibility: WCAG 2.2 AA for core flows; math has text alternatives.
- Privacy: collect the minimum; export and delete-my-data supported; no third-party trackers.
- Security: learner roles can never read answer keys, hidden tests or unreleased item material (§6).

## 11. Licensing rules for content

Original content or content licensed for commercial reuse only. MIT OpenCourseWare is CC BY-NC-SA and must not be copied into the product; OpenStax is treated as CC BY-NC-SA too: **link out only**, no reuse in the product (00a G10); PhET HTML simulations published before 29 March 2026 are CC BY 4.0 (attribution and logo retained). Every skill and template records `license` and `source`.

## 12. Open questions the founder still owns

Jurisdiction and data-residency, monetization, hardware starter-kit bill of materials, whether credentials will ever be issued, beta cohort size and recruitment, and which spine to deepen after the vertical slice.

## 13. Document index

| No. | Document |
|---|---|
| 00 | `00-contract.md` — this contract (v1.2) |
| 00a | `00a-change-decisions.md` — ratified decisions on contract change requests, sections A–F (v1.1) and G (review pass); binding, wins on conflict |
| 00b | `00b-consistency-report.md` — cross-document checks, remaining mismatches, unverified claims |
| 00c | `00c-route-rename-map.md` — API route rename map (history; written by the schema integrator) |
| 00d | `00d-lean-slice-plan.md` — the lean slice plan and the recommended path (Phase −1, lean slice, deferred groups D1–D9; G18) |
| 00e | `00e-verification-log.md` — verification log of platform and licence facts (G10–G14); `00e-founder-operating-rules.md` — founder dark-factory process (planning) |
| 00f | `00f-design-review.md` — independent design review of the learning engine, with the resolution of each finding |
| 01 | `01-PRD.md` — product requirements |
| 02 | `02-learning-science-spec.md` |
| 03 | `03-architecture.md` |
| 04 | `04-data-model.md` (with `schemas/schema.sql`) |
| 05 | `05-skill-graph-and-curriculum-spec.md` |
| 06 | `06-learner-model-and-scheduler-spec.md` |
| 07 | `07-content-pipeline-and-verification-spec.md` |
| 08 | `08-grading-and-tutor-spec.md` |
| 09 | `09-ux-and-flows.md` |
| 10 | `10-build-projects-and-verification-spec.md` |
| 11 | `11-evaluation-and-experiment-plan.md` |
| 12 | `12-security-privacy-compliance.md` |
| 13 | `13-roadmap-and-backlog.md` — roadmap and backlog narrative (the task list itself is `backlog/backlog.yaml`) |
| 14 | `14-risk-register.md` — risk register |
| 15 | `15-cyber-physical-capability-spine.md` — long-term tracks, ladder L6–L13, spine acceptance criteria (planning) |
| 16 | `16-capability-outcomes.md` — credible outcomes after the full spine (planning) |
| 17 | `17-hardware-tools-and-bom.md` — phased hardware, tools and buying guide (planning) |
| — | `lean-build-gate.md` — automated build: lean tasks only until BL-0181 (planning) |
| — | `factory-wave-manifest.md` — lean build waves and green commands (planning) |
| — | `content-authoring-runbook.md` — template G0–G3 and factory content rules (planning) |
| — | `content-population-roadmap.md` — template counts and lean skill slice (planning) |
| — | `CHANGELOG.md` — go/no-go and scope-down decisions (planning) |
| — | `README.md`, `CLAUDE.md` |
| — | `content/lean-skill-slice.yaml` — BL-0067 skill keys (data) |
| — | `content/REVIEW-LOG.md` — G3 and hand-solve log (data) |
| — | `content/syllabi/` — pillar syllabi T0–T6 (planning curriculum) |
| — | `architecture-index.md` — navigation hub for docs 03–08, 12, schemas, content (planning) |
| — | `spine-promotion-policy.md` — when spine skills enter mvp-skill-graph.yaml (planning) |
| — | `content/templates/` — production problem templates (lean pool BL-0065/0066) |
| — | `content/lean-template-manifest.yaml` — skill → template map for lean slice |
| — | `content/safety/` — project safety briefs (`brief_version` 2026-10-31-1) |

This index is the unnumbered "§F" addition of 00a; it is placed after §12 so that §1–§12 keep their numbers. Reference implementations and validators live in `reference/`; content in `content/`; schemas in `schemas/`.
