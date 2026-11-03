# 01 — Product Requirements Document (PRD)

Status: v1.0, 31 Oct 2026. Owner: product. Binding upstream: `00-contract.md`. Companion documents: `02-learning-science-spec.md` (mechanisms, parameters, evidence), `06` (scheduler and learner model; canonical for FSRS, mastery and rating rules), `11-evaluation-and-experiment-plan.md` (how we find out whether it works).

## At a glance

*One page for a reader who has five minutes. Nothing here changes a requirement, an ID or a milestone definition; the sections below remain authoritative. Updated 31 October 2026 with the lean-first plan.*

**What it is.** A mobile-first adaptive practice app (PWA) that takes one adult from near zero to working knowledge (tier L1) in a vertical slice of hardware and software engineering: a skill graph, per-skill spaced retrieval (FSRS), a frontier of next skills, short sessions (micro 5 to 20 min, focus 45 to 120 min), generated and verified problem variants, execution-based grading, a guarded AI tutor and physical build projects verified by evidence. Positioning: *adaptive practice with spaced retrieval, graded feedback and guided builds* (contract section 8).

**Who and what constraint.** The first and, until M4, only user is the founder, who works full time and has about 8 hours a week, builds with AI coding agents, and wants to *learn* with those same hours. The 8 hours cannot be spent twice (R-22).

**What is unproven (section 1.3).** That the founder will study daily with the loop; that per-skill FSRS with fresh generated variants is calibrated; that the tutor helps rather than creates dependence; that build projects can be verified from evidence; that the combination beats a plain flashcard routine. The retrieval, spacing and fading mechanisms have outside evidence [R/V]; the combination is a proposal [P].

**Plan, lean first.**

| Step | What | Founder effort [P] | Calendar at 8 h/week with learning protected | At 5 h/week |
|---|---|---|---|---|
| Phase -1 | No-build 4-week pre-experiment: Anki with FSRS, problem sheets from the sample template generators, a spreadsheet log (`00d-lean-slice-plan.md` section 4) | 6 h plus the study | Nov 2026 | Nov 2026 |
| Lean slice (about M0 plus M1: 83 tasks) | Daily study with the real loop: graph, FSRS, frontier, micro and focus sessions, numeric, symbolic and multiple-choice grading, worked example then faded problems then retrieval, progress view, 30 to 40 verified templates, manual project log | about 239 h central (161 to 359), which is 233 h of building plus the 6 h of Phase -1 | first daily use August 2027, complete October 2027 | first use December 2027, complete May 2028 |
| Go/no-go | Four weeks after first use, scorecard of 10 indicators (`00d` section 8) | 2 h | Aug 2027 | Jan 2028 |
| Deferred groups D1 to D9 (M2 to M5: tutor, sandbox, projects, experiments, offline, beta) | Started one at a time after a go decision | about 529 h more (362 to 821) | not before 2028; the full plan is about three years of building at this pace | several years |

All numbers are [P]. They come from `docs/13-roadmap-and-backlog.md` section 3.3 (the founder-attention model, which separates agent compute time from founder review, decision and manual time) and from `python3 reference/validate_backlog.py`. The original milestone windows in section 10 (M5 from September 2027, about 360 hours) are not achievable for the full plan in any modelled case; they remain as the original proposal.

**Success looks like** (section 5): the founder studies at least 75 percent of the planned minutes on at least 4 days a week (SM-01, SM-02); no unverified item is ever served (SM-06); delayed unaided retention of at least 0.70 on strict-unaided tests (SM-03, a heuristic aspiration); wrong items are rare and retired fast (SM-07). A beta of 10 to 50 learners (M5) is exploratory and cannot test time to L1.

**What would make us stop or change.** Phase -1 adherence below 50 percent; the go/no-go scorecard; logged hours more than twice the model; any claim the evidence does not support (claims gate, doc 11 section 14.3).

**Concept refinements (section 1.4).** Progress is the next competence artifact; the tutor (when built) is item-bound structured help, not a chat app; simulation is a commute track and does not replace bench L1; project credit is capped applied credit, never mastery; the purpose is L1 in each subject, starting with the first walk. None of this adds lean-slice tasks.

**Long-term capability spine (section 1.5).** After the first walk, the product expands along documented tracks (power, control, mechanical, UAV integration, cloud twin, governance) for dual-use literacy, defense-industrial integration, production AI, cybersecurity, and real-world builds—see `docs/15-cyber-physical-capability-spine.md` and `docs/16-capability-outcomes.md`. The lean slice and M0–M1 scope are unchanged.

**Where to read next.** `docs/00d-lean-slice-plan.md` (what to build first), `docs/13-roadmap-and-backlog.md` (estimates, cut list), `docs/15-cyber-physical-capability-spine.md` (long-term tracks), `docs/00-contract.md` (the rules), `docs/14-risk-register.md` (R-22 to R-25 are new).

---

Conventions in this document

- **Evidence tags** follow the contract: [V] source opened and read, [S] snippet only, [R] recalled and unverified, [P]/[inf] design proposal or inference. Anything tagged [R], [S], [P] or [inf] is a hypothesis to be tested by 11. It is never stated as fact in UI copy.
- **IDs:** epics `E1…E13`, user stories `US-001…`, functional requirements `FR-001…`, non-functional `NFR-01…`, success metrics `SM-01…`, non-goals `NG-01…`, open questions `OQ-01…`, learning-science requirements `LS-…` (defined in 02).
- **Priority** is MoSCoW: Must, Should, Could, Won't (this release line). Each FR names the milestone (M0–M5, section 10) in which it must be demonstrable.
- **Cross-references to other documents** use the document number where the contract fixes it (00, 01, 02, 06, 11). The contract does not number the remaining documents, so they are referred to by topic (the data-model document, the tutor-policy document, the content-pipeline document, the grading-and-verification document, the screens document). See CONTRACT CHANGE REQUEST CCR-06.
- **Terms** are those of the contract: tiers `L0–L3`, session types `micro`/`focus`/`lab`, contexts `phone`/`desktop`/`bench`, task kinds, hint levels 0–4, and so on, with exact spellings.

---

## 1. Problem and vision

### 1.1 Problem

A working adult who wants to become competent in hardware and software engineering faces four problems at once.

1. **Time scarcity.** The founder works full time and has about 8 hours a week. Reaching working knowledge (tier L1) in one node is estimated at 150–300 hours [P: the research report proposes these tier hours; no time-to-competence data exist for embedded, PCB, firmware or security subfields]. At 8 hours a week that is roughly 19–38 weeks per node, so wasted minutes are expensive.
2. **Illusion of progress.** Watching lectures or following tutorials feels productive but does not produce unaided skill. The research is explicit that practice scores can rise while unaided performance falls (the Bastani result, an unguarded GPT tutor raised practice scores about 48% and cut unaided exam scores about 17% [V]).
3. **Forgetting and sequencing.** Without scheduled retrieval, skills decay. Without a prerequisite graph, learners hit material they are not ready for or repeat what they already know.
4. **Hardware is physical.** Skills are only real when a board works. Most learning apps stop at quizzes, so the learner cannot tell whether bench skill exists.

### 1.2 Vision

An adaptive practice app that takes one adult from near zero to working knowledge (L1) in each subject on the map, starting with a first walk through math, electronics and embedded software, then widening. Every task requires the learner to produce something. Sessions are short, a skill graph decides what is next, spaced retrieval brings skills back before they fade, a guarded AI tutor helps only after an honest attempt, execution-based graders check answers, and physical builds are verified by evidence. The app also measures itself: it separates aided from unaided performance and runs controlled comparisons so the founder learns whether each mechanism actually helps.

Position statement for all copy: *adaptive practice with spaced retrieval, graded feedback and guided builds* (contract section 8). The app makes no neuroscience, neurostimulation or "top 1%" claims. The strongest honest differentiator is empirical: publishing the app's own delayed, unaided results (see 11).

### 1.3 Product thesis and the part that is unproven

The evidence-backed core is domain-agnostic: retrieval practice, spacing, fading worked examples, interleaving of confusable problem types, and attempt-first tutoring [R/V, see 02]. The product's own differentiating combination (adaptive graph plus hardware builds plus SPICE and unit-test grading plus tutor) rests on design inference [P]. No study supports cross-discipline interleaving, build-project loops or SPICE-based grading for this use. The release plan therefore includes measurement from the first milestone (FR-110, FR-111) so that the product generates the evidence the literature lacks.

### 1.4 Concept refinements (v1.1)

These refine positioning and later UX. They do not add tables, enums, routes or lean-slice tasks. They do not relax the claims policy, the verification gate, NG-02–NG-10, or 00a B5. Pattern gym (FR-035), a built-in simulator, a cohort, and a second credit system stay out of the lean slice and are not pulled into M1.

