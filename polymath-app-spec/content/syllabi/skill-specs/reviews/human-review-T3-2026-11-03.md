# Human-review research pass, T3 (mechanical), 3 Nov 2026

Scope: the 20 T3 rows in `OPEN-CHECKS.md`, founder items 9 (240 MPa judgement) and 11 (ISO 286, ISO 8015, ISO 22081, ASME Y14.5) from `review-T1-T3.md`, and the two REVIEW BAND lab checks (`beam`, `tap_test`). Only `T3.yaml` was edited. No `status` changed.

iso.org returned 403 to automated requests, so ISO texts were read through the official iTeh Standards previews (cdn.standards.iteh.ai), which carry the ISO copyright pages, plus national-body shop pages for prices.

## 1. Summary counts

| Outcome | Rows |
|---|---|
| confirmed | 7 |
| corrected | 7 |
| convention | 0 (2 new convention notes added for the lab bands, see section 3) |
| open | 6 (two of them narrowed) |

After the edits, a dry run of the `build_open_checks.py` pattern finds 6 T3 flags, down from 20. One of the 6 is new and deliberate: the density that FreeCAD Check Geometry uses, which was hedged before with wording the pattern did not catch.

## 2. Every OPEN-CHECKS row

| # | Skill | Flag (short) | Outcome | Source used | What changed |
|---|---|---|---|---|---|
| 1 | `mech.cad.export-step-stl` | "[Secondary sources only;" | corrected | NIST AMS 100-51 (Jan 2023), https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.100-51.pdf, section 1 p. 1 and section 5 pp. 7-9 | Text now says AP242 (first published 2014) merged AP203 and AP214 for model-based exchange with PMI, and that AP214 and AP203 ed. 2 also carry colours and layers. The old text implied colour belongs only to AP214. Hedge removed. |
| 2 | same | "ISO 10303 not read.]" | corrected | same | Same sentence. ISO 10303-242 itself is still not read, but the claim now rests on NIST, a government primary report. Note: ISO lists a 2025 edition of AP242. |
| 3 | same | 3dfindit (snippet) | corrected | same | Source replaced by NIST AMS 100-51. |
| 4 | `mech.cad.mass-cg-export` | iastate MicroCART (snippet) | confirmed | Chai, University of Minnesota UAV lab (2007), https://dept.aem.umn.edu/~uav/repository/export/miprop.pdf, eq. 1: J = (Tn/2π)² m g R² / L | With R = D/2: J = m g D² T² / (16 π² L). Derived it again from first principles: torque = m g b² θ / L with b the distance from axis to each wire, so ω² = m g b² / (J L). Sanity check on the paper's data (m 0.070 kg, L 0.147 m, R 0.013 m, T = 13.69/5 = 2.738 s) gives J = 1.5e-4 kg m², consistent with a 12 inch prop. Defined D, L, T in the text. Also opened the FreeCAD Part_CheckGeometry page: it lists Mass but not the density. The density point is now plainly marked "unconfirmed". |
| 5 | `mech.draw.drawings-datums` | 3-2-1 (flag triggered by the word "secondary") | corrected | Voelcker, "Datum syntax and semantics" (Cornell, ASPE 2002), p. 2: datum precedence reduces six DOF to zero; plus geometry | Made precise: the 3-2-1 split holds for three perpendicular planes. A plane contact removes one translation and two rotations (3), the second plane 2, the third 1. Other datum types, such as an axis, split differently. Reworded as A, B, C precedence. |
| 6 | same | "[From memory;" | corrected | same | Hedge removed; claim is now scoped and derived. |
| 7 | same | "standard not read.]" (fastener formulas) | open | No free ASME text found. A LBL-hosted handbook chapter on ASME Y14.5M-1994 Appendix B returned 404. | Kept the hedge. The formulas also follow from virtual-condition geometry: floating, H - T ≥ F per part; fixed, H - T1 ≥ F + T2. Closes when ASME Y14.5-2018 (R2024) Appendix B is read. |
| 8 | same | "[Projection fact from memory.]" | corrected | ISO 5456-2:1996 official preview, https://cdn.standards.iteh.ai/samples/11502/cef8abb25a204691907a077adf420d24/ISO-5456-2-1996.pdf, 4.1 and 5.1; Autodesk drafting help | ISO 5456-2 allows first-angle, third-angle and reference-arrow methods, each with a symbol. The text now says first angle is usual European practice, third angle US practice, so always show the symbol. The old text said "Germany uses first angle" as if it were a rule. |
| 9 | `mech.draw.iso-gps` | "[Modifier from memory.]" | confirmed | ISO 8015:1985 preview, clause 6.1 (symbol Ⓔ placed after the linear tolerance; image checked); ISO 14405-1:2025 preview: 3.8 and clause 9 "Envelope requirement"; ISO 286-1:2010 introduction | Text says envelope is the circled E after the size tolerance and now lives in ISO 14405-1:2025, clause 9. Hedge removed. |
| 10 | same | "[Evidence: ISO 8015, ISO 22081 and ASME Y14.5 were not read;" | open (narrowed) | ISO 22081:2021 preview: foreword ("cancels and replaces ISO 2768-2:1989"), scope, 5.2 note 2 (independency principle); ISO 2768-1:1989 Table 1 (f ±0.1 and m ±0.2 over 6 up to 30 mm); ISO 286-1:2010 intro (two-point size default); ISO 8015:1985 clause 4 | ISO side confirmed and cited. Evidence note rewritten: only ISO 8015:2011 clause 5.5 and ASME Y14.5 Rule 1 remain unread. Kept the hedge for ASME. |
| 11 | `mech.draw.fits-iso286` | "[Secondary table;" | open | cadforum.cz table read: matches all ten values. ISO 286-1:2010 preview read for definitions. Recomputed IT widths (below). | Hedge reworded: two independent tables agree and the formulas reproduce them, but ISO 286-2 itself was not read. Added ISO 286-1 3.3.3.2: equal limits still count as an interference fit, which supports the H7/p6 misconception text. |
| 12 | same | "ISO 286-2 not read.]" | open | same | Same. Closes by buying ISO 286-2 (prices in section 3). |
| 13 | `matl.select.ashby-indices` | compendium (snippet) | confirmed | TU Delft OCW, Materiaalkunde 1, chapter 5 slides (after Ashby), https://ocw.tudelft.nl/wp-content/uploads/Materiaalkunde_1_slides_chapter5.pdf, slides 18-21 and 25 | Tie E/ρ, panel E^(1/3)/ρ with free thickness, beam E^(1/2)/ρ with free square area, and slopes 1, 2 and 3 on the chart. All match. Source replaced. Recomputed every number (below). |
| 14 | `mech.struct.fatigue-concentration` | Heywood fit from memory | confirmed | Fethallah and Deghboudj, Rev. Compos. Mater. Av. 32(5), 2022, pp. 229-235, eq. 7 and Table 2, doi 10.18280/rcma.320503 | Table 2 Heywood Kn: 2.73 (d/W 0.1), 2.51 (0.2), 2.13 (0.5). Check: 2 + 0.9³ = 2.729, 2 + 0.8³ = 2.512, 2 + 0.5³ = 2.125. Heywood is within 1.3 to 2.6% of their FE values across d/W 0.1 to 0.7. Hedge removed; source added. |
| 15 | `mech.struct.torsion-sections` | unimore (snippet) | confirmed | MIT 16.20 (Lagace) Handout 3, p. 3-2 (narrow rectangle J = b h³/3) and p. 3-3 (q = τ t, Bredt τ = T/(2At), J = 4A²/∮ds/t); Unit 12 eq. 12-2 and p. 12-18 | Source replaced. Numbers recomputed (below). |
| 16 | `mech.struct.fatigue-design` | "kc and later-edition changes are from memory.]" | open (narrowed) | Union College MER419 slide 19 (Shigley 10th): kc 1 / 0.85 / 0.59. Oakland ME 486 sheet: same kc, Se' = 0.5 Sut up to 1400 MPa. EES Reliability_Factor (Shigley 11th, 2020): ke = 0.7528 at 99.9%. | kc and ke confirmed and cited. ka machined 4.51, -0.265 is still from an older lecture copy. The EES as-forged example (ka 0.2921 at 1000 MPa) does not match the older forged fit (272 × 1000^-0.995 = 0.282), so the 11th edition may have refitted Table 6-2. Hedge rewritten to say exactly that. |
| 17 | `mech.struct.bolted-joint-design` | "[VDI 2230 not read," | open | DIN Media lists VDI 2230 Blatt 1:2015-11 as current, from 309.80 EUR incl. VAT | Hedge kept and names the edition. |
| 18 | `mech.tol.fit` | 3dprintcalcs (snippet) | confirmed | CNC Kitchen threaded-inserts article, opened. It says printed holes come out undersized, 0.1 mm on the author's Prusa with Prusament. | Snippet source removed (it now redirects to an anonymous calculator site). Core idea now says the 0.1 mm applies to that setup. |
| 19 | `mech.tol.stack-analysis` | "With ten parts, mean uncertainty..." (flag triggered by the word "uncertainty") | confirmed | NIST/SEMATECH e-Handbook t table, https://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm, ν = 9, column 0.975: 2.262 | Reworded as "95% interval on the mean ±t s/√10, t = 2.262 for 9 degrees of freedom". Check: 2.262 × 0.037 / √10 = 0.0265, matching ±0.027. |
| 20 | same | IMEKO TC14 2007-05 (snippet) | corrected | Diet et al., arXiv 1912.09365, section 1 (cites Bender 1962, Graphic Science 17) | The IMEKO link now redirects to the IMEKO home page. Replaced it. Added Diet's caveat: with very few inputs, Bender's 1.5 × RSS can exceed worst case, so never report more than worst case. Checked both examples: 0.375 < 0.45 and 0.352 < 0.40, so neither breaks the cap. |

