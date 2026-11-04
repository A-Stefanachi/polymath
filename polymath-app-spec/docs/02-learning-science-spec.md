# 02 — Learning-science specification and traceability

Status: v1.0, 31 Oct 2026. Binding upstream: `00-contract.md`. Companions: `01-PRD.md` (FR-IDs), `06` (scheduler and learner model; canonical for FSRS, mastery and rating rules), `11-evaluation-and-experiment-plan.md` (hypotheses H1…H12 and experiments EXP-001…EXP-005 and the beta study BETA-001 referenced below; there is no sixth experiment).

## 1. Purpose and how to use this document

This document turns the research reports into engine requirements. For each mechanism it states the evidence and how strong it is, what must be implemented, which parameters ship as defaults and why, what to avoid, and how the evaluation plan will test it. The builder (a solo founder using AI coding agents) should be able to implement each `LS-` requirement as a small task with a test.

Rules of use

1. **Evidence tags** follow the contract: [V] source opened and read; [S] snippet only; [R] recalled and unverified; [P]/[inf] design proposal or inference. Tags are copied from the research reports (`Polymath hardware AI learning app.md`, cited here as **Report A**, and `Frontier learning and government programs.md`, cited as **Report B**) and their notes. Where Report A also uses [B], [C] or [U] (secondary or blog source, low-reliability, unverified belief), they are carried through as written.
2. **Anything tagged [R], [S], [P] or [inf] is a hypothesis for 11 to test.** It must not appear in UI copy as fact (PRD section 11).
3. **Effect sizes** quoted come from lab and classroom studies on researcher-made tests. Report A notes (Kraft 2020 [R]) that such numbers are not comparable to field effects on standardised tests. The planning range for this product is 0.2–0.5 SD [inf, Report B].
4. **Parameters** are listed in the register (section 4) with an ID `PRM-nn`. They are configuration, not code constants, so that experiments in 11 can vary them.
5. **FR-IDs** come from 01. **New LS-IDs** are defined here (section 3).

---

## 2. Traceability table

Columns: mechanism; evidence status and tag (with source section); implementation requirement; parameters and defaults with rationale; what to avoid; how 11 tests it.