1. **Competence artifacts.** The progress object is the next named artifact plus what still remains for it (contract 7.13, FR-090, FR-091). Example for display: L1 on `elec` means the L1-gated skills and the gate project's required evidence, not hours or a node count. Hour estimates stay labelled [P].
2. **Tutor is structured, item-bound help (D2).** When the tutor ships, the default UI is the hint ladder and a short post-attempt review on the **open item** (FR-050, FR-051). There is no persistent chat across items. Daily message cap (OQ-06). Tutor stays off on checkpoints (FR-053). Tutor-off weeks remain a planned n-of-1 arm (SM-04, 11).
3. **Dual context, one skill.** Phone and desktop carry numeric, multiple-choice, symbolic and (later) sim or SPICE tasks. Bench carries predict-then-measure and project steps. Shared FSRS state. Simulation never substitutes for the applied/bench attempt required at L1 (`needs_applied`, NG-10). Do not build a first-party circuit simulator; a later commute track may deep-link out.
4. **Project credit is capped applied credit.** Accepted evidence writes `project_grants` per 00a B5 / contract 7.15: L0 now, pending L1 until accepted, applied-condition only, never `mastered` from a build alone, never L2 or L3. No extra implicit-review ledger.
5. **Purpose is L1 in each subject; the first walk is the slice.** User-facing purpose: from near zero to working knowledge (L1) in each subject. The first walk is math essentials, `elec`, `sw` with embedded topics (NG-05 still limits what v1 *ships*). After that walk is evidenced, the same loop covers the remaining nodes. One spine can later go to L2 (OQ-08).

### 1.5 Long-term north star — cyber-physical capability (v1.2)

The founder’s intent beyond the first walk is to reach **credible solo cyber-physical engineering**: real hardware and firmware, secure cloud and production AI, and **governance literacy** for dual-use and defense-industrial work—not clearance, export licensing authority, or weapons design.

| Founder goal | Spine response (doc 15) |
|---|---|
| Build dual-use technology | Governance track: export Annex I literacy, technical files, classification workflow with counsel |
| Work on defense tech | Integration and security architecture, test evidence, supply-chain narrative (no classified content) |
| Work on AI projects | Cloud-twin track: MLOps/LLMOps, evals, edge inference at the device boundary |
| Work on cybersecurity projects | OT/embedded plus cloud; threat modelling and zones/conduits |
| Build real things | Foundation L0–L5, then power, mechanical, and UAV ladder L6–L13 |

**Product boundary (unchanged for v1 build):** section 1.5 adds **no** lean-slice task, table, enum or route. Tracks ship incrementally after first-walk L1 and the go/no-go (00d section 8). Credible outcomes after the full spine are summarised in `docs/16-capability-outcomes.md` [P].

---

## 2. Target users and personas

### 2.1 P1 — The Founder (primary, M0 onward)

| Attribute | Value |
|---|---|
| Situation | Full-time worker; self-directed learner; also the builder (uses AI coding agents) and the content reviewer |
| Time | About 8 hours a week target (`profiles.weekly_minutes_target` default 480). Fragmented: commute, lunch, evenings, one weekend bench block |
| Starting point | Near-zero in the slice domains (assumption A-01; confirmed by diagnostic in FR-003) |
| Devices | Phone for micro sessions; laptop for focus blocks and code; bench for lab blocks (multimeter, oscilloscope or logic analyzer if owned, microcontroller board) |
| Goal | L1 on the first walk (math essentials, `elec`, `sw` with embedded topics), proved by a working sensor-logging board and unaided checkpoints; long-term tracks in doc 15 after that |
| Wants | A vertical slice first; micro-learning that fits gaps in the day; honest numbers about progress; no gamified noise |
| Fears | Spending months on content that does not stick; the tutor doing the thinking; a wrong auto-graded answer teaching the wrong thing |
| Example week (target 7.5 h) | Mon–Thu: one 15-minute micro each day on phone (1.0 h). Tue and Thu: 60-minute focus block on desktop (2.0 h). Sat: 3-hour lab block at the bench (3.0 h). Sun: 60-minute focus block plus a 15-minute micro review (1.25 h) |

The founder is also **P3, Reviewer/Admin**: reviews `needs_human_review` items, reviews project evidence (`human_review`), edits content in git, and operates experiments.

### 2.2 P2 — The Beta Learner (M5)

| Attribute | Value |
|---|---|
| Situation | Adult (18+), technically curious, working or studying; a career switcher or serious hobbyist. Assumption A-02: this is the likely profile; the founder owns the final choice (open question OQ-01, also contract section 12) |
| Time | 5–10 hours a week |
| Starting point | Zero to light prior knowledge; diagnostic places them |
| Devices | Phone plus laptop; owns or buys a low-cost starter kit (bill of materials is an open founder decision, OQ-04) |
| Needs | Same loop as P1, plus consent and onboarding, a cohort label, an experiment arm that is neutral in tone, support contact, data export and deletion |
| Risk profile | Typical MOOC completion is in the low single digits to teens [R: Jordan 2014 as cited in the research report], so retention is a design target, not an assumption (SM-10) |

---

## 3. Jobs to be done

| ID | Job statement (when…, I want to…, so I can…) | Primary persona | Served by |
|---|---|---|---|
| JTBD-1 | When I have 10–20 spare minutes, I want a ready, right-sized set of tasks, so I can make progress without planning | P1, P2 | E3, E11 |
| JTBD-2 | When I learn something new, I want to see it done, then try it with support fading, so I can do it myself | P1, P2 | E4 |
| JTBD-3 | When time passes, I want the app to bring skills back at the right moment, so I do not have to remember what to review | P1, P2 | E5 |
| JTBD-4 | When I am stuck, I want help that makes me think rather than giving the answer, so I actually learn | P1, P2 | E6 |
| JTBD-5 | When I finish a module, I want proof of what I can do without help, so I know if I really have it | P1, P2 | E8 |
| JTBD-6 | When I build a circuit or firmware, I want my result checked against something objective, so I know it works | P1, P2 | E7, E9 |
| JTBD-7 | When I plan a weekend, I want a build block with a parts list and steps, so I can work at the bench without hunting for instructions | P1, P2 | E9 |
| JTBD-8 | When I want to know if this approach works for me, I want honest measurements of retention and time, so I can change what I do | P1 (strongly), P2 | E10, E12 |
| JTBD-9 | When I put in effort, I want to see credible progress toward L1 in my chosen area, so I stay motivated | P1, P2 | E10 |
| JTBD-10 | When I stop using the app, I want to take my data or erase it, so I stay in control | P1, P2 | E13 |

---

## 4. Goals and non-goals

### 4.1 Goals

- G-1 Deliver a working vertical slice that takes the founder through the project ladder L0–L4 (blink, divider/RC filter matched to SPICE, transistor switch and regulator, I2C sensor with UART logging, state-machine device with interrupt), with L5 (first KiCad board) fully specified in this package and built last (milestone M5, 00a A3).
- G-2 Make every study minute active: each task asks for a produced response.
- G-3 Keep practice honest: separate aided from unaided performance everywhere, and use strict-unaided delayed results (`max_hint_level = 0`, no tutor panel opened; 00a B1) as the main measure of learning.
- G-4 Never serve an unverified item (contract section 7.8).
- G-5 Fit 8 hours a week: micro, focus and lab sessions that start fast and work offline.
- G-6 Be experiment-ready from the first milestone: assignment, exposure and outcome logging, so that 11 can run n-of-1 comparisons in the founder phase and a randomised exploratory beta (10–50 learners) after.
- G-7 Stay inside the claims policy (section 11).
- G-8 After the first-walk L1 is evidenced and the go/no-go passes, extend the product along the capability tracks in `docs/15-cyber-physical-capability-spine.md` with the same pedagogy (verification gate, strict-unaided checkpoints, project evidence); each track is a sequenced content and engineering release, not a fork.

### 4.2 Non-goals (explicit)

