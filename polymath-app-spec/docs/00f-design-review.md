# 00f - Independent design review of the learning engine

Reviewer 3 (learning-design critique and claims audit). Date: 31 Oct 2026. Scope: documents 02, 05, 06, contract section 7, `reference/scheduler_reference.py`, `reference/scheduler_test_vectors.json`, `content/mvp-skill-graph.yaml`, read against the two research reports and the notes under `/home/claude/research_notes/`. Status: review, resolved by the engine pass of 31 Oct 2026 (section 12). Sections 1 to 11 are the review as written against contract v1.1 and graph 0.1.0 (138 skills); the **Resolution** column of section 3 and section 12 record what the founder ratified (`00a-change-decisions.md` G1 to G9, contract v1.2) and what changed since. Figures quoted in sections 1 to 10 were not rewritten; for current figures use section 12.

Evidence tags as in the contract: **[V]** source opened and read, **[S]** snippet, **[R]** recalled, **[P]/[inf]** proposal or inference. Everything computed by me from the repository files or by simulation is **[inf]** (a model or a count, not a source). Severity: **High** = the learning loop can stall or give wrong results in ordinary use; **Medium** = a likely cost or a design gap with a clear mitigation; **Low** = clarity, consistency or small cost.

Reproduce every number: `python3 -I reference/scheduler_reference.py selftest`, `... check reference/scheduler_test_vectors.json`, and the simulation `python3 reference/scheduler_reference.py sim 12 8` (needs PyYAML; seeds 0..7; the scenario grid is in 06 section 14).

---

## 1. Verdict in six sentences

The engine is coherent and explainable, and its reference implementation does what the documents say. Its main risks for one adult learner at about 8 hours a week are not review overload, which is mild, but (1) a **hole in the mastery pipeline**: a skill can wait indefinitely for its one "applied" attempt, which freezes everything that depends on it (fixed in the reference, F-01); (2) a **frontier that is stricter than the documents imply** (97% hard edges, 94% of them requiring tier L1), which also makes the diagnostic placement unable to open dependents (F-02); (3) **time budgets that disagree by about 2.7 times** between the graph (28 minutes a skill) and the session builder (10.5 minutes a new-skill chunk), plus a Saturday lab block that is dead time for learning until a project step exists (F-07, F-08); (4) an **unvalidated memory model** (fresh variants against FSRS assumptions) with a cheap, specific monitor to add (F-04); (5) **adherence** resting on tone and flexibility alone, with the first physical win not before week 8 to 9 (F-10); (6) a few **content errors** in the skill graph (F-06). "20 new skills a week" is not feasible; 5 to 7 is.

---

## 2. Simulation headline numbers (all [inf]; method and caveats in 06 section 14)

Model: the real `pack_session`, `mastery_state`, `tier_attained`, `compute_frontier`, `weekly_plan_slots` of the reference, the real 138-skill graph, a synthetic learner, a simplified FSRS-5-like memory model whose default weights are **recalled, not verified [R]**. Plan: 5 micro of 20 minutes, 2 focus of 90, 1 lab of 180 (= 460 of 480 minutes); 252 usable non-lab minutes a week after the 10% slack.

| Question | Result |
|---|---|
| Demand at **20 new skills a week** (no time cap) | 354-458 minutes a week in weeks 1-6 on the builder's own time costs (1.4-1.8x the 252 available), 716-866 on the graph's `est_minutes` (2.8-3.4x); the graph is exhausted in week 7. **Not feasible.** |
| Demand at 10 / 7 / 5 new skills a week, builder costs, week 12 | 271 / 192 / 146 minutes a week. With the graph's 28-minute skills: 492 / 344 / 257. **About 7 a week fits the builder's costs; about 5 fits the graph's.** |
| Review load at 20 new a week, peak | 14 reviews a day, 21-32 minutes a day for a few weeks. After the graph is exhausted, 60-110 minutes a week. **Reviews do not swamp the budget under the default model.** |
| What `pack_session` actually delivers (480 min plan, applied-gap rule on) | 6.0-7.5 new skills a week, 48-53% of session minutes on reviews from week 5, reviews due at the start of a week 7-12 skills (10-18 minutes), 77 skills mastered at week 12, whole graph (132 of 138) mastered in about 24 weeks. |
| Same, rule as ratified (no applied-gap rule) | 47 mastered at week 12, new skills a week fall from 7 to 2, the frontier is empty (0.4 skills available), 12 skills stuck in `reviewing`. |
| Pessimistic memory (fresh variants 0.10 less likely recalled, stability grows 0.7x as fast) | Reviews 140-190 minutes a week (60-80% of session time), reviews due at the start of a week 16-26, new skills fall to 2.6 a week by week 17 (6.8 in the base case). This is the swamping scenario. |
| Tasks take 1.5x / 2.0x the builder's estimate | Mastered at week 12: 52 / 34 (base 77). |
| 20% of sessions missed | Mastered at week 12: 61. |
| First LED-blink prerequisites (`sw.fw.gpio-output`, 22 skills, 8.6 core hours) with project pull | Mastered in week 7-14 (median 9). `elec.rc.filter-bench` (43 skills, 18.6 h): weeks 23-25. |
| Diagnostic (06 5.5 algorithm), 20 items | 14 (novice), 25 (some background), 37 (strong) skills of 138 still unresolved; resolving nearly all takes 29, 39, 40+ items. |

---

## 3. Prioritised findings

Column "Class": **A** = fix applied in my files (editorial or reference), **B** = parameter or rule change recommended, not applied, **C** = proposed contract change, **O** = for another owner. "Effort" is for the person who implements it: S under 2 hours, M under a day, L more.