| # | Mechanism | Evidence status and tag, with source | Implementation requirement | Parameters and defaults (rationale) | Avoid | Evaluation (11) |
|---|---|---|---|---|---|---|
| M01 | **Spaced retrieval with FSRS, per skill** | Retrieval practice strong in lab and classroom, meta-analytic g about 0.5 [R] (Report A, "Rating the evidence"); practice testing d about 0.74 and distributed practice d about 0.85, surface outcomes, I² about 85% [V] (Report B, Tier A). Spacing strong [R]. FSRS is proven only for *recall prediction*: on about 350M Anki reviews FSRS-6 beat SM-2 on log loss for 99.6% of users, but an RWKV model beat FSRS by a wide margin, and no RCT compares schedulers on learning [V] (Report A) | FR-040, FR-041, FR-042, FR-043, FR-044, LS-001 to LS-005 | PRM-01 target retention 0.90 (contract default; workload versus retention trade-off, not validated for procedural skills [P]); PRM-02 default FSRS weights until ≥ 1,000 of the user's `review_log` rows, then optimise (optimised beat default for 84.3% of collections [V]; the 1,000 threshold is [P]); PRM-03 maximum interval 180 days (keeps delayed tests inside the evaluation horizon [P]) | Claiming FSRS improves learning; treating Anki-tuned parameters as validated for procedural or conceptual skills (Report A); one card per item instead of per skill | H1 (absolute retention and beta contrast), H11 (mastery validity), FSRS calibration check (predicted vs observed recall), EXP-001 |
| M02 | **Worked example → faded problem → retrieval loop** | Worked examples strong for novices [R], advantage reverses for experts (expertise reversal, Kalyuga 2003 [R]); recent worked-example meta-analysis moderate, strongest for novices and math [R, uncertain numbers] (Report A; notes `memory_practice_science.md`). Full-problem retrieval does *not* reliably beat studying worked examples for novices when element interactivity is high [R] (van Gog and Sweller; contested) | FR-030, FR-031, FR-032, FR-034, LS-006 to LS-009 | PRM-04 same-day retrieval after ≥ 10 minutes or ≥ 3 intervening tasks [P]; PRM-05 faded problems: 2 by default (range 1–3), first removes about half the solution steps, then all [R: Renkl, Atkinson fading]; skip allowed for diagnosed experts (FR-034) | Fixed scaffolds for everyone; promising that retrieval of full problems beats examples for novices; retrieval before any worked example for a brand-new skill | H1; EXP-004 (explain-back component); process data on skip rate |
| M03 | **Interleaving within confusable sets** | Moderate and heterogeneous: Hedges g = 0.42 overall, math g = 0.34, words favour blocking (g = −0.39) [V] (Brunmair and Richter 2019, Report A). Optimal dose not established (Report A gaps) | FR-033, LS-010 to LS-014 | PRM-06 entry criterion ≥ 2 correct attempts with `max_hint_level ≤ 1` per skill in the set; PRM-07 set size 3 (range 2–4 [inf]); PRM-08 interleaved share 60% of module practice once eligible [P], with strategy-selection prompts ("which method applies?") | Interleaving across disciplines as a transfer mechanism (no evidence found, Report A); interleaving vocabulary or definitions; interleaving before each type is minimally solid | H4; EXP-002 |
| M04 | **Blocked first for novices** | Inference from cognitive load theory and contextual interference (hurts acquisition, helps retention and transfer; shrinks or reverses for novices on complex tasks) [R]; staging itself "not directly tested as a policy" [inf] (notes `memory_practice_science.md` §3) | FR-033, LS-010, LS-011 | Blocked until PRM-06 is met; then widen to 2–3 types, then to the full module set over sessions [inf] | Interleaving from the first session; treating the staging policy as validated | H4 (blocked is the control arm); descriptive: time to PRM-06 |
| M05 | **Attempt-first, hint-ladder tutor** | Strong short-term: Harvard physics crossover n=194, more than 2x learning in a median 49 vs 75 minutes, tutor moved one step at a time, required attempt first, pre-loaded solutions [V secondary; one university, two topics; effect size not obtained] (Report A, Report B). Bastani PNAS 2025, about 1,000 high-school students: unguarded GPT +48% practice, −17% unaided exam; guardrailed tutor removed the harm but did not add exam gain [V]. 2026 working paper n=2,379, tutor access lowered final grades by 0.37 SD [B, not peer reviewed]. Khanmigo about 0.06–0.08 SD per school year, only 14.5% of messages with a reasoning step [B]. Small Anthropic study, 52 engineers, quiz 50% with AI vs 67% by hand [B, small N, secondary]. Human-in-the-loop designs look safe (Tutor CoPilot about +4 percentage points [V]). Treat Harvard as an upper bound | FR-050, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, LS-060 to LS-066 | PRM-12: attempt or ≥ 20-word statement before level 1; escalate at most one level per learner turn; proactive offer after 2 wrong submissions or 3 minutes idle after an attempt; daily message cap 100 (cost control [P]); reference solution always in context | Free-form chat as the core loop; answer dumping; tutor in checkpoints; relying on the model's own solving for correctness (pre-load verified solution instead); citing "2x learning" | H3; EXP-001 (tutor on/off); SM-04 alarm; BETA-001 secondary |
| M06 | **Unaided checkpoints** | Direct lesson of Bastani: separate practice scores from unaided scores [V]. Digital Tutor and Sirius used retention testing at delay [V] (Report B). Contract 7.7 | FR-070, FR-053, FR-073, LS-030 to LS-034 | PRM-10 at module end and at least every 14 days; 8–12 items, ≤ 25 min; ≥ 50% from skills last practised ≥ 14 days ago; assessment-pool items (CCR-03); PRM-11 delayed tests at 56 days ±7 | Allowing hints or tutor; reusing practiced seeds; reporting practice score as learning | Primary outcome source for H1–H4, H6; OM-01, OM-04 |
| M07 | **Mastery gating** | Plausible; evidence mostly vendor-linked. ALEKS reports median 0.93 probability of learning an outer-fringe item [B, vendor]; Math Academy FIRe fractional credit [vendor]; Kulik 1990: mastery about 0.5 on local tests, near zero on standardised tests [secondary]; Bloom "2 sigma" replication d about 0.52 [secondary] (Report A) | FR-042, FR-011, LS-020 to LS-023 | PRM-09 per 06 (≥ 3 correct unaided, hint level ≤ 1, ≥ 2 days, ≥ 2 variants, contract 7.5); gate on delayed mixed retrieval, bundled with re-testing | Advertising "2 sigma"; gating on a single deep-knowledge-tracing output (Khan: AUC about 0.81, but plateaued after 10–20 responses and shifted when answer order changed [V]) | H11 (does `mastered` predict delayed retention); H2 |
| M08 | **Perceptual-learning drills** | Real in medicine and math in Kellman's lab [S]; IES efficacy trial (about 3,000 sixth graders) exists, no results on the grant page [V]; reported pilot gains unverified [S/R]. No study of circuits, scope traces, code review or logs [inf] (Report B, Tier A and "Perceptual and adaptive learning modules") | FR-035, FR-037, LS-040 to LS-044 | PRM-13: 20–40 trials per block (about 3–5 minutes), 2–8 categories, varied instances, contrasting near-misses, accuracy ≥ 0.90 and median response time within an expert reference to retire a category [P]; 1–2 blocks per week | Promising gains; using drills for conceptual reasoning; showing the same rendered instance twice in a block | H5; EXP-003 |
| M09 | **Pre-sleep review (optional)** | Sleeping after study helps consolidation (Diekelmann and Born 2010 [R]); a Uni Bern press release shows sleep-time audio does not substitute for study [V press release] (Report B, "Sleep as scheduling"). Whether an evening review helps *this* learner is unknown [inf] | FR-026, LS-050, LS-051 | PRM-16: ≤ 8 items (about 5 minutes) offered 30–120 minutes before the user's bedtime; morning recall of the same skills at a user-chosen time (default 08:00) | Any claim of sleep learning, targeted replay or "optimal windows"; using audio during sleep; collecting sleep data | H9 (descriptive only; EXP-005 is low-powered by design) |
| M10 | **Session length limits and activity switching** | Weak: no RCT on optimal session length for a learning app; vigilance decrement with brief breaks helping, small lab samples [R] (Ariga and Lleras 2011); 20–45 minutes with breaks is "defensible but not RCT-derived"; 90-minute ultradian cycles have no evidence (Report A "Session design"; notes `memory_practice_science.md` §7) | FR-021, FR-022, FR-023, FR-024, LS-052 to LS-055 | PRM-14 micro ≤ 20 min; focus 45–120 min with an activity-type switch at least every 30 minutes and a non-blocking break suggestion at 50 minutes; lab 120–240 min with a break suggestion each 60 minutes; PRM-15 new-skill cap 3 per local day (policy choice, not evidence-derived) | Describing session lengths as brain-science-optimal; forcing session end; any "90-minute cycle" wording | H12 (descriptive: accuracy and latency by minute within session); H7 |
| M11 | **Project-based guided building** | Moderate for scaffolded inquiry, thin for builds: unassisted discovery d about −0.38, guided discovery d about +0.30 (Alfieri 2011 [R]); active learning about +0.47 SD, mostly in-class (Freeman 2014 [R]); alternating simulation and hardware (De Jong 2013 [R]). *No causal evidence found for Olin, MIT 2.007 or Arduino curricula* (Report A gaps). Debugging is the highest-value physical moment (notes `handson_transfer_motivation.md`) | FR-080, FR-081, FR-082, FR-083, FR-084, FR-085, FR-037, LS-080 to LS-085 | PRM-20: each ladder step is worked example → faded build → free build; hint ladder withholds answers in debug cases; debrief after each build; evidence assurance ladder (instrumented upload > nonce challenge > timed video > photo [P]) | Pure discovery; citing build projects as evidence-backed; accepting photos alone as proof of a working circuit | H6; BETA-001 secondary; SM-05 |
| M12 | **Calibration and confidence ratings** | Moderate [R]: hypercorrection of confident errors (Butterfield and Metcalfe 2001; Metcalfe 2017 [R]); delayed judgments and retrieval improve calibration [R]. Confidence-weighted answering: no source retrieved (notes `memory_practice_science.md` §8). Calibration-training durability not retrieved | FR-071, FR-072, LS-070 to LS-073 | PRM-17 scale 1–5 captured before feedback (contract); bands low 1–2, mid 3, high 4–5; confident error = incorrect with confidence ≥ 4; schedule an extra retrieval of the same skill 24–72 hours later (variant); calibration chart after ≥ 30 rated attempts | "Dunning-Kruger" wording; presenting calibration as a validated skill gain; using confidence to change mastery directly | H8; OM-08 |
| M13 | **Explain-back (self-explanation / teach-back)** | Self-explanation d about 0.55 (Bisra 2018 [R]); teach-back as retrieval, "not a separate magic effect" [P] (notes `memory_practice_science.md` §8) | FR-032, FR-036, LS-070 | PRM-18: one explain-back per skill at the end of the faded stage; 2–5 sentences; rubric of key points per template; follow-ups generated for missing points | Using the LLM rubric as the sole correctness grader; changing `mastery_state` from explain-back alone | H10; EXP-004 |
| M14 | **Teaching layer: concept primer, then worked-example stepper (00a K)** | Explicit guidance beats discovery for novices: unassisted discovery d about −0.38, guided d about +0.30 (Alfieri 2011 [R], as M11). Worked examples on math performance g = 0.48 over 55 studies, correct examples better than incorrect or mixed; adding self-explanation prompts to examples gave a *negative* effect against examples alone (Barbieri et al. 2023, abstract and secondary summaries [S]); self-explanation in general d about 0.55 (Bisra 2018 [R], as M13). Instructional explanations added to examples: small overall benefit, larger for conceptual than procedural knowledge (Wittwer and Renkl 2010, 21 studies [S]). Pre-training: learners do better on a process when they already know the names and roles of its key parts (Mayer, multimedia principles [S]). Refutation texts against misconceptions: g = 0.41 over 44 comparisons (2021 meta-analysis [S]); a pre-registered 2025 meta-analysis finds a consistent advantage [S]. Subgoal-labelled worked examples improve transfer in statistics and programming (Catrambone 1998; Margulieux and colleagues [S], mostly conference papers). DC-circuit misconceptions (for example a battery as a constant-current source) survive conventional teaching; analogies help but import their own misconceptions (small studies [S]). Four-component instructional design d about 0.79, best in higher education (Costa et al. 2022 [S]) | LS-096 to LS-101; FR-030, FR-032 | PRM-21: primer at most 3 screens of at most 150 words, 1–2 ungraded checks, recap at most 60 words, within the 4.0-minute `worked_example` estimate (00a K11) [P]; step labels required from 4 steps (00a K5) [P] | Long reading before practice; decoration inside lessons; mandatory typed self-explanation; lessons written by an LLM at run time; presenting any effect size above as expected for this learner | Descriptive (n = 1): first faded-problem and same-day retrieval accuracy, hint use and stuck rate (06 section 10.3) for skills before and after their primer is verified; `lesson_viewed` skip rate |

