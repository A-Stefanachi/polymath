# Human-review research pass: T5 (cloud, data, twin, ML)

Date: 3 Nov 2026. Scope: the 47 T5 rows in `OPEN-CHECKS.md`, plus the T5 items in "Curriculum weaknesses that remain" in `review-T4-T5.md`. Only `T5.yaml` was edited. No `status` changed. The YAML parses, and `reference/validate_skill_specs.py` reports 247 specs and 0 errors.

## 1. Summary counts

| Outcome | Rows |
|---|---|
| confirmed | 15 |
| corrected | 10 |
| convention | 5 |
| open | 0 |
| false positive (flag tool matched ordinary words) | 17 |
| **Total** | **47** |

After the edits, every T5 sentence the flag regex still matches is a false positive (20 sentences). The edits added 3 of them, because new text uses the word "uncertainty". See the end of section 2 for the patterns and a proposed fix to the regex.

## 2. Row-by-row

| # | Skill | Flag (short) | Outcome | Source used | What changed |
|---|---|---|---|---|---|
| 1 | sys.req.requirements | "could not fail" | false positive | n/a | "could not" in a plain sentence. No change. |
| 2 | sys.req.vv-matrix | Useful columns [P] | corrected | NASA SE Handbook App. D, Table D-1 image: https://www.nasa.gov/wp-content/uploads/2019/10/seh_app-d_table_d1.jpg | The proposed column list is replaced by NASA's columns: Requirement No., Document, Paragraph, Shall Statement, Verification Success Criteria, Verification Method, Facility or Lab, Phase, Acceptance Requirement?, Preflight Acceptance?, Performing Organization, Results. The text notes that the phase column plays the role of level here. |
| 3 | sys.req.vv-matrix | image could not be read | corrected | same (the image was read) | The hedge is removed. |
| 4 | sw.cloud.ota-rollback | 20 power-cut trials [P] | convention | arithmetic | Marked as a project convention, with what it shows. Zero failures in 20 trials only bounds the failure rate below 1 − 0.05^(1/20) = 0.139 at 95% confidence, so the text calls it a smoke test. |
| 5 | sys.telemetry.schema-version | "cannot read golden payloads" | false positive | n/a | "can**not read**" matched `not read`. No change. |
| 6 | sys.telemetry.lakehouse-partition | compression 5:1 [P] | convention | n/a | Marked as an assumed practice ratio, with "measure your own". Arithmetic checked: 2.0736 GB / 5 = 414.72 MB. |
| 7 | sys.telemetry.time-model | flag values [P] | convention | n/a | Marked as a convention: the three values map to the three anchoring cases. |
| 8 | sys.twin.state-model | Biot UNCERTAIN | confirmed | MIT 16.Unified notes §18.3, https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node129.html | The page states that a small Biot number gives a uniform temperature, τ = ρVc/(hA), and an exponential solution. The hedge is removed. Numbers recomputed: 37.64 °C; a = 0.96722; 0.6557 K; unaided check gives 37.29 °C, a = 0.90484. |
| 9 | sys.twin.model-calibration | "0.3 K sensor uncertainty" | false positive | n/a | The word "uncertainty". Numbers recomputed: slope −0.0041557, τ = 240.6 s, C = 80.2 J/K, prediction 31.47 °C. |
| 10 | sys.twin.model-calibration | "parameters with uncertainty" | false positive | n/a | The word "uncertainty". |
| 11 | sys.twin.residual-alert | k = 0.4, h = 1.8 [P] | confirmed | NIST e-Handbook 6.3.2.3, https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm ("k ... half the δ shift ... h to be around 4 or 5") | [P] is removed. The ambiguous "(4.5 s)" now reads "4.5 standard deviations". CUSUM recomputed: S = 0, 0, 0, 0.5, 1.2, 1.6, 2.4, 3.0, so the alarm is at sample 7. 0.0027 × 86,400 = 233. 2 × 0.00135³ × 86,400 = 0.0004. |
| 12 | sys.twin.state-estimation | "covariance ... uncertainty-based" | false positive | n/a | The word "uncertainty". |
| 13 | sys.twin.state-estimation | standard equations UNCERTAIN | confirmed | Chen, Heckman, Julier, arXiv:1807.08855, eqs. 5–10 | Hedge replaced by the citation. All numbers recomputed and they match: K₁ = 0.93665, x₁ = 30.9557, P₁ = 0.23416; K₂ = 0.47457, x₂ = 31.3990, P₂ = 0.11864; steady-state K = 0.15378, P⁻ = 0.04543, S = 0.29543. |
| 14 | sys.twin.state-estimation | Welch & Bishop 404 | confirmed | as row 13 | The UNC PDF still returns 404 and the HTML page also 404s now. The source was replaced by the arXiv paper. |
| 15 | sys.twin.state-estimation | "initial uncertainty washing out" | false positive | n/a | The word "uncertainty". |
| 16 | sys.twin.state-estimation | Welch URL (snippet) | confirmed | https://arxiv.org/pdf/1807.08855 | The source URL was swapped. |
| 17 | sys.twin.vvuq | "Uncertainty quantification states..." | false positive | n/a | The word "uncertainty". |
| 18 | sys.twin.vvuq | Compare /E/ to u_val | corrected | 3rd Workshop on CFD Uncertainty Analysis, Lisbon 2008, "Validation Procedure" (adapted from ASME V&V 20), eqs. 1–3 and footnote 1: https://maretec.tecnico.ulisboa.pt/~maretec.daemon/html_files/VV2010_files/ValidationProcedure.pdf | Added the condition that the root-sum-square holds when the error sources are independent. Added that the full standard treats correlated sources and uses standard uncertainties. |
| 19 | sys.twin.vvuq | V&V 20 UNCERTAIN | confirmed | same | E = S − D and u_val = √(u_num² + u_input² + u_D²) were read in the workshop procedure, which states it is adapted from V&V 20. The hedge is removed. The paid standard itself was not bought. |
| 20 | sys.twin.vvuq | NASA-STD-7009 factor list | corrected | NASA-STD-7009B (5 Mar 2024), App. E §E.3.1 and §E.4.1: https://standards.nasa.gov/sites/default/files/standards/NASA/B/1/NASA-STD-7009B-Final-3-5-2024.pdf | The old 8-factor list is replaced by 7009B's two groups. Capability: data pedigree, verification, validation, development technical review, development process/product management. Results: use assessment, input pedigree, uncertainty characterisation, results robustness, use/analysis technical review, use process/product management. Rev. A's use history and people qualifications are noted as older. |
| 21 | sys.twin.vvuq | "/E/ = 1.2 K is inside it" | false positive | n/a | The word "uncertainty". Recomputed: u_val = √0.42 = 0.648 K, band 1.296 K. |
| 22 | sys.twin.vvuq | "input uncertainty fell to 0.2 K" | false positive | n/a | Recomputed: √0.21 = 0.458 K, band 0.917 K < 1.2 K. |
| 23 | sys.twin.vvuq | unaided check "uncertainty budget" | false positive | n/a | The word "uncertainty". |
| 24 | sys.twin.vvuq | ntrs 20160000202 (snippet) | corrected | NTRS record read | That record is a 2015 HRP workshop presentation (Myers et al.), not the standard. It was replaced by the 7009B PDF and the Lisbon procedure. |
| 25 | sys.twin.closed-decision | "uncertainty must reach the decision maker" | false positive | n/a | The word "uncertainty". |
| 26 | sys.twin.closed-decision | "4 K margin from uncertainty" | false positive | n/a | Recomputed: √(50/0.06) = 28.87 A; √(46/0.06) = 27.69 A; at 27 A, 30 + 3 × 0.02 × 729 = 73.74 °C. |
| 27 | sys.twin.uncertainty-thresholds | NIS ~ χ²(m) | false positive | Chen et al. eq. 19 also confirms it | The word "uncertainty". |
| 28 | sys.twin.uncertainty-thresholds | Piché UNCERTAIN | corrected | Piché 2016 abstract (https://researchportal.tuni.fi/en/publications/online-tests-of-kalman-filter-consistency/); Chen et al. eqs. 15 and 19 | Added that the window test needs white innovations. The hedge is replaced by the citations. The Piché PDF is behind bot protection (403 / Anubis) and was not bypassed. |
| 29 | sys.twin.uncertainty-thresholds | "standard, not read in the body" | confirmed | scipy chi-square quantiles | Recomputed: 3.841, 6.635, 10.828, 9.210; window bounds 0.4795 to 1.7085; χ²₁ at α = 1.157e-5 is 19.23; χ²₂ at α = 1.157e-6 is 27.34 = −2 ln α. |
| 30 | ml.pred.rul-literacy | "Slope uncertainty" | false positive | n/a | Recomputed: 14/0.016 = 875, 14/0.024 = 583, (700 − 600)/600 = 16.7%. |
| 31 | ml.pred.rul-literacy | NTRS (snippet) | confirmed | Saxena et al. 2009 PHM paper, §3 and §3.5 and the β criterion: https://ntrs.nasa.gov/api/citations/20100023445/downloads/20100023445.pdf | The PDF was read. It confirms PH, α-λ, RA, convergence and the β probability-mass criterion. The "snippets only" sentence was removed. |
| 32 | ml.ops.monitoring-drift | taxonomy from memory | confirmed | Huyen, "Data Distribution Shifts and Monitoring": https://huyenchip.com/2022/02/07/data-distribution-shifts-and-monitoring.html | Probability definitions were added: P(X), P(Y\|X), P(Y), P(X\|Y). The Moreno-Torres 2012 PDF is behind bot protection. |
| 33 | ml.ops.monitoring-drift | Huyen not opened | confirmed | same | The hedge is removed. |
| 34 | ml.ops.monitoring-drift | PSI levels UNCERTAIN | confirmed | Yurdakul 2018 thesis abstract, WMU: https://scholarworks.wmich.edu/dissertations/3208/ | It confirms the < 0.10 and 0.10–0.25 rules of thumb and the criticism that they have no Type I/II error basis. The text now says this. PSI recomputed as 0.13619. JS divergence (base 2) is 0.0242. |
| 35 | ml.ops.cost-latency | Little's law UNCERTAIN | corrected | Little & Graves, "Little's Law", *Building Intuition* ch. 5 (2008), pp. 81–82, doi:10.1007/978-0-387-73699-0_5 | "Stable systems in general" became "under stationarity, whatever servers, discipline or distributions". The M/M/1 numbers were recomputed: W = 1 s, p95 = 3.00 s; W = 2.5 s, p95 = 7.49 s. |
| 36 | ml.ops.cost-latency | "from memory" | corrected | same | The hedge is removed and the DOI added to sources. |
| 37 | ml.ops.shadow-canary | shadow mode UNCERTAIN | confirmed | AWS SageMaker "Shadow tests": https://docs.aws.amazon.com/sagemaker/latest/dg/shadow-tests.html | The doc says a copy of requests goes to the shadow variant and only production responses reach the caller. Recomputed: 1 − 0.05^(1/300) = 0.99%; 50 trials gives 5.8%. |
| 38 | ml.edge.quantization | Jacob et al. UNCERTAIN | confirmed | arXiv:1712.05877 abstract ("co-design a training procedure to preserve end-to-end model accuracy") | The hedge is replaced by the citation. All quantization numbers were recomputed and match. |
| 39 | ml.edge.quantization | PDF could not be parsed | confirmed | same | The hedge is removed. |
| 40 | ml.edge.deploy | 20% margin [P] | convention | n/a | Marked as a project convention: a measured maximum is a sample, not a bound. Recomputed: 1.9e6/64e6 = 29.69 ms; × 1.2 = 35.63 ms; 33/1.2 = 27.5 ms. |
| 41 | ml.edge.deploy | DWT from memory | corrected | Arm CMSIS_6 `core_cm4.h` and `core_cm33.h`, which define the 32-bit `CYCCNT` and the `DWT_CTRL_NOCYCCNT` bit 25; `core_cm0plus.h` has no DWT_Type | Added that CYCCNT is optional (check NOCYCCNT) and absent on Cortex-M0/M0+, where a timer or GPIO should be used instead. Arm's developer docs did not render for the fetch tool. |
| 42 | ml.edge.tensor-memory | memory doc 404 | corrected | TFLM `docs/memory_management.md`: https://github.com/tensorflow/tflite-micro/blob/main/docs/memory_management.md | The doc has moved. The arena description now uses the doc's three sections: head holds non-persistent planned buffers, temporary holds scoped scratch, tail holds persistent data and grows towards the head. The sizing tool is now named: RecordingMicroInterpreter with PrintAllocations(). |
| 43 | ml.edge.tensor-memory | scratch/persistent [P] | convention | n/a | Marked as illustrative figures that should be read from the recorder. Recomputed: 6,144 + 512 + 1,800 = 8,456; 16,384 − 8,456 = 7,928. |
| 44 | ml.llm.structured-outputs | "wrong or invented value" | false positive | n/a | "invented" is subject matter here (a fabricated model value). |
| 45 | ml.llm.structured-outputs | "invented device id" | false positive | n/a | Same as row 44. |
| 46 | ml.llm.retrieval-evals | "answered from memory" | false positive | n/a | The phrase is subject matter: the LLM's parametric memory. |
| 47 | ml.llm.retrieval-evals | Mooney slides (snippet) | confirmed | NIST trec_eval `m_map.c` (AP sums precision at each relevant retrieved item and divides by all relevant, so unretrieved items count 0); scikit-learn user guide §3.4.5.4 NDCG (DCG with log discount, divided by ideal DCG) | Sources swapped. The Stanford IR book and the UT slides would not load (connection reset and certificate error). All metrics recomputed: AP 0.4167, nDCG 0.5856; unaided check 0.389 and 0.531. |

### False-positive patterns for `reference/build_open_checks.py`

1. **`UNCERTAIN` with `re.I`** matches "uncertainty" and "uncertainties" (15 of the 17 rows). The YAML hedge is always upper-case `UNCERTAIN:`. Fix: match `\bUNCERTAIN\b` case-sensitively, or `UNCERTAIN:`.
2. **`not read`** matches inside "can**not read**" (row 5). Fix: `(?<!can)not read` or `\bnot read\b` after excluding "cannot".
3. **`could not`** matches plain prose such as "could not fail" (row 1). Fix: `could not be (?:opened|read|parsed|confirmed|found|verified)`.
4. **`invented`** matches subject matter, such as an LLM inventing a value (rows 44 and 45). Fix: rely on `[P` for project values, or match only `invented (?:value|figure|number)s?` or "invented for practice".
5. **`from memory`** matches subject matter, such as a model answering "from memory" (row 46). Fix: `(?:is|are|comes?|written|taken) from memory`.
6. A side effect of pattern 1: the type falls through to "Unconfirmed fact" for these rows, which is how a plain "uncertainty" sentence got that type.

Proposed edit (orchestrator applies), `reference/build_open_checks.py`:

- Old: `MARK = re.compile(r"UNCERTAIN|\[uncertain|\[P\b|\(snippet\)|unofficial mirror|from memory|not opened|not read|secondary|unconfirmed|invented|snippet only|could not", re.I)`
- New: `MARK = re.compile(r"(?-i:\bUNCERTAIN\b)|\[uncertain|\[P\b|\(snippet\)|unofficial mirror|(?:is|are|comes?|written|taken) from memory|not opened|(?<!can)not read|secondary|unconfirmed|invented (?:value|figure|number)|snippet only|could not be (?:opened|read|parsed|confirmed|found|verified)", re.I)`

Run it against T1–T6 before committing. T1–T4 and T6 may use "could not" or "invented" as hedges in other forms.

## 3. Founder items (review-T4-T5 "Curriculum weaknesses that remain")

| Item | Decision | Reasoning | Source |
|---|---|---|---|
| 8. `sys.twin.closed-decision` fallback keeps 30 A on timeout | **Fixed in T5.yaml.** On timeout or a lost link, the default is the tighter 27 A. Returning to 30 A is a relaxation and needs explicit approval with evidence. The core idea now says that an expiring *relaxation* reverts to the default, while a *tightening* stays until a human relaxes it. | At 30 A the model predicts 84 °C against an 80 °C limit. A tightening must fail safe, and the old core idea ("a change that expires reverts to the default") would have restored 30 A after 24 h. This follows the safety-first rule. | Arithmetic in row 26; the skill's own [J] envelope rule |
| 2. Hands-on times too short (`ml.edge.deploy` 40 min, `ota-rollback` 35 min) | Not changed. This is a scope or time-model decision, not a fact. Row 4 now says the 20 power-cut trials are a smoke test. | Outside "factual or source issue". | n/a |
| 7. `phone_suitable` conflicts | Not changed. The graph wins, and no T5 fact is involved. | n/a | n/a |

No other weakness touches T5 facts. The review's "Not read" list for T5 is now resolved: Welch & Bishop was replaced, Piché is cited by abstract and Chen et al. eq. 19, Huyen, the PSI levels and Little's law were read, and NASA-STD-7009 is now B.

## 4. Still open

None of the 47 rows is open. Remaining limits:

- **ASME V&V 20 full text** was not bought. The formula is confirmed through the openly published workshop procedure that adapts it. To close fully, buy ASME V&V 20-2009 (R2021) and check §5 against the vvuq core idea. Low priority.
- **Piché 2016 body** sits behind bot protection. The NIS claims rest on Chen et al. instead. To close, read the accepted manuscript in a normal browser (researchportal.tuni.fi/files/3250626/KFconsistency2015.pdf).
- **Arm reference manual** text for CYCCNT was read only through Arm's CMSIS headers, because the developer site does not render for the fetch tool. To close, open the ARMv7-M ARM (DDI 0403) §C1.8.8 in a browser.
