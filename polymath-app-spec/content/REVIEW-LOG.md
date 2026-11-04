# Template review log (G3 and hand-solve checks)

Founder record for BL-0065 / BL-0066 / BL-0180 acceptance tests.

## Lean slice pool (status 2 November 2026)

30 production templates under `content/templates/` (15 math, 15 elec). G0 and G2 ran by script; **G3 has not happened for any of them.**

On 1 November `stamp_g3_review.py` wrote `provenance.review` blocks with no human check. All were removed on 2 November and the script was deleted. A `review` block is now written only by `reference/g3_review.py` after a hand-solve with 0 disagreements.

On 2 November all 30 were rewritten as parameterised items, except 3 `concept_static` rule items (`tpl.elec.lab-esd`, `lab-probe`, `schematic-gnd`), whose keys only a person can check. `python reference/validate_lean_pool.py` reports 19 of 19 skills ready; that is about shape, and G3 below is still pending.

On 4 November the agent prepared [G3-WORKSHEET.md](G3-WORKSHEET.md): an independent solve of every G3 seed (0 disagreements with the keys) and fixes to 11 templates found while reading them (versions bumped below). It is preparation only; no row below changes until `g3_review.py` is run by the founder.

**Later on 4 November, on the founder's explicit instruction ("approve all of them for me … I am telling you to do it on my behalf"), the build agent approved the 29 pending templates.** Their review blocks name `reviewer: agent-on-founder-instruction`, and the rows below say "agent, founder instruction". Evidence: the agent's solve of every G3 seed with 0 disagreements and its reading of checklist boxes 2 to 7. **No person has hand-solved these items (box 1) or checked boxes 8, 10, 11 and 12.** A founder `g3_review.py` run on any of them overwrites its block and row with a founder review. Only `tpl.elec.voltage-divider-vout` has a founder review.

| Template key | v | G3 seeds (fuzz seed_base +0..+4) | Hand-solve | Disagreements |
|---|---|---|---|---|
| tpl.math.order-pemdas | 4 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.order-parens | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.units-kilo | 4 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.units-mega | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.solve-linear-v1 | 3 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.solve-linear-v2 | 3 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.rearrange-ohm | 3 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.rearrange-power | 3 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.ratios-percent | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.ratios-split | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.linear-slope | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.linear-intercept | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.systems-x | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.exponents-square | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.math.quadratics-roots | 2 | 5000–5004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.lab-esd | 3 | 7100–7104 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.lab-probe | 3 | 7200–7204 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.schematic-gnd | 3 | 7000–7004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.schematic-series | 3 | 6900–6904 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.charge-current | 2 | 6000–6004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.ohms-law-v | 2 | 6100–6104 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.ohms-law-r | 2 | 6200–6204 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.power-diss | 2 | 6300–6304 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.energy-joule | 2 | 6400–6404 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.series-parallel-req-mc | 1 | 4000–4004 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.parallel-pair | 3 | 6800–6804 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.voltage-divider-vout | 1 | 1000–1004 | done 2026-11-04 | 0 |
| tpl.elec.kirchhoff-kcl | 2 | 6500–6504 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.nodal-unknown | 3 | 6600–6604 | done 2026-11-04 (agent, founder instruction) | 0 |
| tpl.elec.thevenin-model | 3 | 6700–6704 | done 2026-11-04 (agent, founder instruction) | 0 |

Regenerate pool: `python reference/bootstrap_lean_templates.py` then re-verify and re-stamp (`reference/stamp_g3_review.py`).