| ID | Sev | Finding (short) | Evidence | Recommendation | Class | Effort | Resolution (31 Oct 2026) |
|---|---|---|---|---|---|---|---|---|
| F-01 | High | A `reviewing` skill that lacks only the **applied** attempt (a `problem`, `debug_case` or `checkpoint`) is not a "continuation" (those require `learning`) and gets its problem only from leftover focus-session fill, lowest retrievability first, so the best-remembered skills starve; dependents stay locked. | Simulation: 47 vs 77 mastered at week 12; frontier 0.4 vs 22 skills; 12 skills still `reviewing` with `applied = false` after 26 weeks [inf]. Code: `pack_session` step (b) requires `mastery_state == "learning"` | **Applied:** new rule (b2) `applied_gap` in the reference, 06 section 7.4, parameter `applied_gap_max` (1/3/0), two vectors. Disable with `applied_gap_max = {0,0,0}`. Founder to confirm (PCC-2). | A (+C) | S | Resolved: ratified as G2. Rule (b2) in contract 7.2; `needs_applied` is derived at read time (no column); vectors `needs-applied-*`. |
| F-02 | High | **Diagnostic placement opens nothing across L1 edges.** The 14-day grace waives retrievability but not the tier test; placed skills have `tier_attained` at most L0 (05 11.3); 219 of 232 hard edges require L1. | Direct call: `prereq_satisfied(placement card, min_tier L1)` is False, `min_tier null/L0` True [inf]. Edge count from the YAML [inf] | Decide the reading of contract 7.1 (PCC-1): option A, the grace also waives `min_tier` up to L1 for a placement card with no verification yet; option B, keep strict and document that placement only removes teaching, not gating. Until decided, the strict reading is implemented and documented (06 6.1). | A (docs) + C | S | Resolved: ratified as G1 (PCC-1 option A). Grace counts as tier L1 for the frontier test only; never sets `mastered`; `tier_attained` stays at most L0. |
| F-03 | Medium | **`mastered` is lenient as a retention claim and strict as a gate.** Earliest mastery is about day 3: same-day retrieval (minutes after the worked example) + next-day practice + first review. Two calendar days can be 20 minutes apart (23:50 / 00:10). Qualifying items can all be the easiest template and the same template. Yet `mastered` is what unlocks dependents (L1 edges). | Timeline in 06 4.2; vector `mast-span-gaming`; Elo selection picks the easiest template while `theta < 1441` (06 3.8) [inf] | Recommend `mastery_min_span_days = 2` (costs about 4% of mastered skills and +1 week on the first project skills in the model; 4 days costs 12%). **Applied:** the parameter exists in the reference, default 0, 3 vectors, documented. Not changed by default (rule is canonical in 00a B3 and contract 7.5). Also recommend a "2 distinct templates when 2 exist" condition (PCC-3). | B + C | S | Resolved: ratified as G3. `mastery_min_span_days` = 2 local calendar days and 2 distinct verified templates when the skill has 2 or more; vectors `mast-span-*`, `mast-tpl-*`. |
| F-04 | Medium | **Fresh-variant reviews against FSRS assumptions.** One card per skill still makes sense (it is the unit the learner must be able to do), but the card receives retrievals (1.5 min recall) and problems (10 min) of very different difficulty, on different templates, and FSRS was fitted on identical cards. If variants are recalled worse than predicted, intervals are too long and reviews grow. | Section 2 pessimistic row; evidence base for FSRS is recall prediction only [V, 06 principle 2] | **Applied:** monitor extended in 06 3.8 item 5 (observed vs predicted recall by interval bucket, same-template flag, Hard/Again share vs reps). Recommend: `desired_retention` 0.85 for the first 8 weeks (+5 mastered at week 12, fewer reviews due, [inf]) via the existing `retention` experiment flag, and every second review of an L1 skill as `problem_short` rather than `retrieval`. | A + B | S | Resolved: ratified as G5. `desired_retention` 0.85 for the first 8 weeks, then 0.90 only if observed and predicted recall differ by at most 0.07; monitor in 06 3.8. Every-second-review-as-problem not adopted. |
| F-05 | Medium | **The frontier is strict.** 97% hard edges, 94% of them L1; for those edges the "reviewing with R >= 0.8" branch of contract 7.1 is inert (tier L1 implies the full rule = `mastered`). Minimum calendar time per hop about 3 days; the first LED blink waits for 22 skills. | Counts and simulation [inf] | Relax `min_tier` to L0 (or null) on edges that need the idea only (content owner); expected gain is small (1-2 weeks on the first project skills when *all* are removed), so do not expect a cure. A guided week-1 blink build (L0 credit is already immediate, 00a B5) is the better remedy. | O | M | Partly resolved: edge audit in G9 corrected over-strong edges; `min_tier` reductions (graph item 10) not applied; guided week-1 blink remains the remedy (doc 10 owner). |
| F-06 | Medium | **Skill-graph errors and ordering exceptions** (6 backwards module dependencies; missing prerequisites; over-strong edges; wording errors). See sections 5.2 and 8. | 25-skill spot check plus whole-graph dependency scan [inf] | Content owner fixes (list in section 8). Validator rule 13 should check all edges, not only entry skills. | O (A in 05 text) | M | Resolved in graph 0.2.0 (G9): backward dependencies fixed, 3 whitelisted exceptions remain, validator rule 13 now checks every edge. |
| F-07 | Medium | **Time budgets disagree.** Graph mean 28.2 minutes a skill; builder new-skill chunk 10.5 (15.5 in focus); personalisation multiplier capped at 1.8. A 1.5x overrun cuts mastered skills at week 12 by a third. | YAML mean; 06 7.2; simulation [inf] | Measure in the three orientation sessions; if the ratio is above 1.8, raise the cap to 3.0 and plan 5 (not 7) new skills a week. State the planning figure as 5-7 a week, never 20. **Applied:** note in 05 section 2. | A + B | S | Resolved: ratified as G8. Planning rate 5 to 7 new skills a week; `est_minutes` means first exposure to first mastery (28.6 min mean, 28.5 min builder path); reconciliation in 05 section 2. |
| F-08 | Medium | **The lab block is dead time for learning until a project step is eligible.** A `lab` session without steps holds at most 10 minutes of reviews; 180 of 460 planned minutes (39%) are lab. `weekly_plan_slots(300)` yields fewer learning minutes than `(150)`. | Simulation: 96 vs 77 mastered at week 12 if the slot is served as a focus session; 150-minute plan beats the 300-minute plan [inf] | Serve a lab slot as a focus session (cap 120) while no project step is eligible (PCC-4), or schedule the L0 blink project in week 1-2 so the lab block has content. Founder choice. | B + C | S | Resolved: ratified as G4. A lab slot with no eligible step is served as `focus` capped at 120; vectors `pack-lab-*`. |
| F-09 | Low | **Latency rows of the rating map can mis-rate novices.** `r > 2.0` forces Hard; `expected_ms` starts as an authoring guess (`body.expected_s`). | Rule order in `map_rating`; 06 3.4 [inf] | Ignore the latency rows until a template has >= 20 observations or the learner multiplier exists; log the rows meanwhile. **Applied:** note and worked examples in 06 3.4. | A + B | S | Resolved: ratified as G5. Latency rows ignored until `template_n_obs >= 20`; vectors `rate-*-ignored`. |
| F-10 | Medium | **Adherence and motivation** (section 5.8): reliance on tone, flexibility and reminders; no early physical win (week 8-9), no accountability partner, review-heavy steady state from week 13 (half of the minutes), a 3-hour Saturday block as the hardest slot; the builder and the learner are the same 8 hours (R-22, 00d). | Report A "Motivation" row [R]; MOOC completion in the low single digits to teens [R, Jordan 2014]; simulation | Guided blink in week 1-2; a weekly "progress you can see" project step even when reviews dominate; optional accountability contact (beta); keep 00d's reserved learning time. | O | M | Open (doc 10 and 14 owners): guided L0 blink in weeks 1 to 2. The v1.2 model puts the first blink at about week 15 without it (06 14.4). |
| F-11 | Medium | **Diagnostic: two specs disagree and the budget is unrealistic.** 05 (belief-based, up to 40 items, 45 min) vs 06 (min-max selection, 12-20 items, "about 25 minutes", 1.5 min/item). Inferred skills were `reviewing` in 05 but `learning` in 06; 05 seeded FSRS card stability, 06 creates no card until verification. | Text comparison; simulation of the 06 algorithm (unresolved 14-37 skills after 20 items) [inf] | **Applied:** 05 11.3 table aligned to 06 (canonical, 00a B3); item-count text reconciled; two-sitting recommendation. Item time for constructed response should be 2.5 minutes, not 1.5. | A + B | S | Resolved: ratified as G7. Constructed response only, about 2.5 min per item, up to 20 items in at most 2 sittings of 25 min; 05 and 06 identical. |
| F-12 | Low | **Same-day retrieval gap** (02 PRM-04 / LS-006: 10 min or 3 intervening tasks) is not enforced: the packer puts the retrieval last, so after one new chunk it follows the faded problem immediately. | Vector `pack-micro-new-skill` order [inf] | Either relax PRM-04 to "at least one other task between" or place a due review between chunk and retrieval. **Applied:** conflict stated in 02 LS-006 and 06 7.4. | A (+O) | S | Resolved in 02 and 06 (conflict stated, 06 7.4); no behaviour change. |
| F-13 | Medium | **Interleaving applied to unrelated skills.** 06 treated a whole module as one confusable group when no tag existed; 02 LS-011 says sets are explicit and never inferred; the graph has 0 `confusable_set` values. | grep of the YAML; Brunmair and Richter support mixing confusable types only [V] | **Applied:** 06 7.6 now says no tag means no interleaving. Content owner tags groups: candidates in section 8. In the model interleaving is nearly irrelevant at this scale (77.6 vs 76.8 mastered), so this is about not doing something unsupported rather than about gains. | A + O | S | Resolved: interleaving only within a `confusable_set`; graph 0.2.0 has 11 sets covering 30 skills. |
| F-14 | Low | **Elo/IRT-lite is largely decorative in v1.** Difficulty match picks the easiest template while theta < 1441, and most skills have one template; item calibration needs 30+ observations per template, which one learner rarely produces. | 06 3.8 arithmetic; lean slice has 30-40 templates for 138 skills (00d) [inf] | Keep logging `e_pred` for evaluation; do not spend build time on item-difficulty learning in the lean slice; require >= 2 templates per skill before difficulty matching is claimed to adapt. **Applied:** worked consequence in 06 3.8. | A + B | S | Resolved in text (06 3.8); no behaviour change. |
| F-15 | Medium | **Over-reliance on the tutor is detected late and answered weakly.** `hint_reliance` flags only > 50% of 20 attempts with hint >= 2; level-1 nudges count as unaided; the attempt-first gate is satisfied by typing 20 words; the response to a checkpoint/practice gap is only a 7-day checkpoint interval. | 06 9, 02 LS-060 [inf]; Bastani-type harm is about unaided exam scores [V, 02 M05] | Add a **checkpoint-gap trigger**: if checkpoint accuracy is more than 0.25 below practice accuracy on the same skills for two checkpoints, cap hints at level 1 for 2 weeks and add one hint-locked retrieval per day. Log the gap (already an event). | B | S | Resolved: ratified as G6. Strict-unaided checkpoint accuracy trailing aided by more than 0.15 over the last 2 checkpoints (at least 10 attempts each side) gives `post_attempt_only` per node; vectors `reliance-*`. |
| F-16 | Low | **Phone input.** 31 of 138 skills (22%) are not phone-suitable (code, SPICE, bench) and so can be reviewed only in focus/lab sessions; symbolic answers need a math keyboard and take longer than a 1.5-minute retrieval; no code editing on a phone. | YAML count; 09 section on inputs [inf] | Give code skills a phone-suitable "predict the output" retrieval (05 5.4 already allows it for `sw.c.types-ints`); keep a fixed 5-minute "reviews only" micro option; time-multiplier per answer type. | O | M | Open (doc 09 owner). |
| F-17 | Low | **Checkpoint cadence cost.** Global every 14 days (up to 25 min) plus module checkpoints: about 725 minutes over 24 weeks (12 h), roughly 9% of non-lab session time [inf; module checkpoints are not in the simulation]. Needs a separate `assessment` pool (extra authoring). | Arithmetic from 06 section 8 | Acceptable if the founder keeps them; budget it; make the checkpoint count toward mastery (it does). | O | S | Accepted as a budget item; no change. |
| F-18 | Low | **02 / 06 inconsistency on the new-skill cap** (per day vs per session). | Text | **Applied:** reconciled in 02 (06 canonical). | A | S | Resolved in 02 (06 canonical). |
| F-19 | Low | **Atomicity.** 54 of 138 titles contain "and"; 8 skills look like two (section 5.2). | YAML | Split or reword at the next minor graph version. | O | M | Open: four new skills added; splitting of two-verb skills deferred to the next minor graph version. |
| F-20 | Low | **Evidence honesty.** Seven statements fixed (section 6). | Audit | Done. | A | S | Resolved; claims lint 0 violations. |

