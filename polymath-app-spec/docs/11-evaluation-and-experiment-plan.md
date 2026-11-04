# 11 — Evaluation and experiment plan

Status: v1.0, 31 Oct 2026. Binding upstream: `00-contract.md`. Companions: `01-PRD.md` (metrics SM-xx, FR-IDs), `02-learning-science-spec.md` (mechanisms M01–M13, parameters PRM-nn, evidence tags), `06` (scheduler, mastery and rating rules).

Evidence tags as in the contract: [V] read, [S] snippet, [R] recalled, [P]/[inf] proposal or inference. All numbers marked [P] or [inf] below are planning assumptions, not findings.

<!-- readability:start -->

> **At a glance**
>
> **Purpose:** how the app proves (or fails to prove) that it saves time and improves learning: hypotheses, outcome measures, founder n-of-1 experiments, the beta design, events, dashboards and decision rules.
> **Read by:** the agent building events, experiments and analysis views (BL-0024, 0094, 0128, 0135, 0147, 0148, 0166) and the founder who pre-registers EXP-001 and BETA-001.
>
> 1. Hypotheses H1 to H12 are decision aids, not findings (section 2); the 25 to 40 percent time-saving claim is an unvalidated assumption (section 3).
> 2. Outcome measures OM-01 to OM-14 and the operational definition of L1 per node are in section 4.
> 3. The founder phase uses matched skill pairs and within-subject randomisation (section 5); the experiment catalogue is section 6.
> 4. BETA-001 is a 10 to 50 learner randomised comparison against an active control (section 7).
> 5. Consent and ethics (section 8).
> 6. The event catalogue (section 9 and 9.1) is the single normative list of `events.name` values; any new event must be added there first.
> 7. Dashboards, analysis plan, stopping rules, pre-registration template and the decision rubric DR-01 to DR-14 are sections 10 to 14; the worked EXP-001 pre-registration is section 15.

**Contents**