Supplementary mechanisms that also constrain the design

| # | Mechanism | Evidence status | Requirement | Avoid | Evaluation |
|---|---|---|---|---|---|
| S01 | Difficulty governor (soft success-rate band) | Weak for humans. The "85% rule" derives only from simulations of binary-classifiers, no human data, optimum shifts to about 75–82% under noise [V] (Wilson 2019, Report A). The 70–85% band is a design heuristic, not RCT-derived [P] | LS-090, PRM-19 | Calling 85% a proven law; applying a band to open-ended builds | Descriptive: success rate by condition; not hypothesis-tested |
| S02 | Motivation by competence feedback and visible build progress | Mixed [R]: self-determination theory; leaderboards/badges lowered motivation and exam scores (Hanus and Fox [R]); no credible causal evidence for streaks was found [inf: absence in Report A, not a refuting study]; MOOC completion is typically in the low single digits to teens (Jordan 2014 [R]), so adherence is a first-order risk and not a solved problem (see 00f F-10) | LS-091, FR-090 (no streaks, ranks, badges, points) | Leaderboards, badges, streak pressure, loss-aversion copy | SM-01, SM-02 adherence; H7 |
| S03 | Prerequisite diagnostic before productive failure | Productive failure moderate and conditional, requires baseline knowledge; about g = 0.36 conceptual, none procedural [R] | Deferred (not in M0–M5). If added, it must be gated by a prerequisite diagnostic and followed by consolidation (LS-092) | Using it for absolute beginners | Out of scope for 11 until added |
| S04 | Process lessons from the DARPA Digital Tutor | Promising, unreplicated, sponsor-run, 12 per group; features were credited by developers and not tested by ablation [V] (Report A, Report B) | LS-093: expert-authored debug cases (recorded as templates), no early finish for faster learners (offer harder items), human escalation path (FR-056, reviewer queue) | Citing "novices beat experts in 16 weeks" | Descriptive only |
| S05 | Deterministic grading before any LLM | LLM graders failed on unit conversion, equivalent numeric forms and alternate methods (GPT-4o on 283 circuit solutions: 74.71% fully correct baseline; 97.70% on 87 solutions after prompt engineering [B, one course]); rubric LLM mid-level responses collapsed with a full-credit exemplar [B, very small N] | LS-094; FR-061, FR-065 | LLM as sole correctness judge for numeric or code items | OM-09 and the grader audit in 11 section 4 |

---

## 3. Learning-science requirements (LS-IDs)

Each requirement is testable. "Verify by" names the test type. FR references point to 01.