---

## 4. The engine against the questions asked

### 4.1 Mastery rule: too lenient or too strict, and gaming by easy variants

Both, depending on what is asked of it. **Lenient** as a statement about durable memory: three short-term successes, the first minutes after the worked example, can make a skill `mastered` on about day 3 (06 4.2). The rule counts calendar days, so 23:50 and 00:10 are two days (`mast-span-gaming`). Item difficulty is not part of "qualifying": with Elo target selection the easiest in-tier template is served until `theta` passes 1441, and `distinct variants` means distinct seeds, which can be the same template with different numbers. Nothing in the rule requires a delayed success. **Strict** as a gate: `mastered` is what unlocks dependents across 219 L1 edges, and the applied condition needs a 4- to 10-minute `problem` that only some sessions can carry (F-01). The protection that exists is real but late: decay below R 0.70 and the 14-day unaided checkpoints. I did not change the rule. Recommended, in order of cost: `mastery_min_span_days = 2` (implemented, off); a "two templates when two exist" condition (PCC-3); a delayed-success condition is not recommended because the simulation shows the chain depth would then stall the frontier (min_correct 4 / days 3 loses 12 of 77 mastered skills at week 12).

Gaming by the founder himself is not the realistic risk; sloppy self-assessment is. The tutor-open attempts at hint level 1 still qualify (01 B1), so mastery can include light help; strict-unaided is evaluation-only. That is a defensible trade-off, provided F-15's checkpoint-gap trigger exists.