### Arithmetic recomputed

- ISO 286 widths from i = 0.45 D^(1/3) + 0.001 D, with D the geometric mean of the range. For 6-10 mm, D = 7.746 and i = 0.898 µm: IT6 = 10i = 9, IT7 = 16i = 14.4, table value 15. For 10-18 mm, D = 13.42 and i = 1.083: IT6 = 11, IT7 = 17.3, table value 18. Deviations: g, es = -2.5 D^0.34 = -5.0 and -6.05; k, ei = 0.6 D^(1/3) = +1.2 and +1.4, so +1; p, ei = IT7 = +15 and +18. All match the table. The formulas come from memory and are used only as a check, not as a source.
- Fits: 10 H7/g6 gives 15 - (-14) = 29 and 0 - (-5) = 5 µm. 10 H7/k6 gives +14 µm clearance and -10 µm interference. 12 H7/k6 gives +17 and -12 µm. 6-10 H7/p6 has a minimum of 15 - 15 = 0.
- Ashby: √E/ρ = 5.23, 3.07, 3.01 and 1.32. E^(1/3)/ρ = 2.58, 1.52 (7075 1.48) and 1.12. Masses from m = 2 L^2.5 √S ρ/√E are 4.71, 8.02, 8.18 and 18.67 g. The PLA side is 10.02 mm.
- Torsion: A = π 5.5² = 95.03 mm² and P = 34.56 mm, so J closed = 4A²t/P = 1045.4 mm⁴. J slit = P t³/3 = 11.52 mm⁴, and the ratio is 90.75 = 3(5.5)². Twist closed = 250·120/(5000·1045.4) = 0.00574 rad = 0.329°. Twist slit = 29.8°. At G 30 GPa, 0.055°. Square tube: J = 4·144²/48 = 1728 mm⁴, slit 16 mm⁴, ratio 108.
- Mass and CG: total 462 g, moment 3195 g mm, x = 6.92 mm. With the swap, 477 g and 4975/477 = 10.43 mm.
- Fatigue: ka = 4.51 × 310^-0.265 = 0.986. Reliability ke = 1 - 0.08 z gives 0.897, 0.814 and 0.753. Se = 0.986 × 0.85 × 0.814 × 96.5 = 65.8 MPa.

