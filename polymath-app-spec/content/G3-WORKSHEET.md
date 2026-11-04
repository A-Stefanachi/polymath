# G3 worksheet: the 29 pending lean templates

**Prepared by the agent on 2026-11-04. This is not a G3 review.** Nothing in it writes `provenance.review` or a done row in `REVIEW-LOG.md`. Each template still needs your own run of `py -3 -B polymath-app-spec/reference/g3_review.py <key>`: you type your hand-solved answers and confirm the 12-box checklist (doc 07 section 7, G3). The sheet makes that run quicker by saying what was checked, what was fixed and what still needs your judgement.

## What was checked

1. Rendered the G3 seeds (`fuzz.seed_base` to `+4`) of all 29 templates, 145 items in all, with the keys kept out of view.
2. Solved every item from the rendered statement alone, then compared with the key: **145 of 145 agree (0 disagreements at 0.2 %).** This was done twice: once before the fixes below and again on the new items afterwards, because an edit changes the template hash and with it every generated item.
3. Rendered hints l1–l3, the solution steps and every distractor with its feedback for those seeds, and read them against boxes 2–7. A scan of all rendered text finds no unresolved placeholder, no tab byte, no `nan`/`inf`.
4. Checked option shuffling over 200 seeds per multiple-choice template: the correct position is spread evenly over a–d. If the five G3 seeds put the key in the same place, that is chance.

## Fixed in this commit (each template's version bumped, per L03)

| # | Template | Box | Finding | Fix |
|---|---|---|---|---|
| F1 | `tpl.math.order-pemdas` v4 | 7 | `hints.l3` held a literal TAB byte in place of the `\t` of `\times`, rendering as broken KaTeX. | Restored `\times`. |
| F2 | `tpl.math.order-pemdas` v4 | 7 | The worked steps never showed the product. | New derived `prod`; the steps now read "8 × 8 = 64", then "9 + 64 = 73". |
| F3 | `tpl.math.solve-linear-v2` v3 | 2 | When the x coefficients differed by 1 the steps read "1x + 15 = 19 … divide by 1". | Constraint `a - c >= 2`. Fuzz rejection rate 0.571 (limit 0.7). |
| F4 | `tpl.elec.nodal-unknown`, `tpl.elec.thevenin-model`, `tpl.elec.parallel-pair` v3 | 5 | Their tolerance is 1 % but their prompts gave two-figure examples ("4.2 V", "12 mA", "1.2 kohm"), and a two-figure answer can miss 1 % (0.37 for 0.3651). | Prompts now ask for three significant figures, as the reviewed `voltage-divider-vout` does. **The tolerance is unchanged**: changing a grading tolerance is a founder decision (CLAUDE.md section 12.3). If you'd rather accept two figures, raise `rel` to 0.02; the `wrong-answers-separate` constraint in `nodal-unknown` then needs 0.065 instead of 0.05 (L11: more than 3 × tol). |
| J1 | `tpl.elec.lab-esd`, `tpl.elec.lab-probe`, `tpl.elec.schematic-gnd` v3 | 4 | The correct option was the longest, a cue a test-wise learner can use. | Shortened the correct option to within the distractors' length range. Lost detail stays in the steps and explanation (the strap's resistor, the 0 V meaning). Please read the new wording: these keys are rules only you can confirm. |
| J2 | `tpl.math.rearrange-ohm`, `tpl.math.rearrange-power`, `tpl.math.units-kilo` | 6 | `hints.l3` already substituted the numbers, leaving only the arithmetic. | l3 now stops at the rearranged formula (`R = V / I`, `I = P / V`), or for units-kilo at `1 kΩ = 1000 Ω`. |

## Not fixed here

- **F5, `uS` for micro in worked steps** (for example "$V_A \times 304\,\mathrm{uS}$"). It comes from the `tex:` filter of `polymath-app-spec/reference/verifiers/tplkit.py`, which the worker's port must match byte for byte. Fixing it means changing the reference oracle, so it is filed as a GitHub issue for your decision rather than changed here.
- The duplicate G3 item in `units-kilo` is gone: its new seeds give five different values.

## Still yours (boxes I cannot tick)