### 4.2 Rating mapping

The mapping (06 3.4) is sensible and tested. Observations: partial credit (0.5 to 0.8) is a FSRS success but not a correct attempt, so memory and mastery can disagree (stated, with worked examples, in 06 3.4); Easy is deliberately rare (needs reps >= 2, confidence >= 4, r <= 0.6, no hints, not MC), which is safe; the latency rows depend on guessed `expected_ms` and can punish a slow novice (F-09); confidence-based rules are switched off when the learner always answers 5 (good, 06 10.4); rapid guesses are handled. One gap: `high_confidence_error` queues an extra retrieval (`hypercorrection_recheck`) but the packer has no reason code for it in the vectors (it is a caller concern); make sure the TypeScript port implements it, since it is part of the "hypercorrection" bet that is only [R].

### 4.3 Fresh variants vs FSRS

See F-04. In short: a card per skill is the right unit; the risk is that the card averages unlike events. The new monitor separates "same template again" from "new template" and watches the 8-30 day bucket, where optimistic stability shows first. If observed recall there is below prediction by 0.10, the model says reviews grow by 35-80% (106 to 140-190 minutes a week). The cheap responses, in order: `desired_retention` 0.85 (experiment flag exists), cap `maximum_interval_days` at 60, use applied items for every second review. None needs new code.

### 4.4 Elo/IRT-lite and cold start

Cold start values are coherent (`theta` 1300, K 48 falling to 16, diagnostic init from a logistic with clamp 0.1/0.9). The weakness is data, not maths (F-14). A diagnostic correct answer on d = 1500 yields theta 1882 for that skill and `d - 100` for inferred ancestors: with a 3% guess rate a novice is wrongly placed on about 2 skills in 20 items; with a 10% guess rate (an MC-like item) on 8-10; the ban on MC in the diagnostic (06 5.5) is therefore essential and should be a validator rule for diagnostic items (owner 07).

### 4.5 Frontier, "available" rules, depth 14, 138 skills, first month

The longest hard chain is 14 skills counting the PID stub, 13 among real skills (computed). Depth itself is not the first-month problem; the time per hop is. Each hop needs a `mastered` prerequisite (about 3 days at best), so the critical path is about 6 weeks; the first-month simulation starts about 31 skills and masters about 26 (mostly `math.alg` 9, `elec.dc` 4, `elec.dig` 3, then one to three each from `elec.meas`, `math.prob`, `math.trig`, `sw.c`, `sw.tools`) with 4 to 20 skills on the frontier. Without project pull the first month contains no hardware; with pull the first LED prerequisites finish around week 8-9. The scoring (pull 3.0, unlocks 1.0, soft-unmet 2.0, balance 2.0, cost 0.25) behaves sensibly in the model; the cost term makes cheap skills go first, which suits a first month.

### 4.6 Blocked-first and interleaving thresholds

Stage thresholds (stage 2 at 0.60, stage 3 at 0.70, regress at 0.40, width up to 5) are reasonable and untested [P]. Two practical points: an interleaved set of 2 skills is 4 items of `problem_short` = 16 minutes against 3 minutes for two retrievals, so interleaving is expensive, and in a micro session it often does not fit (the packer falls back to retrievals); and without `confusable_set` tags there is nothing to interleave (F-13). Blocked-first is an inference [inf], not a tested policy, and 02 says so.

### 4.7 Session builder packing and the review backlog over 12 weeks

Answered in section 2 and 06 section 14. The backlog curve (reviews due at the start of each week, mean of 5 seeds): week 1-4: 3.4; 5-8: 6.8; 9-12: 7.7; 13-16: 11.8; 17-20: 10.2; 21-26: 11.8 skills (about 10-18 minutes), never near the 120-minute `backlog_suspend_threshold_min` (80 skills). Minutes a day: reviews 80-125 minutes a week in the base case, which is 13-21 minutes a day over six study days. It only approaches the cap in the pessimistic-memory scenario (reviews 140-190 minutes a week, due 16-26). **Parameter changes if reviews swamp the budget** (in this order): (1) `desired_retention` 0.90 to 0.85; (2) `maximum_interval_days` 180 to 60; (3) keep `max_review_share` at 0.70 but guarantee one new-skill chunk a week while the backlog flag is set, so the learner always sees progress (not simulated); (4) drop the 10-minute lab review cap. No change recommended at the default model.

### 4.8 Checkpoint cadence cost

See F-17: global checkpoints about 12.5 minutes a week at full size (2.6% of 480), module checkpoints another 18 minutes a week averaged over 24 weeks [inf], so about 30 minutes a week or 9-11% of the non-lab minutes. In the simulation only the global checkpoint is modelled (mean 8 minutes a week because the 8-skill sample and the session budget truncate it). Worth it: it is the only unaided measure.

