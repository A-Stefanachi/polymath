# Specification and build decisions log

Record go/no-go outcomes, lean-gate releases, and scope-down choices here before starting deferred backlog groups (D1–D9). Format: date, decision, evidence (metrics or task ids), next three tasks.

---

<!-- Entries appear newest first. -->

## 2026-11-07: the daily new-skill cap says so (00a M4, founder decision)

Decision: the founder hit the default cap of 3 new skills a day (LS-053) and saw only "Nothing of this skill fits a session just now". The founder chose to raise their cap to 6 and to fix the message.

- **Staging data:** `profiles.settings.max_new_skills_per_day = 6` for the founder's profile, written through the management API on 7 Nov 2026 (inside the 1 to 6 range of `dailyCap`).
- **API:** optional `new_skill_cap_reached` on `SessionPreview`; the map and the Practise button show "New material is capped today…".
- **Evidence:** `caps.test.ts` (capped preview true, allowance left false), `start-session.test.ts` (capped outcome), both seen failing first.
- **Next three tasks:** deploy to staging; a Settings screen for the cap (LS-053 promises one); the e2e failures on main.

## 2026-11-06: lessons can be read again from the skill map (00a M3, founder decision)

Decision: the founder asked to "open and read lessons again" and chose "Skills I have started" and "Nothing recorded".

- **API:** new read-only operation `getSkillLesson` (`GET /skills/{skill_key}/lesson`), 404 unless the caller has started the skill and it has a verified lesson.
- **UI:** "Read the lesson" on a started skill's detail opens `/lessons/{skill_key}` with the primer in read-only mode.
- **Evidence:** `reread.test.ts` against a local Supabase (served version and fields, nothing written, 404 cases, strict query), its started-check guard shown failing once.
- **Next three tasks:** deploy to staging; the founder re-reads a lesson on the phone; the e2e failures on main (worked-example flows).

## 2026-11-06: one session can master a skill; "Practise this" serves a finished loop early (00a M2, founder decision)

Decision: the founder asked that qualifying answers given before the review unlock the next skills ("if I provide the qualified answers before the review you need to let me go to the next lesson / module") and chose "Same session is enough" and "Practise this only".

- **Mastery rule:** `mastery_min_days` 2 → 1 and `mastery_min_span_days` 2 → 0 in the reference and in `packages/scheduler`; the other conditions of 06 section 4.2 are unchanged. Vectors: `mast-one-day` now passes, five mechanism vectors pass the G3 parameters explicitly, `mast-project-credit-only` changes its `days` check only, new `mast-one-day-param`; 168 vectors.
- **Early practice:** a focus build on a `learning` skill whose loop is done plans it as a review before its due date; builds without a focus still wait (M1).
- **Evidence:** reference check 168/168 and selftest; scheduler 343 tests; web 456 tests against a local Supabase (none skipped); spec validators pass.
- **Risk to watch:** `mastered` now means three short-term successes; checkpoint accuracy of mastered skills (06 section 12) is the check. The 06 section 14 workload model was not re-run.
- **Next three tasks:** deploy to staging; the founder answers one more Order of operations question through "Practise this"; re-run the 06 section 14 simulation under M2.

## 2026-11-05: repair of the founder's order-of-operations state after #25 (founder instruction)

Decision: the founder asked for the repair ("apply the repair") after #25 fixed attempts being applied with the template's kind instead of the served task's kind (00a H1).

- **What was wrong:** the founder's 4 faded problems on `math.alg.order-of-operations` had been applied as `problem`s. As a result:
  - `loop_step` stayed `faded_problem`;
  - one `review_log` row and an FSRS card (reps 1, due 9 November) were created from faded attempts;
  - Elo was 1390.
- **How it was repaired:** the founder's staging rows were copied to a throwaway local PostgreSQL 17. This one skill's derived state was cleared, and the history was replayed in time order through the fixed domain code: the `completeTask` step for the worked example, `applyGradedAttempt` for each attempt, and `commitSessionReviews` for each session close, each at the event's own time.
- **The result, written to staging through the management API:**
  - `loop_step = retrieval_same_day`, `learning`;
  - no card (reps 0, due null);
  - Elo 1344;
  - the faded-derived `review_log` row deleted;
  - the 4 attempts' `state_applied_at` restamped.