### 3.1 Spaced retrieval and the learning loop (M01, M02)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-001 | One FSRS card state exists per (`user_id`, `skill_key`), never per item. Every graded attempt for the skill that qualifies as a review (06) updates it | FR-040 | Unit test: two different items of one skill produce one `skill_state` row and sequential `review_log` rows |
| LS-002 | Each review uses an item whose (`template_key`, `seed`) has not been served to the user before; if the template's parameter space is exhausted, the builder escalates to a sibling template or marks the skill `needs_human_review` for content | FR-031 | Property test with 200 sequential reviews: no duplicate (`template_key`, `seed`) |
| LS-003 | Target retention is read from configuration per user (PRM-01), validated to 0.80–0.95 | FR-040 | Unit test on boundary values |
| LS-004 | Every attempt records `latency_ms`, `confidence`, `hints_used`, `max_hint_level`, `unaided` so that a different scheduler can be fitted later | FR-110 | Schema test: non-null rules per `task_kind` |
| LS-005 | The scheduler never produces an interval above PRM-03 (180 days) | FR-040 | Unit test |
| LS-006 | After a skill's first `faded_problem` is completed, a `retrieval` task for that skill is queued for the same local day, not earlier than PRM-04 (10 minutes or 3 intervening tasks) after the faded problem; if the session ends first it carries to the next session that day, else it is the first task of the next day. **Known conflict with 06:** the packer of 06 section 7.4 always puts the same-day retrieval last, so in a micro session containing only one new chunk it follows the faded problem with 0 intervening tasks; PRM-04 is therefore a target the builder does not enforce today (00f F-12). 06 is canonical where they differ | FR-030 | Playwright: simulated day with early session end |
| LS-007 | A new skill starts with a `worked_example` unless FR-034 skip conditions are met; the number of `faded_problem` tasks is PRM-05 (default 2); the first fading removes about half the solution steps and the last removes all. **Fade positions are fixed by 00a K3:** templates with 2 or 3 steps hide the last step; from 4 steps the first faded problem hides the second half and the second hides all but the first step | FR-030, FR-034 | Serve test: `worked_steps` length per template step count and faded position (00a K3) |
| LS-008 | A `worked_example` is never graded; the self-explanation prompt is stored but not graded for correctness | FR-032 | Test that no `grade` is written for `worked_example` |
| LS-009 | Expertise reversal: if the learner answers the first problem unaided and correctly, subsequent worked examples for that skill are optional; if they fail two faded problems in a row, the system returns one step toward more support (a worked example variant) | FR-034 | Simulation test of learner trajectories |

### 3.2 Blocked then interleaved (M03, M04)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-010 | Skills are blocked (same skill repeated) until PRM-06 is met for each skill in a confusable set; only then are they eligible for interleaving | FR-033 | Unit test of eligibility function |
| LS-011 | Confusable sets are explicit in content (`confusable_set` id on skills, 2–4 skills, same module) and are never inferred at runtime | FR-033, FR-010 | Sync validation: set size, same module |
| LS-012 | In an interleaved practice block the items are drawn from the set so that no skill appears twice consecutively unless the set has one eligible skill; each item includes a strategy-selection prompt ("Which method applies and why?") before the answer box on at least the first 6 interleaved items of a set | FR-033 | Unit test of ordering; Playwright check of prompt |
| LS-013 | Templates flagged `interleave: false` (definitions, vocabulary, notation) are excluded from interleaved blocks | FR-033 | Sync validation and builder test |
| LS-014 | Cross-discipline mixing only occurs in capstone `project_step` and `checkpoint` tasks. No ordinary session may combine skills from different nodes inside one interleaved block | FR-033 | Builder property test |

### 3.3 Mastery gating (M07)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-020 | `mastered` is set only by the rule in 06 (contract 7.5), never by a diagnostic alone and never by explain-back | FR-042, FR-003 | State-machine test |
| LS-021 | Gating decisions use the explainable Elo/IRT-lite learner model plus the rule; no black-box output may change `mastery_state` | FR-042 | Code review checklist; model card |
| LS-022 | A `decayed` skill removes its dependants from the frontier until it returns to `reviewing` | FR-044, FR-011 | Frontier test |
| LS-023 | The app displays why a state was assigned (rule, counts, dates) | FR-042, FR-013 | UI test |

### 3.4 Unaided checkpoints and delayed tests (M06)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-030 | Checkpoints and delayed tests render no tutor control and tutor API calls for those items return 403. The app does not try to block outside lookup; integrity relies on telling the learner the purpose (it shows what they can do alone) and on never using a single checkpoint result to gate progress beyond the rule in 06 | FR-053, FR-070 | Playwright and API test |
| LS-031 | Checkpoint items come from `pool = assessment` (00a section C) and use seeds never served in practice | FR-070 | DB query test |
| LS-032 | A checkpoint is scheduled at module end and when 14 days have passed since the last checkpoint; a checkpoint contains 8–12 items and is estimated ≤ 25 minutes; at least half the items come from skills last practised ≥ 14 days earlier | FR-070 | Builder test |
| LS-033 | Delayed tests are scheduled 56 days (±7) after a skill is first `mastered`, or after day 28 of exposure if mastery has not occurred (needed for experiments, see 11) | FR-073 | Scheduler test with time travel |
| LS-034 | Each checkpoint and delayed attempt stores `unaided = true`, `max_hint_level = 0`, `confidence`, and the assessment kind (00a section C); such attempts are strict-unaided by construction (no hint UI, no tutor) and appear in the view `v_attempts_strict_unaided` (00a B1) | FR-070, FR-073 | Schema test |

### 3.5 Perceptual-learning drills (M08)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-040 | A perceptual template declares ≥ 2 categories, an instance generator (rendered scope traces, schematic fragments, waveform snippets, log excerpts), and near-miss pairs between categories | FR-035 | Sync validation |
| LS-041 | A drill block has 20–40 trials, categories interleaved, immediate feedback after each trial, and records accuracy and response time per trial | FR-035 | Unit and Playwright tests |
| LS-042 | Within a block no rendered instance is repeated; across blocks the generator varies noise, scale and component values | FR-035 | Property test |
| LS-043 | A category is retired from the drill when accuracy ≥ 0.90 and median response time is within the template's reference time across two blocks on different days; it is rescheduled by FSRS like any skill | FR-035, FR-040 | Scheduler test |
| LS-044 | Drill performance is logged separately (`task_kind = perceptual_drill`) and counts toward mastery only if the template declares so | FR-035 | Test |