Box 1 (your own hand-solve), box 8 (skill fit and `difficulty_prior`), box 10 (sources), box 11 (all 29 declare `llm_assistance.used: true`, so read every LLM-written field), box 12 (degenerate cases), and the three rule keys (`lab-esd`, `lab-probe`, `schematic-gnd`): my reading agrees with them, as a second opinion only.

## Suggested order

Run `g3_review.py` template by template; the math ones take about 2 minutes each. Afterwards `py -3 -B polymath-app-spec/reference/validate_lean_pool.py` and `pnpm content:sync -- --dry-run` should show the reviewed count rising.

---

## Agent answers: compare only after you have solved

Values per seed, in seed order; SI units unless given; letters are the displayed option. All equal the key for the current template versions.

| Template | Seeds | Agent answers |
|---|---|---|
| `tpl.elec.charge-current` | 6000–6004 | 1.175 · 1.8 · 1.35 · 1.3 · 0.6 A |
| `tpl.elec.energy-joule` | 6400–6404 | 1039.5 · 144 · 1620 · 504 · 75 J |
| `tpl.elec.kirchhoff-kcl` | 6500–6504 | 0.015 · 0.29 · 0.08 · 0.06 · 0.165 A |
| `tpl.elec.lab-esd` | 7100–7104 | d · d · d · a · c  |
| `tpl.elec.lab-probe` | 7200–7204 | c · a · d · d · d  |
| `tpl.elec.nodal-unknown` | 6600–6604 | 3.10906 · 3.08066 · 6.85054 · 8.69959 · 3.6842 V |
| `tpl.elec.ohms-law-r` | 6200–6204 | 196.72 · 184.615 · 321.43 · 145.16 · 1500 Ω |
| `tpl.elec.ohms-law-v` | 6100–6104 | 12.74 · 22.32 · 6 · 6.9 · 2.04 V |
| `tpl.elec.parallel-pair` | 6800–6804 | 82.456 · 185.915 · 1821.69 · 955.932 · 3083.5 Ω |
| `tpl.elec.power-diss` | 6300–6304 | 0.768 · 0.138889 · 0.45375 · 0.033333 · 0.081 W |
| `tpl.elec.schematic-gnd` | 7000–7004 | c · a · b · d · b  |
| `tpl.elec.schematic-series` | 6900–6904 | 10520 · 10700 · 2380 · 980 · 1570 Ω |
| `tpl.elec.series-parallel-req-mc` | 4000–4004 | a · b · c · c · b  |
| `tpl.elec.thevenin-model` | 6700–6704 | 0.0088567 · 0.0034625 · 0.0080089 · 0.0011074 · 0.0047608 A |
| `tpl.math.exponents-square` | 5000–5004 | 1000 · 9 · 27 · 4 · 256  |
| `tpl.math.linear-intercept` | 5000–5004 | a · a · a · a · a  |
| `tpl.math.linear-slope` | 5000–5004 | 3 · -3 · 4 · -2 · 6  |
| `tpl.math.order-parens` | 5000–5004 | d · c · b · d · c  |
| `tpl.math.order-pemdas` | 5000–5004 | 73 · 41 · 16 · 96 · 59  |
| `tpl.math.quadratics-roots` | 5000–5004 | 9 · 9 · 7 · -4 · 9  |
| `tpl.math.ratios-percent` | 5000–5004 | 216 · 40 · 80 · 36 · 70  |
| `tpl.math.ratios-split` | 5000–5004 | 24 · 4 · 21 · 45 · 56  |
| `tpl.math.rearrange-ohm` | 5000–5004 | 22 · 12 · 22 · 100 · 150 Ω |
| `tpl.math.rearrange-power` | 5000–5004 | 0.75 · 2 · 0.75 · 2.5 · 0.5 A |
| `tpl.math.solve-linear-v1` | 5000–5004 | 2 · 5 · 5 · 10 · 6  |
| `tpl.math.solve-linear-v2` | 5000–5004 | 3 · 2 · 5 · 8 · 9  |
| `tpl.math.systems-x` | 5000–5004 | 3 · 4 · 5 · 2 · -5  |
| `tpl.math.units-kilo` | 5000–5004 | 5800 · 4100 · 6800 · 2600 · 1100 Ω |
| `tpl.math.units-mega` | 5000–5004 | c · a · a · c · b  |