| ID | Non-goal | Reason |
|---|---|---|
| NG-01 | Reaching "top 1%" or mastery of all disciplines | Not supported by evidence; tiers L0–L3 replace it [P] |
| NG-02 | Any neurostimulation, neurofeedback, sleep-cueing, binaural beats, subliminal or sleep audio, or biometric/neural/emotion data | Contract section 8; reasons in 02 section 6 |
| NG-03 | Native iOS/Android apps, VR/AR, multi-agent tutors; **v1:** no automated CAD/FEA grading. **Post-v1 (doc 15):** CAD evidence may use file manifest + checklist + human review; FEA stays human-reviewed at L2+ [P] | Contract section 9 (out of v1 automated graders) |
| NG-04 | Payments, social features, leaderboards, badges, public marketplace, certificates | Contract section 9; Hanus and Fox found lower motivation and exam scores with leaderboards/badges [R] |
| NG-05 | **v1 shipped curriculum** beyond the first walk (stubs stay placeholders until promoted). Post-v1 tracks in doc 15 ship incrementally as verified content | Contract section 9 |
| NG-06 | Weapon, munitions, or EW **design enablement** in learning content. **In scope later (doc 15):** export-control literacy, EU UAS ops modules, OT/embedded security architecture, defense **integration** case studies—governance only [P] | Export-control caution [P]; no armament labs |
| NG-07 | Claiming that the app saves time or improves learning | Unproven until 11 produces results; see section 11 |
| NG-08 | Using third-party content that is non-commercially licensed (for example MIT OpenCourseWare) | Contract section 11 |
| NG-09 | Medical, mental-health or cognitive-health claims | Contract section 8 |
| NG-10 | Replacing physical practice with simulation only; SPICE and emulators supplement benches, they do not replace builds | Evidence for sim-to-hardware transfer is thin [P] |

---

## 5. Success metrics

Targets are proposals fixed now so that results can be judged against them later; the justification column explains the basis. Phase F = founder phase (M1–M4); phase B = beta (M5). Measurement uses the contract's tables and the event catalogue in 11 section 9.

| ID | Metric | Target | Phase | How measured | Basis |
|---|---|---|---|---|---|
| SM-01 | Weekly study minutes versus target | Mean of weekly `sessions.actual_min` (capped for idle, see 11 section 4) ≥ 75% of `weekly_minutes_target` (≥ 360 of 480 min) over any 8-week window | F, B | Sum over `sessions` per ISO week | Feasibility of the 8 h/week premise [inf] |
| SM-02 | Active days | ≥ 4 days with at least one completed session in ≥ 75% of weeks | F, B | Distinct `date(sessions.started_at)` in user timezone | Spacing needs distribution across days [R] |
| SM-03 | Delayed unaided retention | Mean score ≥ 0.70 on strict-unaided tests of skills first mastered ≥ 8 weeks earlier, with unseen item variants | F, B | 11 OM-01: `attempts` in view `v_attempts_strict_unaided` where `assessment_kind = delayed` | Heuristic aspiration [P]; no published benchmark for this domain |
| SM-04 | Tutor-dependence gap | Median (aided score minus strict-unaided checkpoint score) ≤ 0.10 over a rolling 4 weeks; alarm at > 0.20 | F, B | 11 OM-04 | Bastani lesson [V]; thresholds [P] |
| SM-05 | Project ladder progress | Founder: L0 evidence accepted by end M3; L2 by end M4; L4 by end of M5 window. Beta learner: ≥ 50% complete L1-ladder project (L0–L2) within 12 weeks | F, B | `user_projects.status`, `project_evidence.evidence_status = accepted` | Ladder is the researchers' proposal [P] |
| SM-06 | Unverified items served | Exactly 0 | F, B | `items.status` at serve time vs events `task_shown` (hard guard, FR-060) | Contract 7.8 |
| SM-07 | Confirmed wrong items | ≤ 1 confirmed wrong item per 500 items served; each retired within 48 h of confirmation | F, B | `item_reported` events resolved to `item_retired` | LLM-drafted items are wrong 21–25% of the time before verification [V: MATHWELL/GPT-4 Turbo 74.8–78.8% acceptable], hence the gate |
| SM-08 | Grading latency | p95 within contract section 10 | F, B | `attempts.submitted_at` to `grade` write; `jobs` timestamps | Contract section 10 |
| SM-09 | Micro-session start | ≤ 1 s from open on warm PWA, p95 | F, B | `app_opened` to `session_started` client timestamps | Contract section 10 |
| SM-10 | Beta retention and completion | ≥ 60% of enrolled learners active in week 12; ≥ 70% complete the end-of-block unaided test | B | `events` active days; checkpoint completion | MOOC completion is typically low [R]; target is aspirational |
| SM-11 | Review debt | ≤ 15% of due reviews overdue by more than 3 days, measured weekly | F, B | `skill_state.due` vs now | Scheduler health [P] |
| SM-12 | Time-to-criterion versus baseline | Report only (no pass/fail) in phase F; in phase B, treatment arm ratio of median active minutes to reach the fixed target set versus control ≤ 0.75 is the *hypothesis* [inf, unvalidated] | F, B | 11 OM-03 | Earlier assumption: 150–300 h per L1 node, 25–40% saving on the study portion, both unvalidated |
| SM-13 | Tutor policy compliance | 100% of tutor messages stored with `hint_level`; audit of 100 randomly sampled messages per quarter finds ≤ 1 that reveals a final answer below level 4 | F, B | `tutor_messages` | Contract 7.9 |
| SM-14 | Experiment data completeness | ≥ 95% of experiment-eligible task exposures carry an `experiment_exposure` event; ≥ 90% of scheduled delayed tests are taken within ±7 days of due | F, B | Event counts vs assignments | Needed for valid analysis |
| SM-15 | Calibration | Mean absolute gap between mean rescaled confidence and accuracy on checkpoints decreases over 12 weeks (exploratory, no target) | F, B | 11 OM-08 | Metacognition evidence is moderate [R] |

---

## 6. Epics and user stories

Roles: *Learner* = P1 or P2. *Reviewer* = P3 (founder).

### E1 Account, onboarding and consent
- US-001 As a learner, I sign in with a six-digit code sent by email, or the link in the same email, so that I need no password. (FR-001)
- US-002 As a learner, I set my weekly time target and time zone so that sessions and reminders fit my life. (FR-002)
- US-003 As a learner, I take a placement diagnostic so that I do not repeat what I know. (FR-003)
- US-004 As a beta learner, I read and accept a plain-language consent before research data is used. (FR-004, FR-114)

### E2 Skill graph and frontier
- US-005 As a learner, I see which skills are available now and why locked skills are locked. (FR-011, FR-013)
- US-006 As a learner, I see a map of my progress by node and module. (FR-012)
- US-007 As a reviewer, I load and validate the skill graph from git. (FR-010)

### E3 Sessions
- US-008 As a learner with 15 minutes on my phone, I get a micro session that fits. (FR-020, FR-021)
- US-009 As a learner at my desk, I get a focus block of 45–120 minutes that mixes activity types. (FR-022, FR-023)
- US-010 As a learner, I plan a lab block with a parts list and steps. (FR-022, FR-085)
- US-011 As a learner, I see a short summary at the end of each session and when the next review is due. (FR-025)
- US-012 As a learner, I can cap new material per day so that reviews do not pile up. (FR-024)
- US-013 As a learner, I can opt in to a short evening review and a morning recall check. (FR-026)

### E4 Learning loop and task kinds
- US-014 As a learner, a new skill starts with a worked example, then problems with fading support, then a same-day recall. (FR-030)
- US-015 As a learner, every review uses a fresh variant so that I recall the skill, not the answer. (FR-031)
- US-016 As a learner, I explain a worked example's key step in my own words. (FR-032)
- US-017 As a learner, similar methods are practised mixed together once I know each. (FR-033)
- US-018 As a learner, I do rapid pattern drills on waveforms, schematics and faults. (FR-035)
- US-019 As a learner, I explain a concept back as if to a novice and see what I missed. (FR-036)
- US-020 As a learner, I solve debug cases with symptoms and measurements. (FR-037)

### E5 Spaced review and mastery
- US-021 As a learner, due reviews appear first so that nothing fades. (FR-040, FR-043)
- US-022 As a learner, I can see why a skill is `mastered`, `reviewing` or `decayed`. (FR-042)
- US-023 As a reviewer, I can adjust target retention (default 0.90). (FR-040)

### E6 Tutor
- US-024 As a learner, the tutor asks what I tried before helping. (FR-050)
- US-025 As a learner, hints get progressively more explicit, and I know that a full solution ends credit for that attempt. (FR-051)
- US-026 As a learner, I can report a wrong or confusing item or tutor reply. (FR-056, FR-066)
- US-027 As a reviewer, I can audit tutor transcripts and policy flags. (FR-054)

### E7 Grading and verification
- US-028 As a learner, numeric answers are accepted with units and tolerance. (FR-061)
- US-029 As a learner, my circuit netlist is checked by simulation and my code by tests. (FR-063, FR-064)
- US-030 As a reviewer, no unverified item reaches a learner. (FR-060, FR-067)
- US-031 As a reviewer, I approve or retire items in a review console. (FR-124)

### E8 Checkpoints and metacognition
- US-032 As a learner, I get an unaided checkpoint at module end and at least every 14 days. (FR-070)
- US-033 As a learner, I rate my confidence before feedback and later see how calibrated I am. (FR-071, FR-072)
- US-034 As a learner, I get delayed tests at 8 weeks or more on skills I once mastered. (FR-073)
- US-035 As a learner, I attempt transfer tasks that differ from practice. (FR-074)