### 3.6 Session design and sleep scheduling (M09, M10)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-050 | The optional evening review contains ≤ 8 items from skills touched that day and is offered 30–120 minutes before the stored bedtime; the morning recall uses fresh variants of the same skills | FR-026 | Scheduler test |
| LS-051 | No sleep, wake or physiology data is collected; only a user-entered bedtime and reminder time are stored | FR-026, NFR-05 | Data inventory test |
| LS-052 | A focus session plan contains at least two task kinds and an activity-type switch at least every 30 minutes | FR-022 | Builder test |
| LS-053 | The default new-skill cap is 3 per local day; reviews are uncapped. **Reconciliation with 06:** 06 section 7.4 caps new skills per *session* (micro 1, focus 3, lab 0), so a day with a micro and a focus session can introduce 4; 06 is canonical and has no per-day counter. The planning rate is 5 to 7 new skills a week (00a G8) and the simulation of 06 section 14 starts 7 to 8 a week, so the daily cap rarely binds | FR-024 | Builder test |
| LS-054 | A micro session plan is ≤ 20 estimated minutes and only phone-suitable tasks | FR-020, FR-021 | Builder test |
| LS-055 | Break suggestions never end a session and are logged as `break_suggested` events | FR-023 | Event test |

### 3.7 Tutor (M05)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-060 | Level 1 hints are unavailable until the item has at least one submitted attempt or the learner has written ≥ 20 words on what they tried | FR-050 | API test with scripted dialogues |
| LS-067 | Over-reliance response (00a G6, contract 7.17; thresholds [P]): per node, if strict-unaided checkpoint accuracy trails the accuracy of aided attempts on the same skills by more than 0.15 over the last two checkpoints (at least 10 attempts on each side), the tutor switches to post-attempt-only for that node and the switch is re-evaluated at every checkpoint (06 section 9) | FR-050 | Scheduler vectors `reliance-*`; tutor-policy test |
| LS-061 | In `debug_case` tasks the ladder withholds the diagnosis until level 4; levels 1–3 ask for the next measurement or observation | FR-037, FR-051 | Scripted dialogues |
| LS-062 | Level escalation is at most one level per learner turn; level 4 requires explicit confirmation and sets `max_hint_level = 4`, which forces FSRS rating 1 for that attempt | FR-051, FR-041 | API and scheduler tests |
| LS-063 | The tutor prompt contains the verified reference solution and `verification_report` summary; absent either, the tutor is disabled for the item | FR-052 | Prompt assembly test |
| LS-064 | Tutor replies below level 4 are scanned for the final answer and blocked when found; blocked replies are logged with `answer_leak_blocked` | FR-054 | Red-team suite of 50 adversarial prompts; pass criterion ≤ 2 leaks |
| LS-065 | The tutor proactively offers a nudge after 2 wrong submissions or 3 minutes of inactivity after a first attempt | FR-055 | Playwright |
| LS-066 | Prompts are versioned files in the repo, and every tutor message logs `model`, `prompt_version`, `hint_level`, `policy_flags` | FR-051, FR-123 | Schema test |

### 3.8 Metacognition (M12, M13)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-070 | Explain-back is graded by rubric (missing key points listed) and generates follow-up retrieval tasks; it does not change `mastery_state` | FR-036 | State-machine test |
| LS-071 | Confidence (1–5) is captured before feedback for every graded task kind except `worked_example`; skipping is stored as null | FR-071 | Playwright |
| LS-072 | A confident error (incorrect, confidence ≥ 4) triggers an explicit correction screen showing the error against the reference, and schedules one extra variant of the skill 24–72 hours later | FR-071, FR-072 | Scheduler test |
| LS-073 | The calibration view is available after 30 rated attempts and uses neutral wording | FR-072 | Copy lint and UI test |

### 3.9 Projects (M11)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-080 | Each project step follows worked → faded → free build for its new content, declared in the step's YAML | FR-080 | Sync validation |
| LS-081 | A project step may be started only when its linked skills are at least `learning`; the UI warns if a linked skill is not yet `reviewing` | FR-080 | Test |
| LS-082 | After each build step, a debrief with the three prompts (expected, observed, change) is requested | FR-084 | Test |
| LS-083 | Simulation and hardware alternate: each hardware step that has a SPICE twin requires the SPICE result first (predict, simulate, measure) | FR-064, FR-080 | Content lint |
| LS-084 | Evidence for a step has an assurance level (1 instrumented upload, 2 nonce challenge, 3 timed video, 4 photo); steps declared as "verifies a working circuit" must require level ≤ 2 | FR-082 | Sync validation |
| LS-085 | A project completion is credited as `accepted` only after evidence_status = `accepted`; a completed project does not by itself change any skill's mastery | FR-083 | State test |

### 3.10 Cross-cutting constraints

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-090 | The difficulty governor lowers difficulty or offers a worked example after 3 consecutive incorrect drill or review attempts, and raises difficulty after 5 consecutive correct unaided attempts; the target band 0.75–0.90 is documented as a heuristic and is not applied to builds. **Implementation note:** 06 realises the governor through Elo item selection at target success 0.80 (06 section 3.8 and 5.2) and the stuck and trace-back rule (06 section 10.3); the consecutive-count thresholds above are the acceptance behaviour to test, not separate code | FR-020 | Simulation test |
| LS-091 | No leaderboard, badge, points, rank or streak mechanic exists in v1 | FR-090 | Product review; copy lint |
| LS-092 | Productive-failure tasks are not implemented in M0–M5 | none | Backlog item |
| LS-093 | Debug cases are authored from expert troubleshooting transcripts where available; each states the fault set and the measurement sequence an expert would use | FR-037 | Content review |
| LS-094 | Deterministic grading (units, tolerances, equivalence, execution) precedes any LLM step; LLM output is never ground truth for correctness | FR-061, FR-065 | Grader unit tests |
| LS-095 | Every UI string that names a mechanism is cross-checked against this document; no claim exceeds the evidence tag (blocklist in FR-126) | FR-126 | CI |

### 3.11 Teaching layer (M14, 00a K)

