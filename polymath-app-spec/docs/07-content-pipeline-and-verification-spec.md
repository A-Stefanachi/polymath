# 07 — Content pipeline and verification spec

Status: implementation-ready draft, 31 Oct 2026. Binding upstream document: `00-contract.md`. Companion: `08-grading-and-tutor-spec.md` (graders and tutor). Machine-readable files owned by this document: `schemas/problem-template.schema.json`, `content/sample-problem-templates/*.yaml`, `reference/verifiers/*`, `reference/validate_templates.py`.

Evidence tags follow the contract: **[V]** source opened, **[S]** snippet only, **[R]** recalled, **[P]/[inf]** design proposal or inference. Anything tagged [P] or [inf] is a hypothesis to be tested, never UI copy.

<!-- readability:start -->

> **At a glance**
>
> **Purpose:** how a problem template becomes a verified, servable item, and how wrong items are caught, reported and retired.
> **Read by:** the agent building `content:sync`, the template linter, the verification engine and the review console (BL-0013, 0015, 0017, 0018, 0050 to 0053, 0056, 0057); the founder when authoring templates.
>
> 1. A template is YAML; a seed deterministically produces one item (statement, key, hints, distractors) (sections 2 to 4).
> 2. Expressions use a restricted grammar and pint units; there is no `eval` (section 3).
> 3. No item is served unless an independent method agrees with the generator (section 5, contract 7.8).
> 4. The result is stored in `items.verification_report` (section 6).
> 5. Gates G1 lint (26 rules), G2 fuzz (200 samples), G3 human spot-check, G4 per-instance verification, G5 difficulty calibration, G6 retirement (section 7).
> 6. Learners report problems; defect metrics and the retirement flow are in section 8.
> 7. LLMs may draft and polish templates but never approve them (section 9).
> 8. `content:sync` loads YAML into Postgres idempotently; only the pipeline sets `status = verified` (section 10).
> 9. Licences and provenance are recorded per template (section 11); what was actually run is in section 12.

**Contents**