### E9 Projects and evidence
- US-036 As a learner, I follow a project with steps, a parts list and required evidence. (FR-080)
- US-037 As a learner, I upload photos, scope captures, logs or a repo link as evidence. (FR-081)
- US-038 As a learner, a nonce challenge makes my evidence hard to fake or copy. (FR-082)
- US-039 As a reviewer, I review evidence that cannot be auto-verified. (FR-083)
- US-040 As a learner, I write a short post-build debrief. (FR-084)

### E10 Progress and transparency
- US-041 As a learner, I see the next competence artifact, minutes, reviews, retention and unaided scores without streak pressure. (FR-090)
- US-042 As a learner, I see what each tier means and what I still need for L1 in a node. (FR-091)

### E11 PWA, offline, reminders
- US-043 As a learner, I install the app and it works offline for cached micro tasks. (FR-100, FR-101)
- US-044 As a learner, I choose when to be reminded. (FR-103)

### E12 Experiments and analytics
- US-045 As a reviewer, I define an experiment and its units, and assignment is logged. (FR-111, FR-112)
- US-046 As a reviewer, I export analysis-ready data. (FR-113)
- US-047 As a reviewer, every relevant action emits an event. (FR-110)

### E13 Privacy, administration, quality
- US-048 As a learner, I export or delete my data. (FR-120, FR-121)
- US-049 As a reviewer, a CI check blocks forbidden claims in copy, content and prompts. (FR-126)
- US-050 As a learner, core flows meet WCAG 2.2 AA. (FR-125)

---

## 7. Functional requirements

Format: **ID — title** (priority, milestone, epic, stories). *AC* = acceptance criteria in Given/When/Then; *Edge* = edge cases. "06" = scheduler and learner-model document. LS-IDs are in 02.

### E1 Account, onboarding, consent

**FR-001 — Email sign-in with a six-digit code, link kept** (Must, M0, E1, US-001)
- AC: Given an unregistered valid email, When the user submits it on the sign-in screen, Then Supabase Auth sends one email holding a six-digit code and a sign-in link, and entering the code in the app within 15 minutes creates a session and a `profiles` row with `timezone` set from the browser. This is the primary path and must work inside an installed iOS PWA.
- AC: Given the same email, When the user follows the link within 15 minutes, Then a session is created in the browser that opens it. On iOS that may be Safari, not the installed PWA, so the screen never relies on the link.
- AC: Given a wrong, expired or reused code or an expired or reused link, When it is used, Then the user sees "This code has expired or is not correct" or "This link has expired" and a resend option, and no session is created.
- Edge: rate-limit to 5 sends per email per hour and limit code attempts; the code field accepts paste and autofill; show the same neutral message whether or not the email exists.

**FR-002 — Profile and weekly time target** (Must, M0, E1, US-002)
- AC: Given a signed-in user, When they set `weekly_minutes_target`, Then values 60–1200 are accepted (default 480) and others are rejected with an inline message.
- AC: Given a time zone change, When saved, Then all "today" and "due today" logic uses the new zone from the next request.

**FR-003 — Placement diagnostic** (Should, M2, E1, US-003)
- AC: Given a new learner, When they start the diagnostic, Then it asks ≤ 25 minutes of `diagnostic` tasks across the slice nodes, ends early when frontier estimates stabilise, and writes `skill_state.elo` priors.
- AC: Given a diagnostic correct answer without any hint, When saved, Then the skill is *not* set to `mastered`; it is flagged for a confirming retrieval and mastery follows the rule in 06 (contract 7.5).
- AC: The diagnostic is stored as a `focus` session whose tasks have `task_kind = diagnostic` (00a A2); it gives provisional credit only (`skill_state.source = placement`), never `mastered` (00a B6); the total diagnostic time is capped at 45 minutes in 05 section 9, of which 25 minutes is the expected length for this PRD's target.
- Edge: a learner may skip the diagnostic and start at the beginning of `math`.

**FR-004 — Consent and data settings** (Must, M0 for founder self-consent record; M5 full flow, E1, US-004)
- AC: Given a beta user, When first signing in, Then a consent screen states what is logged, what research use means, who sees it, and how to withdraw; acceptance writes a consent version and timestamp; research analysis excludes users without the current consent (see FR-114).
- Edge: declining research consent must still allow product use; their data is excluded from experiment analysis but still logged for the product's operation unless they also delete it.

### E2 Skill graph and frontier

**FR-010 — Content sync** (Must, M0, E2, US-007)
- AC: Given YAML under `content/`, When `content:sync` runs, Then skills, edges, templates, projects and steps load into Postgres idempotently, keyed on `key`.
- AC: Given a skill key that violates `^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$` or a cycle in `hard` edges, When sync runs, Then it exits non-zero and writes nothing.
- AC: Every skill and template must have non-empty `license` and `source`, else sync fails (contract section 11).

**FR-011 — Frontier computation** (Must, M1, E2, US-005)
- AC: Given the contract rule 7.1, When a skill's `hard` prerequisites are all `mastered` (or `reviewing` with retrievability ≥ 0.8) and each edge's `min_tier` is met by `tier_attained`, Then the skill is available; `soft` prerequisites only reorder.
- Edge: a prerequisite that becomes `decayed` removes dependants from the frontier at the next computation, but in-progress skills continue (contract 7.2b).

**FR-012 — Graph view** (Should, M1, E2, US-006)
- AC: Given a learner, When they open the map, Then skills show `mastery_state` by colour plus text labels (never colour alone), grouped by node and module, filterable by node.

**FR-013 — Explain why locked** (Should, M1, E2, US-005)
- AC: Given a locked skill, When selected, Then the unmet `hard` prerequisites are listed with their states and the minimum tier needed.

### E3 Sessions

**FR-020 — Session builder** (Must, M1, E3, US-008)
- AC: Given `available_minutes = 15`, `context = phone`, `session_type = micro`, 4 reviews due, When the builder runs, Then the estimated total ≤ 15 min, every task is tagged phone-suitable, and selection priority follows contract 7.2 (due reviews, in-progress continuation, new frontier skills, interleaved practice, checkpoint if due).
- AC: Given identical inputs and state, When run twice with the same seed, Then the output is identical (deterministic for testing).
- Edge: nothing due and no frontier skill fits the time: return a single interleaved retrieval set drawn from `reviewing` skills, or say "Nothing due. Optional practice available."

**FR-021 — Micro session** (Must, M1, E3, US-008)
- AC: Given a warm PWA, When the user taps "Start micro", Then the first task renders within 1 s (p95).
- AC: A micro session never exceeds 20 minutes of estimated time; at 20 minutes of elapsed active time the app offers to finish.
- AC: Given an available window of 21–44 minutes, When the user starts a session, Then the builder returns one `micro` session and offers an optional second `micro` session (a separate `sessions` row) when the first ends; there is no session type for 21–44 minutes (00a A1).

**FR-022 — Focus and lab session types** (Should, M2 for focus; M3 for lab, E3, US-009, US-010)
- Lean note: focus arrives with BL-0178, an optional task placed after the go/no-go (00d sections 2 and 6). The go/no-go window therefore runs on micro sessions only, so 150 minutes a week means about 8 sessions of 20 minutes, and FR-023's focus AC is demonstrable only once BL-0178 ships.
- AC: Given `session_type = focus` and `available_minutes` 45–120, When built, Then the plan mixes at least two task kinds and switches activity type at least every 30 minutes (LS-052).
- AC: Given `session_type = lab` and 120–240 minutes with `context = bench`, When built, Then the plan consists of `project_step` tasks with a parts and tools checklist and optional pre-bench micro tasks.

**FR-023 — Session length guard** (Should, M1, E3, US-009)
- AC: Given a focus session at 50 minutes of active time, When the learner continues, Then a non-blocking break suggestion appears and is logged; it never ends the session by force.

**FR-024 — Daily new-material cap** (Should, M1, E3, US-012)
- AC: Given the default cap of 3 new skills per local day (LS-053), When a fourth would be introduced, Then the builder fills remaining time with reviews or interleaved practice and shows "New material is capped today. You can change this in Settings."
- Reviews are never capped.

**FR-025 — Session summary** (Should, M1, E3, US-011)
- AC: Given a finished session, When the user sees the summary, Then it lists minutes, tasks done, aided vs unaided accuracy, and the date of the next due review. No streak counter.

**FR-026 — Optional pre-sleep review and morning recall** (Could, M2, E3, US-013)
- AC: Given an opt-in with a bedtime, When the evening reminder is due, Then a micro session of ≤ 8 items from skills studied that day is offered, and the next morning a recall check for the same skills is offered. Copy follows section 11.
- Edge: user can turn off any time; no assumption about sleep is made or stored beyond the chosen times.