| ID | Requirement | Related FR | Verify by |
|---|---|---|---|
| LS-096 | On a skill's first `worked_example` (no graded attempt on the skill yet), the runner shows the skill's verified concept primer before the first step, with a "skip to the example" control on every screen; skills without a verified lesson start at the example | FR-030 | Playwright: primer then stepper; skip lands on step 1 |
| LS-097 | The worked example reveals one step at a time with its label; when the template's steps are labelled, each step asks "What is this step doing?" with that item's step labels as choices, answer shown at once, no penalty; free-text explanation is optional and never graded (LS-008) | FR-032 | Playwright; test that no `grade` is written |
| LS-098 | Solution steps reach the browser only through `getTask` for the caller's own `worked_example` or `faded_problem` task on a `practice`-pool item, and a faded problem never carries its final step (00a K2, K3) | FR-031 | API tests: other user's task 404; `retrieval`, `problem`, `checkpoint`, assessment item and `getItem` carry no `worked_steps` |
| LS-099 | Primer checks are ungraded: they create no `attempts` row, no grade and no `skill_state` or `review_log` change; only `lesson_check_answered` events are written | FR-030 | Integration test: row counts before and after |
| LS-100 | When a graded attempt's `misconception_tags` contains the lesson's `misconception.tag`, the feedback shows the lesson's correct idea and a link to the recap | FR-072 | Playwright with a seeded misconception answer |
| LS-101 | A `worked_example` on a skill that already has a graded attempt (relearning after decay, or a loop restart of 06 section 10.3) shows the `recap` variant: the recap and the misconception's correct idea, not the full primer | FR-044 | API test: `variant` by attempt history |

---

## 4. Parameter register

All values are configuration. "Owner" is the document that is canonical if values conflict.

| ID | Parameter | Default | Range | Rationale and tag | Owner |
|---|---|---|---|---|---|
| PRM-01 | `desired_retention` (`target_retention`) | 0.85 for the first 8 weeks, then 0.90 only if the calibration monitor is within 0.07, else 0.85 (contract 7.4, 00a G5) | 0.80–0.95 | Contract default after the review pass; higher retention costs more reviews. Not validated for procedural skills or fresh variants [P] | 06 |
| PRM-02 | FSRS parameter set | Library defaults until ≥ 1,000 user `review_log` rows, then optimise | n/a | Optimised parameters beat defaults in 84.3% of Anki collections [V]; threshold [P] | 06 |
| PRM-03 | `max_interval_days` | 180 | 60–365 | Keeps skills inside the evaluation horizon [P] | 06 |
| PRM-04 | Same-day retrieval gap | ≥ 10 min or ≥ 3 intervening tasks | 5–60 min | Spacing within a day without leaving the topic cold [P]; not enforced by the 06 packer (LS-006) | 02 / 06 |
| PRM-05 | Faded problems per new skill | 2 | 1–3 | Fading supported for novices [R]; count is [P] | 02 |
| PRM-06 | Interleave entry criterion | ≥ 2 correct with `max_hint_level ≤ 1` per skill | 1–4 | Blocked-first staging [inf] | 02 |
| PRM-07 | Confusable set size | 3 | 2–4 | Dose not established [inf] | 02 |
| PRM-08 | Interleaved share of module practice | 60% | 30–80% | Heuristic [P]; varied in EXP-002 only as arm (blocked vs interleaved), not as dose | 02 |
| PRM-09 | Mastery rule | ≥ 3 correct (score ≥ 0.8) unaided (hints ≤ 1) attempts, ≥ 2 local days with the first and last attempt ≥ 2 calendar days apart, ≥ 2 variants from ≥ 2 distinct templates when the skill has two or more verified templates (00a G3), plus conditions 4–6 of 06 section 4.2 | per 06 | Contract 7.5; successive relearning logic [R] | 06 |
| PRM-10 | Checkpoint cadence and size | Module end and ≤ 14 days; 8–12 items; ≤ 25 min; ≥ 50% from skills last practised ≥ 14 d | 7–28 d | Contract 7.7; sizes [P] | 02 |
| PRM-11 | Delayed test lag | 56 days (±7) | 56–84 | "8+ weeks" in Report B experiment template; Sirius-style retention at 2+ months [V abstract] | 11 |
| PRM-12 | Tutor policy | Attempt or ≥ 20 words first; one level per turn; proactive after 2 wrong or 3 min; 100 messages per day | 10–200/day | Harvard design [V secondary], Bastani guardrails [V]; thresholds [P] | tutor-policy document |
| PRM-13 | Perceptual block | 20–40 trials, 2–8 categories, accuracy ≥ 0.90 and reference RT, 1–2 blocks/week | n/a | Kellman design principles [S]; thresholds [P] | 02 |
| PRM-14 | Session limits | micro ≤ 20 (a 21–44 minute window is one micro session optionally chained to a second, 00a A1); focus 45–120 with switch ≤ 30 min and break suggestion at 50; lab 120–240 with suggestion each 60 | n/a | Weak evidence [R]; logistic rather than physiological rationale | 02 |
| PRM-15 | New-skill cap | 3 per local day | 1–6 | Policy choice, not evidence-derived (notes `memory_practice_science.md` §7) | 06 (per-session caps, LS-053) |
| PRM-16 | Pre-sleep review | ≤ 8 items, 30–120 min before bedtime; morning recall at 08:00 default | n/a | Consolidation literature [R]; parameters [P] | 02 |
| PRM-17 | Confidence | 1–5 before feedback; confident error ≥ 4; extra retrieval 24–72 h | n/a | Hypercorrection [R]; thresholds [P] | 02 |
| PRM-18 | Explain-back | 1 per skill after faded stage; 2–5 sentences | n/a | Self-explanation d about 0.55 [R] | 02 |
| PRM-19 | Success band | 0.75–0.90 soft band | n/a | Heuristic; not the "85% rule" | 02 |
| PRM-20 | Project scaffolding | worked → faded → free per step | n/a | Guided discovery d about +0.30 [R]; builds themselves unevidenced | 02 |
| PRM-21 | Concept primer size | ≤ 3 screens of ≤ 150 words, 1–2 ungraded checks, recap ≤ 60 words, inside the 4.0-minute `worked_example` estimate; step labels required from 4 steps | screens 1–3 | Pre-training and short conceptual explanations [S]; sizes [P] (00a K6, K11) | 02 |