## 3. Founder items

### Item 9: "moving examples to the 240 MPa minimum"

Decision: keep the minimum. Best practice and the project's safety rule both say to check against a specified minimum, not a typical value.

Source: Aluminum Association, *Aluminum Standards and Data* (2009), Table 11.1 (extruded rod, bar and profiles) and Table 12.1 (extruded tube). Both list 6061-T6 as tensile 38.0 ksi minimum and yield 35.0 ksi minimum, for both thickness rows. URLs: https://www.aluminum.org/sites/default/files/2022-12/Table_11.1.pdf and Table_12.1.pdf. 35 ksi = 241.3 MPa, so 240 MPa is right, rounded slightly down.

Finding: the old text gave "minimums 240 and 290 MPa". The 290 MPa (42 ksi) tensile figure is the one usually quoted for sheet and plate. Extruded bar and tube, which is what the arms use, have a minimum of only 262 MPa (38 ksi). I corrected `mech.struct.stress-strain` to say this. Wikipedia gives 290 MPa with no specification behind it. The sheet and plate figure (ASTM B209) was not read.

Recommendation, not applied: `mech.struct.fatigue-design` runs Goodman with Sut = 310 MPa, a typical value. For consistency with this decision, a later pass could use Sut = 262 MPa for extruded 6061-T6. That changes the worked numbers, so I left it for the founder.