### E4 Learning loop and task kinds

**FR-030 — New-skill learning loop** (Must, M1, E4, US-014)
- AC: Given a skill entering `learning`, When the learner works it, Then the order is `worked_example`, then at least one `faded_problem`, then a `retrieval` task later the same local day, then FSRS-scheduled reviews (contract 7.3).
- AC: A `retrieval` task is not shown within 10 minutes of the preceding task for the same skill unless the session ends first, in which case it is queued for the next session the same day, else the first session of the next day (LS-006).
- Edge: if the learner answers the first faded problem correctly with hint level 0 and has diagnostic evidence of prior knowledge, the remaining worked-example steps may be skipped (FR-034).

**FR-031 — Fresh variant per review** (Must, M1, E4, US-015)
- AC: Given a skill with prior served items, When a review is built, Then the `items.seed` differs from every earlier seed served to that user for that template, and where available a different template is used on alternate reviews.

**FR-032 — Self-explanation prompt** (Should, M2, E4, US-016)
- AC: Given a `worked_example`, When the final step is shown, Then the learner is asked one prompt ("Why does this step work?") and a free-text reply of ≥ 10 words is required to continue; the reply is stored but never graded as a correctness item.

**FR-033 — Blocked first, then interleaved within a module** (Must, M2, E4, US-017)
- AC: Given a module with a confusable set (2–4 skills tagged in content), When every skill in the set has ≥ 2 correct attempts with `max_hint_level ≤ 1`, Then interleaved sets are scheduled; before that, practice is blocked per skill (LS-010 to LS-014).
- AC: No interleaving across different disciplines in ordinary sessions; cross-discipline mixing appears only in capstone `project_step` and `checkpoint` tasks (contract 7.2).
- AC: Templates flagged `interleave: false` (vocabulary and definitions) are never interleaved.

**FR-034 — Expertise-reversal skip** (Could, M3, E4, US-014)
- AC: Given a learner who solves a skill's first problem unaided and correctly, When the skill starts, Then the worked example is offered as optional.

**FR-035 — Perceptual drills ("pattern gym")** (Should, M3, E4, US-018)
- AC: Given a skill with a perceptual template, When a drill starts, Then it presents 20–40 short classification trials (about 3–5 minutes) over varied rendered instances of ≥ 2 contrasting categories, interleaved, with immediate feedback, accuracy and response time recorded (LS-040 to LS-043).
- Evidence note: effect in electronics is untested [inf]; copy must not promise gains.

**FR-036 — Explain-back** (Should, M3, E4, US-019)
- AC: Given a skill at the end of the faded stage, When the learner writes 2–5 sentences explaining it to a novice, Then `rubric_llm` lists missing key points against a rubric from the template and the result creates follow-up retrieval tasks; it does not alone change `mastery_state` (LS-070).

**FR-037 — Debug cases** (Should, M3, E4, US-020)
- AC: Given a `debug_case` task with symptoms and measurements, When the learner submits a diagnosis, Then it is checked against the case's fault set by exact or multiple-choice grading; the hint ladder withholds the answer (LS-061).

### E5 Spaced review and mastery

**FR-040 — Per-skill FSRS scheduling** (Must, M1, E5, US-021, US-023)
- AC: Given a graded attempt, When the review is recorded, Then `skill_state` FSRS fields (`stability`, `difficulty`, `due`, `last_review`, `reps`, `lapses`, `fsrs_state`) update via `ts-fsrs` with target retention default 0.90, configurable 0.80–0.95.
- Licence check of `ts-fsrs` is required before shipping (contract section 3).

**FR-041 — Review log and rating mapping** (Must, M1, E5)
- AC: Every scheduled review writes `review_log` with `rating` 1–4, `elapsed_days`, `scheduled_days` per the mapping in 06; rating 1 (Again) is forced when `max_hint_level = 4`.

**FR-042 — Mastery state transitions** (Must, M1, E5, US-022)
- AC: Given the rule in 06 (contract 7.5: ≥ 3 qualifying attempts, correct meaning `score >= 0.8` and unaided meaning `max_hint_level <= 1` with no revealed solution, on ≥ 2 distinct local days, across ≥ 2 distinct item variants, the last two graded unaided attempts not failures, at least one constructed-response attempt and, for L1 targets, one applied attempt where such templates exist), When satisfied, Then `mastery_state` becomes `mastered`; When retrievability falls below the 06 threshold or a lapse occurs, Then `decayed`.

**FR-043 — Due-review inbox** (Should, M1, E5, US-021)
- AC: Given due items, When the learner opens Review, Then the count and oldest-overdue age show, and SM-11 is computable.

**FR-044 — Re-queue decayed skills** (Must, M1, E5)
- AC: Given a skill in `decayed`, When the next session is built, Then it appears in category (a) of the priority list and dependants are removed from the frontier until it returns to `reviewing`.

### E6 Tutor

**FR-050 — Attempt-first policy** (Must, M2, E6, US-024)
- AC: Given an item with no submitted attempt and no learner statement of what they tried, When the learner asks for help, Then the tutor declines to hint and asks "What have you tried so far?"; after a submitted attempt or a written statement of ≥ 20 words, hint level 1 is available.
- AC: The tutor UI is the hint ladder and an item-bound thread on the open task (section 1.4); there is no persistent chat that outlives the item or that can be opened with no item in context (09 S10).
- Edge: for `worked_example` tasks the tutor may answer clarifying questions about the displayed example without an attempt, but never about a different open item.

**FR-051 — Hint ladder 1→4** (Must, M2, E6, US-025)
- AC: Given an open item, When the learner requests help repeatedly, Then each reply escalates at most one level per learner turn: 1 nudge, 2 conceptual hint, 3 worked step, 4 reveal solution; level 4 requires a confirm tap that states "Revealing the solution ends credit for this attempt."
- AC: Every `tutor_messages` row stores `hint_level` and `policy_flags`; `attempts.hints_used` and `max_hint_level` are updated.

**FR-052 — Reference solution in context** (Must, M2, E6)
- AC: Given any tutor call, When the prompt is assembled, Then the verified reference solution and `verification_report` summary are included; if absent, the tutor is disabled for that item.

**FR-053 — Tutor disabled in checkpoints** (Must, M2, E6, US-032)
- AC: Given `task_kind = checkpoint` or an assessment-pool item, When displayed, Then no tutor entry point is rendered and tutor API calls for that item return 403.

**FR-054 — Answer-leak guard and audit** (Should, M2, E6, US-027)
- AC: Given a tutor reply at level < 4, When it contains the final numeric answer or the complete final code of the reference solution, Then it is blocked, regenerated once with a stricter instruction, and `policy_flags` records `answer_leak_blocked`.
- AC: A reviewer view lists flagged messages.

**FR-055 — Proactive hint offer** (Should, M2, E6)
- AC: Given 2 incorrect submissions on one item, or 3 minutes without input after a first attempt, When the item is still open, Then the UI offers "Want a nudge?"; accepting starts at level 1. This responds to the observation that learners often do not ask [R/V: only 14.5% of Khanmigo messages contained a reasoning step].

**FR-056 — Flag an item or tutor reply** (Must, M2, E6, US-026)
- AC: Given any item or tutor message, When the learner taps Report, Then an `item_reported` event is stored with reason and the item is marked `needs_human_review` and withheld from other serving until resolved.

### E7 Grading and verification

**FR-060 — Verification gate** (Must, M0, E7, US-030)
- AC: Given any serve request, When an item's `status` is not `verified`, Then it is not served unless `needs_human_review` and the requester is the founder; a database-level check or RLS policy enforces this and a test attempts to bypass it.

**FR-061 — Exact numeric and multiple choice grading** (Must, M0, E7, US-028)
- AC: Given a numeric answer with units, When graded by `exact_numeric`, Then unit conversion (for example 26.4 cents vs $0.264) and tolerance bands (relative or absolute per template) are applied deterministically before any LLM sees the response.
- Edge: log-scale tolerance for Fermi estimates is a template option.

**FR-062 — Symbolic equivalence** (Must, M1, E7)
- AC: Given an algebraic answer, When graded by `symbolic_equivalence` (SymPy), Then mathematically equivalent forms are accepted and the report records the canonical form; time-out 2 s p95.

**FR-063 — Code tests in sandbox** (Must, M2, E7, US-029)
- AC: Given learner C or Python code, When submitted, Then the worker runs tests in an isolated sandbox with CPU, memory, wall-time and network limits, returns per-test results in `grade.graders`, and completes p95 < 20 s.

