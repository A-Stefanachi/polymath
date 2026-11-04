# Template review log (G3 and hand-solve checks)

Founder record for BL-0065 / BL-0066 / BL-0180 acceptance tests.

## Lean slice pool (status 2 November 2026)

30 production templates under `content/templates/` (15 math, 15 elec). G0 and G2 ran by script; **G3 has not happened for any of them.**

On 1 November `stamp_g3_review.py` wrote `provenance.review` blocks with no human check. All were removed on 2 November and the script was deleted. A `review` block is now written only by `reference/g3_review.py` after a hand-solve with 0 disagreements.

On 2 November all 30 were rewritten as parameterised items, except 3 `concept_static` rule items (`tpl.elec.lab-esd`, `lab-probe`, `schematic-gnd`), whose keys only a person can check. `python reference/validate_lean_pool.py` reports 19 of 19 skills ready; that is about shape, and G3 below is still pending.

On 4 November the agent prepared [G3-WORKSHEET.md](G3-WORKSHEET.md): an independent solve of every G3 seed (0 disagreements with the keys) and fixes to 11 templates found while reading them (versions bumped below). It is preparation only; no row below changes until `g3_review.py` is run by the founder.

| Template key | v | G3 seeds (fuzz seed_base +0..+4) | Hand-solve | Disagreements |
|---|---|---|---|---|
| tpl.math.order-pemdas | 4 | 5000–5004 | pending | — |
| tpl.math.order-parens | 2 | 5000–5004 | pending | — |
| tpl.math.units-kilo | 4 | 5000–5004 | pending | — |
| tpl.math.units-mega | 2 | 5000–5004 | pending | — |
| tpl.math.solve-linear-v1 | 3 | 5000–5004 | pending | — |
| tpl.math.solve-linear-v2 | 3 | 5000–5004 | pending | — |
| tpl.math.rearrange-ohm | 3 | 5000–5004 | pending | — |
| tpl.math.rearrange-power | 3 | 5000–5004 | pending | — |
| tpl.math.ratios-percent | 2 | 5000–5004 | pending | — |
| tpl.math.ratios-split | 2 | 5000–5004 | pending | — |
| tpl.math.linear-slope | 2 | 5000–5004 | pending | — |
| tpl.math.linear-intercept | 2 | 5000–5004 | pending | — |
| tpl.math.systems-x | 2 | 5000–5004 | pending | — |
| tpl.math.exponents-square | 2 | 5000–5004 | pending | — |
| tpl.math.quadratics-roots | 2 | 5000–5004 | pending | — |
| tpl.elec.lab-esd | 3 | 7100–7104 | pending | — |
| tpl.elec.lab-probe | 3 | 7200–7204 | pending | — |
| tpl.elec.schematic-gnd | 3 | 7000–7004 | pending | — |
| tpl.elec.schematic-series | 3 | 6900–6904 | pending | — |
| tpl.elec.charge-current | 2 | 6000–6004 | pending | — |
| tpl.elec.ohms-law-v | 2 | 6100–6104 | pending | — |
| tpl.elec.ohms-law-r | 2 | 6200–6204 | pending | — |
| tpl.elec.power-diss | 2 | 6300–6304 | pending | — |
| tpl.elec.energy-joule | 2 | 6400–6404 | pending | — |
| tpl.elec.series-parallel-req-mc | 1 | 4000–4004 | pending | — |
| tpl.elec.parallel-pair | 3 | 6800–6804 | pending | — |
| tpl.elec.voltage-divider-vout | 1 | 1000–1004 | done 2026-11-04 | 0 |
| tpl.elec.kirchhoff-kcl | 2 | 6500–6504 | pending | — |
| tpl.elec.nodal-unknown | 3 | 6600–6604 | pending | — |
| tpl.elec.thevenin-model | 3 | 6700–6704 | pending | — |

Regenerate pool: `python reference/bootstrap_lean_templates.py` then re-verify and re-stamp (`reference/stamp_g3_review.py`).