### Item 11: ISO 286, ISO 8015, ISO 22081, ASME Y14.5

| Standard | What could be confirmed free | Status | Buy (if needed) |
|---|---|---|---|
| ISO 286-1:2010 (+Cor 1:2013) | Preview: basic hole has lower deviation 0 (3.1.4), clearance and interference definitions (3.3), interference fit includes the equal-limits case (3.3.3.2), and the two-point size default from ISO 14405-1 (introduction). | Confirmed for definitions | EVS 241.44 EUR incl. tax |
| ISO 286-2:2010 (+Cor 1:2013) | Tables not in the preview. Two independent tables and the formula check agree. | open | EVS 272.12 EUR; SIS 1 599 SEK for the SS-EN PDF; DIN Media from 233.60 EUR |
| ISO 8015:2011 | Scope only; preview text not served. The independency principle is confirmed through ISO 22081 5.2 note 2 and the 1985 edition, clause 4. | Clause 5.5 wording open | EVS 89.37 EUR (cheapest, recommended first) |
| ISO 22081:2021 | Foreword: cancels and replaces ISO 2768-2:1989. Scope, rules A to D, independency note. | confirmed | EVS 180.07 EUR, only if writing items on general geometrical specifications |
| ISO 14405-1:2025 | Envelope requirement is 3.8 and clause 9. The symbol table is not visible in the preview. | Symbol confirmed via ISO 8015:1985 6.1 | EVS 272.12 EUR |
| ASME Y14.5-2018 (R2024) | Nothing primary free. ANSI and ASME previews returned 403. | open (Rule 1, fastener formulas in Appendix B) | Resellers 249 to 299 USD; DIN Media about 266 EUR incl. VAT |

Buying advice: if the budget covers one purchase, buy ISO 8015:2011 (89 EUR). If it covers two, add ASME Y14.5-2018. Those two settle every remaining drawing flag except the ISO 286-2 table values, which already agree across two independent sources.

### Lab bands `beam` (0.46) and `tap_test` (0.66)

Diagnosis. `reference/lab_band_checks.py` compares the measurement with an ideal-clamp prediction, while the clamp adds 2 to 30% to the deflection. That one-sided systematic error is the main reason correct builds fail. A second large error is unmodelled: on a 12/10 mm tube, 4 OD⁴/(OD⁴ - ID⁴) = 7.7, so a 1% OD error is a 7.7% error in I.