---

## 5. What to avoid (consolidated)

1. Citing FSRS as improving learning. 2. Treating Anki-derived parameters as validated. 3. Cross-discipline interleaving as a transfer mechanism. 4. The "85% rule" as a human law. 5. "2 sigma". 6. 90-minute brain cycles. 7. Leaderboards, badges and streak pressure. 8. Fixed scaffolds for experts. 9. Productive failure for absolute beginners. 10. Deep knowledge tracing as the sole gate. 11. LLM as sole correctness grader. 12. Citing build projects, SPICE grading or simulator-to-hardware transfer as evidence-backed. 13. Citing the MIT "Your Brain on ChatGPT" EEG study as causal (a December 2025 comment raises concerns about sample size and methods [C], Report A).

---

## 6. Techniques deliberately excluded

None of these appears in v1; none is reopened without the stated trigger. Reasons are from Report B unless stated.

| Technique | What it is | Evidence status | Reason excluded | Trigger to revisit |
|---|---|---|---|---|
| Neurostimulation (tDCS, taVNS, TMS, ultrasound, photobiomodulation) | Electrical, magnetic or ultrasound stimulation to speed learning | tDCS single session null in healthy adults across 59 analyses [V per one note, S per another]; multi-session with training SMD 0.35 in healthy older adults from 6 RCTs, n=323 [V]; taVNS g about 0.41 with heterogeneous small studies [V abstract]; DARPA TNT page lists no results and the 30% goal was not shown to be met [V]. Others recalled only | Hypothesis-grade at best; needs hardware a phone cannot supply; health and regulatory risk (FDA clearances found were for medical conditions) [S]; contract section 8 forbids | Large pre-registered replications in open literature plus regulatory clarity |
| Targeted memory reactivation (TMR) and closed-loop sleep stimulation | Replaying cues during slow-wave sleep | Hu 2020 g=0.29 overall, bias-adjusted estimates down to about 0.05–0.18 [V]; needs EEG-monitored sleepers; wrist or phone sleep staging too coarse [R] | Not deliverable on a phone; small and uncertain effect; claim risk | Consumer-grade RCTs with preregistration, none found |
| Neurofeedback and EEG load estimation | Training brain signals or adapting to EEG | 2024 JAMA Psychiatry meta-analysis of 38 RCTs (ADHD) SMD 0.04 on probably-blinded outcomes [V]; DecNef lab-only and disputed [S/R] | No benefit shown under blinding; needs a headband; neural data laws (Colorado, California, Montana, Connecticut) [V] | Replicated blinded benefit in healthy adults |
| Subliminal or sleep audio | Tapes played below awareness or during sleep | Greenwald 1991: three double-blind replications, 237 adults, no advertised effect; the effect lived in belief [V]; NRC 1988: no evidence for sleep learning [V secondary] | Refuted | None |
| Binaural beats as a learning aid | Two tones intended to alter state | Pooled g about 0.45 across cognition, anxiety and pain from 22 studies; abstract only read; heterogeneity and bias not seen [V abstract]; likely partly expectancy [inf]; no randomised learning trials of Hemi-Sync found | Evidence is about relaxation, not learning; claim risk. If ever offered it would be low-stakes relaxation audio, clearly labelled and outside all learning claims | Randomised learning trials with active controls |
| Brain-training games | Generic cognitive drills | Near transfer yes, far transfer little (Simons 2016); FTC action against Lumosity in 2016 [V] | Far-transfer claims are actionable as deceptive advertising | None |
| VR/XR | Immersive simulation | 2024 review of 50 VR studies: context-dependent, mostly self-reported outcomes [V]; Pilot Training Next gains came from reps, cheap access and automatic assessment, not neuroscience [inf] | Deferred: SPICE, emulators and real cheap hardware likely give most of the benefit [inf, unverified] | A bench task where SPICE/emulation clearly cannot teach the skill |
| Physiology-adaptive tutoring (HRV, webcam gaze, EEG) | Adjusting learning by sensor data | No RCT shows it beats performance-only adaptation; wrist sleep-staging agreement moderate (kappa about 0.5–0.6) [R]; neural-data and emotion-inference laws (EU AI Act education ban in force Feb 2025 is [R], unchecked) | Deferred; contract section 8 forbids emotion inference and biometric data in v1 | Opt-in, on-device design plus legal review plus an RCT |
| Learning styles matching, photographic memory, "10% of the brain", nootropics | Popular myths | No adequate support (Pashler 2008 [R]); healthy single-dose cognitive enhancers SMD about 0.12–0.21 [V] | Myth or tiny effects | None |
| Suggestopedia and "superlearning" | Relaxation plus music plus role play | Strong claims unsupported; components usable [V secondary] | Only "brief relaxation before high-anxiety tasks" kernels borrowed, without claims | None |
| Gateway, Hemi-Sync, Stargate, MKUltra, NLP | Pseudo-science or non-learning programs | Gateway paper is a 1983 Army feasibility memo in CIA holdings [V]; others not learning technologies | Not applicable | None |

---

## 7. Known evidence gaps

These are carried from the research and shape where 11 must collect data.