**FR-064 — SPICE comparison** (Must, M2, E7, US-029)
- AC: Given a learner netlist, When graded by `spice_compare` (ngspice), Then specified node voltages or frequency responses are checked against tolerance bands; p95 < 20 s; netlists are sandboxed with directive allow-listing.

**FR-065 — Rubric grading is never the sole correctness grader** (Must, M2, E7)
- AC: Given a numeric or code item, When its template lists only `rubric_llm`, Then content sync rejects the template; `rubric_llm` is allowed for `explain_back` and design-judgment items, and its output is stored with the model and prompt version.

**FR-066 — Report and retire** (Must, M1, E7, US-026)
- AC: Given a confirmed wrong item, When the reviewer retires its template version or item, Then future serves stop, affected `review_log` rows are annotated, and the affected attempts are excluded from analysis exports via a flag.

**FR-067 — Verification report stored** (Must, M0, E7, US-030)
- AC: Every served item has a non-null `verification_report` containing independent recomputation result, tolerance, generator version and seed.

**FR-068 — KiCad ERC/DRC grading** (Could, M4, E7)
- AC: Given a KiCad project archive, When graded by `drc_erc` (kicad-cli), Then violations are returned as structured findings; p95 < 60 s. Needed only for project L5.

### E8 Checkpoints, confidence, delayed tests

**FR-070 — Unaided checkpoint** (Must, M2, E8, US-032)
- AC: Given a module's last skill reaching `reviewing`, or 14 days since the previous checkpoint, When the next session is built, Then a checkpoint of 8–12 items (≤ 25 minutes) is offered with no tutor and no hints, drawn from assessment-pool items not previously served in practice (CCR-03).
- AC: Attempts are stored with `unaided = true` and `max_hint_level = 0`.

**FR-071 — Confidence rating before feedback** (Must, M1, E8, US-033)
- AC: Given any graded task kind except `worked_example`, When the learner submits, Then a 1–5 confidence control is shown and stored in `attempts.confidence` before the result is revealed; skipping is allowed and recorded as null.

**FR-072 — Calibration view** (Could, M3, E8, US-033)
- AC: Given ≥ 30 attempts with confidence, When the learner opens Progress, Then a calibration chart shows accuracy per confidence level. Confident errors are highlighted (LS-072). No "Dunning-Kruger" wording.

**FR-073 — Delayed strict-unaided retention test** (Must, M3, E8, US-034)
- AC: Given a skill first `mastered` 56 days earlier (window ±7), When the next session is built, Then a delayed test task using unseen variants is offered, flagged `delayed`, no tutor, no hints.
- Edge: if the learner postpones beyond the window, it is still logged with its actual lag in days.

**FR-074 — Transfer tasks** (Should, M4, E8, US-035)
- AC: Given a skill at `mastered`, When a transfer task is built, Then it uses a different template or a changed surface context in the same skill (marked pool `transfer`) and counts toward OM-02 in 11, not toward mastery.

### E9 Projects and evidence

**FR-080 — Project ladder and steps** (Must, M3, E9, US-036)
- AC: Given a user project, When opened, Then steps are shown in `position` order with `est_min`, `session_type`, linked `skill_keys`, and `evidence_required`; a step is unlockable only when its linked skills are at least `learning`, with a warning if not `reviewing`.

**FR-081 — Evidence upload** (Must, M3, E9, US-037)
- AC: Given a step requiring evidence of kind `photo`, `video`, `log`, `scope_capture`, `measurement`, `repo` or `note`, When the learner uploads, Then the file is stored in Supabase Storage with a size cap (photos ≤ 15 MB, video ≤ 100 MB, logs ≤ 5 MB), a `project_evidence` row is created with `evidence_status = submitted`.

**FR-082 — Verification ladder with nonce** (Should, M3, E9, US-038)
- AC: Given a step with `verification` mode "nonce", When started, Then the app issues a unique challenge string; a valid serial log or logic-analyzer capture containing it sets `auto_verified`; a video with the nonce visible goes to `needs_review`; photos alone are `needs_review` and are never auto-accepted. Assurance order follows [P] in the research report: instrumented upload, then hardware-in-the-loop challenge, then timed video, then photo.

**FR-083 — Evidence review queue** (Must, M3, E9, US-039)
- AC: Given evidence in `needs_review`, When the reviewer opens the queue, Then they can accept or reject with a note; the learner is notified; `evidence_status` is updated and an event is emitted.

**FR-084 — Post-build debrief** (Should, M3, E9, US-040)
- AC: Given a finished project step, When submitted, Then the learner answers three prompts (what I expected, what happened, what I will change) stored as `note` evidence.

**FR-085 — Lab block planner and safety notes** (Must, M3, E9, US-010)
- AC: Given a lab session, When planned, Then the screen lists tools, parts from the project's `bom`, estimated minutes per step, and a safety card (ESD, soldering, no mains work, certified battery packs only, abuse testing virtual only) that must be acknowledged once per project.

### E10 Progress and transparency

**FR-090 — Progress dashboard** (Should, M1, E10, US-041)
- AC: Given a learner, When viewing Progress, Then it shows the next competence artifact (the next project step or node L1 gate still open, with remaining skills and evidence in plain words; section 1.4, contract 7.13), weekly minutes vs target, skills by `mastery_state`, aided vs unaided accuracy (SM-04) when checkpoints exist, review debt (SM-11), and the next checkpoint; it contains no streak counter, rank, badge or points.

**FR-091 — Tier explanation** (Should, M3, E10, US-042)
- AC: Given a node, When the learner opens it, Then it states the operational definition of L1 used by the app (see 11 section 4.3, 06, and contract 7.13), the remaining skills and evidence for that artifact, and that hour estimates are rough proposals [P].

### E11 PWA, offline, reminders

**FR-100 — Installable PWA** (Must, M1, E11, US-043)
- AC: Given Chrome on Android or Safari on iOS, When visited, Then the manifest and service worker meet installability criteria, and the app opens standalone.

**FR-101 — Offline cache of due micro tasks** (Must, M2, E11, US-043)
- AC: Given connectivity, When the app is foregrounded, Then the next 24 hours of due micro tasks (with rendered items, never answers for non-local-graded kinds) are cached; Given offline, When a micro session is started, Then it works fully from cache.
- Edge: cache limit 50 MB; oldest first eviction; the user sees "Offline: N tasks ready".

**FR-102 — Local grading with server re-verification** (Should, M2, E11)
- AC: Given a cached numeric item, When answered offline, Then the client grades locally and queues the attempt; on sync the server re-grades; if results differ, the server grade wins and the learner sees the corrected result. An offline attempt counts toward mastery only after server verification (00a C; contract 7.10). Offline packs carry numeric and multiple-choice answer keys only.

**FR-103 — Web Push reminders** (Should, M2, E11, US-044)
- AC: Given opt-in, When the chosen time arrives, Then at most 2 notifications per day are sent, none in the user's quiet hours, with neutral copy (section 11). Sent and opened events are logged.

**FR-104 — Desktop layout for focus blocks** (Should, M2, E11)
- AC: Given a viewport ≥ 1024 px, When in a focus session, Then a two-pane layout (task and scratch area / tutor) renders; at ≤ 480 px a single column renders.

### E12 Experiments and analytics

**FR-110 — Event logging** (Must, M0, E12, US-047)
- AC: Given any event in the catalogue (11 section 9), When it occurs, Then a row is written to `events` with `user_id`, `name`, `props`, `at`; props keys match the catalogue; unknown names are rejected in CI by a schema test.

**FR-111 — Experiment assignment** (Must, M2, E12, US-045)
- AC: Given an `experiments` row and eligible units, When assignment runs, Then arms are assigned by a seeded randomiser, written to `experiment_assignments`, and an `experiment_assigned` event is emitted; re-running does not change existing assignments.
- Requires CCR-01 (unit-level assignment for within-user designs).

**FR-112 — Arm-gated behaviour and exposure logging** (Must, M2, E12, US-045)
- AC: Given an assignment, When a task is built, Then features (for example tutor availability, interleaving) read the arm from the assignment, and an `experiment_exposure` event is emitted with the arm and unit.
- AC: The learner can view in Settings which experiments they are in (plain-language, hypothesis-neutral for beta).

**FR-113 — Analysis export** (Must, M4, E12, US-046)
- AC: Given the reviewer, When exporting, Then analysis-ready CSVs for attempts, review log, sessions, assignments and events are produced with pseudonymous IDs, excluding retired-item attempts and users without research consent.

**FR-114 — Research consent gating** (Must, M5, E12, US-004)
- AC: Given a user without current research consent, When exports or dashboards run, Then their rows are excluded from experiment analyses.

### E13 Privacy, administration, quality