### 4.9 Diagnostic length

12-20 items at 1.5 minutes (06) is 18-30 minutes; realistic constructed-response items take 2-3 minutes, so the 45-minute cap binds at 15-22 items. In the simulated idealised learner this leaves 14-37 skills unresolved (section 2), which are simply treated as `unseen`: the cost is some re-teaching of skills already known (mitigated by the "I already know this" skip, 06 5.6), not wrong placement. Recommendation: offer the diagnostic in two sittings of 25 minutes; keep MC out; set item time 2.5 minutes; accept 20-25 items for the founder.

### 4.10 Over-reliance on the tutor

See F-15. Detection (hint share) and response (hint-locked retrieval, shorter checkpoint interval) are proportionate but slow, and the strongest control, the unaided checkpoint, has no direct consequence for the tutor policy. The Bastani-type effect is about unaided performance falling [V per 02 M05]; the design measures it every 14 days, which is good, but a response rule should exist before the tutor ships (the lean slice has no tutor, so every attempt is unaided by construction, 00d).

### 4.11 Motivation and adherence

Addressed by the design: neutral tone and no streaks (09), micro sessions of 5-20 minutes, plans that rebalance missed slots without guilt (06 7.9), a return session after absence (06 10.2), visible counts instead of badges, reminders the learner controls, a build ladder. Gaps: (1) the first physical result arrives at week 8-9 in the model, while Report A names visible build progress ("it blinks") as the main reward [R]; (2) accountability and cohort supports were not retrieved by the research and are absent; (3) from week 13 about half of all minutes are reviews of already-learned skills, a maintenance feel; (4) the longest slot (180-minute Saturday lab) is the most fragile for a full-time worker and the plan treats a missed lab as carried in full; (5) the founder is also the builder: 00d and R-22 already reserve 2.5 of 8 hours for learning while the app is built, in which case the model predicts roughly 4-5 new skills a week at 150 minutes (59.6 mastered at 12 weeks for a 150-minute week with no lab) [inf]; (6) no mechanism turns a failed adherence month into information (SM-01 measures it; nothing adapts the plan except the 50% rule). Recommendations in F-10.

### 4.12 Accessibility of micro-sessions on a phone

Numeric keypad with unit selector and a math keyboard with KaTeX preview are specified (09), with text alternatives. Risks: symbolic entry on a phone is slow; 22% of skills cannot be done on a phone; micro sessions can end short (1-3 of 7 learning sessions a week below half full in the model) when nothing phone-suitable is eligible. Nothing blocks a good phone experience, but the 1.5-minute retrieval estimate should be replaced by a per-answer-type default (numeric 1.0, symbolic 2.0, MC 0.7 [P]).

---

## 5. Skill-graph quality

### 5.1 Granularity (5-40 minutes)

All 138 skills are 10-40 minutes (none below 10); mean 28.2; 45 skills are 30 minutes and 10 are 40. The numbers are author estimates [P]. The sharper issue is the mismatch with the builder (F-07). Skills that look like two: `sw.fw.uart-logging` (framing and baud rate, plus formatting log lines), `elec.rc.bode-db` (decibels, plus reading a Bode plot), `elec.dig.mux-decoder-adder` (three devices), `elec.dig.latch-flipflop` (SR latch, D flip-flop), `elec.rc.spice-rc` (transient and AC runs), `sw.fw.adc-scaling`, `math.alg.exp-log` (logs, solving, decibels), `sw.fw.i2c-protocol` (transaction, pull-up sizing). Slow ones for a novice: `elec.dc.nodal-analysis` (40), `elec.rc.rc-lowpass` (40, "derive"), `math.calc.exp-growth-decay` (35, an ODE).

### 5.2 Spot check of 25 random skills (seed 20261031)

Technical accuracy and prerequisite sanity, read against the YAML. "OK" means accurate and edges defensible.

| Skill | Accuracy | Prerequisites | Note |
|---|---|---|---|
| elec.dc.thevenin-norton | OK | OK | Description covers the Thevenin form; Norton is its source transformation; title joins two ideas that are always used together |
| elec.dig.fsm-from-spec | OK | OK | |
| elec.dig.latch-flipflop | **Wording error**: an SR latch is not "clocked"; only the flip-flop is | **Too strong**: hard edge from `combinational-design` (K-maps); `gates-truth-tables` suffices | Two devices in one skill |
| elec.dig.mux-decoder-adder | OK | OK | Three devices; "describe" is a weak verb |
| elec.meas.datasheet-reading | OK | OK | |
| elec.meas.oscilloscope | OK | **Too strong**: hard edge from `math.trig.sinusoids`; amplitude, period and frequency need no phase; it delays the scope until module 8 | Make it soft or remove |
| elec.meas.schematic-reading | OK | OK (root) | |
| elec.rc.bode-db | **Imprecise**: dB for voltage/current ratios is 20 log10, for power 10 log10; not stated | Hard edge to `rc-lowpass` is right for the Bode part, wrong for the dB part | Duplicates "decibel ratios" in `math.alg.exp-log` |
| elec.rc.spice-rc | OK | OK | Two analyses (.tran and .ac) |
| elec.semi.bjt-switch | OK (add the forced-gain rule of thumb to the worked example) | OK | |
| elec.semi.diode-concept | OK | OK | |
| math.alg.exp-log | OK but **omits natural logarithm and e**, which `rc.rc-step-response` needs for the time to a threshold | OK | |
| math.alg.ratios-proportions | OK | OK | |
| math.calc.exp-growth-decay | OK | OK; "solve" by recognition, no integration prerequisite | 35 minutes is optimistic |
| math.prob.expectation | OK | OK | |
| math.trig.angles-radians | OK | OK | |
| math.trig.sinusoid-sum | OK | OK | |
| math.vec.matrix-vector | OK | OK | |
| sw.c.functions | OK | OK | |
| sw.fsm.table-driven | OK, but needs **function pointers**, which no skill teaches | `mem.pointers` present; no function-pointer skill | Add a skill |
| sw.fw.gpio-input | OK | Hard edge from `gpio-output` is a convenience, soft is enough | |
| sw.fw.i2c-protocol | OK, but "size its pull-ups" needs rise time (RC) | **Missing** hard edge from `elec.rc.rc-time-constant` | Also two outcomes in one sentence |
| sw.fw.isr-basics | OK | OK | Grader feasibility: an ISR needs a hardware or simulated target; confirm `code_tests` can do it |
| sw.fw.uart-logging | OK | **Missing** a UART framing skill (start/stop bits, 8N1) | Logic-analyzer decoding of UART assumes it |
| sw.mem.memory-model | OK | OK | |