| Gap | Source | Consequence for design | How handled |
|---|---|---|---|
| No RCT of FSRS versus other schedulers on *learning* | Report A | Cannot claim scheduling benefit | Log everything (LS-004); fit alternatives offline; H1, H11 |
| Parameters from Anki not validated for procedural or conceptual technical skills | Report A | Retention target may be wrong | Predicted-vs-observed recall check in 11 |
| Optimal interleaving dose and adult technical-learner trials missing | Report A | PRM-07/08 are guesses | EXP-002 tests blocked vs interleaved only; dose stays untuned |
| No hands-on or maker causal evidence (Olin, MIT 2.007, Arduino) | Report A | Projects are a design bet | H6, BETA-001, SM-05 |
| Simulator and SPICE grading learning outcomes unevidenced; no CAD or diagram grading source | Report A | Graders are tools, not proof of learning | Grader audit versus human review (11 section 4); H6 |
| Perceptual-learning evidence absent for electronics | Report B | Pattern gym is an untested bet | EXP-003 |
| No RCT of LLM tutoring for hardware; no primary-source effect size for Kestin; critiques of Bastani and Kestin not retrieved | Report A | Tutor effect in this domain unknown; harms possible | EXP-001, H3, BETA-001 |
| No independent replication of Digital Tutor; derivatives after 2022 not located | Reports A, B | Process lessons only | Descriptive use |
| Confidence-weighted answering and calibration-training durability unevidenced | notes | Calibration features exploratory | H8 |
| Optimal session length and no RCT for a learning app | Report A | Limits are logistic | H12 descriptive |
| Effects of cohort, accountability and identity-based motivation not retrieved | Report A | Beta retention unknown | SM-10 |
| Remote verification of hardware work (badges, portfolios) not studied | Report A | Evidence ladder is [P] | Human review queue; audit |
| Time-to-competence data for embedded, PCB, firmware subfields absent; 150–300 h per L1 node is a proposal | Report A | Time-saving claims cannot be anchored | 11 section 3 treats it as unvalidated |
| Effects emerge late (Cognitive Tutor and Khanmigo gains concentrated in year 2 [B-]) | Reports A, B | Short trials may show nothing | Decision rubric avoids concluding "no effect" from short nulls |
| Legal: EU AI Act education-category timing, CRA applicability, neural-data statutes, COPPA/FERPA/GDPR specifics | Reports A, B | Compliance exposure if scope grows | Counsel review before beta (OQ-02, OQ-03) |
| Whether a fresh item variant is recalled as well as FSRS predicts for the same skill | Design review 00f F-04 [inf] | Intervals may be too long; reviews may rise from about 106 to 140-190 minutes a week (06 section 14.3) | Calibration monitor extended by interval bucket (06 section 3.8 item 5) |
| Whether "three successes over two calendar days or more" predicts retention a month later | Design review 00f F-03 [inf] | `mastered` may be lenient; it also gates the frontier | H11, checkpoint accuracy on `mastered` vs `reviewing` skills; `mastery_min_span_days` now defaults to 2 (00a G3, 06 section 4.2) |
| Learner-time estimates: the graph says 28.6 minutes a skill (first exposure to first mastery); the builder's costs add to 28.5 for a focus-session path | Design review 00f F-07 [inf]; reconciled by 00a G8 | The two agree on paper; real learner time may be 1.5 to 2 times higher, which cuts the planning rate from 7 to about 5 new skills a week | Orientation sessions (06 section 10.1) measure it; time multipliers (06 section 7.2) |

---

## 8. Cross-references

- FR-IDs: 01 section 7. Metrics: 01 section 5.
- Hypotheses H1–H12, outcome measures OM-01…OM-14, experiments EXP-001…EXP-005 and BETA-001, event names: 11.
- Scheduler, mastery and rating rules: 06 (canonical on conflict with PRM-01…PRM-03, PRM-09).

## 9. Resolved by 00a (v1.1)

This document's requests, and the ones it depended on from 01 section 13, were ratified in `00a-change-decisions.md`.

| ID | Outcome | Where it landed |
|---|---|---|
| 01 CCR-02 (strict `unaided`) | Modified | 00a B1: `attempts.unaided` stays `max_hint_level <= 1` and not revealed; the strict form is the view `v_attempts_strict_unaided` ("strict-unaided", used by document 11) |
| 01 CCR-03 (item pools, assessment kind) | Accepted | 00a section C |
| 01 CCR-08 (control arm) | Accepted | 00a D7 (active control) |
| CCR-09 (`skills.confusable_set`, `item_templates.interleave`) | Accepted | 00a section C |
| CCR-10 (`item_templates.reference_time_s`, `attempts.assessment_kind`) | Accepted | 00a section C |

## 10. Design-review notes (31 Oct 2026)

The independent critique of the learning engine is in `00f-design-review.md`. Changes it made to this document: the Report-A-derived statement on streaks and the MOOC completion figure are now tagged (S02); three internal conflicts with 06 are stated where they occur (LS-006 / PRM-04 same-day gap, LS-053 / PRM-15 new-skill cap, LS-090 governor) with 06 declared canonical; three evidence gaps were added to section 7. No parameter value of the register was changed.

Unverified in this document: all [R], [S], [P], [inf] items as tagged; the numeric parameters in the register are defaults to be tuned, not findings.

## 11. Review pass status (engine pass, 31 Oct 2026)

Applied from `00f-design-review.md` and `00a` section G: **F-03** (G3: PRM-09 and the unverified-claims row now state the 2-calendar-day span and the two-template condition); **F-04** (G5: PRM-01 is 0.85 for the first 8 weeks with a switch rule; the latency rows of the rating map wait for 20 observations of a template, 06 section 3.4); **F-07** (G8: the unverified-claims row now says the figures reconcile and gives the 5 to 7 planning rate); **F-15** (G6: new LS-067 and the trigger in 06 section 9; the earlier proposal of a 0.25 gap is replaced by 0.15); **F-18** (LS-053 and PRM-15 stay as reconciled: 06 is canonical, per session). **Fixed here:** every mention of a sixth experiment id (doc 11 defines EXP-001 to EXP-005 and BETA-001; the project hypothesis H6 is tested by the founder's descriptive data and BETA-001) and the outcome-measure range (doc 11 has OM-01 to OM-14). **Still open in this document:** LS-006 / PRM-04 (same-day retrieval gap not enforced by the packer, F-12; 06 is canonical), F-14 (Elo is largely decorative in v1; no change here). IDs were not renumbered; LS-067 is new.

## 12. Teaching layer (00a K, 4 Nov 2026)

Added after the founder reported that the app did not teach: the worked example showed only the problem statement, and nothing explained an idea before practice. New: mechanism M14, section 3.11 (LS-096 to LS-101) and PRM-21; LS-007 now names the fade positions of 00a K3. The loop of M02 is unchanged in order and in cost; the primer is part of the `worked_example` task. No parameter of the register changed value. Every effect size in M14 comes from abstracts or secondary summaries and is tagged [S] or [R]; none comes from adult electronics learners.