**FR-120 — Data export** (Must, M4, E13, US-048)
- AC: Given a signed-in user, When they request export, Then a JSON/CSV archive of their rows from all user-owned tables is available within 24 hours.

**FR-121 — Delete my data** (Must, M4, E13, US-048)
- AC: Given a confirmed delete request, When executed, Then all rows with that `user_id` and their Storage objects are deleted within 30 days (target 7), and a deletion event without identifiers remains for audit.

**FR-122 — Row Level Security** (Must, M0, E13)
- AC: Given two users A and B, When A queries any user-owned table, Then only A's rows return; a test suite asserts this for every table with `user_id`.

**FR-123 — LLM data minimisation** (Must, M2, E13)
- AC: Given a tutor or grading call, When the prompt is built, Then it contains no email, display name or other direct identifiers, only item content, the learner's response and minimal context; model and prompt version are logged.

**FR-124 — Content review console** (Must, M1, E13, US-031)
- AC: Given items or templates in `needs_human_review`, When the reviewer opens the console, Then they see the rendered item, reference solution, verification report, and can approve (`verified`) or retire (`retired`).

**FR-125 — Accessibility** (Must, M1 and ongoing, E13, US-050)
- AC: Given the core flows (sign-in, session, review, tutor, checkpoint, evidence upload), When audited with axe and manual keyboard and screen-reader checks, Then there are no WCAG 2.2 AA failures; every math expression has a text alternative.

**FR-126 — Claims-policy lint** (Must, M0, E13, US-049)
- AC: Given any string in `app/`, `content/`, `prompts/` or docs, When CI runs, Then a blocklist (section 11.2 and contract section 8 terms, for example "top 1%", "2 sigma", "85% rule", "neuroplasticity", "critical period", "sleep learning", "binaural", "rewire", "brain cycle") fails the build; an allowlist file with a reason is required for any exception.

---

## 8. Non-functional requirements

| ID | Requirement | Target (from contract section 10 unless stated) | Test |
|---|---|---|---|
| NFR-01 | Grading latency p95 | numeric/symbolic < 2 s; code tests < 20 s; SPICE < 20 s; KiCad ERC/DRC < 60 s; rubric LLM < 30 s | Load test with 50 concurrent jobs in the worker; p95 recorded in CI nightly |
| NFR-02 | Micro start | ≤ 1 s from open on warm PWA; fully offline for cached tasks | Playwright with throttled CPU and offline mode |
| NFR-03 | Item traceability | Every verified item stores `verification_report` | DB constraint and test |
| NFR-04 | Accessibility | WCAG 2.2 AA on core flows; math text alternatives | axe in CI plus manual audit each milestone |
| NFR-05 | Privacy | Minimum collection; export and delete; no third-party trackers | Network audit in Playwright (no third-party hosts except fonts if self-hosted is not possible, to be decided); FR-120/121 |
| NFR-06 | Security | RLS on all user tables; sandbox isolation for learner code and netlists; upload scanning by type and size | RLS test suite; sandbox escape tests (no network, no filesystem outside tmp, resource limits) |
| NFR-07 | Reliability | Worker job retries ≤ 3 with backoff; no lost attempts when offline (queue persists across app restarts) | Chaos test: kill worker mid-job; airplane-mode test |
| NFR-08 | Cost | LLM cost per active learner-week recorded; budget set by the founder (OQ-06) | `tutor_message_sent` props `tokens_in`, `tokens_out` |
| NFR-09 | Data integrity for research | Event time monotonic per session; server timestamps authoritative; offline attempts carry client time and server receipt time | Event schema tests |
| NFR-10 | Content licence hygiene | No unlicensed third-party content; each skill/template has `license` and `source` | Sync validation (FR-010) |

---

## 9. Dependencies and assumptions

### 9.1 Dependencies

- D-01 `ts-fsrs` licence confirmed before use (contract section 3). Fallback: implement FSRS from the open specification after licence review.
- D-02 Anthropic Claude API access for tutoring and rubric grading, behind `LlmClient`.
- D-03 Worker host (Fly.io or Cloud Run) with ngspice, kicad-cli, SymPy, pint, NumPy, sandbox runtime.
- D-04 Content authoring capacity: original content only; the 40–60 skill nodes of the slice are the largest effort [P: estimate from research].
- D-05 Hardware starter kit defined (BOM) before M3 (OQ-04).
- D-06 Web Push support on iOS requires an installed PWA (verify at build time).

### 9.2 Assumptions (all to be re-checked)

- A-01 The founder starts near-zero in `math`, `elec`, `sw`.
- A-02 The first beta cohort is adult, English-speaking, and has a low-cost kit.
- A-03 AI coding agents deliver roughly one milestone per 8–10 calendar weeks at 8 hours a week [inf, unvalidated]. **Not supported by the backlog:** M0 plus M1 alone is about 390 hours of task size (about 233 founder hours in the central case for the lean slice), which is some 50 weeks at 8 hours a week with learning protected, not 18 to 20; see section 10.1 and doc 13 section 3.3.
- A-04 Time-to-L1 hours (150–300 per node) are placeholders [P]. At 8 hours a week the three slice nodes could take on the order of 450–900 hours in total. The vertical slice therefore defines its own L1 operational criteria on a fixed skill set (11 section 4.3); node-level L1 for all three nodes is not a milestone deliverable.
- A-05 Practice effects shown in the literature (retrieval g about 0.5; interleaving g about 0.42 overall, 0.34 in math [V]) are lab or classroom results and will be smaller in this setting; planning figure 0.2–0.5 SD [inf].
- A-06 The beta is exploratory and cannot detect small effects (11 section 7).
- A-07 Planning rate: a learner at 8 hours a week can take on about 5 to 7 new skills a week (00a G8; doc 09 section 14); the 3-new-skills-per-day cap (FR-024) is a ceiling, not a target. Timelines in this PRD use the planning rate and the founder-hour model of doc 13 section 3.3, and they are planning figures [P], not promises.

---

## 10. Release plan and milestones (product level)

The windows below are the **original indicative windows** [inf, A-03], written before the backlog existed. The backlog shows that they cannot hold for the full plan: it totals 1,095.5 hours of task size, about 768 founder hours in the central case of the founder-attention model (523 to 1,180), against the roughly 360 hours the windows imply (doc 13 section 3). They are kept as the original proposal and are superseded by the honest timelines below. Each milestone ends with a demo that the founder can do.

| Milestone | Indicative window | What the user can do | FRs that must be demonstrable | Exit criteria |
|---|---|---|---|---|
| **M0 Walking skeleton** | Nov–Dec 2026 | Sign in with an email code, set a weekly target, open one verified `retrieval` item with numeric grading, see it logged; content syncs from git; claims lint runs in CI | FR-001, 002, 010, 060, 061, 067, 110, 122, 126, FR-004 (founder record) | One template rendered with 3 seeds, all verified; RLS tests green; SM-06 = 0 |
| **M1 Practice core** | Jan–Feb 2027 | Run phone micro sessions from a 15–20 skill `math`/`elec` slice: worked example, faded problems, same-day retrieval, FSRS reviews with fresh variants, confidence ratings, frontier map, due inbox, progress page, installable PWA | FR-011–013, 020, 021, 023–025, 030, 031, 040–044, 062, 066, 071, 090, 100, 124, 125 | 2 weeks of founder use; SM-02 and SM-09 met; zero unverified serves |
| **M2 Guarded tutor and execution grading** | Mar–Apr 2027 | Focus blocks on desktop; ask the tutor with attempt-first hints; submit code and netlists for graded feedback; take unaided checkpoints; offline micro; reminders; diagnostic; first n-of-1 experiment assigned | FR-003, 022 (focus), 026, 032, 033, 050–056, 063–065, 070, 101–104, 111, 112, 123 | Tutor policy audit (SM-13) passed; SPICE and code graders within latency targets; EXP-001 pre-registered and running (see 11) |
| **M3 Projects and evidence** | May–Jun 2027 | Lab blocks with parts list and steps; upload evidence; nonce-verified logs; review queue; perceptual drills, explain-back, debug cases; delayed 8-week tests begin; project L0–L2 | FR-022 (lab), 034–037, 072, 073, 080–085, 091 | Founder completes project L0 with accepted evidence (SM-05); first delayed tests taken |
| **M4 Measurement-grade** | Jul–Aug 2027 | Transfer tasks; project L3–L4 (I2C sensor with UART logging, state-machine device); analysis exports; dashboards; data export and deletion; KiCad checks (stretch) | FR-068, 074, 113, 120, 121 | Pre-registered analysis of first n-of-1 experiments runs end-to-end on real data; privacy features pass tests |
| **M5 Closed beta (10–50)** | Sep 2027 onward, 12-week intervention plus 8-week delayed test | A beta learner consents, takes the diagnostic, is randomised to an arm, follows the loop, builds the ladder projects (L0–L4; the L5 KiCad board is fully specified and is the last item built, 00a A3), takes unaided checkpoints and the 8-week delayed test, and exports or deletes data | FR-004 (full), 114, plus all earlier | Beta pre-registration filed before first enrolment; ≥ 10 learners enrolled; decision rubric in 11 section 14 applied to results |