Result: 5 accuracy or wording problems, 6 prerequisite problems, 3 skills with two outcomes, in 25 skills. The spot check suggests about one in five skills has a correctable fault [inf; sample of 25].

### 5.3 Missing prerequisites and mis-ordered modules (whole graph)

Six edges point from a later module to an earlier one (listed in 05 section 6.2): `trig.sinusoids` to `meas.oscilloscope`; `prob.measurement-uncertainty` to `meas.measure-vs-simulate`; `c.program-structure` to `tools.build-make`; `prob.averaging-noise` to `fw.moving-average`; `prob.measurement-uncertainty` to `fw.sensor-calibration`; soft `opamp.sensor-conditioning` to `fw.adc-scaling`. The one that matters most: the L1 capstone skill `meas.measure-vs-simulate` hard-depends on `prob.measurement-uncertainty` (variance, expectation, probability rules), while the module table puts probability last. Missing skills: summing or level-shift amplifier (so `opamp.sensor-conditioning` can "choose gain and offset"), function pointers, memory-mapped registers and `volatile` (needed by `fw.gpio-output` "register or driver call" and `fw.isr-shared-data`), UART framing, natural log. Over-strong edges: `latch-flipflop` from `combinational-design`; `oscilloscope` from `trig.sinusoids`; `opamp.comparator` from `ideal-rules` (positive feedback; the ideal rules assume negative feedback); `dig.logic-levels` from `dig.binary-hex`.

---

## 6. Evidence-honesty audit (documents 02, 05, 06)

Method: every sentence containing an effect size, percentage, trial, benchmark or a verb of establishment, read against its tag. Findings, all fixed:

1. 06 principle 4 said frontier selection has "the best public support among the options considered [V]". The source says plausible, vendor-linked [B]. Rewritten as an engineering choice [inf].
2. 06 principle 5 gave "after basic fluency" as if from the source [V]. It is an inference [inf] (02 M04 says so). Retagged.
3. 06 principle 2 quoted the FSRS benchmark as "~10k Anki collections"; 02 and the notes say about 10k users and 350M reviews. Harmonised.
4. 02 S02 stated "streaks have no credible causal evidence" untagged. Retagged [inf: absence in Report A] and the MOOC completion figure [R] added.
5. 05 section 4 said "17 such edges were removed while authoring": an unreproducible author log. Tagged [inf] and the validator result (0 warnings) stated.
6. 05 11.3 stated "stability seeded to 3 days" and similar card fields as design: these are library internals not verified and contradicted 06 3.6. Removed; aligned.
7. 05 6.1 stated "longest hard chain 14" without saying it includes a stub. Clarified (13 real).

New numbers I added are tagged [inf] where they come from the simulation or repository counts. Remaining [R]/[P] statements in the three documents are tagged where they occur; the numeric defaults in 06 are covered by its blanket statement that every default is [P]. Outside my files, one place to check: `01-PRD.md` A-03/A-04 hour estimates, tagged [inf] there.

---

## 7. Changes by class

### (a) Applied in my files

- `reference/scheduler_reference.py`: rule (b2) `applied_gap` in `pack_session` (parameter `applied_gap_max`, state flag `needs_applied`, reason `applied_gap`); practice fill skips a second problem for such a skill; optional parameter `mastery_min_span_days` in `mastery_rule` (default 0 = ratified behaviour); `mastery_rule` vectors accept `params`; the workload simulator (`sim` command, `simulate`, `demand_curve`, `sim_graph`). Vectors regenerated: **107** (was 102): five new (`pack-applied-gap-micro`, `pack-applied-gap-focus`, `mast-span-gaming`, `mast-span-2d-blocks`, `mast-span-2d-ok`); **none of the 102 old vectors changed** (compared field by field).
- `docs/06`: vector count; evidence fixes; rating worked examples; mastery timeline and the span parameter; `min_tier` interaction; loop-step transition table; applied-gap step; same-day retrieval note; Elo selection consequence; monitor item 5; interleaving needs `confusable_set`; two parameter rows; acceptance criteria; section 14 (simulation, sensitivity, diagnostic); unverified list.
- `docs/05`: time-estimate mismatch note; chain and edge statistics; ordering exceptions; diagnostic alignment with 06; placement consequence; evidence tag on the removed-edges statement.
- `docs/02`: S02 tag; LS-006, LS-053, LS-090 conflict notes; PRM-04 and PRM-15 owners; three evidence-gap rows; section 10.
- `reference/lint_claims.py` (new): section 8.

### (b) Parameter or rule changes recommended, not applied

| Change | Why | Risk | Evidence |
|---|---|---|---|
| `desired_retention` 0.90 to 0.85 for weeks 1-8 (flag `retention`) | +5 mastered, fewer reviews due | Slightly lower recall; reversible | [inf] |
| `mastery_min_span_days` 0 to 2 (flag `mastery_span`) | Closes the midnight loophole and the same-day-only path; costs about 3 skills at week 12 | Slower unlocking | [inf], vectors exist |
| Latency rows of the rating map off until `n_obs >= 20` | Avoid mis-rating novices | Fewer Hard ratings | [inf] |
| Plan 5-7 new skills a week, never 20; builder multiplier cap 1.8 to 3.0 if orientation shows more | Section 2 | None | [inf] |
| Checkpoint-gap trigger (F-15) | Early response to over-reliance | Extra friction | [P] |
| Lab slot as focus while no project step is eligible (F-08) | +26% mastered at week 12 | Delays project time | [inf] |
| Diagnostic: two sittings, 2.5 min/item, 45-minute total cap, no MC | Realistic budget | None | [inf] |
| `maximum_interval_days` 60 if the 8-30 day bucket under-recalls | Contain optimistic stability | More reviews | [P] |

### (c) Proposed contract changes (not applied)