Best practice is to correct recognised systematic effects, not widen the band to absorb them. JCGM 100:2008 (GUM) 3.2.4 assumes the result "has been corrected for all recognized significant systematic effects" (https://www.bipm.org/documents/20126/2071204/JCGM_100_2008_E.pdf, read).

I simulated both options (N = 200000, scratch script):

| Method | Pass rate at 15% | Note |
|---|---|---|
| Ideal clamp, as now | 0.47 | reproduces 0.46 |
| Ideal clamp, band widened | 0.64 at 20%, 0.82 at 25%, 0.94 at 30%, 0.99 at 35% | A 30-35% band hides real method errors. Rejected. |
| Measured OD/ID, clamp calibrated on a same-OD steel reference rod (residual 15-35% of the clamp term), 5-load slope | 1.00 (95th percentile error 6.7-8.9%; pass at 10% is 0.97-1.00) | adopted |
| Tap test predicted from the measured installed static k, weighed masses, bin ≤ 1% of f | 1.00 at 10% (95th percentile 5.7-7.3%) | adopted |

Decision: change the method and keep both bands (15% and 10%). Edited in `T3.yaml`:

- `mech.struct.beam-bending`: two new core ideas (root rotation scales with L², and measure the tube because of the 7.7× sensitivity). The unaided check now gives the procedure: caliper OD and ID; a same-OD solid steel reference rod at the same length and torque gives the clamp term; tube deflection from the slope of at least five loads; pass within 15% of the prediction plus the clamp term. A `[project convention: ...]` note justifies keeping 15%.
- `mech.struct.vibration-modes`: predict from the static k measured on the same arm in the same clamp, plus weighed masses; record at least 0.5 s near 200 Hz so the bin is under 1% of f; pass within 10%. A convention note is added.

Proposed edit to `reference/lab_band_checks.py` (not applied). Replace the two functions `beam()` and `tap_test()` (from `def beam()` up to, not including, `def rig_overshoot()`) with:

```python
def beam() -> tuple[float, str]:
    """mech.struct.beam-bending: deflection within 15 percent of a prediction that uses measured
    tube sizes and a clamp compliance calibrated on a same-diameter reference bar in the same clamp."""
    e, od, idia, l, f = 70e9, 0.012, 0.010, 0.12, 12.0
    sec = lambda o, i_: np.pi / 64 * (o**4 - i_**4)
    od_t, id_t, e_t = od * u(1), idia * u(1.2), e * u(5)  # true part: stock tolerance, alloy E
    od_m = od_t + rng.uniform(-2e-5, 2e-5, N)  # caliper reading, +/-0.02 mm
    id_m = id_t + rng.uniform(-2e-5, 2e-5, N)
    clamp = rng.uniform(0.02, 0.30, N)  # true clamp share of beam deflection
    beam_t = f * l**3 / (3 * e_t * sec(od_t, id_t))
    meas = beam_t * (1 + clamp) + rng.normal(0, 0.005e-3 / np.sqrt(5), N)  # slope of 5 loads, gauge 5 um
    clamp_cal = beam_t * clamp * u(25)  # reclamping and reference-bar error, 25% of the clamp term
    pred = f * l**3 / (3 * e * sec(od_m, id_m)) + clamp_cal
    return float(np.mean(abs(meas - pred) / pred <= 0.15)), "E 5%, OD/ID measured +/-0.02 mm, clamp 2-30% calibrated to 25%, gauge 5 um over 5 loads"


def tap_test() -> tuple[float, str]:
    """mech.struct.vibration-modes: tap frequency within 10 percent of a prediction that uses the
    static stiffness measured on the same arm in the same clamp."""
    k_meas = u(5)  # measured k (beam test) vs true installed k
    m_meas = u(2)  # weighed masses vs true
    added = 1 + rng.uniform(0, 0.05, N)  # sensor or wire mass not in the prediction
    dyn = 1 - rng.uniform(0, 0.03, N)  # Rayleigh and dynamic clamp effects
    meas = dyn / np.sqrt(added) + rng.uniform(-0.005, 0.005, N)  # spectrum bin at most 1% of f
    pred = np.sqrt(k_meas / m_meas)
    return float(np.mean(abs(meas - pred) / pred <= 0.10)), "measured k 5%, mass 2%, added mass up to 5%, dynamic 0-3%, bin 1%"
```

A patched copy was run with `py -3 -B`. Other rows are unchanged, and the new rows are:

```
| beam | 1.00 | fine | E 5%, OD/ID measured +/-0.02 mm, clamp 2-30% calibrated to 25%, gauge 5 um over 5 loads |
| tap_test | 1.00 | fine | measured k 5%, mass 2%, added mass up to 5%, dynamic 0-3%, bin 1% |
```

The same two rows should replace the `beam` and `tap_test` rows in `content/syllabi/skill-specs/lab-band-checks.md`.

Caveat: these are simulations with uniform error assumptions [P], not bench evidence. The 25% residual after clamp calibration is an assumption. One bench run of the reference-rod step would close it.

## 4. Still open

| Item | What closes it | Who |
|---|---|---|
| `drawings-datums` fastener formulas | Read ASME Y14.5-2018 (R2024) Nonmandatory Appendix B, about 250-300 USD | founder buys; reviewer checks |
| `iso-gps` ASME Rule 1 and ISO 8015:2011 5.5 wording | Buy ISO 8015:2011 (EVS 89.37 EUR) and ASME Y14.5-2018 | founder |
| `fits-iso286` table values | Buy ISO 286-2:2010 (from about 234 EUR), or check the 6-10 and 10-18 rows in a library copy | founder or library visit |
| `fatigue-design` ka for machined surfaces in Shigley 11th ed. | Read Table 6-2 in Shigley 11th edition (library or own copy) | reviewer |
| `bolted-joint-design` VDI 2230 | Buy VDI 2230 Blatt 1:2015-11 (DIN Media from 309.80 EUR incl. VAT) only if T3 is meant to teach the full method; otherwise keep it as a named pointer | founder decision |
| `mass-cg-export` Check Geometry density | Five-minute FreeCAD test: a 10 mm cube with no material assigned; mass 1000 means density 1 | founder, bench |
| Lab-band residual assumption | One bench run: same-OD steel rod, clamp twice, compare the clamp terms | founder, bench |
| Housekeeping | Apply the `lab_band_checks.py` edit, update `lab-band-checks.md`, run `reference/build_open_checks.py` | orchestrator |

## Follow-up: fatigue minimum properties

The orchestrator accepted the recommendation: design checks use specified minimum properties. A search of T3.yaml for "310" and "Sut" found only one design check that used the typical 6061-T6 Sut: `mech.struct.fatigue-design`. `mech.struct.stress-strain` names 310 MPa only as the typical value, and its checks already use the 240 MPa minimum yield.

Changes to `mech.struct.fatigue-design`:

- The Goodman core idea now says to use the minimum Sut for the product form: 262 MPa (38 ksi) for extruded 6061-T6, from Aluminum Association Tables 11.1 and 12.1.
- New core idea: ka is capped at 1. The steel-fitted ka = 4.51 Sut^-0.265 gives 4.51 × 262^-0.265 = 1.031. A machined surface cannot be better than the polished R.R. Moore specimen, so a value above 1 is not physical. The conservative choice is ka = 1.
- The worked example and the unaided check were recomputed as follows.

| Quantity | Old (Sut 310, ka 0.986) | New (Sut 262, ka 1) |
|---|---|---|
| Se at 99% reliability | 0.986 × 0.85 × 0.814 × 96.5 = 65.8 MPa | 1 × 0.85 × 0.814 × 96.5 = 66.77 MPa |
| n, Kf on both | 1 / (55/65.85 + 77/310) = 0.92 | 1 / (55/66.77 + 77/262) = 1 / (0.8237 + 0.2939) = 0.895, written as 0.89 |
| n, Kf on alternating only | 1 / (55/65.85 + 35/310) = 1.05 | 1 / (0.8237 + 35/262) = 1 / (0.8237 + 0.1336) = 1.045, written as 1.04 |
| Yield check | 2.2 × (25 + 35) = 132 MPa; 240/132 = 1.82 | unchanged, 1.82 |
| Verdict against 1.5 | fail | fail |
| Unaided check, Se at 99.9% | 60.9 MPa | 0.85 × 0.753 × 96.5 = 61.77 MPa, written as 61.8 |
| Unaided check, n with Kf on both | 0.87 | 1 / (55/61.77 + 77/262) = 1 / (0.8905 + 0.2939) = 0.844, written as 0.84 |
| Time to 5e8 cycles at 200 Hz | 694 h | unchanged: 5e8 / 200 / 3600 = 694.4 h |

Caveat: Sf = 96.5 MPa at 5e8 cycles is still a typical R.R. Moore value. No published minimum fatigue strength was found, so the result stays a teaching estimate, not an allowable.

`py -3 -B reference/validate_skill_specs.py`: 247 specs checked, 0 error(s).
