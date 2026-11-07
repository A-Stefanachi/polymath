# Template review log (G3 and hand-solve checks)

Founder record for BL-0065 / BL-0066 / BL-0180 acceptance tests.

## Lean slice pool (status 2 November 2026)

30 production templates under `content/templates/` (15 math, 15 elec). G0 and G2 ran by script; **G3 has not happened for any of them.**

On 1 November `stamp_g3_review.py` wrote `provenance.review` blocks with no human check. All were removed on 2 November and the script was deleted. A `review` block is now written only by `reference/g3_review.py` after a hand-solve with 0 disagreements.

On 2 November all 30 were rewritten as parameterised items, except 3 `concept_static` rule items (`tpl.elec.lab-esd`, `lab-probe`, `schematic-gnd`), whose keys only a person can check. `python reference/validate_lean_pool.py` reports 19 of 19 skills ready; that is about shape, and G3 below is still pending.

On 4 November the agent prepared [G3-WORKSHEET.md](G3-WORKSHEET.md): an independent solve of every G3 seed (0 disagreements with the keys) and fixes to 11 templates found while reading them (versions bumped below). It is preparation only; no row below changes until `g3_review.py` is run by the founder.

**Later on 4 November, on the founder's explicit instruction ("approve all of them for me … I am telling you to do it on my behalf"), the build agent approved the 29 pending templates.** Their review blocks name `reviewer: agent-on-founder-instruction`, and the rows below say "agent, founder instruction". Evidence: the agent's solve of every G3 seed with 0 disagreements and its reading of checklist boxes 2 to 7. **No person has hand-solved these items (box 1) or checked boxes 8, 10, 11 and 12.** A founder `g3_review.py` run on any of them overwrites its block and row with a founder review. Only `tpl.elec.voltage-divider-vout` has a founder review in its file.

At 18:02–18:03 UTC on 4 November the founder signed off five templates in the staging review console (`item_templates.body._review`, `source: console`, hand-solve done, 0 disagreements, for the current hashes): `charge-current`, `energy-joule`, `kirchhoff-kcl`, `ohms-law-r` and `ohms-law-v`. Their rows read "founder, review console". Their files also keep the agent block, which the console never rewrites (00a H4).

| Template key | v | G3 seeds (fuzz seed_base +0..+4) | Hand-solve | Disagreements |
|---|---|---|---|---|
| tpl.math.order-pemdas | 4 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.order-parens | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.units-kilo | 4 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.units-mega | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.solve-linear-v1 | 3 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.solve-linear-v2 | 3 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.rearrange-ohm | 4 | 5000–5004 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.math.rearrange-power | 3 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.ratios-percent | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.ratios-split | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.linear-slope | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.linear-intercept | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.systems-x | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.exponents-square | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.quadratics-roots | 3 | 5000–5004 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.lab-esd | 3 | 7100–7104 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.lab-probe | 4 | 7200–7204 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.schematic-gnd | 4 | 7000–7004 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.schematic-series | 3 | 6900–6904 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.charge-current | 3 | 6000–6004 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.ohms-law-v | 3 | 6100–6104 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.ohms-law-r | 3 | 6200–6204 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.power-diss | 3 | 6300–6304 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.energy-joule | 3 | 6400–6404 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.series-parallel-req-mc | 1 | 4000–4004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.parallel-pair | 3 | 6800–6804 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.voltage-divider-vout | 1 | 1000–1004 | done 2026-11-04 | 0 |
| tpl.elec.kirchhoff-kcl | 3 | 6500–6504 | done 2026-11-05 (agent, founder instruction) | 0 |
| tpl.elec.nodal-unknown | 3 | 6600–6604 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.thevenin-model | 3 | 6700–6704 | done 2026-11-04 (agent, founder instruction) | 0 |

## Lessons (concept primers, 00a K9)

On 5 November, on the founder's instruction ("Approve all on my behalf"), the build agent approved version 1 of all 19 lean lessons on staging, after reading each and checking every worked example and check-question answer. No person has reviewed them yet. `skill_lessons.reviewed_by` shows the founder's account, because it must name a user and that account is the only one. See the CHANGELOG entry of 5 November. A founder approval of a later version in the console supersedes this.

Later on 5 November the founder asked for a second review on their behalf ("review them for me on my behalf and approve"). An independent agent re-read all 19 and found no factual error; six lessons got wording fixes (order of operations, schematic reading, power and energy, lab safety and ESD, Thevenin and Norton, nodal analysis) and became version 2, approved by the agent on the same instruction.

On 7 November, on the founder's instruction ("Approve on my behalf"), the build agent approved the 16 versions that add figures (00a M5, M6), after they were synced to staging as `needs_human_review` (#32). Only figures changed (plus the larger, two-row symbols figure in schematic reading); no lesson text changed. Before inserting each figure the agent rendered it and checked every component, value, connection and label against the lesson text, and checked the inserted SVG byte-for-byte against the rendered one. The approval used the console's update, restricted to the exact skill, version and content hash that were synced. No person has reviewed the figures yet.

| Lesson (skill) | v | Approved | By |
|---|---|---|---|
| elec.dc.charge-current-voltage | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| elec.dc.kirchhoff-laws | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| elec.dc.nodal-analysis | 3 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| elec.dc.ohms-law | 1 | 2026-11-05 | agent, founder instruction |
| elec.dc.power-energy | 3 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| elec.dc.series-parallel | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| elec.dc.thevenin-norton | 3 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| elec.dc.voltage-divider | 1 | 2026-11-05 | agent, founder instruction |
| elec.meas.lab-safety-esd | 3 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| elec.meas.schematic-reading | 3 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.exponents-roots | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.linear-functions | 1 | 2026-11-05 | agent, founder instruction |
| math.alg.order-of-operations | 3 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.quadratics | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.ratios-proportions | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.rearrange-formulas | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.solve-linear | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.systems-2x2 | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |
| math.alg.units-and-prefixes | 2 | 2026-11-07 | agent, founder instruction (figures, 00a M5 and M6) |

Regenerate pool: `python reference/bootstrap_lean_templates.py`, then re-verify and review each template with `reference/g3_review.py` (`stamp_g3_review.py` was deleted on 2 November).