- [1. Purpose and ground rules](#1-purpose-and-ground-rules)
- [2. Hypotheses](#2-hypotheses)
- [3. Baselines and the time-saving assumption](#3-baselines-and-the-time-saving-assumption)
  - [3.1 The assumption, stated plainly](#31-the-assumption-stated-plainly)
  - [3.2 What can and cannot be learned about it](#32-what-can-and-cannot-be-learned-about-it)
- [4. Outcome measures](#4-outcome-measures)
  - [4.1 Active time](#41-active-time)
  - [4.2 Outcome measure table](#42-outcome-measure-table)
  - [4.3 Operational definition of L1 for a node (used by OM-03 and FR-091)](#43-operational-definition-of-l1-for-a-node-used-by-om-03-and-fr-091)
  - [4.4 Instrument validity checks](#44-instrument-validity-checks)
- [5. Founder phase: within-subject (n-of-1) design](#5-founder-phase-within-subject-n-of-1-design)
  - [5.1 Principle](#51-principle)
  - [5.2 Units, matching, randomisation](#52-units-matching-randomisation)
  - [5.3 Washout and counterbalancing](#53-washout-and-counterbalancing)
  - [5.4 Schedule](#54-schedule)
  - [5.5 Analysis (founder phase)](#55-analysis-founder-phase)
  - [5.6 What this design can and cannot show](#56-what-this-design-can-and-cannot-show)
- [6. Experiment catalogue](#6-experiment-catalogue)
- [7. Randomised beta design (BETA-001), 10–50 learners](#7-randomised-beta-design-beta-001-1050-learners)
  - [7.1 Honest statement of purpose](#71-honest-statement-of-purpose)
  - [7.2 Power reality check](#72-power-reality-check)
  - [7.3 Population](#73-population)
  - [7.4 Arms](#74-arms)
  - [7.5 Randomisation and procedure](#75-randomisation-and-procedure)
  - [7.6 Outcomes](#76-outcomes)
  - [7.7 Why 12 weeks does not test "time to L1"](#77-why-12-weeks-does-not-test-time-to-l1)
- [8. Consent and ethics](#8-consent-and-ethics)
- [9. Event catalogue (maps to `events`)](#9-event-catalogue-maps-to-events)
  - [9.1 Events specified by other documents (added by review pass 2)](#91-events-specified-by-other-documents-added-by-review-pass-2)
- [10. Dashboards](#10-dashboards)
- [11. Analysis plan, missing data, quality](#11-analysis-plan-missing-data-quality)
  - [11.1 Common rules](#111-common-rules)
  - [11.2 BETA-001 primary model](#112-beta-001-primary-model)
  - [11.3 Missing data](#113-missing-data)
  - [11.4 Grader and content quality in analysis](#114-grader-and-content-quality-in-analysis)
- [12. Stopping rules](#12-stopping-rules)
- [13. Pre-registration template](#13-pre-registration-template)
- [14. Decision rubric](#14-decision-rubric)
  - [14.1 Principle](#141-principle)
  - [14.2 Rubric](#142-rubric)
  - [14.3 Claims gate](#143-claims-gate)
- [15. Worked example: pre-registration of the first experiment (EXP-001)](#15-worked-example-pre-registration-of-the-first-experiment-exp-001)
- [16. Limits and unverified items](#16-limits-and-unverified-items)
- [17. Resolved by 00a (v1.1)](#17-resolved-by-00a-v11)

<!-- readability:end -->

---

## 1. Purpose and ground rules

The question is whether the app *actually* saves time and improves learning for an adult doing hardware/software engineering. The research reports say the evidence-backed core (retrieval, spacing, fading worked examples, confusable-type interleaving, guarded tutoring) is generic, while the product's own combination (adaptive graph, hardware builds, SPICE and unit-test grading) has no direct study (Report A, "What changes about the product thesis"). The app is therefore also an instrument that must generate the missing evidence.

Ground rules

**Terminology (00a B1).** `attempts.unaided` is the scheduler's flag: `max_hint_level <= 1` and the solution not revealed. This plan never uses it as an outcome. Every outcome measure, hypothesis and stopping rule below that says "strict-unaided" means `max_hint_level = 0` **and** no tutor panel opened for the item, derived in the view `v_attempts_strict_unaided`. Checkpoints expose no hint UI or tutor, so checkpoint attempts are strict-unaided by construction. The plain word "aided" means `max_hint_level >= 1` or tutor messages present.

1. **Strict-unaided delayed performance is the outcome of record.** Practice scores are process data. Bastani et al. found unguarded GPT raised practice scores about 48% and cut unaided exam scores about 17% [V] (Report A).
2. **No efficacy claims in the product** until the claims gate in section 14.3 is satisfied. Contract section 8 and PRD NG-07 apply.
3. **Pre-register before looking.** Every experiment has a frozen pre-registration (section 13) committed to git before its first assignment.
4. **Be honest about power.** The founder phase and the beta are exploratory. They can reveal large effects and harm, rarely small effects. Report A's guidance is to compute power for d of about 0.2–0.3; samples of 20 or fewer detected a 0.45 effect in under 20% of resamples [V] (Report B, Frontiers 2016).
5. **Late effects are possible.** Cognitive Tutor showed no effect in year 1 and about 8 percentile points in year 2; Khanmigo gains concentrated in year 2 [B-] (Reports A, B). A null at 12 weeks is not evidence of no effect.
6. **Active controls, not no-treatment.** Controls receive the same content and time on task.
7. **Separate belief from learning.** Greenwald's cross-labelled design showed the "effect" of subliminal tapes lived in belief [V] (Report B). We record what learners believe before showing results.

---

## 2. Hypotheses

Thresholds are pre-specified decision aids [P]; the decision rubric (section 14) says what each outcome changes.

| ID | Hypothesis | Tag and basis | Primary measure | Where tested |
|---|---|---|---|---|
| H1 | **Retention.** For skills mastered in the app, the mean strict-unaided score on unseen variants at 56 ± 7 days after mastery is at least 0.70. In the beta, treatment exceeds control on the week-20 delayed test | Spaced retrieval strong in labs [R/V]; domain benchmark absent [P]. Beta effect planning range 0.2–0.5 SD [inf] | OM-01 | Founder (descriptive), BETA-001 (comparative) |
| H2 | **Time saving.** Active minutes to reach a fixed target skill set are lower with the full app than with a static-syllabus control, with ratio of medians ≤ 0.75 | **[inf, unvalidated]** earlier assumption: baseline 150–300 h per L1 node [P: Report A tier hours] and 25–40% saving on the study portion. No source supports the saving (section 3) | OM-03 | BETA-001; founder gives absolute hours only |
| H3 | **Tutor does not create dependence.** (a) Delayed strict-unaided scores for skills learned with the tutor are no more than 0.10 below skills learned without it; (b) the gap (aided minus strict-unaided) stays ≤ 0.10 | Guardrailed tutor removed harm but gave no exam gain [V] (Bastani); Harvard upper bound [V secondary]; 2026 working paper found −0.37 SD with tutor access [B] | OM-01 by condition; OM-04 | EXP-001; BETA-001 secondary |
| H4 | **Interleaving.** Practising a confusable set mixed (after blocked entry) beats blocking on the delayed strict-unaided test by ≥ 0.05 | g = 0.42 overall, 0.34 in math [V] (Brunmair and Richter); at an assumed skill-level SD of 0.175 this is about 0.06 absolute [inf] | OM-01 by condition | EXP-002 |
| H5 | **Perceptual drills.** A pattern gym on fault/waveform/schematic recognition improves accuracy and median response time on 20 unseen instances at 2 weeks versus time-matched ordinary practice | Kellman lab [S]; IES trial without public results [V]; electronics untested [inf] | OM-11 | EXP-003 |
| H6 | **Guided projects.** (a) At least 80% of started ladder steps reach `accepted` evidence; (b) after a project, transfer-task score ≥ 0.60; (c) project completion is not accompanied by a failed strict-unaided checkpoint (kill criterion, rubric DR-04) | No causal evidence for build curricula (Report A gaps); ladder is [P] | OM-05, OM-02 | Founder, BETA-001 |
| H7 | **Feasibility.** The learner achieves ≥ 75% of the weekly time target and ≥ 4 active days in ≥ 75% of weeks | MOOC completion low [R]; 8 h/week premise [inf] | OM-06 | Founder, BETA-001 |
| H8 | **Calibration.** Mean absolute gap between rescaled confidence and accuracy falls by ≥ 0.05 over 12 weeks | Moderate [R]; confidence-weighted answering unevidenced | OM-08 | Descriptive |
| H9 | **Pre-sleep review.** Skills reviewed in the evening and next morning are retained no worse than others | [R] consolidation; effect for this learner unknown [inf] | OM-01 by condition | EXP-005 (descriptive by design) |
| H10 | **Explain-back.** Skills with explain-back have higher delayed strict-unaided scores than those without | Self-explanation d about 0.55 [R]; teach-back as retrieval [P] | OM-01 by condition | EXP-004 |
| H11 | **Mastery and scheduler validity.** (a) The FSRS-predicted retrievability agrees with observed delayed correctness (mean absolute calibration error ≤ 0.07), and with observed recall of ordinary reviews in every interval bucket (OM-14; fresh variants may recall worse than FSRS assumes); (b) `mastered` skills score higher on delayed tests than skills tested while only `reviewing` | FSRS validated for prediction in Anki data only [V]; thresholds [P] | OM-12, OM-14 | All phases |
| H12 | **Session design.** Within-session accuracy and latency do not degrade materially after 30 and 50 minutes of focus sessions | Weak evidence for session length [R] | OM-13 | Descriptive |

---

## 3. Baselines and the time-saving assumption

### 3.1 The assumption, stated plainly

- **Baseline:** reaching tier L1 in a node takes about 150–300 hours [P]. Report A derived this loosely from one CE2016 area (20–60 core hours plus labs); it also says "hour estimates need user testing" and "no credible time-to-competence data exist for embedded, PCB, firmware or security subfields".
- **Saving:** the app reduces the *study portion* by about 25–40% [inf, unvalidated]. No source in the research supports this figure. If the study portion were 50–70% of node hours [inf], a 25–40% saving would shorten a whole node by roughly 12–28%. Both numbers are hypotheses.
- **Arithmetic reality at 8 h/week:** 150–300 h is about 19–38 weeks per node. The three slice nodes (`math`, `elec`, `sw`) could total 450–900 h, which is 56–112 weeks at 8 h/week. No milestone in 01 promises node-level L1 for all three. The slice defines operational criteria (section 4.3).

### 3.2 What can and cannot be learned about it

| Question | Can we answer it? | How |
|---|---|---|
| How many active hours does the founder need per module and for the first full node? | Yes, absolute, with wide intervals | OM-03 accumulated from events; extrapolate only within observed modules |
| Does the full app reach a fixed target set faster than a static-syllabus control? | Partly, exploratory, on a 15-skill target set in 12 weeks | BETA-001; N of 10–50 |
| Does the app save time versus the learner's own counterfactual (textbook, video course, no app)? | No | No such control exists in the design. A static-syllabus control with the same items is not equal to ordinary self-study |
| Does it save time to L1 for a whole node in the beta? | No | Node L1 takes 150–300 h; the beta window gives about 60–100 h |
| Does an individual mechanism save time for the founder? | Weakly | EXP-001 and EXP-002 report minutes-to-mastery as a secondary outcome |

The product therefore makes no time-saving claim. The hypothesis H2 is kept only so that a negative or null result can change the design (rubric DR-06).

---

## 4. Outcome measures

### 4.1 Active time

`sessions.actual_min` is wall-clock and includes idle. For evaluation, **active minutes** are computed per attempt and per task:

- `active_ms` (client-measured foreground time with input in the last 120 s, capped at 600,000 ms per task) is stored in `attempt_submitted.props`.
- Worked example dwell (`worked_example_viewed.dwell_ms`) is capped at 300,000 ms per example.
- Tutor thread time is the sum of gaps between consecutive messages capped at 120 s each.
- Lab sessions (context `bench`) use `sessions.actual_min` as declared by the learner (start and stop), because bench work cannot be measured by the app. It is flagged `self_declared`.
- Off-app study (reading, videos) is self-reported weekly in one question (`offapp_time_reported`). Totals are reported with and without off-app time; primary time outcomes use in-app active minutes and, separately, lab minutes. This is OQ-09.

### 4.2 Outcome measure table

| ID | Measure | Definition | Source | Timing |
|---|---|---|---|---|
| OM-01 | **Delayed strict-unaided retention** | Mean score (0–1) over 5 items for a skill (4 unseen variants from the assessment pool, 1 transfer-pool item), strict-unaided (`max_hint_level = 0` and no tutor panel opened; view `v_attempts_strict_unaided`), taken at t0 + 56 days (window ±7; actual lag recorded). t0 = date the skill first reaches `mastered`, or day 28 after first exposure if not mastered by then | `attempts`, `item_templates.pool`, `session_tasks.assessment_kind = delayed` | 8+ weeks after learning |
| OM-02 | **Transfer score** | Mean score on `transfer`-pool tasks for a skill: different template or changed surface context, no hints | `attempts` with pool `transfer` | After mastery, ≥ 14 days |
| OM-03 | **Time-to-criterion** | Cumulative active minutes (4.1) from the first attempt on a fixed target set until every skill in it is `mastered` (module-level criterion). Censored at the end of follow-up. Node-level version = time-to-L1 using 4.3 | `events`, `skill_state` | Continuous |
| OM-04 | **Tutor-dependence gap** | For each learner and rolling 4-week window: mean score of aided attempts (`max_hint_level ≥ 1` or tutor messages present) on practice items minus mean score on strict-unaided checkpoint items, matched by skill where possible. Also: tutor messages per attempt; share of attempts with `max_hint_level ≥ 2` (hint reliance index) | `attempts`, `tutor_messages` | Rolling |
| OM-05 | **Project completion and verified artifacts** | Share of started project steps reaching `evidence_status = accepted`; time from step start to acceptance; share `auto_verified` versus human reviewed; assurance level (02 LS-084) | `project_evidence`, `user_projects` | Continuous |
| OM-06 | **Adherence** | Weekly active minutes ÷ `weekly_minutes_target`; active days per week; share of due reviews done within 3 days (review debt) | `sessions`, `skill_state`, events | Weekly |
| OM-07 | **Efficiency** | OM-01 score per 10 active hours invested in the skill | Derived | After OM-01 |
| OM-08 | **Calibration** | Mean of (confidence − 1) ÷ 4 minus accuracy over strict-unaided items (signed), plus mean absolute difference and Brier score of binned confidence | `attempts.confidence` | Rolling |
| OM-09 | **Item and grader quality** | Confirmed wrong items per 500 served; share of reports resolved in 48 h; grader–human agreement on a random audit of 50 graded attempts per quarter for `rubric_llm` and 20 for each execution grader; target ≥ 95% agreement | `item_reported`, audit sheet | Quarterly |
| OM-10 | **Belief** | After each module block, before results are revealed: "Which condition do you think helped you learn more?" (A, B, no difference) and confidence 1–5 | `belief_survey_submitted` | Block end |
| OM-11 | **Pattern recognition** | Accuracy and median response time on 20 unseen drill instances | `attempts` with `task_kind = perceptual_drill` and pool `assessment` | 2 weeks after drill block |
| OM-12 | **Scheduler calibration** | For delayed-test attempts, FSRS-predicted retrievability at test time versus observed correctness: mean absolute calibration error in 10 bins and AUC | `review_scheduled` prop at last review, attempts | After delayed tests |
| OM-13 | **Within-session trend** | Accuracy and latency by minute-in-session band (0–15, 15–30, 30–50, 50+) | `attempt_submitted` | Descriptive |
| OM-14 | **Interval-bucket calibration** (added by the review pass; 00f F-04) | For every graded review attempt (not only delayed tests): observed recall minus FSRS-predicted retrievability, by interval bucket of the elapsed days since the previous review (1–3, 4–7, 8–30, over 30), split by same-template versus fresh-variant, with the Hard-or-Again share by review number. Signed mean difference and mean absolute error per bucket; a negative signed difference in the 8–30 bucket means intervals are too long. Feeds the retention default switch (G5: 0.90 only if observed minus predicted is within 0.07) and the optional `maximum_interval_days` cap | `fsrs_calibration_bucket`, `review_scheduled`, `attempt_submitted` | Nightly, reported weekly |

### 4.3 Operational definition of L1 for a node (used by OM-03 and FR-091)

06 is canonical for `tier_attained`. For evaluation, a node reaches L1 when all of the following hold at the same time; if 06 differs, 06 wins and this section is updated.

1. At least 90% of the node's skills with `tier_target ≤ L1` are `mastered` and none is `decayed`.
2. The node's L1 capstone project step has `evidence_status = accepted` (for `elec`: project ladder L2; for `sw`: ladder L3 or L4 step covering firmware; for `math`: none required, a transfer-task set replaces it).
3. The latest node-level strict-unaided checkpoint scored ≥ 0.80.
4. *Confirmation* (reported separately as "L1 confirmed"): at 56 days after attainment, a delayed strict-unaided test over 10 randomly chosen mastered node skills scores ≥ 0.70.

An event `tier_attained` is emitted at conditions 1–3, and a second `tier_attained` with `confirmed = true` at condition 4.

### 4.4 Instrument validity checks

- Auto-grader audit and rubric audit as in OM-09. A failed audit (< 95%) freezes the affected grader's items from outcome data.
- All outcome items are generated from verified templates (contract 7.8) and excluded if later retired (FR-066).
- The assessment pool must never be shown in practice (CCR-03; check by SQL: zero overlap between assessment templates and practice `session_tasks`).
- Retention items use new seeds but share the template family; transfer items differ in template or surface context. The two are reported separately because memory for a seed would inflate OM-01 if seeds repeated.

---

## 5. Founder phase: within-subject (n-of-1) design

### 5.1 Principle

One learner, many skills. Randomise at the level of the skill (or the confusable set), not the week. Each skill is learned once, so no skill sees both conditions. This avoids the main n-of-1 problem of carry-over for the same content. It trades it for another: skills differ, so conditions are applied to **matched pairs** of skills, and the analysis is paired.

### 5.2 Units, matching, randomisation

1. **Eligible units.** Skills (or confusable sets for EXP-002) with: ≥ 20 verified seeds available; no `hard` prerequisite edge between partners; same module; `est_minutes` within ±25%; `difficulty_prior` within 0.15; same dominant `task_kind` mix. Skills tagged `interleave: false` are excluded from EXP-002.
2. **Pairing.** At module start, the system lists eligible units not yet assigned and forms pairs by greedy nearest-neighbour matching on the two numeric criteria. An odd unit is left unrandomised and gets the default condition. Pairs and their match distances are stored.
3. **Randomisation.** For each pair a seeded pseudo-random number generator (seed stored in `experiment_assignments.rng_seed`, CCR-01) assigns one unit to the treatment arm and one to control. A balanced list ensures half of the pairs give the treatment arm to the unit the frontier will reach first (counterbalances order, trend and fatigue).
4. **No re-rolling.** The assignment is written once. Overrides are logged as `experiment_override` events and analysed as protocol deviations.
5. **Concealment.** The founder cannot conceal conditions from themself. Mitigation: outcomes are auto-graded (execution graders), delayed tests mix items from both conditions in one session without condition labels, analysis scripts are frozen before data.

### 5.3 Washout and counterbalancing

- **Skill-level designs need no washout for content**: no skill is exposed to both conditions.
- **Strategy carry-over** (for example, learning to lean on the tutor or to ignore it) is the real threat. Mitigations: alternate conditions within each module rather than running a block of one condition then the other; the pair-order index is included in the analysis as a covariate; a one-week "no-experiment" period (default condition for all skills) precedes the first experiment and follows any change of protocol, which is the washout for strategy.
- **Period-level crossovers** (for example "tutor on in weeks 1–4, off in weeks 5–8") are not used as the main design because they are confounded with content difficulty and with the learner's changing skill. If used for an exploratory ABBA check, the periods are four weeks with a one-week washout between them, and the analysis is descriptive.
- **Counterbalancing across experiments:** only one experiment is active on a given skill. A skill is in at most one experiment (no factorial cells) to keep power.

### 5.4 Schedule

Experiments are phased because the feature that defines the arm must exist and because each pair needs 8+ weeks to produce its delayed test.

| Window (indicative [inf]) | Activity |
|---|---|
| M1 (Jan–Feb 2027) | Baseline logging; H7, H8, H12 descriptive; no randomisation yet (tutor not built) |
| M2 (Mar–Apr 2027) | Pre-register EXP-001; start pairing at module starts; EXP-002 starts where interleaving eligible |
| M3 (May–Jun 2027) | First delayed tests (from skills mastered in M1/M2); EXP-003, EXP-004 start |
| M4 (Jul–Aug 2027) | First pre-registered analyses; dashboards complete; decision rubric applied (EXP-001 interim, descriptive) |
| M5 (Sep 2027 on) | BETA-001; founder continues EXP-001/002 to accumulate pairs |

### 5.5 Analysis (founder phase)

- Estimand: mean paired difference in OM-01 (treatment − control) over pairs.
- Primary test: exact randomisation (sign-flip) test on the pair differences, two-sided α = 0.05; with n pairs there are 2^n sign patterns (4,096 for 12 pairs). Report the mean difference, a 95% confidence interval (t-based and permutation-based) and the exact p-value.
- Sensitivity: item-level logistic mixed model, correct ~ condition + pair-order index + (1 | pair) + (1 | skill), random intercepts; and a Bayesian estimate with a weakly informative prior centred at 0 with SD 0.10 [P], reported as a posterior interval.
- Secondary outcomes (minutes to mastery on a log scale, hint reliance, belief) are labelled exploratory. No multiplicity correction for exploratory outcomes; they are not used for decisions except via the rubric.

### 5.6 What this design can and cannot show

**Can show**

- Whether, for this learner and this content, a condition changes delayed strict-unaided performance by a large amount, and whether it **harms** strict-unaided performance (the key tutor risk).
- Per-skill time-to-mastery under each condition, paired.
- Process facts: how the learner actually uses the tutor, adherence, which graders fail.

**Cannot show**

- **Generalisation.** One person. The founder is highly motivated and builds the product; results do not transfer to beta learners.
- **Small effects.** Power is low (table below). The expected true effect for interleaving (about 0.06) is far below what 12 pairs can detect (about 0.16).
- **Blind effects.** The founder knows the condition. Expectancy and effort differences cannot be excluded; auto-grading and mixed-condition tests reduce, not remove, bias.
- **Absolute time saving versus not using the app.** There is no counterfactual path.
- **Independence of skills.** Skills share structure (a divider skill helps later circuit skills). The no-hard-edge rule limits but does not remove spillover.
- **Long-term effects** beyond the delayed test.

Detectable paired difference at 80% power, two-sided α = 0.05, paired t approximation, by assumed SD of pair differences [inf: the SD is assumed, to be replaced by the observed SD after 8 pairs]:

| Pairs | SD = 0.15 | SD = 0.175 | SD = 0.20 |
|---|---|---|---|
| 8 | 0.17 | 0.20 | 0.23 |
| 10 | 0.15 | 0.17 | 0.20 |
| 12 | 0.13 | 0.16 | 0.18 |
| 20 | 0.10 | 0.12 | 0.13 |
| 24 | 0.09 | 0.11 | 0.12 |

Reading: with 12 pairs a difference smaller than about 0.16 (16 percentage points) is likely to be missed. Large harm from the tutor (the Bastani effect was −17% in unaided exam scores [V]) is detectable; a true interleaving advantage of 6 points is not.

---

## 6. Experiment catalogue

| ID | Question | Units and arms | Primary outcome | Target pairs or N | Starts | Hypothesis |
|---|---|---|---|---|---|---|
| EXP-001 | Tutor with attempt-first hint ladder versus no tutor (static worked solution after submission) | Matched skill pairs, ON vs OFF (arms mapped to `treatment`/`control`) | OM-01 | 12 pairs, continue to 24 | M2 | H3 |
| EXP-002 | Blocked-then-interleaved versus blocked only within a confusable set | Matched confusable sets (3 skills each), interleaved vs blocked | OM-01 over set | 8 sets (limited by content), expect underpowered | M2 | H4 |
| EXP-003 | Pattern gym versus time-matched ordinary practice on a recognition skill | Matched recognition skills | OM-11 at 2 weeks, OM-01 at 8 weeks | 6 pairs | M3 | H5 |
| EXP-004 | Explain-back on versus off | Matched skills | OM-01 | 10 pairs | M3 | H10 |
| EXP-005 | Evening review plus morning recall versus normal schedule | Alternating weeks (ABAB), descriptive | OM-01 on reviewed skills, adherence | 8 weeks | M3 | H9 |
| BETA-001 | Full app versus static-syllabus active control | Learners, 1:1 | OM-01 at week 20 | 20–50 learners | M5 | H1, H2, H3, H6, H7 |

Priority order if the founder's time is limited: EXP-001 (largest known risk, large effects plausible), then BETA-001, then EXP-002; EXP-003 to EXP-005 only if time permits.

---

### 6.1 Parameter flags that are not experiments

Two scheduler parameters are changed by flag so that the founder can compare periods descriptively without an arm structure (00f section 7(b)): `retention` (`desired_retention` 0.85 for the first 8 weeks, then 0.90 only if OM-14 allows, G5) and `mastery_span` (`mastery_min_span_days`, default 2, G3). Both are logged in `experiment_snapshot` on every event that carries it and in `params_version`; neither is randomised in the founder phase, so any effect on OM-01 or OM-03 is read as descriptive, not causal. In BETA-001 both flags are fixed across arms. Analysis note for SM-01: the target of 360 of 480 minutes includes the lab block; the usable non-lab minutes are 252 a week after the 10 percent slack, so a founder who skips the lab block cannot reach SM-01 and should read it against that figure (00f section 8).

## 7. Randomised beta design (BETA-001), 10–50 learners

### 7.1 Honest statement of purpose

BETA-001 is **exploratory**. Its purposes are: (1) test that the loop works for someone other than the founder, (2) estimate effect sizes and variances for planning a later, larger trial, (3) detect large harm, (4) learn why people stop. It cannot establish efficacy.

### 7.2 Power reality check

Two-arm comparison of a continuous primary outcome, 1:1, 80% power, two-sided α = 0.05. Minimum detectable standardised difference d:

| Total N | Per arm | d (no covariate) | d with baseline adjustment (r = 0.6, r² = 0.36) | d with 30% attrition and adjustment |
|---|---|---|---|---|
| 10 | 5 | 2.02 | 1.62 | 2.43 |
| 20 | 10 | 1.33 | 1.06 | 1.30 |
| 30 | 15 | 1.06 | 0.85 | 1.06 |
| 40 | 20 | 0.91 | 0.73 | 0.88 |
| 50 | 25 | 0.81 | 0.65 | 0.79 |

To detect d = 0.5 needs about 63 per arm; d = 0.3, about 175 per arm; d = 0.2, about 393 per arm [calculation: n per arm = 2 × ((1.96 + 0.84) ÷ d)²]. Expected real effects are 0.2–0.5 SD at best [inf, Report B], so a beta of 10–50 can detect only an unrealistically large effect (d about 0.7 or more). The pre-registered use of the result is **estimation**: report the adjusted difference with its 95% interval, do not call a non-significant result "no effect", and use the interval to size a future trial. Under N < 20 total, between-arm inference is not reported; only process outcomes and qualitative findings are.

### 7.3 Population

- Adults 18 or older who commit to 5–10 hours a week for 20 weeks, own a phone and a computer, and agree to buy or be given the listed starter kit (OQ-04).
- Recruited through the founder's network; target 40, minimum viable 20, maximum 50.
- Exclusion: baseline diagnostic score ≥ 0.70 on the target set (ceiling), under 18, unable to complete consent.
- Optional, separately consented, demographic items for subgroup audits: age band, education level, first-generation student status. Subgroup results are descriptive only given N.

### 7.4 Arms

| | Treatment | Control (active) |
|---|---|---|
| Content and target set | Same 15-skill target set from `math`, `elec.dc`, `sw` (C basics) and the same L0–L1 projects | Same |
| Item pool | Same verified templates | Same |
| Order | Frontier-driven session builder (contract 7.2) | Fixed linear syllabus order |
| Practice | Worked → faded → retrieval; blocked-first then interleaved within module | Worked → faded → retrieval; always blocked |
| Review | Per-skill FSRS, target retention 0.90, fresh variants | Fixed schedule: 1, 3, 7, 14, 28 days after completion, fresh variants, no adaptive scheduling |
| Tutor | Attempt-first hint ladder | None; post-submission worked solution and grader feedback |
| Checkpoints and delayed tests | Identical (module end, ≥ every 14 days, week 12, week 20) | Identical |
| Reminders and project review | Same | Same |
| Weekly time guidance | Same target minutes | Same |

This is a **bundle test**. It cannot attribute any difference to a single component; component attribution comes from the founder experiments. The control is not "ordinary self-study" and a treatment win does not show superiority to that.

### 7.5 Randomisation and procedure

- Consent → baseline diagnostic (target set) → randomisation (server-side, after the diagnostic). 1:1, permuted blocks of 4, stratified by baseline score (< 0.30 / 0.30–0.69) and weekly hours (< 6 / ≥ 6). The allocation sequence is generated from a seed whose SHA-256 is recorded in the pre-registration; the seed is revealed at analysis.
- Stored as `experiment_assignments` with `unit_type = user`.
- Neutral interface labels ("Plan A", "Plan B" in Settings); learners are told they are comparing two ways of organising the same course, not which is expected to work better. Learners are asked not to discuss the app's method with other participants; contamination is estimated from a closing question.
- Timeline: week 0 baseline; weeks 1–12 intervention; week 12 immediate strict-unaided test (T1); weeks 13–20 maintenance (assigned mode continues, target set reviewed according to the arm's schedule); week 20 delayed strict-unaided test (T2, primary).
- Total follow-up of 20 weeks; the delayed test is 8 weeks after the end of intensive learning, matching the "8+ weeks" guidance (Report B).

### 7.6 Outcomes

- **Primary:** T2 mean OM-01 over the 15 target skills (5 items each, unseen variants and 1 transfer item per skill), strict-unaided, no tutor.
- **Key secondary (Holm-adjusted together):** T1 score; OM-03 time-to-criterion over the target set (censored at week 12); OM-04 tutor-dependence gap (treatment arm only for the tutor part, plus aided-strict-unaided gap in both using hints-after-submission as aided); project completion (OM-05).
- **Exploratory:** OM-06 adherence, OM-08 calibration, OM-10 belief, OM-09 quality, within-session trend, attrition by arm, subgroups.
- **Process:** reasons for stopping (short exit question), device mix, offline usage.

### 7.7 Why 12 weeks does not test "time to L1"

Node L1 needs 150–300 h [P]. At 5–10 h/week for 12 weeks learners reach 60–120 h, and the target set needs about 30–40 h [inf]. BETA-001 therefore tests time-to-criterion on the fixed set, not time-to-L1. The L1 definition in 4.3 is applied to founder data only.

---

## 8. Consent and ethics

1. **Adults only (18+).** No minors, no under-18 profiling. This avoids COPPA, FERPA and age-appropriate design duties but does not remove GDPR if any participant is in the EU. The research reports did not review COPPA/FERPA/GDPR specifics (Report A); counsel review is required (OQ-02).
2. **Informed consent in plain language** (FR-004): purpose (compare two ways of organising the same course), what is logged (events, attempts, tutor messages, uploads), who sees it, retention period, voluntary participation, the right to withdraw at any time without penalty, data export and deletion (FR-120, FR-121), time commitment of 20 weeks, risks.
3. **Risks stated:** time cost, frustration, physical hazards in builds (soldering, ESD; no mains work; certified battery packs only; abuse testing virtual only), possibility that one arm is less effective, and that the app is experimental.
4. **Non-disclosure of hypotheses** until debrief: learners are told what is compared, not which arm is expected to do better. A debrief at the end shows their arm and results.
5. **Research consent is separable from product use** (FR-004, FR-114). Declining excludes the data from analyses.
6. **No neural, biometric or emotion data** (contract section 8). No sleep data: only user-entered bedtime when the pre-sleep option is enabled.
7. **LLM providers:** prompts exclude direct identifiers (FR-123); model and prompt versions are logged; learners are told that tutor text is processed by a third-party provider.
8. **Independent review:** the founder is both investigator and operator. Before enrolling anyone else the founder obtains an independent advisory review (a qualified person not involved in the product) of the protocol and consent text, and determines with counsel whether a formal ethics board is required in the founder's jurisdiction (OQ-03). This document does not claim that any review has occurred.
9. **Incentives** are disclosed; no cash in the baseline plan (OQ-11).
10. **Equity:** subgroup descriptive audits (a 2026 working paper found larger losses from tutor access for first-generation students [B, not peer reviewed]) with optional demographic items; small N means these are alerts, not tests.
11. **Data protection by design:** pseudonymous IDs in exports, RLS, minimal retention, deletion within the stated period.

---

## 9. Event catalogue (maps to `events`)

Every event is one row in `events` (`id`, `user_id`, `name`, `props` jsonb, `at`). `at` is server time. Props include `client_at` (ISO-8601) when the event originates offline. Names are lowercase snake_case. This table is the proposed normative list (CCR-05). Any new event requires adding it here and a schema test (FR-110).

| Name | Props (keys) | Emitted when | Used for |
|---|---|---|---|
| `app_opened` | `context`, `display_mode`, `offline`, `load_ms` | App foregrounded | SM-09, device mix |
| `consent_recorded` | `consent_version`, `research` | Consent saved | FR-004, FR-114 |
| `diagnostic_completed` | `n_items`, `duration_s`, `target_set_score` | Placement ends | Baseline, strata |
| `session_started` | `session_id`, `session_type`, `context`, `planned_min` | Session begins | OM-06 |
| `session_ended` | `session_id`, `actual_min`, `active_min`, `tasks_done`, `ended_reason` | Session ends | OM-06 |
| `break_suggested` | `session_id`, `minutes_in` | Break prompt shown | H12 |
| `task_shown` | `session_id`, `session_task_id`, `item_id`, `task_kind`, `skill_key`, `template_key`, `pool`, `assessment_kind`, `offline` | Item rendered | Serve audit (SM-06) |
| `worked_example_viewed` | `item_id`, `skill_key`, `dwell_ms` | Example closed | OM-03 active time |
| `lesson_viewed` | `skill_key`, `lesson_version`, `variant`, `screens_seen`, `skipped`, `dwell_ms` | Concept primer closed (00a K10) | M14 descriptive check (doc 02), OM-03 active time |
| `lesson_check_answered` | `skill_key`, `lesson_version`, `check_id`, `correct` | Primer check answered; ungraded (LS-099) | Lesson quality review (a check most learners miss is rewritten) |
| `attempt_submitted` | `attempt_id`, `item_id`, `skill_key`, `task_kind`, `correct`, `score`, `latency_ms`, `active_ms`, `confidence`, `hints_used`, `max_hint_level`, `unaided`, `assessment_kind` | Attempt graded | All outcomes |
| `hint_requested` | `item_id`, `requested_level`, `granted`, `denied_reason` | Hint asked | OM-04, FR-050 |
| `tutor_message_sent` | `thread_id`, `item_id`, `skill_key`, `role`, `hint_level`, `policy_flags`, `model`, `prompt_version`, `tokens_in`, `tokens_out` | Tutor message stored | SM-13, OM-04, cost |
| `review_scheduled` | `skill_key`, `due`, `stability`, `difficulty`, `predicted_retrievability` | FSRS update | OM-12 |
| `skill_state_changed` | `skill_key`, `from_state`, `to_state`, `reason` | `mastery_state` change | OM-03, H11 |
| `tier_attained` | `node`, `tier`, `active_min_total`, `calendar_days`, `confirmed` | 4.3 conditions met | OM-03 |
| `checkpoint_started` | `session_id`, `assessment_kind`, `n_items` | Checkpoint opens | OM-04 |
| `checkpoint_completed` | `session_id`, `assessment_kind`, `n_items`, `score`, `duration_s` | Checkpoint ends | OM-01, OM-04 |
| `delayed_test_due` | `skill_key`, `due_at`, `planned_lag_days` | Scheduler flags | SM-14 |
| `delayed_test_completed` | `skill_key`, `actual_lag_days`, `score`, `n_items` | Delayed test ends | OM-01 |
| `experiment_assigned` | `experiment_key`, `unit_type`, `unit_key`, `arm`, `block_index`, `rng_seed` | Assignment written | Audit |
| `experiment_exposure` | `experiment_key`, `unit_type`, `unit_key`, `arm`, `task_kind`, `item_id` | A task is built under an arm | Exposure completeness (SM-14) |
| `experiment_override` | `experiment_key`, `unit_key`, `reason` | Protocol deviation | Deviation log |
| `belief_survey_submitted` | `experiment_key`, `unit_key`, `belief`, `confidence` | Survey saved | OM-10 |
| `project_started` | `project_key` | Project opened | OM-05 |
| `project_step_started` | `project_key`, `step_key` | Step opened | OM-05 |
| `evidence_submitted` | `project_key`, `step_key`, `evidence_kind`, `assurance_level` | Upload saved | OM-05 |
| `evidence_status_changed` | `project_key`, `step_key`, `from`, `to`, `review_s` | Status change | OM-05 |
| `project_completed` | `project_key`, `active_min_total` | Project accepted | OM-05, H6 |
| `item_reported` | `item_id`, `template_key`, `reason`, `source` | Learner reports | OM-09 |
| `item_retired` | `template_key`, `item_id`, `confirmed_wrong`, `reason` | Reviewer retires | OM-09 |
| `reminder_sent` / `reminder_opened` | `kind`, `local_hour` | Push sent or opened | OM-06 |
| `offline_sync_completed` | `n_attempts`, `n_regraded`, `n_mismatch` | Sync ends | NFR-07 |
| `offapp_time_reported` | `week_start`, `minutes` | Weekly question | Section 4.1 |
| `data_export_requested` / `data_delete_requested` | none | Request made | Privacy audit |

### 9.1 Events specified by other documents (added by review pass 2)

These events are used by documents 06, 08 and 10. They are normative here so that there is one list; the owning document gives the meaning of the props. Rows marked "overlap" duplicate the meaning of a row above; the owner of the document that uses the name is asked in 00b ("Findings for other owners") to adopt the catalogue name, after which the overlap row is deleted.

| Name | Props (keys) | Emitted when | Owner and note |
|---|---|---|---|
| `challenge_issued` / `challenge_renewed` / `challenge_expired` | `project_key`, `step_key`, `attempt_no`, `ttl_h` | Nonce challenge issued, renewed or expired | 10 section 7.4.3 |
| `evidence_checked` | `project_key`, `step_key`, `decision`, `failed_checks` | Automated checks finished | 10 section 7.7 |
| `evidence_reviewed` | `project_key`, `step_key`, `reason_code`, `self_review`, `review_s` | Human review decided | 10 section 7.6 |
| `project_step_done` | `project_key`, `step_key`, `assisted` | Step completed | 10 section 8.2 |
| `project_credit_written` / `project_credit_applied` / `project_credit_suspended` | `project_key`, `step_key`, `skill_key`, `tier` | Row of `project_grants` written, applied or suspended | 10 section 8.2 |
| `bench_state_saved` | `project_key`, `step_key` | Bench state saved | 10 section 5.7 |
| `safety_ack` | `project_key`, `brief_version`, `phrase_hash` | Safety phrase accepted | 10 section 5.3 |
| `tutor_policy_flag` | `thread_id`, `flag`, `skill_key` | One per true `policy_flags` key | 08 section 8 |
| `tutor_reveal` | `thread_id`, `item_id`, `skill_key` | Level 4 reveal confirmed | 08 section 7 |
| `tutor_fallback_static` | `thread_id`, `item_id`, `reason` | Tutor replaced by static solution | 08 section 8 |
| `session_built` | `session_id`, `session_type`, `context`, `available_minutes`, `fill`, `builder_ms` | Builder returns | 06 section 12 |
| `task_started` / `task_submitted` | `task_id`, `item_id`, `r_pred`, `e_pred`, `latency_ms` | Task opened or answered | 06 section 12; overlap with `task_shown` / `attempt_submitted` |
| `rating_assigned` | `skill_key`, `rating`, `flags`, `unit_size`, `scheduled_days`, `fuzz_applied` | FSRS rating chosen | 06 section 12 |
| `elo_updated` | `skill_key`, `theta_before`, `theta_after`, `d_before`, `d_after`, `weight`, `K` | Elo update | 06 section 12 |
| `mastery_changed` | `skill_key`, `from`, `to`, `checks`, `qualifying_count` | Mastery state change | 06 section 12; overlap with `skill_state_changed` |
| `tier_changed` | `skill_key`, `from`, `to` | Skill tier changes | 06 section 12 |
| `frontier_computed` | `size`, `top5` | Once per session build | 06 section 12 |
| `interleave_stage_changed` | `group`, `from`, `to`, `last_accuracies` | Interleaving stage change | 06 section 12 |
| `checkpoint_scheduled` | `scope`, `module`, `scheduled_for` | Checkpoint created | 06 section 12 |
| `stuck_detected` / `trace_result` | `skill_key`, `reason`, `suspects`, `outcome` | Stuck detection and trace | 06 section 12 |
| `plan_generated` / `slot_missed` / `plan_rebalanced` | `plan_id`, `slot_id`, `actions` | Weekly plan events | 06 section 12 |
| `fsrs_calibration` | `n_reviews`, `brier`, `bins` | Nightly job | 06 section 12; OM-12 |
| `hint_reliance_flag` | `scope`, `rate` | Reliance flag | 06 section 12 |
| `gaming_flag` | `kind` | Gaming heuristic fires | 06 section 12 |
| `content_review_flag` | `skill_key`, `templates` | Content flagged | 06 section 12 |
| `checkpoint_gap_flag` | `node`, `strict_acc`, `aided_acc`, `gap`, `n_attempts`, `n_checkpoints`, `triggered` | The over-reliance check (G6) runs after a checkpoint completes: logged whether or not it triggers | 06 section 9, 08 section 7; OM-04, H3 |
| `tutor_mode_changed` | `node`, `from_mode`, `to_mode`, `reason`, `gap` | The tutor switches between normal and post-attempt-only for a node (G6), or switches back | 08 section 7, 09 S10; OM-04, H3 |
| `fsrs_calibration_bucket` | `interval_bucket`, `n_reviews`, `predicted_mean`, `observed_mean`, `same_template_share`, `hard_again_share` | One row per interval bucket (1-3, 4-7, 8-30, over 30 days) in each nightly calibration run | 06 section 12; OM-14, G5 |
| `nightly_maintenance_completed` | `job_id`, `steps`, `duration_s`, `n_decayed`, `status` | The `nightly_maintenance` job (G15: calibration, decay evaluation, tutor audit) finishes | 03 section 8; ops, OM-12, OM-14 |

Data-model additions the evaluation needs, which the contract allows without a request (columns may be added): `attempts.active_ms`, `attempts.assessment_kind` mirror, `item_templates.pool` (the pool belongs to the template, not the item), an `analysis_exclusions` table (`id`, `experiment_key`, `user_id`, `unit_key`, `reason`, `decided_by`, `decided_at`), and SQL views listed in section 10. All of these were ratified in 00a section C. Tutor analysis does not need a model column or an attempt column on tutor messages: the baseline schema records `tutor_messages.prompt_version` and `tutor_messages.llm_call_id` (joined to `llm_calls.model`), and links a thread to its item and session through `tutor_threads.item_id` and `tutor_threads.session_id`, so tutor-on versus tutor-off comparisons join through those columns.

---

## 10. Dashboards

All are SQL views over `events` and the core tables, plus a private `/admin/metrics` route in the Next.js app and a Python analysis package (`analysis/`, pandas and statsmodels) run from notebooks. No third-party analytics.

| ID | Dashboard | Audience | Content | Blinding rule |
|---|---|---|---|---|
| D1 | Founder weekly | P1 | Minutes vs target, active days, review debt, due today, strict-unaided vs aided accuracy (SM-04), checkpoint scores, next delayed tests, confusable-set queue | None |
| D2 | Experiment monitor | P3 | Pairs formed, assigned, completed; days to each delayed test; balance of order; overrides; missing tests | **Shows counts and dates only. Outcome means by arm are hidden until the pre-registered analysis date**, except safety checks in section 12 |
| D3 | Content quality | P3 | Items served, reported, retired; verification failures; grader audits (OM-09); latency p95 versus contract section 10 | None |
| D4 | Beta cohort | P3 | Enrolment, arm balance, attrition by arm, adherence by arm (process only), checkpoint participation, support issues | Outcome by arm hidden until analysis |
| D5 | Scheduler health | P3 | Predicted vs observed recall (OM-12), observed minus predicted by interval bucket (OM-14), interval distribution, lapse rate, review debt, checkpoint-gap flags and tutor-mode switches | None |

Views: `v_weekly_adherence`, `v_active_minutes`, `v_attempts_strict_unaided`, `v_aided_unaided_gap`, `v_delayed_tests`, `v_experiment_pairs`, `v_exposure_completeness`, `v_item_quality`, `v_scheduler_calibration`.

---

## 11. Analysis plan, missing data, quality

### 11.1 Common rules

- **Populations:** intention-to-treat (all randomised) for BETA-001 primary; all assigned pairs with complete outcomes for founder experiments, with sensitivity analyses for missing pairs.
- **Exclusions:** attempts on retired items (FR-066), attempts flagged by `experiment_override` in a per-protocol sensitivity analysis only, duplicate offline submissions (keep earliest client time, server grade).
- **Estimates over p-values:** always report the effect, its 95% interval and the sample, and all pre-specified nulls.
- **Multiplicity:** one primary outcome per experiment; for BETA-001 four key secondaries adjusted jointly by Holm; everything else descriptive.
- **Code:** analysis scripts are written and committed (git tag `prereg/<id>`) before the first outcome exists, run on simulated data first, and rerun unchanged on real data.

### 11.2 BETA-001 primary model

Score at T2 ~ arm + baseline target-set score + stratum (weekly-hours group), ordinary least squares with HC3 robust errors. Report adjusted mean difference, 95% CI, standardised effect (Hedges g with CI). Sensitivity: stratified permutation test (10,000 permutations); item-level logistic mixed model (correct ~ arm + baseline + (1 | learner) + (1 | skill)); non-parametric rank test.

Time-to-criterion: Kaplan–Meier curves by arm and a Cox model on active minutes, censored at week 12; report the hazard ratio and the ratio of medians if estimable.

### 11.3 Missing data

| Situation | Handling |
|---|---|
| Learner drops before T2 | Primary ITT with multiple imputation (50 imputations, chained equations) using baseline score, stratum, adherence in weeks 1–6, T1 score if present. Sensitivity: complete-case; tipping-point analysis shifting imputed treatment-arm scores down by 0 to 0.20; worst-case bound |
| Partial checkpoint | Score is the mean of answered items if ≥ 60% answered, else missing |
| Missing confidence | Excluded from OM-08 only |
| Delayed test outside the ±7-day window | Kept with actual lag as a covariate if within ±21 days; otherwise missing |
| Founder skips a scheduled delayed test | Pair marked missing; reason recorded; if > 25% of pairs are missing the result is labelled unreliable |
| Offline attempts with clock skew | Server receipt order used for sequencing, client time for dwell only |
| Non-random attrition | Differential attrition by arm is itself reported as a secondary finding (OM-06) |

### 11.4 Grader and content quality in analysis

Outcome items come only from templates that passed the verification gate and, for OM-01, from the assessment pool. A wrong item discovered after the fact is excluded and the analysis is re-run; the exclusion list is published with the results.

---

## 12. Stopping rules

No early stopping for efficacy anywhere (too little data; inflates error). Stops are for safety, data validity, and futility of the process.

| ID | Rule | Action |
|---|---|---|
| ST-01 | Confirmed wrong item rate above 1 per 200 served in any rolling week, or any wrong item in an outcome test | Pause generation of new variants for the affected templates; re-verify; re-run affected analyses |
| ST-02 | Any physical-safety incident or near-miss in a build (burn, shock, battery event) | Pause projects for the learner, review the step's safety card, report to the founder; stop the project ladder for all if the cause is in the content |
| ST-03 | Interim safety look at the midpoint of BETA-001 (week 6 for all) and at 6 pairs for EXP-001: if the treatment arm's strict-unaided checkpoint mean is lower than control by ≥ 0.5 SD (beta) or the treatment mean pair difference is ≤ −0.15 (EXP-001), as a point estimate | Founder review within 7 days; pause the arm-specific feature if the review judges the mechanism plausible; not an automatic stop. The look is descriptive and does not spend alpha for efficacy |
| ST-04 | Attrition above 50% in either arm by week 6 | Stop enrolment, run exit interviews, redesign onboarding or session design before restarting |
| ST-05 | Learner withdraws or distress reported | Immediate removal from analysis unless they consent to keep data; offer support contact |
| ST-06 | Grader audit below 95% agreement (OM-09) | Freeze the grader's items from outcome measurement until fixed |
| ST-07 | Exposure completeness below 95% (SM-14) after two weeks | Fix logging before further assignment |
| ST-08 | Tutor policy audit finds > 1 answer leak per 100 sampled messages | Disable level 3–4 hints until the guard is fixed |

---

## 13. Pre-registration template

Stored at `experiments/<id>/prereg.md`. The git tag `prereg/<id>-vN` and the file's SHA-256, recorded in `experiments.preregistration_ref` (CCR-01), are created **before the first `experiment_assigned` event**. Changes after freezing are new versions with a change log; analyses use the version in force at data lock.

```
ID:                 EXP-xxx / BETA-xxx
Title:
Version / date:     (frozen at git tag; SHA-256 recorded)
Status:             draft | frozen | running | analysed | closed
Investigator(s):
1. Question and rationale (with evidence tags and links to 02 mechanism IDs)
2. Hypotheses (directional, with decision thresholds)
3. Design (within-subject / randomised; unit; arms and exact definitions of each condition)
4. Eligibility of units/participants (inclusion, exclusion)
5. Matching and randomisation (algorithm, seed handling, counterbalancing, concealment, washout)
6. Procedure and timeline (schedule of exposures, tests, windows)
7. Outcomes
   7.1 Primary outcome (definition, instrument, timing, scoring)
   7.2 Secondary and exploratory outcomes
8. Sample size and power (target, assumed SD, minimum detectable effect, justification)
9. Analysis plan (estimand, model, tests, sensitivity, multiplicity)
10. Missing data and deviations (rules, imputation, protocol deviation handling)
11. Stopping rules and safety looks
12. Decision rule (link to rubric rows)
13. Data and code (tables/views, analysis script path, data lock date)
14. Ethics and consent (consent version, review status)
15. Limitations declared in advance
16. Change log
```

---

## 14. Decision rubric

### 14.1 Principle

Because the experiments are small, decisions are **estimate-based and asymmetric**: protect against harm first, keep a mechanism if the evidence does not credibly show harm and the cost is low, and change a default only on credible negative or consistent no-benefit evidence. "Credible" means the point estimate is on the harm side of the stated margin and the 80% interval excludes zero, or the 95% interval excludes zero.

### 14.2 Rubric

| ID | Result (pre-registered measure) | Design change |
|---|---|---|
| DR-01 | EXP-001 or BETA-001: tutor-on delayed strict-unaided score is lower than tutor-off by more than 0.10 (point estimate), with the 80% interval excluding 0 | Tighten the tutor: raise the attempt requirement (two submitted attempts), delay hint level 2 until after a pause, cap hints per item and per day, remove level 3 from non-debug items, make the tutor post-attempt only (explain after submission). Re-test (EXP-001b) |
| DR-02 | Tutor-on is within 0.10 of tutor-off, and minutes-to-mastery is not lower by at least 15% | Keep the tutor but demote it to optional/on-request in sessions; stop proactive offers (FR-055) |
| DR-03 | Tutor-on is higher by at least 0.05 with the 95% interval excluding 0 | Keep default; consider widening tutor scope; do not publish an efficacy claim before the claims gate |
| DR-04 | Projects completed by the founder or ≥ 50% of the project-completing beta learners, but strict-unaided module checkpoint < 0.60 in the same period (Report A: "if learners finish builds but fail strict-unaided delayed checks, fix the loop before adding content") | Freeze new content; increase strict-unaided checkpoint frequency (7-day cadence); add faded-build steps; add retrieval of the skills a project uses before the next project step |
| DR-05 | Delayed strict-unaided retention (OM-01) below 0.60 for the founder over 20+ skills, or the 95% interval upper bound below 0.70 (H1 fails) | If OM-12 shows overestimated retrievability (observed − predicted > 0.07): raise target retention to 0.93 and cap intervals at 60 days. If calibration is fine but retention low: add extra successive relearning (a fourth correct strict-unaided attempt) before the first long interval |
| DR-06 | BETA-001 time-to-criterion ratio of medians ≥ 0.9 with a 95% interval including 1 | Drop H2; remove any time-based marketing hypothesis; keep the time estimates in the UI labelled as personal pace estimates. If the ratio ≤ 0.75 with the interval excluding 1, record "exploratory finding in a small trial" and plan a larger trial; no UI claim |
| DR-07 | EXP-002: interleaved − blocked point estimate ≤ −0.05 with the 80% interval excluding 0 | Make blocked the default, interleave only for explicit mixed-review sessions; keep the strategy-selection prompt. If the point estimate is positive or inside ±0.05, keep the default (consistent with evidence [V] g = 0.34 in math) and keep accruing sets |
| DR-08 | EXP-003: pattern-gym accuracy improvement < 0.05 and no response-time gain | Cut perceptual drills from default sessions; keep as optional |
| DR-09 | EXP-004: explain-back shows ≤ 0 effect and median 3 minutes per use | Make explain-back optional or limit to selected skills |
| DR-10 | H7: adherence < 50% of target for 4 consecutive weeks (founder) or week-12 activity < 40% (beta) | Redesign session length, reminders and plan before adding content |
| DR-11 | OM-12: calibration error > 0.07 or AUC < 0.60, or OM-14 signed difference below -0.07 in any interval bucket with at least 30 reviews | Stay at (or return to) `desired_retention` 0.85, refit FSRS parameters; test an alternative scheduler offline using the stored logs (LS-004) |
| DR-12 | OM-04: median gap > 0.20 for 4 weeks | Raise the strict-unaided share of practice, convert more hints to post-attempt review, tell the learner the gap in the progress view |
| DR-13 | OM-09: grader–human agreement < 95% or confirmed wrong item rate > 1 per 500 | Freeze the grader or template family; manual re-verification; stricter independent recompute |
| DR-14 | Differential attrition > 20 percentage points between arms | Treat arm as having a usability problem; review exit reasons; adjust before any comparative interpretation |

### 14.3 Claims gate

No efficacy or time-saving statement appears in the UI, marketing or documents until all hold: a pre-registered primary result exists; its 95% interval excludes zero in the claimed direction; sample size and design are stated in the sentence; the result is reproduced either by a second cohort or an independent re-analysis of the same data by someone other than the analyst; and the wording passes the language policy (PRD section 11). Permitted form: "In our pre-registered pilot (N = …, 20 weeks), learners using plan A scored X points higher on an strict-unaided test 8 weeks later (95% interval …). The pilot was small." Anything else is forbidden.

---

## 15. Worked example: pre-registration of the first experiment (EXP-001)

This is the complete pre-registration text in the section 13 format, written for the first experiment. Dates are illustrative and fixed at freeze time.

```
ID:                 EXP-001
Title:              Attempt-first hint-ladder tutor versus no tutor, skill-level,
                    within one learner (the founder)
Version / date:     v1.0, draft dated 31 Oct 2026; frozen at git tag
                    prereg/exp-001-v1 before the first experiment_assigned event
                    (planned at M2 exit, indicative Apr 2027)
Status:             draft
Investigator:       Founder (also the participant, product builder and reviewer)

1. Question and rationale
   Does learning a skill with the guarded tutor (attempt-first, hint ladder
   1 to 4, reference solution pre-loaded; mechanism M05 in 02) change what the
   learner can do alone 8 weeks later, compared with learning it with only
   post-submission worked solutions? Reason: unguarded GPT tutoring raised
   practice scores about 48% but cut unaided exam scores about 17% [V, Bastani];
   the guardrailed tutor removed the harm but gave no exam gain [V]; Harvard
   found large short-term gains [V secondary]; a 2026 working paper found tutor
   access lowered grades by 0.37 SD [B, not peer reviewed]. No study covers
   hardware/software skills or this tutor [Report A gaps].

2. Hypotheses
   H3-a (harm check, primary conclusion): delayed strict-unaided score with tutor (ON)
        is not lower than without (OFF) by more than 0.10.
   H3-b (exploratory): ON requires fewer active minutes to mastery.
   No directional superiority hypothesis on the delayed score is tested.
   Prior expectation: difference between -0.05 and +0.10 [inf].

3. Design
   Within-subject randomised design at skill level; matched pairs; one skill per
   condition; no skill is exposed to both.
   ON (maps to experiment_arm = treatment): tutor entry point visible; policy
        FR-050 to FR-055 and LS-060 to LS-066 in force.
   OFF (maps to control): tutor entry point hidden. After each submission the
        learner sees grader feedback and the full verified worked solution
        (equivalent to hint level 4 with the usual credit loss); no chat, no
        hint levels. After 3 failed submissions, the worked solution is
        shown as in ON. Everything else is identical (items, FSRS, session
        builder, confidence ratings, checkpoints).

4. Eligibility of units
   Skills in the nodes math, elec, sw that have: >= 20 verified seeds; at least
   one faded_problem and one problem template; no hard prerequisite edge to the
   partner skill; est_minutes within +/-25% of partner; difficulty_prior within
   0.15 of partner; not part of EXP-002 or EXP-004 pairs. Unmatched skills are not randomised
   and receive ON (default).
   Illustrative pairs (actual keys come from content at module start):
   elec.dc.voltage-divider / elec.dc.thevenin-equivalent;
   math.alg.solve-linear-equations / math.alg.factor-quadratics;
   sw.c.pointers-basics / sw.c.struct-layout;
   elec.dc.series-parallel-resistance / elec.dc.power-dissipation.

5. Matching and randomisation
   At each module start the system forms pairs by greedy nearest-neighbour matching
   on |est_minutes ratio| and |difficulty_prior difference|, then assigns ON to one
   member of each pair with a PRNG (seed = first 8 bytes of SHA-256 of
   "EXP-001|" + pair_id + "|" + the secret string stored outside the repo).
   A balanced list ensures that in every group of 4 pairs, 2 pairs give ON to the
   skill the frontier reaches first. Assignments are written once to
   experiment_assignments (unit_type = skill, unit_key = skill_key, rng_seed,
   block_index). No re-rolling. Overrides produce experiment_override events.
   Washout: skills are not shared across conditions. A one-week no-experiment
   period (all skills ON) precedes the first assignment. Conditions alternate in
   time within a module, not in blocks. The pair-order index is a covariate.
   Concealment is impossible for the learner; outcomes are auto-graded and
   delayed tests mix ON and OFF skills with no condition labels.

6. Procedure and timeline
   Learning phase per skill: normal loop (worked example, faded problems,
   same-day retrieval, FSRS reviews) in the assigned condition.
   t0 = date the skill first reaches mastered, or day 28 after first exposure if
   not mastered by then (whichever is earlier). Delayed test at t0 + 56 days
   (window +/-7; up to +/-21 accepted with the lag as covariate).
   Belief survey (OM-10) at module end, before any score is shown.
   Enrolment of pairs: from M2 exit until 12 pairs have a completed delayed test,
   or 30 Jun 2028, whichever is first. Continuation to 24 pairs is pre-specified
   (see 8).

7. Outcomes
   7.1 Primary: OM-01 delayed strict-unaided retention per skill = mean score over 5
       items (4 unseen variants from the assessment pool and 1 transfer-pool
       item), strict-unaided (max_hint_level = 0, no tutor panel opened; view
       v_attempts_strict_unaided), auto-graded
       (exact_numeric, symbolic_equivalence, code_tests or spice_compare).
       Pair difference d_i = score(ON skill) - score(OFF skill).
   7.2 Secondary (exploratory): active minutes to t0 (log ratio ON/OFF);
       hint reliance index (ON only); immediate module checkpoint score;
       confidence calibration (OM-08); belief (OM-10); tutor messages per attempt.

8. Sample size and power
   Target: 12 completed pairs for the first analysis, 24 for the confirmatory
   analysis. Assumed SD of pair differences 0.175 (range 0.15 to 0.20) [inf].
   Minimum detectable difference at 80% power, alpha 0.05 two-sided: about 0.16
   at 12 pairs (0.13 to 0.18) and about 0.11 at 24 pairs (0.09 to 0.12).
   A true difference smaller than these will probably not be detected. The
   expected finding at 12 pairs is inconclusive; the decision rubric (DR-01 to
   DR-03) is estimate-based for this reason. The 12-pair analysis is reported as
   interim and descriptive; the formal test (alpha 0.05) is applied once, at 24
   pairs or at the stop date.
   The SD is re-estimated from the observed pair differences after 8 pairs
   without unblinding the direction (variance only).

9. Analysis plan
   Estimand: mean of d_i.
   Test: exact sign-flip randomisation test on the d_i (2^n patterns), two-sided
   alpha 0.05. 95% CI: t-based and permutation-based. For the harm check,
   compare the lower bound of the 90% CI with -0.10.
   Sensitivity: item-level logistic mixed model, correct ~ condition +
   pair_order_index + (1 | pair) + (1 | skill); Bayesian posterior with a
   normal(0, 0.10) prior on the mean difference; per-protocol analysis excluding
   pairs with an override; leave-one-pair-out.
   Multiplicity: one primary; secondaries exploratory.
   Software: analysis/exp001.py, written and run on simulated data before
   freeze, rerun unchanged at data lock.

10. Missing data and deviations
   Pair with a missing delayed test (outside +/-21 days or skipped): excluded from
   the primary; sensitivity analyses impute the missing member with the
   observed mean of its condition, and with worst-case values (ON = 0, OFF =
   observed mean). If more than 25% of pairs are missing, the result is labelled
   unreliable. Tutor opened in an OFF skill (override): logged, analysed per
   assignment (intention to treat) and per protocol. Items retired after
   serving are excluded.

11. Stopping rules and safety looks
   Descriptive harm look at 6 completed pairs: if the mean pair difference is
   <= -0.15 (point estimate), the founder reviews the tutor policy within 7 days
   (ST-03); no efficacy stopping. Other stops: ST-01, ST-06, ST-07, ST-08.

12. Decision rule
   Rubric DR-01, DR-02, DR-03 (section 14). At 12 pairs, rubric rows are applied
   as estimate-based guidance and cannot trigger a public claim.

13. Data and code
   Views v_experiment_pairs and v_delayed_tests; export through FR-113; script
   analysis/exp001.py; data lock when the stop condition is met; results
   committed to experiments/exp-001/results.md with all pre-specified nulls.

14. Ethics and consent
   Participant is the founder; consent_version recorded for the self-record
   (FR-004). The protocol is shared with the independent advisory reviewer
   (section 8, item 8) before the freeze. No review is claimed here.

15. Limitations declared in advance
   One participant; not blinded; skills may interact; low power; the founder
   knows the hypotheses and built the tutor; results do not transfer to other
   learners; effects past 8 weeks are not measured.

16. Change log
   v1.0 - initial version.
```

---

## 16. Limits and unverified items

- Every numeric threshold with [P] or [inf] (retention 0.70, 0.10 margins, SD 0.175, completion 80%) is a planning default, not a finding.
- Effect sizes cited from the literature are as tagged in the reports; many are [R] and should be checked against the source before any publication.
- The 150–300 h baseline and 25–40% saving have no source (section 3).
- The EU AI Act education-category timing, the Cyber Resilience Act, neural-data statutes and the data-protection rules for research participants come from the reports' sources, which were not independently checked here; counsel review is required.
- The power tables use normal and t approximations and an assumed SD; they should be recomputed with observed variances after the first 8 pairs and after the beta pilot.
- Indicative calendar windows are estimates tied to the 8 h/week assumption.

## 17. Resolved by 00a (v1.1)

| ID | Outcome | Where it landed |
|---|---|---|
| CCR-11 (`attempts.active_ms`) | Accepted | 00a section C |
| CCR-12 (`analysis_exclusions`) | Modified | 00a section C: columns are `id`, `experiment_key`, `user_id`, `unit_key`, `reason`, `decided_by`, `decided_at` (exclusions are decided per experiment unit, not per generic entity) |
| CCR-13 (`experiments.design` fields; arm labels) | Accepted | 00a section C (`experiments.design` jsonb carries `unit_type`, `arm_labels` and pairing rules; `experiment_arm` stays `control`/`treatment`, named conditions map onto them) |

Also required from 01 section 13, all decided by 00a: CCR-01 (unit-level assignment, pre-registration reference) accepted; CCR-02 (strict `unaided`) modified into the term **strict-unaided** and the view `v_attempts_strict_unaided` (B1), used throughout this document; CCR-03 (item pools and assessment kinds) accepted; CCR-05 (event catalogue) accepted: **this document's catalogue in section 9 is the normative list of event names** (D6); CCR-07 (delayed-test scheduling and export in scope) accepted as a clarification; CCR-08 (active-control semantics) accepted (D7): the control arm is an active control with static syllabus order, blocked practice, a fixed review schedule and no tutor chat.