Founder dogfooding starts at M1. No external user is invited before M4 exit. The windows in the table above are indicative only; the honest timelines are in section 10.1.

### 10.1 The lean slice is the first deliverable, and honest timelines

The first deliverable is the **lean slice** of `docs/00d-lean-slice-plan.md`: the tasks tagged `lean: true` in the backlog, a strict subset of the full plan (same schema, IDs and contract). It is almost exactly M0 plus M1, with five tasks added for it (BL-0178 to BL-0182; review pass 3 of 31 October 2026 added ten more lean tasks, BL-0183 to BL-0195) and the practice core of section 10 kept whole: the M0 and M1 functional requirements stay demonstrable, with the settings screen deferred. It is preceded by a four-week no-build pre-experiment (Phase -1, BL-0182) and followed by a go/no-go checkpoint four weeks after first use (BL-0181). M2 to M5 are the deferred groups D1 to D9, started one at a time after the go decision.

| Item [P] | At 8 h/week (2.5 h learning, 4.75 h building) | At 5 h/week (1.5 h learning, 3.0 h building) |
|---|---|---|
| Phase -1 | weeks 1 to 4 (November 2026) | weeks 1 to 4 |
| Lean M0 exit (first served verified item on the phone) | week 19 (March 2027) | week 28 (May 2027) |
| First daily use of the app (end of BL-0060 and BL-0065) | week 40 (2 August 2027) | week 60 (20 December 2027) |
| Go/no-go (BL-0181) | week 43 (August 2027) | week 65 (January 2028) |
| Lean slice complete (M1 exit test BL-0069 and the optional tasks) | week 52 (October 2027) | week 80 (May 2028) |
| Lean founder effort | 239 h central (161 to 359), including 6 h of Phase -1 and 233 h of building (156 to 351); core without optional tasks 218 h (147 to 328) | same hours, longer calendar |
| Full plan M5 | about week 162 (December 2029); 114 weeks if no hour were reserved for learning | about week 256 (2031) |

Add about 25 percent for lost weeks. If the unit of the backlog really is founder hours (the original reading, doc 13 PA-2) the lean slice is about 365 hours and every date above stretches by roughly 1.7 times. The first 10 lean tasks measure which reading is right.

---

## 11. Claims-and-language policy applied to product copy

Rule (contract section 8): describe the app as *adaptive practice with spaced retrieval, graded feedback and guided builds*. Anything tagged [R]/[S]/[P]/[inf] in 02 is not stated as fact. No efficacy claim of any kind ships in v1 (NG-07).

### 11.1 Allowed example UI strings

1. "Today: 15 minutes. 3 reviews due, 1 new skill."
1a. "Next: blink LED. Evidence not yet logged." (competence artifact; 1.4)
2. "Try it first. Hints unlock after your first attempt."
3. "Checkpoint: no hints and no tutor. This shows what you can do on your own."
4. "Practice with hints: 92%. Checkpoints with no hints: 71%. The second number shows what you can do on your own."
5. "Mastered means 3 correct answers with at most a nudge, on 2 different days, on different versions of the question."
6. "Review scheduled for 14 Nov. The schedule is a model estimate and is sometimes wrong."
7. "Optional: a 5-minute review this evening, then a quick recall check tomorrow morning."
8. "You are in a comparison: for the next 4 weeks some skills are practised mixed and others in blocks. We will compare results at the end."
9. "Evidence accepted: the scope capture matches the simulation within 5%."
10. "This item was reported as wrong. It is paused while it is checked."

### 11.2 Ten forbidden example UI strings (and why)

1. "Unlock your brain's peak learning window." (critical-period / surge-window claim)
2. "Learn twice as fast with our AI tutor." (the Harvard result is a short-term upper bound from one university [V secondary]; no efficacy claims)
3. "Reach the top 1% in every engineering discipline." (tiers replace this; NG-01)
4. "Novices beat experts in 16 weeks, like the military." (misstates the 12-per-group Digital Tutor evaluation [V])
5. "Built on secret military learning techniques." (the open record shows ordinary methods [inf])
6. "Every session rewires your brain." (neuroscience claim)
7. "Keep your success rate at the proven 85% for optimal learning." (the 85% rule comes from simulations, not human data [V])
8. "Study in 90-minute brain cycles for best results." (no evidence found)
9. "Learn while you sleep" or "Focus audio that boosts learning." (sleep and binaural claims excluded; see 02 section 6)
10. "Our AI knows exactly what you have forgotten and guarantees retention." (FSRS predicts recall; it does not prove learning improvement [V])

Reviewer checklist: any new string that names a mechanism must be tagged in 02; any number about learning outcomes must come from our own data with an interval and the pre-registration reference.

---

## 12. Open questions

| ID | Question | Owner | Needed by | Default if unanswered |
|---|---|---|---|---|
| OQ-01 | Beta profile: career switchers, students or hobbyists? Minimum prior knowledge? | Founder | M4 | Adult hobbyists and career switchers, 18+ |
| OQ-02 | Jurisdiction and data residency (GDPR exposure if any EU participants; DPIA need) | Founder with counsel | M4 | EU-region Supabase project; no minors |
| OQ-03 | Does the beta need independent ethical review, and from whom? | Founder with counsel | M4 | Obtain an independent advisory review before enrolment (11 section 8) |
| OQ-04 | Starter-kit bill of materials and who pays | Founder | M2 | Learner buys a listed kit; no hardware sold by the product |
| OQ-05 | Monetisation | Founder | After M5 | None in v1 |
| OQ-06 | Monthly LLM budget per active learner | Founder | M2 | Budget cap with a tutor daily message limit |
| OQ-07 | Will credentials ever be issued? | Founder | After M5 | No; raises assessment-validity stakes and possible EU AI Act education-category obligations [C: editorial source in the research, verify] |
| OQ-08 | Track ordering tweaks after the first walk (default: doc 15 T1→T6; multirotor; EU UAS ops) | Founder | After go/no-go | As doc 15 defaults |
| OQ-09 | Does off-app study (books, videos) count toward the 8 hours, and how is it logged? | Founder | M1 | Self-reported weekly hours in a one-question prompt (11 OM-03) |
| OQ-10 | Is a pre-test baseline of the founder's absolute time-to-L1 feasible, given there is no unaided control path? | Founder | M2 | No; use within-person experiments and report absolute hours with intervals |
| OQ-11 | Incentives for beta learners (money, kit subsidy) and their effect on retention | Founder | M4 | No cash; optional kit subsidy disclosed in consent |
| OQ-12 | Third-party font and push-service hosting versus "no third-party trackers" | Founder | M1 | Self-host fonts; Web Push uses browser push services only |

---

## 13. Resolved by 00a (v1.1)

The change requests filed by this document were ratified in `00a-change-decisions.md` and folded into `00-contract.md` v1.1. IDs CCR-01 to CCR-08 are kept for traceability only; no new request is open.

| ID | Outcome | Where it landed |
|---|---|---|
| CCR-01 | Accepted | 00a section C (`experiments`, `experiment_assignments`, `analysis_exclusions`); contract section 6 |
| CCR-02 | Modified | 00a B1: `attempts.unaided` is `max_hint_level <= 1` and not revealed; the strict definition requested here (`max_hint_level = 0`, no tutor message) becomes the derived view `v_attempts_strict_unaided` and the term "strict-unaided" in document 11; contract 7.5 and 7.14 |
| CCR-03 | Accepted | 00a section C (`item_templates.pool`, `session_tasks.assessment_kind`, `attempts.assessment_kind`) |
| CCR-04 | Accepted | 00a section C (`profiles.consents`, `bedtime_local`, `reminder_prefs`, `onboarded_at`) |
| CCR-05 | Accepted | 00a D6: document 11's event catalogue is the normative list of event names |
| CCR-06 | Accepted | 00a section F; contract section 13 |
| CCR-07 | Accepted as a clarification (not itemised in 00a); contract section 9 now lists delayed-test scheduling and the CSV export; recorded in 00b for confirmation | contract 9 |
| CCR-08 | Accepted | 00a D7: the control arm is an active control |

Unverified items in this document: the numeric targets in section 5 are proposals, not benchmarks; the milestone windows are estimates; EU AI Act and neural-data law statements come from the research reports' sources and were not independently checked; the Khanmigo "14.5% of messages" figure and Jordan 2014 completion rate are as cited in the research reports.