- **Guard:** the write was conditional on staging still holding exactly the exported 4 attempts, 7 sessions and 1 review row.
- **Departure from the rules:** `review_log` is otherwise append-only (BL-0197 rebuilds never delete). This deletion removes a row the bug wrote, on the founder's own data, at the founder's request.
- **Next three tasks:** the founder continues the loop (retrieval, then practice); a hosted worker; the GitHub `staging` environment.

## 2026-11-05: second content review, fixes and pool stock on staging (founder instruction)

Decision: the founder asked the build agent to "review them for me on my behalf and approve", and then said "I dont run anything on my machine you do it". Two independent agents reviewed the 30 lean templates, the 19 lessons and the BL-0067 slice. The agent fixed what they found, approved the new versions on the founder's behalf, and loaded them onto staging from the cloud session.

- **Templates (10 new versions):**
  - charge-current, ohms-law-r and power-diss: the prompts now ask for three significant figures. A sensible two-figure answer missed the unchanged 2 % tolerance on 10 to 20 % of items.
  - ohms-law-v and energy-joule: the same sentence.
  - quadratics-roots: "integer roots", and the hint now says to change the signs.
  - lab-probe: the l3 hint no longer restates the answer.
  - schematic-gnd: "ground symbols of the same kind and name".
  - kirchhoff-kcl: "defined as flowing out" in place of an arrow that has no figure.
  - rearrange-ohm: a 1 W power constraint.
  - energy-joule: the bounds check's upper limit is 21601 J, because the largest draw rounds just above 21600 J.
  - Check results: G2 fuzz passes 200/200 for each template. An agent re-solved the new G3 seeds from the statements: 50 of 50 agree. The review blocks say `agent-on-founder-instruction`.
  - Lost founder sign-offs: five of these templates (charge-current, energy-joule, kirchhoff-kcl, ohms-law-r, ohms-law-v) had the founder's console sign-off on their old hashes. That no longer applies to the new versions.
- **Lessons (6 new versions, agent-approved):**
  - order of operations: scientific calculators, and spreadsheets on `-3^2`.
  - schematic reading: polarised capacitors, and ground symbols of the same kind.
  - power and energy: "can overheat and damage it".
  - lab safety and ESD: about 2 to 3 kV to feel a discharge, eye protection for soldering, and a scope-ground check that no longer gives away `tpl.elec.lab-probe`.
  - Thevenin and Norton: the Norton line.
  - nodal analysis: "alone".
- **Graph 0.10.1:**
  - `elec.dc.superposition` → `elec.dc.thevenin-norton` is now soft. Superposition is not in the lean slice, so the hard edge locked Thevenin for good. All Thevenin material uses one source (doc 05 section 4, rule 3).
  - Titles: "Ohm's law" and "Kirchhoff's laws".
- **Staging, done the M0 way (no TCP route, no laptop worker):**
  - The pipeline ran against a throwaway local PostgreSQL 17 loaded with staging's content rows: content:sync, the worker's `content_postprocess` fuzz job, a second sync, and a `pregenerate_items` pool job for the founder (want 30 per skill).
  - The new and changed rows were then upserted to staging through the management API. No status was set by hand.
  - Result: 30 verified templates, 25 verified lesson versions, and 26 to 30 unserved verified items per skill.
- **Not done (founder judgment):**
  - `difficulty_prior` for nodal-unknown and thevenin-model;
  - the two different prior-to-Elo conversions in docs 06 and 07;
  - the weaker distractors in linear-intercept, order-parens and series-parallel-req-mc;
  - the extra soft edges the slice reviewer suggested.
- **Still open for BL-0067:** the per-module signed checklist entries and `status: verified` for the 19 skills.
- **Scope:** founder-only staging, as for the entries of 4 and 5 November.
- **Next three tasks:**
  - a hosted worker (the pool refills only while a worker runs, and the founder runs nothing locally);
  - the GitHub `staging` environment, so merges deploy without the agent;
  - BL-0070 dogfood defects.

## 2026-11-05: agent approval of the 19 lean lessons (founder instruction)

Decision: the founder told the build agent to approve the 19 concept primers on the founder's behalf ("Approve all on my behalf"), after they were synced to staging as `needs_human_review` (#20). The founder chose to depart from K9's rule that the founder approves each lesson version in the console.