- [0. What this document decides](#0-what-this-document-decides)
  - [Evidence base (why this is strict)](#evidence-base-why-this-is-strict)
- [1. Pipeline overview](#1-pipeline-overview)
- [2. Template anatomy](#2-template-anatomy)
  - [2.1 Field notes that matter for correctness](#21-field-notes-that-matter-for-correctness)
  - [2.2 Coverage, diagnostic eligibility and timing](#22-coverage-diagnostic-eligibility-and-timing-design-review-00f-f-03-f-11-f-14-f-09-g3-g7)
- [3. Rendering and the expression language](#3-rendering-and-the-expression-language)
  - [3.1 Placeholders and filters](#31-placeholders-and-filters)
  - [3.2 Units](#32-units)
  - [3.3 Expression grammar (all `expr`, `value_expr`, `wrong_answer_expr`, `correct_when`, `constraints().expr`, `generator.outputs`, `verifiers().spec` expressions)](#33-expression-grammar-all-expr-value_expr-wrong_answer_expr-correct_when-constraintsexpr-generatoroutputs-verifiersspec-expressions)
- [4. Generation](#4-generation)
  - [4.1 Determinism](#41-determinism)
  - [4.2 Rejection sampling and degenerate cases](#42-rejection-sampling-and-degenerate-cases)
  - [4.3 Produced item](#43-produced-item)
- [5. Independent recomputation](#5-independent-recomputation)
  - [5.1 The rule](#51-the-rule)
  - [5.2 Pairs used in the samples](#52-pairs-used-in-the-samples)
  - [5.3 Verifier kinds (schema enum) and status in the reference implementation](#53-verifier-kinds-schema-enum-and-status-in-the-reference-implementation)
  - [5.4 Unit and dimension checks with pint](#54-unit-and-dimension-checks-with-pint)
  - [5.5 Tolerance when comparing generator and verifier](#55-tolerance-when-comparing-generator-and-verifier)
- [6. The verification report (`items.verification_report`)](#6-the-verification-report-itemsverification_report)
- [7. QA gates in detail](#7-qa-gates-in-detail)
  - [G1 Static lint rules](#g1-static-lint-rules)
  - [G2 Fuzz run (200 samples)](#g2-fuzz-run-200-samples)
  - [G3 Human spot-check checklist (template-level, by the founder)](#g3-human-spot-check-checklist-template-level-by-the-founder)
  - [G4 Instance verification](#g4-instance-verification)
  - [G5 Difficulty calibration from attempts (P)](#g5-difficulty-calibration-from-attempts-p)
  - [G6 Retirement rules (P thresholds, to be tuned with data)](#g6-retirement-rules-p-thresholds-to-be-tuned-with-data)
- [8. Item defect metrics and the learner report flow](#8-item-defect-metrics-and-the-learner-report-flow)
  - [8.1 Definitions and targets (P)](#81-definitions-and-targets-p)
  - [8.2 Learner "report a problem" flow](#82-learner-report-a-problem-flow)
- [9. LLM assistance policy](#9-llm-assistance-policy)
- [10. `content:sync`](#10-contentsync)
  - [Implementation tasks (agent-ready)](#implementation-tasks-agent-ready)
- [11. Content licensing and provenance](#11-content-licensing-and-provenance)
- [12. Validation and test results (31 Oct 2026, this environment)](#12-validation-and-test-results-31-oct-2026-this-environment)
- [13. Assumptions and unverified items](#13-assumptions-and-unverified-items)
- [14. Resolved by 00a (v1.1)](#14-resolved-by-00a-v11)

<!-- readability:end -->

---

## 0. What this document decides

1. A **template** is a YAML file that, given a seed, deterministically produces one practice item (statement, answer key, hints, distractors) and carries the checks that prove the item is correct.
2. **No generated item is served unless a verifier that uses a different method from the generator agrees with it** (contract 7.8). Verification happens twice: once per template version (fuzz run plus human spot-check) and once per generated item (the same verifiers on that item's parameters). The result is stored in `items.verification_report`.
3. LLMs may draft and polish; they never approve. Humans review templates, not instances.
4. Wrong items are expected to occur; the pipeline's job is to make them rare, traceable and cheap to retire.

### Evidence base (why this is strict)

| Finding | Source and tag | Consequence here |
|---|---|---|
| LLM-written K-8 word problems met "solvable, accurate and appropriate" only 62.4% to 78.8% of the time across four models (MATHWELL 74.8%, GPT-4 Turbo 78.8%, GPT-3.5 62.8%, Llama-2 70B 62.4%; 250 rated problems per model) | MATHWELL, arXiv 2402.15861; research note `ai_adaptive_tutoring.md` line 69 [B, one study, K-8 word problems, not engineering] | Never serve LLM-authored items without an executable or symbolic check. Plan for roughly one in four to one in five unverified LLM items being unusable (an inference from a different domain [inf]). |
| LLM grading of circuit homework: 74.71% fully correct at baseline, 97.70% on a smaller set after multi-step prompting, context augmentation and error hints; failures were unit conversion, equivalent numeric forms, rejecting valid alternative methods; no diagrams, no SPICE | arXiv 2511.18221, report "Content verification and auto-grading" [B, one course] | Units, equivalent forms and alternative methods are handled in code before any LLM (doc 08). |
| Checklist-rubric LLM scoring reached ICC 0.90 to 0.92 vs 0.94 for humans, but mid-level responses collapsed with a one-shot exemplar showing only full credit | arXiv 2604.12227, 20 responses [B, very small N] | Calibration sets must include partial-credit exemplars (doc 08). |
| No retrieved source evaluates SPICE-based, CAD or diagram grading | Report section 8 evidence gaps | SPICE and measurement grading designs are **[P]** and flagged as such. |

## 1. Pipeline overview

```
 author (human, optionally LLM-assisted)            CI and sync (git push)                       runtime (worker + app)
 ------------------------------------------         -------------------------------------        -----------------------------------------
 content/templates/<node>/<key>.yaml                G0 schema validation                          serve request (session builder asks for
   + content/prompts/*_vN.md (if LLM used)          G1 static lint (L01..L26)                       skill S, kind K)
        |                                           G2 fuzz run: 200 seeds, all verifiers           |
        v                                           G3 human spot-check sign-off (review block)     v
 git commit / PR  ---------------------------->     content:sync -> item_templates rows           choose template version, new seed
                                                      status: needs_human_review | verified         |
                                                                                                    v
                                                                                              G4 generate + verify instance
                                                                                                    -> items row (status verified,
                                                                                                       verification_report stored)
                                                                                                    |
                                                                                                    v
                                                                                              serve -> attempt -> grade (doc 08)
                                                                                                    |
                                    G5 calibration (difficulty from attempts)   <----------------- attempts, learner "report a problem"
                                    G6 retirement (reports, anomalies)          <-----------------
```

| Gate | Scope | Where it runs | Blocks |
|---|---|---|---|
| G0 schema | template file | `npm run content:validate` and CI (`reference/validate_templates.py` is the Python reference) | sync |
| G1 static lint | template file | CI and `content:sync` | sync |
| G2 fuzz | template version | worker `verify-template` job, CI | `verified` status |
| G3 human spot-check | template version | founder, recorded in `provenance.review` | `verified` status (otherwise `needs_human_review`) |
| G4 instance verification | each `items` row | worker, at generation | serving that item |
| G5 calibration | template and item | nightly job | nothing; adjusts `difficulty_est` |
| G6 retirement | item, template version | nightly job and manual | serving |

Status mapping to the contract enum `content_status` (`draft`, `verified`, `needs_human_review`, `retired`):

| Object | `draft` | `needs_human_review` | `verified` | `retired` |
|---|---|---|---|---|
| `item_templates.status` | file has `authoring_status: draft` (synced for visibility, never served) | `ready`, G0 to G2 pass, no valid review block (shown to the founder only) | `ready`, G0 to G2 pass, valid review block whose `template_sha256` matches | `authoring_status: retired`, or retired by G6 |
| `items.status` | not used | G4 produced a verifier `skipped`, or template is `needs_human_review`, or item quarantined by G6 (shown to the founder only) | every verifier `pass` and template `verified` | retired by G6 |

## 2. Template anatomy

One YAML file per template, named `<key>.yaml` (for example `tpl.elec.voltage-divider-vout.yaml`). Location in the real repo: `content/templates/<node>/`. Seven complete examples are in `content/sample-problem-templates/`. The JSON Schema (draft 2020-12) is `schemas/problem-template.schema.json`; the table below is the human summary.

| Block | Required | Purpose |
|---|---|---|
| `schema_version`, `key`, `version`, `authoring_status` | yes | Identity. `key` matches `^tpl\.[a-z]+\.[a-z0-9-]+$` (contract section 4). `version` is an integer that must increase whenever a rendered item or its answer could change. `authoring_status` is `draft`, `ready` or `retired`; the file can **never** say `verified` (schema enforces it). |
| `skill_key`, `task_kind`, `grader_type`, `difficulty_prior` | yes | Hoisted into columns of `item_templates`. Enumerations are the contract's exact spellings. `skill_key` must match `^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$` and exist in `skills` (checked at sync). |
| `pool`, `interleave`, `reference_time_s`, `mastery_eligible` | no | Hoisted into the `item_templates` columns of the same name (00a section C). Defaults: `pool = practice`, `interleave = true`, `mastery_eligible = true`. `mastery_eligible` must be `false` for a `rubric_llm` template whose rubric calibration set is not approved (doc 08 section 2.8); the scheduler also reads `grade.mastery_eligible`. `item_templates` holds one row per `(key, version)`; `items` carry `template_version`. |
| `title`, `license`, `source`, `provenance` | yes | Licensing and provenance (section 11). |
| `delivery` | yes | `contexts` (`phone`, `desktop`, `bench`), `est_seconds`, `phone_suitable`, optional `offline_gradable`. The session builder (doc 06) reads these. |
| `parameters` | yes (may be empty) | Typed sampling spec: `int`, `float`, `choice`, `e_series` (E6, E12, E24, E96 values times decades), `bool`. Each may carry a pint `unit`; values are stored in SI base for that dimension. |
| `derived` | no | Named intermediate values (expressions) used for display and constraints. |
| `constraints` | no | Boolean expressions; a draw that violates any is rejected and resampled. Every constraint states its `reason`. |
| `render` | yes | `stem_md` (Markdown plus KaTeX plus placeholders), `alt_text` (mandatory plain-text alternative, WCAG 2.2 AA), optional `figure`, `reading_table`, `answer_prompt`, `time_limit_s`. |
| `solution` | yes | `generator` (how the answer is computed) and `steps` (worked solution, shown at hint level 4 and after the attempt). |
| `answer` | yes | Grader-specific answer spec (value, unit, tolerance; or options; or tests; or netlist checks). The schema selects the sub-schema from `grader_type`. |
| `verifiers` | yes (at least 2 when `ready`) | The independent checks (section 5). |
| `hints` | yes (`l1` to `l3` when `ready`) | Static hint scripts per level; also the fallback when the AI tutor is off or over budget (doc 08 section 8.4). |
| `misconceptions` | yes (may be empty) | Tags `mc.<slug>` with descriptions and, for numeric/symbolic answers, a `wrong_answer_expr` the grader uses to tag a specific wrong answer. |
| `fuzz` | yes | `samples` (at least 200), `seed_base`, limits on rejection rate and minimum distinct parameter sets. |

### 2.1 Field notes that matter for correctness

- **Parameters.** `e_series` draws a mantissa from the series and a decade in `[decade_min, decade_max]`; the value is built from a decimal string (for example `4.7` and `3` give exactly `4700.0`) so no float noise enters the item. `int` with `nonzero: true` excludes 0. `choice` draws uniformly from `values`.
- **Answer specs by `grader_type`.** `exact_numeric`: `kind` (`numeric` or `complex`), `value` or `re`/`im` (names of generator outputs), `unit`, `accept_units`, `bare_number_means`, `tolerance` (`rel`, `abs`; accept when `|x - ref| <= max(abs, rel*|ref|)`). `symbolic_equivalence`: `variables`, `reference` (name of a generator output holding a SymPy expression), `sample_domain`, `forbid_functions`, `form`, `numeric_rel_tol`. `multiple_choice`: `options[]` each with `correct` or `correct_when`, optional `value_expr`, and for every option that can be wrong a `misconception_tag` and `feedback_md`. `code_tests`: `header`, `starter_code`, `reference_solution`, `reference_model_py`, `compile`, `limits`, `tests.{visible,hidden,golden}`, `mutants`. `spice_compare`: `skeleton`, `allowed_elements`, `required_nodes`, `fixed_elements`, `reference_netlist`, `analysis.grader_directives`, `checks[]`, `limits`. `drc_erc`, `measurement_check`, `rubric_llm`, `human_review`: see doc 08.
- **Perceptual drills** (`task_kind: perceptual_drill`) must be answerable in 60 seconds or less (schema), use `multiple_choice` or `exact_numeric`, and carry `render.time_limit_s`. The sample `tpl.elec.divider-fault-drill` shows a fault table where the true fault is a parameter and the correct option is chosen by `correct_when`.
- **YAML pitfalls (verified while building the samples).** PyYAML follows YAML 1.1: `1.0e12` is read as a **string**; write `1.0e+12` (a sign is required). Quote dates (`"2026-10-31"`). Block scalars (`|`) for any text that contains `{`, `}` or `:`. The Node loader used by `content:sync` must use the YAML 1.2 core schema with timestamps disabled, and `content:sync` re-validates against the schema after loading so a type surprise fails loudly.

### 2.1a Loop stages and static items (00a H1, H2)

One template serves `worked_example`, `faded_problem` and `retrieval`, so it needs at least 2 `solution.steps`. A definition or rule item with one fixed question sets `concept_static: true` and needs G3 sign-off. `reference/validate_lean_pool.py` reports both.

### 2.2 Coverage, diagnostic eligibility and timing (design review 00f F-03, F-11, F-14, F-09; G3, G7)

These rules need no new field or enum; they are checks in the `content:sync` coverage report (a report, not a numbered lint rule, so L01 to L26 keep their meaning) and in the selectors of docs 05 and 06.

1. **At least two verified templates per skill where the skill is gated.** Every skill that the diagnostic may probe (doc 05 section 11) and every skill that appears in the mastery rule (all skills that unlock dependents) needs **at least 2 verified templates**. The mastery rule asks for 2 distinct verified templates among the qualifying attempts when a skill has two or more (G3), and difficulty matching cannot adapt with one template (00f F-14). The coverage report lists each such skill with its verified-template count; a skill with a single template is reported `thin` and counts against the content definition of done for its milestone. Until a second template exists the rule is simply not applicable to that skill (the scheduler must not wait for a template that does not exist).
2. **Diagnostic items are constructed-response only (G7).** The diagnostic selector may only draw templates whose `grader_type` is `exact_numeric` or `symbolic_equivalence` (and `code_tests` or `spice_compare` once the sandbox graders are enabled). Multiple-choice templates are never selected for `task_kind = diagnostic`, because a guess succeeds 20 to 33 percent of the time and placement credit is expensive to undo. Consequently every skill that the diagnostic may probe needs at least one verified constructed-response template; the coverage report lists skills that have only multiple-choice templates. Authoring cost: a diagnostic-ready skill is roughly one extra constructed-response template, budgeted in doc 13 section 3.
3. **Time estimates come from a stopwatch, not a guess.** `delivery.est_seconds` (the value the scheduler reads as `body.expected_s` and uses to seed `expected_ms`) is set by the founder timing a first attempt at the item as a competent beginner would take it, by stopwatch, on the phone when `phone_suitable` is true. Record the measurement in `provenance.notes` (for example "stopwatch 3 draws: 95, 110, 120 s; est 110"). A template whose `est_seconds` is an untimed guess is reported `untimed` in the coverage report and its latency rows in the rating map stay off (doc 06 section 3.4; fewer than 20 observations ignore latency, G5). Per-answer-type defaults for planning before a stopwatch exists are in doc 09 section 6.
4. **Assessment pool.** Checkpoint items (`pool: assessment`) double the authoring for the skills they cover (00f F-17); the coverage report counts practice and assessment templates separately.

## 3. Rendering and the expression language

### 3.1 Placeholders and filters

`{{name}}` and `{{name|filter[:arg]}}` may appear in `stem_md`, `alt_text`, `answer_prompt`, hints, solution steps and option text. A name resolves to a parameter, a derived value, or a generator output. Two special names exist: `{{value|...}}` inside an option's `text_md` means that option's `value_expr`, and `{{skeleton}}` in a `spice_compare` stem is the rendered `answer.skeleton`. An unresolved name or unknown filter is a lint error (L07) and a runtime generation failure (the item is not served).

| Filter | Result for `4700` ohm (or as noted) |
|---|---|
| (none) | integers as `4700`; otherwise 4 significant figures |
| `eng` / `eng:UNIT` | `4.7 kΩ` (engineering prefix, 3 significant figures; unit from the parameter or the argument: `ohm`, `V`, `A`, `F`, `Hz`, `s`, `H`, `W`) |
| `tex` / `tex:UNIT` | `4.7\,\mathrm{k}\Omega` for KaTeX |
| `sig:N`, `fixed:N`, `int` | N significant figures; N decimals; nearest integer |
| `paren` | integer, wrapped in parentheses when negative (`(-3)`) |
| `cplx`, `tex_cplx` | complex as `3 - 2j` |
| `spice` | `4700.0` (repr float, valid SPICE number) |
| `raw` | unformatted |

KaTeX rules: `$...$` inline, `$$...$$` display; no `\href`, `\url`, `\includegraphics`, `\input`; macros limited to the app's KaTeX allowlist; after rendering a sample item CI runs `katex.renderToString(..., {throwOnError: true, trust: false})` on every math span (L18). Every item has `alt_text`; figures are generated from named SVG templates (`render.figure.template`), never from external URLs.

### 3.2 Units

Parameter values are stored as floats in SI base units for their dimension (ohm, V, A, F, Hz, s). The `unit` string is validated by pint at lint time. Offset units (degC) are not allowed in parameters; temperatures are in K or handled as differences.

### 3.3 Expression grammar (all `expr`, `value_expr`, `wrong_answer_expr`, `correct_when`, `constraints[].expr`, `generator.outputs`, `verifiers[].spec` expressions)

A restricted Python-expression subset, parsed with Python's `ast` and checked against an allowlist; **never** passed to `eval`, `sympify` or `parse_expr`. Reference: `reference/verifiers/safe_expr.py`.

- Allowed nodes: numbers (int, float, complex), strings (for comparisons), names, `+ - * / // % **`, unary `+ - not`, comparisons, `and`/`or`, conditional expression `a if c else b`, calls to allowlisted functions with at most 4 positional arguments.
- Allowed functions: `sqrt sin cos tan asin acos atan atan2 exp log log10 abs min max round floor ceil hypot re im conjugate phase complex`; constants `pi E j`. In SymPy mode (template-author expressions only) `diff` is also available; learner input never gets it.
- Rejected: attribute access, subscripts, lambdas, comprehensions, keyword arguments, names not in scope, expression length over 400 characters, more than 300 AST nodes, power with a numeric exponent of magnitude above 64 or a result estimated above 1e300 (so `9**9**9` fails fast).
- The same text can be evaluated in three namespaces: plain floats/complex (generation), exact SymPy rationals with `j` as the imaginary unit (verification), or pint Quantities (dimension checks).

## 4. Generation

### 4.1 Determinism

```
seed_material = sha256( "{template_key}|{version}|{seed}" )         # UTF-8
rng           = Mersenne Twister seeded with the first 8 bytes of seed_material (big-endian integer)
```

Rules (acceptance test `test_determinism_across_processes`): the same `(key, version, seed)` produces identical parameters and identical rendered text in any process, with any `PYTHONHASHSEED`; parameters are drawn in the order they are declared; draws never depend on dictionary or set order; the worker never uses global `random`. `seed` is a 63-bit integer chosen by the session builder (new seed per presentation, contract 7.3); `(template_key, version, seed)` is unique in `items`. For multiple-choice display, the shown distractors and their order come from a second stream `seed + 10^9` so they do not perturb parameter draws.

### 4.2 Rejection sampling and degenerate cases

```
for tries in 1..500:
    draw all parameters
    compute derived values and generator outputs
    if any constraint is false, or (multiple_choice and any two option values are closer than min_separation_rel): continue
    return
fail: generation error -> event item_generation_failed, template flagged
```

Per-sample rejection is cheap, but a template that rejects most draws is badly specified, so the fuzz gate limits `rejection_rate` (default 0.5; the samples set 0.9 with a stated reason where a deliberately narrow window is wanted). Degenerate cases every template must exclude by constraint, not by hope (checked by the author's checklist, G3):

| Degenerate case | Example constraint (from the samples) |
|---|---|
| Trivial or guessable answer | divider: `r1 != r2` (otherwise the answer is Vin/2) |
| Answer too close to a boundary or to a common wrong answer | divider: `abs(r1-r2)/(r1+r2) >= 0.1` keeps the swapped-resistor answer more than 20 percent away; fuzz verifies every `wrong_answer_expr` is outside tolerance |
| Zero or sign-ambiguous values | complex division: all four integer parts `nonzero` |
| Distractors collide with each other or the answer | series-parallel: `min_separation_rel: 0.04` on all five option values, plus `r1 != r2 != r3` |
| Magnitudes that make numbers unreadable | `max/min <= 15`; RC: `300 <= r_ideal <= 60000` |
| Indistinguishable fault signatures | fault drill: ratio window 0.15 to 0.85 plus the `fault_uniqueness` verifier |
| Numerically ill-conditioned or singular systems | require a condition check in `constraints` or a verifier `bounds` |
| Division by zero or domain errors | the sampler treats any `ExprError` as a rejection; the fuzz gate counts them |

### 4.3 Produced item

The worker writes one `items` row: `template_key`, `seed`, `params` (jsonb, SI values), `rendered` (jsonb: `stem_md`, `alt_text`, `answer_prompt`, `options` actually shown, `reading_table`, `figure`), `verification_report`, `status`, `difficulty_est`. The answer key (generator outputs, reference solution, hidden tests) is **not** in `rendered`; it is recomputed server-side from `params` at grading time or stored in a server-only column group (data-model owner decides; see CCR-07). The reference implementation returns the key as `_ctx`, which must never be serialised to the client.

## 5. Independent recomputation

### 5.1 The rule

> A verifier is *independent* if it would still catch a mistake in the generator's formula, the generator's code path, or the author's reading of the problem. Recomputing the same expression text, in the same arithmetic, is not verification.

Each `verifiers[]` entry has an `independence` sentence (schema-required) stating how it differs. Lint L24 rejects a verifier of kind `sympy_solve`, `sympy_exact`, `polar_vs_rectangular` or `spice_vs_closed_form` whose expression text (whitespace-normalised) equals a generator output expression. An LLM is never a verifier (section 9).

### 5.2 Pairs used in the samples

| Template | Generator method | Independent verifier method | What it catches |
|---|---|---|---|
| voltage divider | float closed form `vin*r2/(r1+r2)` | exact rational KCL at the output node solved by SymPy; pint dimension check | formula error, wrong resistor, unit slip |
| complex division | inverse construction: sample quotient and divisor, compute numerator | exact Gaussian division via conjugate in SymPy; polar division (magnitudes, angles) in floating point | wrong product formula, sign error |
| derivative | hand-derived product-rule expression | SymPy `diff` then `simplify(ref - d) == 0`; mpmath numeric differentiation at 5 points | algebra slip in the reference |
| series-parallel MC | closed form series/parallel | inject 1 A and solve node equations exactly; pairwise option separation | wrong key, colliding distractors |
| debounce C | Python executable model | compiled C reference solution; hand-computed golden vectors; mutants must fail | spec misread, weak tests |
| RC low-pass | closed form `1/(2 pi R C)` | ngspice AC analysis of the reference netlist, `.meas` of the -3 dB point | wrong cutoff formula, bad netlist template |
| fault drill | hand-written reading table | numeric nodal analysis with open = 1e12 ohm and short = 1e-3 ohm; pairwise distinguishability | wrong signature, ambiguous faults |

### 5.3 Verifier kinds (schema enum) and status in the reference implementation

| Kind | Checks | Reference code |
|---|---|---|
| `sympy_solve` | solve declared equations exactly (SymPy, rational parameters) and compare unknowns to generator outputs | `verify_template.v_sympy_solve` |
| `sympy_exact` | exact recomputation of named outputs; symbolic outputs compared by `simplify(a-b)==0` | `v_sympy_exact` |
| `sympy_diff_vs_numeric` | mpmath numeric derivative (30 digits) vs reference expression | `v_sympy_diff_vs_numeric` |
| `polar_vs_rectangular` | complex division in polar vs rectangular form | `v_polar_vs_rectangular` |
| `pint_dimension` | evaluate expressions on pint Quantities and convert to the declared unit | `v_pint_dimension` |
| `bounds` | value strictly or weakly between two expressions | `v_bounds` |
| `distinct_options` | exactly one correct option; all option values pairwise separated; correct value equals verified output | `v_distinct_options` |
| `option_values_recomputed` | per-distractor exact recomputation (reserved; not used in samples) | not implemented |
| `fault_uniqueness` | nodal solution per fault vs table; pairwise distinguishability by readings | `v_fault_uniqueness` (named circuit `series_divider`) |
| `reference_code_passes` | reference C solution passes all visible and hidden tests on a parameter grid | `v_reference_code_passes` |
| `model_vs_reference_code` | differential test: Python model vs compiled C on random inputs | `v_model_vs_reference_code` |
| `golden_vectors` | hand-computed vectors pin the model | `v_golden_vectors` |
| `mutants_fail` | every mutant fails at least one hidden test | `v_mutants_fail` |
| `spice_vs_closed_form` | ngspice measurement of the reference netlist vs closed form and target | `v_spice_vs_closed_form` |
| `netlist_lint_reference` | reference passes lint and grading; the same netlist with R doubled does not | `v_netlist_lint_reference` |

The registry is open: new kinds require a schema enum addition, a reference implementation and a test.

### 5.4 Unit and dimension checks with pint

1. For every parameter with a `unit`, build `Quantity(value, unit)`.
2. Evaluate each `pint_dimension.spec.checks[].expr` on those Quantities with the restricted evaluator (pint overloads the arithmetic operators), then call `.to(result_unit)`. A `DimensionalityError` fails the verifier and the message includes the computed dimensionality.
3. Learner answers are converted with the same registry (doc 08 section 2.1); unit normalisation (`Ω`, `µ`, `kOhm`) is deterministic code.
4. Display units are checked in the render step: `eng`/`tex` filters need a unit (parameter unit or explicit argument); lint L09 fails a placeholder that formats a derived value without a resolvable unit.
5. Limits: pint is not asked about magnitude. The magnitude check is the independent numeric recomputation. Both must pass.

### 5.5 Tolerance when comparing generator and verifier

Default `rel 1e-9, abs 1e-12`; looser only for numeric-vs-symbolic comparisons that are inherently approximate (mpmath finite differences use `rel 1e-7`, ngspice measurements `rel 5e-3` because `.meas` interpolates on a 40-points-per-decade grid). A tolerance looser than 1e-2 in any verifier needs a comment in the template and is flagged at G3.

## 6. The verification report (`items.verification_report`)

JSON, one per item, written by the worker at G4 (and by the template fuzz run for each sample). Fields:

| Field | Type | Meaning |
|---|---|---|
| `report_version` | int | `1` |
| `template_key`, `template_version`, `template_sha256` | string, int, hex | Exactly what was verified. The hash is over the canonical template (keys sorted, `authoring_status` and `provenance.review` excluded) so a review sign-off is bound to content. |
| `seed`, `params` | int, object | Reproduce the item. |
| `generated_at`, `toolchain` | timestamp, object | Python, SymPy, pint, numpy (and ngspice, gcc versions when used). |
| `generator` | object | `method`, `outputs` (stringified), `rejections` (draws rejected before this one). |
| `verifiers[]` | array | Per verifier: `id`, `kind`, `status` (`pass`, `fail`, `skipped`), `ms`, and kind-specific evidence (`recomputed`, `generator`, `checks`, `killed_by`, ...). |
| `self_grade` | object | The reference answer in several spellings was graded correct; each `wrong_answer_expr` was graded incorrect **and** tagged with its misconception. |
| `decision` | `verified` or `rejected` | `verified` only if every verifier passed and self-grade and render checks passed. |
| `reasons` | string[] | Empty when verified; otherwise one line per failure. |
| `duration_ms` | int | |

Decision to `items.status`: `decision = verified` and template status `verified` gives `verified`; any `skipped` verifier, or a template in `needs_human_review`, gives `needs_human_review` (founder only); `rejected` items are never inserted as servable (a row with `status = draft` and the report is kept for diagnosis, and the event `item_verification_failed` is written). Size cap 64 KB per report (verifier evidence is truncated, never the decision).

Real example (voltage divider, seed 1; produced by `verify_template.verify_item`, trimmed for length):

```json
{
  "report_version": 1,
  "template_key": "tpl.elec.voltage-divider-vout",
  "template_version": 1,
  "template_sha256": "c6a8e1ccf27ac8fede7cd3801f2641b3a6b14863ea162bb513dc8981d52bab7a",
  "seed": 1,
  "params": {"vin": 3.3, "r1": 2000.0, "r2": 18000.0},
  "toolchain": {"python": "3.13.18", "sympy": "1.14.0", "pint": "0.26.2", "numpy": "2.5.3"},
  "generator": {"method": "closed_form", "outputs": {"vout": 2.97}, "rejections": 1},
  "verifiers": [
    {"id": "kcl-exact", "kind": "sympy_solve", "status": "pass",
     "checks": [{"unknown": "vo", "recomputed": 2.97, "generator": 2.97}], "ms": 30},
    {"id": "dimension", "kind": "pint_dimension", "status": "pass", "ms": 1},
    {"id": "window", "kind": "bounds", "status": "pass", "value": 2.97, "ms": 0}
  ],
  "self_grade": {
    "checked": ["2.97 V", "2.97", "2970.0 mV"],
    "wrong_answers": [
      {"tag": "mc.divider-swapped-resistors", "text": "0.33 V", "rejected": true, "tagged": true},
      {"tag": "mc.divider-assumes-half", "text": "1.65 V", "rejected": true, "tagged": true},
      {"tag": "mc.divider-ratio-not-fraction", "text": "29.7 V", "rejected": true, "tagged": true}
    ]
  },
  "decision": "verified",
  "reasons": [],
  "duration_ms": 33
}
```

Latency budget at G4: verification must fit inside item generation of 2 s p95 for analytic templates, 10 s p95 for SPICE items; code-template checks depend only on the parameter grid and are cached by `(template_sha256, params)`. Items are pre-generated by a background job so the learner never waits on G4 [P]; the PWA's 24-hour cache (contract 7.10) is filled from verified items only.

## 7. QA gates in detail

### G1 Static lint rules

Each rule has an id, a test and a severity (E = blocks sync, W = warning shown in CI). Reference tooling: the schema (G0) is implemented in `reference/validate_templates.py`; the rules below that need only the loaded template are partly exercised by `tests/test_templates.py`; the remainder is specified here and is an implementation task (section 10, task T3).

| Id | Rule | Sev |
|---|---|---|
| L01 | File validates against the schema; filename equals `key` plus `.yaml` | E |
| L02 | `skill_key` exists in `skills` (sync) and `task_kind` is allowed for the grader (for example `perceptual_drill` only with `multiple_choice` or `exact_numeric`) | E |
| L03 | `version` is greater than the synced version when the canonical hash changed and the old status was not `draft` | E |
| L04 | Every expression parses in the safe grammar and every name resolves | E |
| L05 | Every constraint is true for at least 1 of 20 sampled draws (not vacuous or impossible) | E |
| L06 | No unused parameter or derived value (a parameter that never reaches stem, answer or hints) | W |
| L07 | Every placeholder and filter resolves in stem, alt text, hints, steps and options | E |
| L08 | `render.stem_md` at most 1200 characters; `alt_text` present and not equal to the stem | E |
| L09 | Every `eng`/`tex` placeholder has a resolvable unit | E |
| L10 | `license` is in the allowed set; `source` is not a pointer to non-commercial material; `llm_assistance.used = true` implies the named `prompt_version` file exists in `content/prompts/` | E |
| L11 | `exact_numeric`: `tolerance.rel` at most 0.05 and at least one of `rel`, `abs` set; each `wrong_answer_expr` differs from the answer by more than `3 x tolerance` on 20 samples | E |
| L12 | Hints: `l1` and `l2` contain no placeholder that resolves to a generator output or to a number of the final answer; `l3` may show intermediate values but not outputs named in the answer spec | E |
| L13 | `multiple_choice`: exactly one correct option per draw; every possibly-wrong option has `misconception_tag` and `feedback_md`; `n_shown` at most the option count | E |
| L14 | Misconception tags used in options or tests are declared in `misconceptions[]` | E |
| L15 | `code_tests`: header, starter and reference compile with the declared flags; at least 3 hidden tests, 2 golden vectors, 2 mutants; starter does not already pass | E |
| L16 | `spice_compare`: skeleton and reference netlist pass the linter in doc 08; skeleton does not already satisfy the checks | E |
| L17 | Figures reference a known `svg_template` name; no external URLs in any text field | E |
| L18 | KaTeX renders every math span of a sample item with `throwOnError: true` | E |
| L19 | Banned-claims scan (contract section 8): no phrase from the list (neuroplasticity window, critical period, targeted memory replay, sleep cueing, neurostimulation, 2 sigma, 85% rule, 90-minute cycle, top 1%, mastery of all disciplines) in any text field | E |
| L20 | `delivery.phone_suitable = true` implies `phone` in contexts and `est_seconds` at most 180 | E |
| L21 | `difficulty_prior` is within 0.2 of the median prior of the other synced templates for the same skill, unless `provenance.review.notes` explains why | W |
| L22 | At least 2 verifiers when `ready`; at least one is not `bounds` or `pint_dimension` | E |
| L23 | Verifier expression text differs from the generator's (section 5.1) | E |
| L24 | `fuzz.samples` at least 200 | E |
| L25 | No `TODO`, `FIXME`, `lorem`, `XXX` text in any field | E |
| L26 | Reading level and jargon: advisory only (W) | W |

### G2 Fuzz run (200 samples)

Command: `python3 reference/verifiers/verify_template.py` (all templates) or `... --only tpl.elec.voltage-divider-vout`. For `fuzz.samples` seeds starting at `fuzz.seed_base`, it generates the item, runs every verifier, renders every text field (stem, alt text, hints, steps, options), grades the reference answer in several spellings, and grades every `wrong_answer_expr`. Pass criteria, all required:

1. 0 generator or render exceptions; 0 unresolved placeholders; no `nan` or `inf` in rendered text.
2. 0 verifier failures and 0 skipped verifiers.
3. 100 percent of reference spellings graded correct; 100 percent of misconception answers graded incorrect **and** tagged.
4. Rejection rate at most `fuzz.max_rejection_rate`.
5. Distinct parameter sets at least `fuzz.min_distinct_param_sets` (default: 50; code and small-grid templates state their own number; the debounce template has 10 grid points and says so).
6. Code templates: reference passes on the whole parameter grid, every mutant killed by at least one hidden test, differential run against the Python model matches on 20 random sequences per grid point.
7. Wall time recorded in the report; analytic templates average under 100 ms per item (the symbolic-derivative sample is the slowest at about 280 ms because of SymPy `simplify`; accepted, since items are pre-generated).

**Result recorded for the seven samples (31 Oct 2026, 200 samples each): all PASS.** See section 12 for the exact output.

### G3 Human spot-check checklist (template-level, by the founder)

The reviewer renders five items (the review tool shows seeds `fuzz.seed_base` to `+4` plus one worst-case draw per constraint) and signs off only if every box is true:

1. I solved two of the five items by hand and my answers match the key.
2. The statement is unambiguous: one question, units stated, nothing underspecified (for example "unloaded" appears where needed).
3. The numbers are plausible for real parts (resistor values, voltages, frequencies).
4. Every distractor corresponds to a specific, realistic mistake and its feedback names the mistake without giving the answer.
5. The tolerance would accept a learner who rounds sensibly and reject each listed misconception.
6. `hints.l1` and `l2` reveal no number of the final answer; `l3` performs only the first step.
7. The worked solution steps are correct and use the same sign and unit conventions as the statement.
8. The skill key and `difficulty_prior` fit the skill; the item tests the skill and not a prerequisite.
9. `alt_text` conveys the figure in words; the figure matches the statement.
10. Sources: the item is original or its licence permits commercial reuse (section 11); no copied wording.
11. For LLM-assisted templates: I read every LLM-written field (hints, explanations, distractors) and checked it against the rules above.
12. The degenerate-case table (section 4.2) was considered and each applicable case has a constraint.

Sign-off is recorded in the file as `provenance.review: {reviewer, date, template_sha256, checklist_version, notes}`. A later edit changes the hash and voids the review automatically. Sampling guidance for spot-checks of LLM-assisted templates: review all fields, not a sample, because templates are few and the unit of review is the template.

### G4 Instance verification

For every item the worker runs all `verifiers` that are item-level (everything except the code checks keyed on the parameter grid), the self-grade and render checks, and stores the report. Failure policy: retry generation with the next seed up to 3 times; if all fail, mark the template `needs_human_review`, write `item_verification_failed` events, and have the session builder pick another template for the skill. A template with 3 or more G4 failures in 24 hours is automatically pulled from serving.

### G5 Difficulty calibration from attempts [P]

- `difficulty_prior` is a float in (0, 1) (00a D3) and is the author's estimate that a learner who just finished the skill's worked example fails the item (0 trivial, 1 very hard). Converted for the Elo model as `elo_item = 1500 + 400 * log10(d / (1 - d))` with `d` clipped to [0.05, 0.95] (the scale is owned by doc 06, 00a D3).
- Per template (pooled over variants) the nightly job computes `p_obs` = fraction of correct **first attempts with `max_hint_level <= 1`**, only from attempts with `grade.status = graded`. Posterior difficulty: `d_est = (k * d_prior + n * (1 - p_obs)) / (k + n)` with `k = 20` pseudo-attempts [P]. Written to `items.difficulty_est` of future items of that template; per-item estimates are not used because each seed is shown rarely.
- With one learner (D1) data are thin: calibration below `n = 30` attempts per template only flags outliers (section G6) and does not update. Absolute difficulty cannot be calibrated with one person; only relative ordering of templates within a learner's history.
- Review trigger: after `n >= 30`, if `|d_est - d_prior| > 0.3` the template goes to the founder's review list with the observed rate.

### G6 Retirement rules [P thresholds, to be tuned with data]

| Trigger | Action |
|---|---|
| A report of category `answer_key_wrong` or `answer_marked_wrong` on an item | That item (seed) is quarantined (`items.status = needs_human_review`) at once; the reporting attempt is flagged `grade.disputed = true` and excluded from scheduling until triage. |
| Two reports from different users on the same template version in 30 days, or three on any items of one template version | Template version set to `needs_human_review` (founder only) until triaged. |
| Confirmed defect (triage outcome `confirmed_defect`) | Retire the template version (`retired`), fix, bump `version`, rerun G0 to G3; list affected attempts and emit `attempt_voided` events (doc 06 recomputes `skill_state` and FSRS for voided attempts). |
| Statistical anomaly, template: first-attempt success below 5 percent or above 98 percent after at least 30 attempts across at least 5 learner-days | Flag for review (not auto-retire). |
| Statistical anomaly, item: 0 correct of at least 5 attempts while the template success is above 60 percent | Quarantine the item. |
| Latency anomaly: median `latency_ms` above 5 times the template median over at least 5 attempts | Flag (probably ambiguous or too long). |
| Grader disagreement: `offline_grade_mismatch` events above 1 percent for a template | Flag (client and server graders differ). |
| Discrimination: point-biserial between item correctness and the learner's skill Elo below 0.05 after at least 100 attempts (beta only) | Flag. |

## 8. Item defect metrics and the learner report flow

### 8.1 Definitions and targets [P]

- **Confirmed item defect**: an item that was served with a wrong key, an ambiguous or unsolvable statement, or a display error that changes the meaning, confirmed by triage or by audit.
- **Defect rate** = confirmed defects served / items served, rolling 90 days.
- **Targets (MVP)**: at most 1 confirmed defect per 1000 items served; 0 confirmed key-wrong defects in templates marked `verified` (a key-wrong defect in a verified template is a pipeline bug, triaged as an incident with a new verifier or lint rule as the fix); reports triaged within 7 days; median time from confirmed defect to quarantine under 1 hour (automatic) and to fix under 7 days.
- **Audit**: each month the founder hand-solves 30 randomly served items. 0 defects in 300 audited items supports a defect rate below 1 percent at 95 percent confidence (rule of three), which is a weak bound; the audit is a smoke test, not a proof.
- Leading indicators logged as events and shown on the content dashboard: fuzz failures per sync, G4 rejection rate, reports per 1000 items by category, share of items in `needs_human_review`, `offline_grade_mismatch` rate.

### 8.2 Learner "report a problem" flow

> The category names below are superseded by the contract's `item_reports.reason` values (00a J1), and the FSRS exclusion in step 4 is done by a rebuild (00a J2).

1. Every item feedback screen and every tutor thread has a "Report a problem" control (keyboard accessible).
2. The form asks for a category: `answer_marked_wrong`, `answer_key_wrong`, `unclear_or_ambiguous`, `display_broken`, `unsafe_or_inappropriate`, `other`; optional text up to 500 characters. Nothing else is collected.
3. The client calls `POST /api/v1/items/{item_id}/report` (authoritative route of `schemas/api.openapi.yaml`; the first informal name is kept in `00c-route-rename-map.md`) with `item_id`, `attempt_id`, category, text. The server writes an `item_reports` row (`id`, `user_id`, `item_id`, `attempt_id`, `category`, `text`, `status`, `created_at`, `resolved_at`; ratified in 00a D5) and an `events` row `name = 'item_report_filed'` with `props = {item_id, attempt_id, template_key, template_version, category}`. The free text lives only in `item_reports`, not in the event.
4. Immediate effects: the item is quarantined for categories `answer_marked_wrong` and `answer_key_wrong`; the attempt gets `grade.disputed = true` and is excluded from FSRS and mastery until triage; the learner sees "Thanks. We'll check this item. This attempt won't count against you until we do."
5. Triage queue (the open `item_reports` rows, status `open`; there is no separate job kind, because `jobs.kind` values follow document 03; founder-facing page shows the stem, the key, the verification report, the learner's response and the grader detail). Outcomes: `confirmed_defect` (then G6 actions), `learner_error` (explanation shown to the learner, `disputed` cleared, attempt counts), `ambiguous` (treated as confirmed defect: rewrite), `not_a_defect`. Each outcome writes `item_report_resolved`.
6. Metrics (SQL over `events`): reports per 1000 items served; share confirmed; median triage time.

## 9. LLM assistance policy

| Use | Allowed | Conditions |
|---|---|---|
| Draft a whole template (parameters, constraints, stem, solution steps) | yes | Goes through all gates and G3 like human text; `provenance.llm_assistance` lists roles, model, prompt version. |
| Write or polish hints, explanations, worked-solution wording | yes | Reviewed at G3 (checklist item 11); L12 enforces no answer leakage at levels 1 and 2. |
| Propose distractors and misconception tags | yes | Each distractor needs a human-confirmed tag and feedback; distractor values must be produced by `value_expr` (code), not typed by the model. |
| Propose `difficulty_prior` | yes | Advisory; G5 overrides with data. Literature supports LLM difficulty priors only as a starting estimate [S, report "Learner modeling"]. |
| Second opinion on a template (find errors) | yes | Advisory only: any disagreement sets `needs_human_review`; agreement never promotes anything. |
| Sole verifier of any item or template | **never** | Contract 7.8. Not even for explanatory text; text correctness is G3. |
| Final answer key for numeric, symbolic, code or netlist items | **never** | Keys come from the generator and are confirmed by an independent computation. |
| Grading numeric or code correctness | **never** | Doc 08. |

Prompt versioning: every drafting prompt lives in `content/prompts/<name>_vN.md` with front matter (`id`, `status`, `changelog`). A prompt file is immutable once used: change means a new `vN+1`. A template records `prompt_version` (regex `^[a-z0-9_]+_v[0-9]+$`) and CI fails if the file is missing. The two prompts owned by doc 08 are `tutor_v1` and `rubric_grader_v1`; the sample templates cite a drafting prompt id `template_assist_v1` (to be created by the content owner when first used; L10 will block a template that names a prompt file that does not exist). No learner data is ever placed in a drafting prompt.

## 10. `content:sync`

`npm run content:sync [-- --dry-run] [-- --only <key>]` (TypeScript script in the Next.js repo; calls the worker for G2).

Algorithm (idempotent; safe to run repeatedly):

1. Load `content/skills/**/*.yaml`, `content/templates/**/*.yaml`, `content/projects/**/*.yaml` with the YAML 1.2 core schema (no timestamp coercion).
2. G0 and G1 for every template. Any error exits with code 1 and writes nothing (all-or-nothing per run).
3. Compute `sha256` (canonical body) per template; compare to `item_templates.body->'_sync'->>'sha256'`.
4. For each changed or new template: the sync run enqueues a `jobs` row `kind = 'content_postprocess'` (`payload = {sync_run_id}`, document 03 section 8.3); for each changed template the worker runs G2 (200 samples) and writes `result`. `--no-fuzz` is not allowed in CI.
5. Upsert `item_templates`: columns `key`, `skill_key`, `task_kind`, `grader_type`, `difficulty_prior`, `version`, `status`, `body` (the whole file minus the hoisted columns, plus `_sync = {sha256, git_commit, synced_at, fuzz_job_id}`). Status rule: `draft` for draft files; `retired` for retired; for `ready`: `verified` only if the fuzz job passed, `provenance.review.template_sha256` equals the computed hash, and `content/REVIEW-LOG.md` has a `done` row with 0 disagreements for that key (00a H4), else `needs_human_review`.
6. Never delete rows. A removed file marks the template `retired`. Old versions are kept as rows keyed `(key, version)` (data-model owner: see CCR-06); existing `items` keep pointing at the version they were generated from.
7. Print a summary table: created, updated, unchanged, retired, errors, and the list of templates awaiting human review.

Exit codes: 0 success; 1 validation error; 2 fuzz failure; 3 database error. `--dry-run` runs steps 1 to 4 without writing.

CI (GitHub Actions): job `content` runs `content:validate` (G0, G1), `pytest reference/verifiers/tests`, and the fuzz for templates changed in the PR; the PR cannot merge if a changed `ready` template fails.

### Implementation tasks (agent-ready)

| Task | Deliverable | Acceptance test |
|---|---|---|
| T1 | Port `safe_expr.py` and `tplkit.py` to the worker package `worker/content/` | `pytest` determinism and degenerate-case tests from `reference/verifiers/tests/test_voltage_divider.py` pass unchanged |
| T2 | Implement G0 in TypeScript (Ajv 2020) | all 7 samples valid; the 13 negative cases in `test_schema_rejects_bad_documents` all rejected |
| T3 | Implement lint rules L01 to L26 (Python or TS) | one failing fixture per rule, each reported with its id |
| T4 | Verifier registry in the worker with the 14 implemented kinds | `python3 reference/verifiers/verify_template.py` passes for all samples; deliberately broken generator in `test_engine_rejects_broken_template_expression` is rejected |
| T5 | `content_postprocess` (template verification) and `pregenerate_items` (item generation) job kinds writing `verification_report` | report validates against section 6 fields; a `skipped` verifier produces `needs_human_review` |
| T6 | `content:sync` per this section | idempotent second run reports "unchanged"; changed hash voids review; removed file retires |
| T7 | Report-a-problem endpoint, triage page, quarantine on report | integration test: report on `answer_key_wrong` quarantines the item and flags the attempt within 1 s |
| T8 | Nightly calibration and anomaly job | seeded fixture data trigger each G6 rule exactly once |
| T9 | Review tool that renders five items and writes `provenance.review` | edit after review changes the hash and the template falls back to `needs_human_review` |

## 11. Content licensing and provenance

Rules inherited from the contract (section 11): original content, or content licensed for commercial reuse only. MIT OpenCourseWare (CC BY-NC-SA) is never copied. **OpenStax textbooks are CC BY-NC-SA (library-wide as of 31 Oct 2026; per-title exceptions unverified, 00e [V]). They are not usable in the commercial product: link out only, never copy or adapt text, figures or problems (G10).** PhET: only simulations published **before 29 March 2026** are CC BY 4.0 (attribution and logo kept); check the date in the simulation's About dialog before any reuse, and treat later releases as not reusable [V per report and 00e, PhET licensing page].

| Field | Rule |
|---|---|
| `license` | One of `original`, `CC0-1.0`, `CC-BY-4.0`, `MIT`, `licensed-commercial`. The schema rejects anything else, so a CC BY-NC-SA source cannot be recorded as a template licence. |
| `source` | `original`, or a citation of the idea source (textbook chapter, standard). Problem statements are written fresh; a citation is for attribution of a concept or dataset, not a copied stem. If the licence requires attribution (CC BY), the attribution text is added to `provenance` notes and to the app's credits page, generated from synced templates. |
| `provenance.authors`, `created` | Who wrote it and when. |
| `provenance.llm_assistance` | `used`, `roles`, `model`, `prompt_version` (section 9). |
| `provenance.review` | Reviewer, date, hash, checklist version (G3). |

Process rules: (1) the founder or an LLM may be inspired by a textbook problem type, but must change structure and numbers so that the item is not a copy; (2) any third-party figure or dataset needs its licence recorded and a text alternative; (3) CI emits `content/LICENSES.generated.md` listing every licence and attribution, used for the credits page; (4) OpenStax or other CC material may be used only after the title's licence has been verified and recorded in the repo (open question for the founder, contract section 12); until then no OpenStax text is used; (5) examples of what is safe: parameterised electrical formulas and original numbers; what is not: lecture notes, problem sets or figures copied from MIT OCW.

## 12. Validation and test results (31 Oct 2026, this environment)

| Command (run from `/home/claude/polymath-app-spec`) | Outcome |
|---|---|
| `python3 reference/validate_templates.py` | 7/7 templates valid |
| `python3 reference/verifiers/verify_template.py` (200 samples each) | PASS for all 7 templates; rejection rates: divider 0.53, complex 0.02, derivative 0.06, series-parallel 0.68, debounce 0.00, RC 0.17, fault drill 0.40 |
| `cd reference/verifiers && python3 -m pytest tests -q` | 119 passed, 6 skipped (the skips are the numeric-hint-leak test applied to the six templates whose answers are not real numbers, by design) |
| `python3 reference/verifiers/voltage_divider_demo.py 1 2 3` | three verified reports |

Environment facts: Python 3.13 for the first run; the grader and verifier tests also passed on Python 3.12.6 on 2 Nov 2026 (92 passed, 33 skipped, Windows). Original run: SymPy 1.14.0, pint 0.26.2, numpy 2.5.3, jsonschema 4.26.0, gcc 13.3, ngspice 42. Not verified: behaviour with other ngspice versions (the `.meas ... WHEN` and `.save` syntax was checked only on 42), KiCad (not installed), the TypeScript ports, macOS or Windows.

## 13. Assumptions and unverified items

1. SPICE-based grading, measurement feature extraction and diagram handling are **[P]**: no retrieved source evaluates them. The sample proves the pipeline is implementable, not that it is pedagogically effective.
2. The thresholds in G5 and G6 (k = 20 pseudo-attempts, 5 percent / 98 percent success anomalies, 0.05 point-biserial, 3 failures per 24 hours) are starting values [P] to be tuned with beta data. With one learner they will mostly flag, not decide.
3. The defect-rate target of 1 per 1000 is a proposal, not a benchmark from the literature.
4. `ts-fsrs` and other third-party licences were not examined here (not in scope).
5. The Node implementation of the safe expression grammar must match Python exactly; the cross-check is the shared fixture file in T1/T2 (expression, names, expected value or error). Not yet written.
6. The static lint rules L03, L05, L06, L08, L10 to L12, L14 to L26 are specified but not implemented in the reference code; G0, the fuzz gate and all verifier kinds listed as implemented are tested.
7. The drafting prompt `template_assist_v1` (cited by two sample templates) is provided in `content/prompts/template_assist_v1.md`. The samples' `llm_assistance` blocks are illustrative of the format: the hints and tags in them were written in this authoring session, not by a recorded run of that prompt.

## 14. Resolved by 00a (v1.1)

Every request filed by documents 07 and 08 was decided in `00a-change-decisions.md`. The numbering CCR-01 to CCR-11 is kept for traceability. No contract name or enum was renamed.

| # | Outcome | Where it landed |
|---|---|---|
| CCR-01 (`grade` keys and `status`) | Accepted | 00a D2: `attempts.grade` gains `status` (`graded`, `invalid_input`, `pending_review`, `error`) and the extra keys; `score` and `correct` are null unless `status = graded`; `attempts.grade_status` mirrors it (`graded` and `invalid_input` store `graded`, `pending_review` stores `pending`, `error` stores `error`); the scheduler ignores any attempt whose status is not `graded` (00a B4) |
| CCR-02 (`policy_flags` keys) | Accepted | 00a D2: keys follow doc 08 section 8.2 |
| CCR-03 (`unaided`) | Accepted | 00a B1: `max_hint_level <= 1` and not revealed; checkpoints expose no hint UI; evaluation uses strict-unaided (view `v_attempts_strict_unaided`) |
| CCR-04 (`jobs.kind` names) | Rejected as written | 00a section C: `jobs.status` and `jobs.kind` follow document 03 (`grade_attempt`, `pregenerate_items`, `verify_evidence`, `content_postprocess`, and so on). The names `generate_item`, `verify_template`, `grade`, `human_review`, `triage_item_report`, `nightly_calibration` are not job kinds: template verification runs under `content_postprocess`, human review is a queue over `attempts.grade_status = pending`, and triage is a queue over `item_reports`. The nightly calibration is a scheduled task whose registration is an open item in 00b |
| CCR-05 (`mastery_eligible`) | Accepted | 00a B4: `item_templates.mastery_eligible` (default true, false for uncalibrated `rubric_llm`) and `grade.mastery_eligible` |
| CCR-06 (one row per `(key, version)`) | Accepted | 00a section C; `items.template_version` |
| CCR-07 (server-only answer keys) | Accepted | 00a section C (`item_secrets`) and arch CCR-2; offline packs may carry numeric and multiple-choice keys only, and offline attempts count toward mastery only after server verification (arch CCR-8) |
| CCR-08 (error reports) | Superseded | 00a D5: learner error reports are `item_reports` rows plus an `events` row |
| CCR-09 (`difficulty_prior`) | Accepted, modified | 00a D3: float in the open interval (0,1); `schemas/problem-template.schema.json` now uses exclusive bounds |
| CCR-10 (Elo conversion) | Accepted | 00a D3: `1500 + 400*log10(d/(1-d))`, owned by 06 |
| CCR-11 (`authoring_status`) | Accepted | 00a D4: files declare only `draft`, `ready` or `retired`; only the pipeline sets `verified` |