| ID | Proposal | Justification |
|---|---|---|
| PCC-1 | Contract 7.1: state whether the 14-day placement grace also waives `min_tier` (recommended: yes, up to L1, until the first verification review). | Strict reading makes the diagnostic open nothing across 219 of 232 hard edges (F-02); 05 11.3 and 06 6.1 now document the strict reading. |
| PCC-2 | Contract 7.2 (b): read "in-progress skill" to include a `reviewing` skill whose only open mastery condition is *applied*. | Implemented in the reference; without it 47 instead of 77 skills are mastered at week 12 (F-01). A clarification, not a new priority class. |
| PCC-3 | Contract 7.5: add (optional) condition "first and last qualifying attempts at least 2 days apart" and "at least 2 distinct templates when 2 verified templates exist". | F-03; first condition implemented as a parameter, second not implemented. |
| PCC-4 | Contract 5/7.6: a `lab` slot with no eligible project step may be served as a `focus` session (cap 120). | F-08; today the slot is idle for learning. |

---

## 8. Findings for other owners

**Content owner (`content/mvp-skill-graph.yaml`)**

1. `elec.dig.latch-flipflop`: reword ("Trace an SR latch's output through an input sequence and a D flip-flop's output through clock edges."), change hard prerequisite `combinational-design` to `gates-truth-tables`; consider splitting.
2. `elec.meas.oscilloscope`: make `math.trig.sinusoids` soft or remove it.
3. `elec.meas.measure-vs-simulate`: its hard edge to `math.prob.measurement-uncertainty` pulls probability into week 5-8; either make it soft (tolerance stack-up is already in `dc.resistor-values`) or move `math.prob` (at least `probability-rules`, `expectation`, `variance`, `measurement-uncertainty`, `averaging-noise`) before `elec.meas`/`sw.fw` in `modules[].order`. Fix `sw.tools.build-make` (needs `c.program-structure`) similarly.
4. `sw.fw.i2c-protocol`: add hard edge `elec.rc.rc-time-constant`, or drop "size its pull-ups" and move it to a new skill; reduce to one outcome.
5. `math.alg.exp-log`: mention natural logarithm and e; avoid duplicating decibels with `elec.rc.bode-db`; state 20 log10 vs 10 log10 in one of them.
6. `elec.opamp.sensor-conditioning`: add a prerequisite skill for summing or level-shift amplifiers (offset), or reword to "choose gain" only.
7. `elec.opamp.comparator`: replace hard `ideal-rules` with `dc.voltage-divider` (hysteresis thresholds) or note positive feedback.
8. Missing skills (minor graph version): function pointers (before `sw.fsm.table-driven`), memory-mapped registers and `volatile` (before `sw.fw.gpio-output` / `fw.isr-shared-data`), UART framing (before `fw.uart-logging`).
9. Add `confusable_set` values (none exist): candidates `{dc.kirchhoff-laws, dc.nodal-analysis, dc.superposition, dc.thevenin-norton}`, `{opamp.inverting, opamp.noninverting, opamp.comparator}`, `{rc.rc-lowpass, rc.rc-highpass}`, `{semi.bjt-switch, semi.mosfet-switch}`, `{calc.derivative-rules, calc.derivative-functions, calc.antiderivatives}`, `{c.control-flow, c.functions}` is not confusable and should stay untagged.
10. Consider reducing `min_tier: L1` to L0 on edges that need only the idea (F-05).
11. Re-time with a stopwatch: `dc.nodal-analysis`, `rc.rc-lowpass`, `calc.exp-growth-decay`.

**Validator (`reference/validate_graph.py`)**: rule 13 should check every edge, not only entry skills (6 backward edges pass today); add a warning for titles with "and" in a description with two verbs; optional check that at least one skill in each module has a `confusable_set` when interleaving is intended.

**Document 01 / 13 / backlog**: `13` line 73 and the scheduler tasks in `backlog.yaml` (sched-vectors-runner, scheduler-port tasks) must implement and test `applied_gap`, the `needs_applied` flag (derived from `mastery_rule(...).checks.applied == false` for `reviewing` skills), and `mastery_min_span_days`; vector count is now 107 (field `count` is authoritative). State in 01 that the planning rate is 5-7 new skills a week (A-04 gives 450-900 hours for three nodes; 05 gives 162-300; the two should be reconciled).

**Document 07**: every probed skill needs a constructed-response diagnostic item (MC is banned there); the assessment pool doubles item authoring for checkpoints; difficulty matching needs >= 2 templates per skill; set `expected_s` from a stopwatch, not a guess.

**Document 09**: show "needs one more applied problem" as the reason a skill is `reviewing`; the diagnostic as two sittings; a 5-minute reviews-only micro option; per-answer-type time defaults.

**Document 10 / project ladder**: offer the L0 blink as a guided build in week 1-2 (L0 credit is immediate, 00a B5; LS-081 lets a step start when linked skills are at least `learning`, but the frontier does not make `gpio-output` available that early, so state the project-first exception explicitly).

**Document 11**: add the interval-bucket calibration and the checkpoint-gap measure to the event props; add `mastery_span` as an experiment flag; SM-01 (>= 360 of 480 minutes) should be read against the 252 usable non-lab minutes, i.e. a lab block is part of the 360.

---

## 9. Claims lint (`reference/lint_claims.py`)

Scans `docs/`, `content/` (including `content/prompts/`), `backlog/`, `README.md`, `CLAUDE.md` for the forbidden claims of contract section 8: neuroplasticity windows or critical periods, targeted memory replay or reactivation (TMR) and sleep-cueing, neurostimulation, "2 sigma", the "85% rule", 90-minute brain cycles, "top 1%", "mastery of all", "novices beat experts" (16 weeks), emotion, biometric or neural-data inference.

Allow-context rule (defined in the script header): a hit is excused when (A) its own line contains a negation or discussion marker (never, do not, must not, forbidden, excluded, deliberately, avoid, reject, lint, "no ... claims", "out of v1", ...); (B) the nearest enclosing Markdown heading is an exclusion, claims, policy, risk, avoid, non-goal, techniques, security or similar section; (C) a marker sits within two lines in the same paragraph; (E) for YAML, the enclosing entry's title, slug or id mentions claims or lint. Output is `file:line: VIOLATION [category] 'fragment' :: line`. `--show-allowed` lists the excused hits; `--selftest` runs 16 positive and negative cases.