- What stands behind the approval: the agent drafted the lessons (#19, `lesson_assist_v1`); `validate_lessons.py` and the app validator pass 19/19; `claims:lint` is clean. Before approving, the agent read all 19 and checked every worked example, equation and check-question answer and its feedback. It found no factual or arithmetic error.
- What does not: no person has read them. The founder should still check the ESD lesson's two approximate figures (a spark is noticeable at a few thousand volts; a strap resistor is often 1 MΩ) and the one-line Norton note in the Thevenin lesson.
- How it was written: on staging, through the management API, the same update the console's approve action makes, applied only to versions still `needs_human_review`. `skill_lessons.reviewed_by` must be a user, and the founder's account is the only one, so the database shows the founder's account as reviewer. This entry and `content/REVIEW-LOG.md` are the record that the agent made the approval.
- Scope: founder-only staging, as for the templates (entry of 4 November). Before any beta learner has an account, the founder reviews the lessons or records a new decision here.
- Next three tasks: founder reads the lessons while studying; BL-0205 (step labels); numeric misconception values from the worker.

## 2026-11-04: agent approval of the 29 lean templates (founder instruction)

Decision: the founder told the build agent to approve the 29 pending lean templates on the founder's behalf ("approve all of them for me", then "I am telling you to do it on my behalf"). The agent first declined, citing rule 3, FR-124 and the removal of the unchecked stamps on 2 November. The founder repeated the instruction, so the founder chose to depart from the G3 rule that a person does the hand-solve.

- What stands behind the approval: the agent's solve of all 145 G3 seeds from the rendered statements, 0 disagreements, done again after the 4 November edits; its reading of checklist boxes 2 to 7; and fixes to 11 templates (#15). See `content/G3-WORKSHEET.md`.
- What does not: no person has hand-solved these items (box 1) or checked boxes 8, 10, 11 and 12. That includes the three rule keys (`lab-esd`, `lab-probe`, `schematic-gnd`), which only a person can confirm.
- Records: `provenance.review.reviewer` is `agent-on-founder-instruction`, and the REVIEW-LOG rows say "agent, founder instruction". A founder `g3_review.py` run on any template replaces its block and row.
- Scope: founder-only staging. Before any beta learner has an account, each of these templates needs a founder G3 review, or the founder records a new decision here.
- Next three tasks: sync the verified pool to staging and pregenerate items; founder G3 on the three rule items; BL-0198.

## 2026-11-04: CI runs locally only (00a L1)

Decision: the founder removed GitHub Actions CI ("remove CI altogether and run it only locally"). Runs had queued for GitHub runners and held up merges.

- Deleted `.github/workflows/ci.yml`. `deploy-staging.yml` stays: it deploys `main` and is not a check.
- `pnpm ci:local` runs `tools/ci/local-ci.sh`, the same jobs on the founder's machine. A pull request merges only after a full run passes on its head commit.
- `tools/ci/spec-validators.sh` now runs `validate_lessons.py`.
- `infra/BRANCH-PROTECTION.md`: required status checks off. **Founder action:** turn off "Require status checks to pass" for `main` in GitHub settings, otherwise pull requests wait for checks that never report.
- Next three tasks: BL-0198, BL-0199, BL-0200.

## 2026-11-04: teaching layer (00a K1 to K12)

Decision: the founder reported that the app "is not really teaching" and asked which teaching method fits the curriculum. After the research and the agent's recommendation, the founder asked for the specification ("create the specs for it").

- Finding: a worked example showed only the problem statement. The solution steps were generated and stored in `item_secrets.solution`, but H1 was never built and the OpenAPI file had no field for them. Nothing explained an idea before practice.
- Method chosen: explicit instruction, then worked examples with fading, then spaced retrieval. A short concept primer (lesson) runs inside the existing `worked_example` task, followed by a stepper with labelled steps and "pick the step's purpose" self-explanation. Faded problems show their given steps. There is no new task kind and no scheduler change. The 4.0-minute estimate and the reference vectors are unchanged.
- Evidence used (doc 02 M14, all [S] or [R]): worked examples g = 0.48 in math; explanations help conceptual more than procedural knowledge; pre-training; refutation texts g = 0.41; subgoal labels. Added self-explanation prompts lowered the worked-example benefit in one meta-analysis, so typing is optional.
- Specification added:
  - 00a section K;
  - `skill_lessons` in `schemas/schema.sql`, with 7 new database tests (all 257 pass on PostgreSQL 17);
  - `WorkedStep`, `LessonView`, `TaskDetail.lesson` and the `rendered.worked_steps` fields in the OpenAPI file;
  - the optional step `label` in the template schema;
  - `schemas/lesson.schema.json`, `reference/validate_lessons.py` and a draft sample lesson for `elec.dc.ohms-law`;
  - docs 02 (M14, LS-096 to LS-101, PRM-21), 04, 05 §5.6, 06 §7.2, 07 (L27, §15), 09 S08 and 11 §9 (two events).
- Shipped with the specification so CI stays green, because CI compares each of these with the specification:
  - the additive migration `20261104000000_skill_lessons.sql` (`pnpm db:diff-reference` is clean);
  - regenerated `packages/shared-types` (API, database and event types);
  - lint L27 in `tools/content-lint`, with its fixture.
  No learner-facing behaviour changes until BL-0198.
- Cost: eight lean tasks, BL-0198 to BL-0205, about 18 central founder-attention hours [P]. The lean target's upper bound moves from 225 to 250 founder hours.
- Next three tasks: BL-0198 (serve worked steps), BL-0199 (stepper and faded cards), BL-0200 (lessons content type and sync).

## 2026-11-04: visual design "Bench Arcade" (00a J7)

Decision: the founder found the M0 UI hard to like. They asked for a researched, readable and engaging design with 90s pixel-art icons, then approved the clickable prototype ("its perfect, put it in").

- Evidence used:
  - Seductive-details meta-analyses: decoration inside a lesson tends to reduce learning, so pixel art stays in the chrome.
  - One task per screen with immediate feedback, as in Brilliant- and Duolingo-style flows.
  - Readability guidance: 16 to 18 px body text, about 1.5 line height, short lines on a phone.
  - Atkinson Hyperlegible Next, designed for character distinction (claims are the makers' [R]).
- Rules kept: WCAG 2.2 AA contrast for every pair (measured), no streaks, XP or confetti, and self-hosted fonts, so no third-party requests.
- Next three tasks: BL-0058 (tokens, shell and components in this look), BL-0196, BL-0197.

## 2026-11-04: Wave 5 decisions (00a J1 to J6)

Decision: the founder delegated the six open questions of the Wave 5 review to the build agent ("take decisions for me"). Each is recorded as a 00a J entry.

- J1: report categories follow the contract's `item_reports.reason` values. `wrong_answer` quarantines at once.
- J2: a disputed attempt is excluded from FSRS by rebuilding `skill_state` from `review_log`. New lean task BL-0197.
- J3: the symbolic part of BL-0085 moves into the lean slice as BL-0196, for queue-only grading with the apply callback.
- J4: the symbolic answer key carries the misconceptions. This is part of BL-0196.
- J5: a console approval completes G3 for the current hash. The file route stays valid.
- J6: `tpl.elec.schematic-series` v3 fixes lint L11. `content:sync` enforces every lint rule, and L04 resolves generator outputs in evaluation order.
- Evidence: `pnpm content:lint` gives 30 templates, 0 errors. G2 fuzz on schematic-series v3 passes 200 of 200 samples, rejection rate 0.407. `validate_backlog` and `check_package` pass.
- Plan effect: the lean slice grows from 83 to 85 tasks, adding 9 h of task size. BL-0060 (first daily use) now also depends on BL-0196 and BL-0197. The planning totals in docs 00d, 01 and 13 still say 83 tasks and 395.5 h; refresh them when the model is refitted (00d section 8).
- Next three tasks: BL-0058 (design tokens and layout shell), BL-0196, BL-0197. The founder can start BL-0065 (15 math templates) in parallel.

## 2026-11-04: M0 exit (BL-0032)

Decision: M0 (walking skeleton, doc 01 section 10) is met on staging. The founder delegated BL-0032 to the build agent without review of the steps below.

M0 exit criteria:

- [x] One template rendered with 3 seeds, all verified: `tpl.elec.voltage-divider-vout` v1, seeds 1000 to 1002 (from the G3-reviewed range 1000 to 1004); `select count(*) from items where status='verified' and template_key='tpl.elec.voltage-divider-vout'` on staging returns 3.
- [x] RLS tests green: local CI on this change, `pnpm test:rls` 69 tests PASS, `supabase test db` 86 tests PASS, RLS mutation checks PASS. GitHub CI is parked by the founder, so local CI (`tools/ci/local-ci.sh`) stands in for the CI summary of acceptance 3.
- [x] Claims lint runs: `pnpm claims:lint` 0 violations (266 files).
- [x] SM-06 = 0: on staging, attempts on an item that is not `verified` = 0, and open session tasks on such an item = 0.
- [x] Demonstrable FRs: `pnpm e2e:m0` passes against https://polymath-staging.vercel.app (1 passed). It covers email-code sign-in (FR-001), the consent record (FR-004), onboarding with a weekly target (FR-002), the item for 3 seeds with its text alternative and no answer key in the page (FR-060, FR-067), numeric grading (FR-061), and the attempt and event rows (FR-110). The content comes from git through `content:sync` (FR-010, FR-122, FR-126).

How it was done, and what differs from the plan:

- The worker had no handler for the `content_postprocess` job that `content:sync` enqueues, so no synced template could reach `verified`. BL-0032 adds it (`services/worker/polymath_worker/postprocess.py`): the G2 fuzz run of doc 07 section 7, ported from `reference/verifiers/verify_template.py`. All 30 lean templates passed 200 samples. BL-0052 still owns the CI side of G2 and the per-template report.
- The cloud session has no TCP route to the staging database (infra/ACCOUNTS.md) and the laptop worker is not running yet. The pipeline therefore ran on the local stack: sync, fuzz job, second sync (the divider is the only template with a G3 review, so it is the only `verified` one), and a `pregenerate_items` job for the 3 seeds. Its output rows were then copied unchanged to staging through the management API: modules, skills, edges, templates, items, item_secrets, sync runs and the two jobs. No status was set by hand. Later syncs to staging keep the verified status, because the hash is unchanged.
- The e2e learner is a throwaway account made with the admin API (signup is off) and deleted at the end of the run. Only the email is stood in for: the test answers the browser's `/auth/send-code` call and mints the code with the admin API, because Resend's test sender delivers only to the founder's address. The code is typed into the real form and checked by the real verify route on staging. Delivery of the email is the founder's iPhone check (infra/VERIFIED.md, done 4 Nov 2026).
- The exit demonstration from the phone (risk note of BL-0032) is the founder's 4 Nov 2026 sign-in recorded in infra/VERIFIED.md. Answering an item from the phone is not recorded separately.
- Local CI on commit 87c4d98 (`bash tools/ci/local-ci.sh --skip docker`): all 26 steps PASS, including `e2e:auth`, `worker-db-tests`, `content-sync-db` and `web-db-tests`. Not run: the worker image build, which the sandbox proxy blocks, as in Wave 4.

Next three tasks: BL-0050 (template lint L01 to L26), BL-0051 (verifier registry), BL-0052 (G2 fuzz in CI).

## 2026-11-03: worker heartbeat table and function default privileges (00a I3)

Decision: the founder delegated the two schema questions of the Wave 2 review (PR #4) to the build agent's judgment. Both are recorded as 00a I3: `app_private.worker_heartbeat` (the one-row heartbeat doc 03 sections 8.4 and 8.6 call for, read by `GET /health`) and a global default-privileges entry so new functions are not executable by PUBLIC (a baseline gap found by ST-RLS-19).

- Evidence: migrations `20261103000000_default_privileges_functions` and `20261103000100_worker_heartbeat`; `pnpm db:diff-reference` matches `schemas/schema.sql`; ST-RLS-19's function check passes (it was a pgTAP `todo`); a pgTAP test covers the heartbeat grants and the one-row rule; the worker writes the row every 5 minutes.
- Not decided here: the staging run of the OA-9 / ST-RLS-19 probe (`infra/VERIFIED.md`) happens when migrations are first pushed to staging (BL-0029).
- Next three tasks: BL-0021 (email-code sign-in), BL-0022 (API skeleton), BL-0019 (grading-core).

## 2026-11-03: data region London for now (OQ-02); BL-0001 started

Decision: the founder keeps the staging Supabase project in `eu-west-2` (London) for the moment. This is a UK jurisdiction, not the EU default of OQ-02; the UK has an EU adequacy decision. Revisit before the study history grows or before any beta learner has an account, when a move means migrating data. The non-EU choice keeps `deepseek/deepseek-v4.1-flash` as the strong model; `z-ai/glm-5.3` on Mistral's EU endpoint stays the alternative if the region moves to the EU.

- BL-0001 started in parallel with Phase -1 at the founder's choice: Supabase staging project created (Postgres 17.11, Free plan), OpenRouter key with a $50 monthly limit. Record in `infra/ACCOUNTS.md`.
- Still open in BL-0001: Vercel, Docker Desktop on the laptop, optional domain and SMTP.

## 2026-11-03: OpenRouter open-weights models; laptop worker in the lean slice

Decision: the founder chose OpenRouter with open-weights models as the LLM provider (00a I1) and the founder's laptop as the lean-slice worker host in queue-only mode (00a I2). The OpenRouter key is in the cloud environment's network secrets and has a $50 monthly limit (checked 3 Nov 2026). Fly.io and Anthropic accounts drop out of BL-0001.

- Edited to match: contract LLM line, doc 01 D-02, doc 03 (context diagram, 9 and 9.1, 12, ADR-011, OA-5), doc 12 (REG-17, ST-SEC-02), CLAUDE.md layout, BL-0001, BL-0029, BL-0054 and BL-0073 (title and a data-collection test; slug `llm-anthropic` kept as a stable key).
- Models (founder's choice, 3 Nov 2026): strong tier `deepseek/deepseek-v4.1-flash` (MIT), cheap tier `z-ai/glm-5.3-flash` (MIT). Evidence: both on OpenRouter's zero-data-retention endpoint list (checked 3 Nov 2026); Artificial Analysis index about equal to GLM-5.3 at a tenth of the price (vendor-reported benchmarks [R]). Alternative kept: `z-ai/glm-5.3` on Mistral's EU endpoint if EU residency is required (OQ-02). BL-0073 reads both LICENSE files, pins one provider and quantisation for rubric repeatability, verifies prices into `pricing.json` and runs the doc 08 adversarial suite before either model is relied on.
- Next three tasks: BL-0001 (founder: Supabase staging, Vercel), BL-0002 (repo scaffold), BL-0003.

## 2026-11-03: research pass on the needs_human_review skills

Decision: at the founder's request, agents researched the open checks and founder items for all 247 T1 to T6 and bridge skills against primary sources (00a H19, H20). The reports are in `content/syllabi/skill-specs/reviews/human-review-T*-2026-11-03.md`. No skill is `verified`.

- OPEN-CHECKS: 151 flags down to 11. `build_open_checks.py` no longer flags ordinary words such as "uncertainty".
- Safety: the L6 and L7 briefs are now `2026-11-03-1`. Changes: rotating parts, fire response, a flywheel guard and 1 J cap, stall limits, and a ban on gain-to-oscillation tests.
- Corrections:
  - 6061-T6 extrusion minimum Sut is 262 MPa, used in the fatigue check.
  - DC-link capacitance is sized by charge balance.
  - The PX4 anti-alias filter description and the gyro-calibration method are fixed.
  - The NASA-STD-7009B factors, § 9 AWV scope and product-liability dates are fixed.
- Lab bands: beam and tap test now calibrate the clamp, and both pass at 1.00 in simulation.
- Graph: seven UAV `est_minutes` raised, capped at the 60-minute schema limit. `robo.uav.manual-recovery`, `fc-config` and `sitl-first` are candidates to split. The `prof.eu.product-liability` description now says "from 9 Dec 2026".
- Still open: the LBA letter (ready to send in the T4 report), two vendor PDFs, paid standards (ISO 8015, ISO 286-2, ASME Y14.5, IPC-2221, VDI 2230, Shigley 11th Table 6-2), counsel questions in the T6 report, stopwatch runs, and founder sign-off on project conventions.

## 2026-11-02: final spec gaps

Decision: applied the founder's rule to research when unsure and implement best practice. H15 is accepted: FSRS guidance supports counting one review per day. Added H16 (tutor reports), H17 (FR-113 is a CLI), H18 (00d additions go through 00a).

- `is_service_role()` also checks `current_user`, because secret keys are not JWTs. Still to confirm on staging.
- L1#s05 no longer lists firmware skills, because the learner only flashes starter code.
- Spine skills without a calculus prerequisite were reviewed and left as they are: they use closed forms and working-level estimates, not derivations.

## 2026-11-02: bridge skills

Decision: added nine bridge skills in T2 and T5 (00a H14). Graph 0.9.0: 142 draft, 247 needs_human_review, 4 stubs.

## 2026-11-02: weakest points addressed

Decision: curated prerequisites into graph 0.8.0 (00a H13), synced spec metadata, added `OPEN-CHECKS.md`, `lab-band-checks`, and read the Recommendation 2019/1318 annex and other official legal text.

## 2026-11-02: T1 to T6 skills expanded

Decision: all 238 T1 to T6 skills are authored, with specs in `content/syllabi/skill-specs/` (00a H12). Graph 0.7.0: 142 draft, 238 needs_human_review, 7 stubs. None is verified.

## 2026-11-02: syllabus review applied

Decision: applied the ranked changes in `SYLLABUS-REVIEW-2026-11-02.md`, with decisions 00a H8 to H11. This does change the first walk: six skill swaps, still 142 skills, lean slice unchanged.

- All 65 modules now have an unaided hard task.
- T1 power conversion, T2 loop analysis and an L2 advanced module, T3 drawings and materials, T4 real physics and flight test, T5 validated twin and data SLOs, T6 export, data and AI law.
- `elec.pcb` moved to T1. T1, T3, T4 and T5 were reordered.

## 2026-11-02: remaining syllabus gaps, researched first

Decision: added 14 stubs (graph 0.5.0: 142 real plus 158 stubs). The first walk and lean slice are unchanged.

- T1: new `sw.rel` firmware reliability module, a shunt current amplifier as op-amp bench proof, and high-discharge pack skills, with a draft L6 safety brief (00a H6).
- T5: new `ml.pred` module on baselines, honest anomaly evaluation, physics residuals and remaining useful life.
- T6: stop and escalate drill, a threat model of the founder's own device, and IoT baselines.
- T3 and T4 order settled: T3 modules before T4, the L9 build after L8 (00a H7).

## 2026-11-02: spine curriculum upgrades

Decision: added 31 planned skills to T2, T3, T5 and T6 in `spine-module-plan.yaml`. Scope stays planning only: the first walk, lean slice and M0 to M1 are unchanged.

- T2: new `ctl.sys` module, quaternions, Allan variance, plant identification, phase margin, 1-D Kalman, and a clamped one-axis rig in L7.
- T3: new `mech.struct` module, with predicted and measured deflection and first mode in L9.
- T5: new `sys.twin` and `ml.llm` modules, OTA rollback, and a residual alert in L11.
- T6: new `prof.eu` module for the Cyber Resilience Act, CE and radio rules, and product liability.
- Differential equations and eigenvalues sit at the start of T2, so the 142-skill first walk does not change.
- T1 and T4: added the motor model, efficiency map, FOC literacy, SITL, fault injection and log analysis (6 more skills).
- All 37 new skills are now stubs in graph 0.4.0: 142 real plus 144 stubs. They stay unserved until promoted.
- `sens.meas.calibration-uncertainty` moved from L2 to L1, and its 6 prerequisite edges with it, to match the ladder's L1 gate.
- Draft safety brief added for the L7 rig (`content/safety/prj.L7.imu-ground-logger.md`).

## 2026-11-02: repository review fixes

Decision: amended the specification after the review of 2 November 2026 (00a section H). Not a go/no-go.

- Phase -1 protocol rebuilt (00d section 4): nine skills, per-skill 14-day re-tests, first-match outcome table.
- All 30 script-written G3 stamps removed. No lean template is reviewed yet.
- The 30-template pool rewritten: 27 parameterised, 3 `concept_static`. 19 of 19 skills pass `validate_lean_pool.py`.
- Multiple-choice option ids are opaque per item.
- L2 reversed-diode drill removed, L0 s07 check corrected.
- FSRS default, Claude sampling parameters, serve gate and function revoke corrected.
- Scheduler oracle fixed; 3 vectors added, no existing expected value changed.