Run on 31 Oct 2026: 36 files (including this one), **0 violations, 136 excused hits**. I read all excused hits outside the three exclusion documents (01 PRD forbidden-strings table and non-goals, 07 lint rule list, 08 tutor policy and adversarial cases, 09 copy guide, 12 security tests, 14 risk register, backlog claims-lint task, CLAUDE.md, README); each rejects or tests the claim. Two real violations were found in the first draft of the script's own run: none in the documents (the first run reported 7 hits that were all negations of the form "makes no neuroscience, neurostimulation or top 1% claims"; the line rule was extended to the pattern `no ... claim(s)` and `out of v1`, then re-run clean). Limits: the rule is lexical; a line that contains a marker word and a claim, for example "no risk, top 1%", would be excused. It does not read images, YAML values split across lines, or code outside the scanned folders. Treat `--show-allowed` as a review aid whenever a section with an exclusion heading is edited.

---

## 10. Validation output (31 Oct 2026)

```
$ python3 -I reference/scheduler_reference.py selftest
selftest ok
$ python3 -I reference/scheduler_reference.py check reference/scheduler_test_vectors.json
107/107 vectors pass
$ python3 reference/validate_graph.py            (tail)
total est_minutes: 3890 = 64.8 h core learning time (planning multiplier 2.5x = 162 h, unvalidated)
RESULT: PASS (0 errors, 0 warnings)
$ python3 reference/lint_claims.py
lint_claims: scanned 36 files, 0 violation(s), 136 hit(s) excused by the allow-context rule
```

## 11. What this review did not do

It did not run the pinned FSRS-6 library (the memory model is recalled and simplified), did not test any item template, and did not observe a real learner. All simulation results are model outputs [inf] intended to size problems and rank options, not to predict this learner. The 25-skill spot check read descriptions and edges, not items or graders. The first real data come from the orientation sessions and the calibration monitor.

---

## 12. Resolution (engine pass, 31 Oct 2026, contract v1.2)

**Ratified.** PCC-1 became G1 (option A: the placement grace counts as tier L1 for the frontier test only). PCC-2 became G2 (applied-gap rule; `needs_applied` derived at read time, not stored). PCC-3 became G3 (span of 2 local calendar days and 2 distinct verified templates; both implemented). PCC-4 became G4 (lab fallback). Recommendations in 7(b) became G5 (retention 0.85 then switch rule; latency gate), G6 (tutor over-reliance trigger, replacing the F-15 proposal's 0.25 gap and level cap by 0.15 and `post_attempt_only`), G7 (diagnostic) and G8 (planning rate). Graph findings became G9. Not adopted: `maximum_interval_days` 60 (kept as a monitored option) and every-second-review-as-problem (F-04).

**Section 8 items (graph, applied in `content/mvp-skill-graph.yaml` 0.2.0):** 1 to 9 and 11 applied (latency-flipflop reworded and re-edged, oscilloscope and measure-vs-simulate edges fixed by moving `math.prob` before `elec.meas`, i2c-protocol and sensor-conditioning prerequisites added, comparator edge changed, 4 new skills, 11 confusable sets, re-timing of nodal analysis, rc-lowpass and exp-growth-decay); item 10 (`min_tier` reductions) **not applied**. The validator (`reference/validate_graph.py`) now checks rule 13 on every edge with 3 whitelisted `module_order_exceptions` and checks `confusable_set` tags.

**Current figures.**

| Quantity | Review (v1.1, graph 0.1.0) | Now (v1.2, graph 0.2.0) |
|---|---|---|
| Skills (real + stubs) | 138 + 18 | 142 + 18 |
| Edges (hard / soft; hard at L1) | 232 hard, 219 at L1 | 247 total: 239 hard, 8 soft; 227 hard at L1 |
| Total `est_minutes` | 3890 min = 64.8 h (2.5x = 162 h) | 4060 min = 67.7 h (2.5x = 169 h); mean 28.6 min |
| Backward module dependencies | 6 | 0 outside 3 whitelisted exceptions |
| Confusable sets | 0 | 11 (30 skills) |
| Test vectors | 107 | 161 (13 changed inputs, no changed expected values; 06 section 15) |

**Simulation headline changes (06 section 14, all [inf]).** Mastered at week 12 under the v1.2 defaults: 86.9 (the review's v1.1 model: 77 with the applied-gap rule and the lab as dead time; the contract v1.1 rules with the lab fallback give 92.9 in the v1.2 simulator). Without the applied-gap rule 60.4; with two verified templates per skill 75.9; span 4 days 80.8; retention 0.90 from day 1 90.6; pessimistic memory 66.5 (review share 55%); tasks 1.5x and 2.0x the estimate 68.0 and 50.6; 20% missed sessions 68.9; 150-minute weeks 55.8. Reviews due at the start of a week settle at 10 to 11. First blink (`sw.fw.gpio-output` and its 22 ancestors) at about week 15 under v1.2 against about week 11 under v1.1 rules; a guided L0 blink in weeks 1 to 2 is the remedy. The review's claim that 0.85 raises mastered skills was **not reproduced** in the v1.2 simulator (87 against 91 at 0.90 from day 1): 0.85 is retained for review load and the unvalidated fresh-variant risk, not for speed. Diagnostic at 20 items: 16 (novice), 28 (some background), 40 (strong) skills of 142 unresolved.

**Validation (31 Oct 2026, after the engine pass).**

```
$ python3 -I reference/scheduler_reference.py selftest        -> selftest ok
$ python3 -I reference/scheduler_reference.py check reference/scheduler_test_vectors.json -> 161/161 vectors pass
$ python3 reference/validate_graph.py   -> total est_minutes: 4060 = 67.7 h; RESULT: PASS (0 errors, 4 warnings: est_minutes > 40 on nodal-analysis, rc-lowpass, exp-growth-decay, spice-rc)
$ python3 reference/validate_projects.py -> 6 projects, 69 steps, 0 errors, 0 warnings
$ python3 reference/validate_templates.py -> 7/7 templates valid
$ python3 reference/lint_claims.py -> 0 violations, 136 excused hits
$ python3 reference/check_package.py -> 2 findings, both in docs/09-ux-and-flows.md (reference to the 00b consistency report, its section on open items, not an engine-pass file)
```
