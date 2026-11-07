# Content authoring runbook (templates, graph, projects)

Status: v1.0, 1 Nov 2026. Companion: `07-content-pipeline-and-verification-spec.md`. For **population order and counts**, see `content-population-roadmap.md`.

## Factory rules (non-negotiable)

1. **Never edit reference vectors** (`reference/*_vectors.json`, scheduler vectors, grader vectors) to make code pass—fix code or stop and ask (`CLAUDE.md` section 2.10).
2. **One backlog task per PR** when implementing the app; content PRs may bundle templates only if acceptance tests say so (BL-0065: 15 files).
3. **`authoring_status: ready`** in YAML; **`verified`** is set only by `content:sync` after G0–G2 and a valid G3 `provenance.review` block.
4. **G3 on every ready template**—no batch auto-approve. Log hand-solves in `content/REVIEW-LOG.md`.
5. **LLM:** use `content/prompts/template_assist_v1.md` for hints/misconceptions only unless drafting a full template; record `provenance.llm_assistance`. LLM never sets answer keys (doc 07 section 9).
6. **Lean build gate** until BL-0181: `docs/lean-build-gate.md`.

## Per-template workflow

| Step | Action | Command / artefact |
|------|--------|-------------------|
| 1 | Copy pattern from `content/sample-problem-templates/` into `content/templates/<node>/tpl.<node>.<slug>.yaml` | — |
| 2 | Generator + **independent** verifier (different method) | doc 07 section 5 |
| 3 | Optional LLM assist for text fields | `template_assist_v1` |
| 4 | Open PR | G0/G1 in CI |
| 5 | Fuzz | worker / CI G2 (200 seeds) |
| 6 | Founder G3 | five rendered items; checklist doc 07 G3; `provenance.review` with matching `template_sha256` |
| 7 | Hand-solve check | 5 items per template → `content/REVIEW-LOG.md` |
| 8 | Merge + sync | `pnpm content:sync` (app repo) |
| 9 | Runtime | G4 on each generated `items` row at serve prep |

## Skill graph and projects

- **Graph:** change `content/mvp-skill-graph.yaml` / skill files; `python3 reference/validate_graph.py`; module checklist doc 05 section 10 before `status: verified`.
- **Projects:** change `content/project-ladder.yaml`; `python3 reference/validate_projects.py`; golden build before promoting step thresholds (doc 10 section 12).
- **Sync:** skills, templates, and projects load together (doc 07 section 10).

## Lean slice template pool (BL-0065 / BL-0066)

| Step | Command |
|------|---------|
| G0 schema | `python reference/validate_templates.py` |
| G2 fuzz (200 seeds) | `cd reference/verifiers && python verify_template.py --samples 200` (all paths under `content/templates/`) |
| G3 hand-solve, one template at a time | `python reference/g3_review.py <template key>` |
| Pool readiness | `python reference/validate_lean_pool.py` |
| Manifest | `content/lean-template-manifest.yaml` |
| Hand-solve log | `content/REVIEW-LOG.md` |
| Dry-run sync (spec) | `python tools/content_sync.py --dry-run` |

## Concept primers (lessons, BL-0203; doc 07 section 15, 00a K6)

| Step | Action | Command / artefact |
|------|--------|-------------------|
| 1 | Start from the format example | `content/lessons/elec.dc.ohms-law.yaml` |
| 2 | LLM draft from the skill's description, its templates' steps and misconception tags (and `core_ideas` for T1 to T6 skills); record `provenance.llm_assistance` | `content/prompts/lesson_assist_v1.md` |
| 3 | Keep it short: at most 3 screens of 150 words, one misconception, 1 or 2 checks, recap of 60 words; reuse a template misconception tag | doc 05 section 5.6 for the emphasis by kind of skill |
| 4 | Validate and lint | `python3 reference/validate_lessons.py`; `python3 reference/lint_claims.py` |
| 5 | Set `authoring_status: ready`, open the PR, sync | `pnpm content:sync` (app repo) makes a version that waits for review |
| 6 | Founder review in the console (L-G3 checklist) and approve | `/admin/content`, lesson tab |

An edit to a verified lesson makes a new version that waits for review; learners keep the old one until it is approved.

**Visual first (00a M6).** The founder learns fastest from pictures, so draw the idea before explaining it in words:

- Every lesson has at least one figure (validator rule, LG1-VISUAL). Any circuit, symbol, graph, layout or step sequence that a screen or a check describes gets its own figure on that screen or check (checks may carry a figure, 00a M5).
- Draw circuits as schematics in the house style of the existing figures: box resistors, stroke 2, `currentColor`, sans-serif labels, about 300 to 340 units wide. Label every part with its name and value as the text uses them, and mark the unknown with "?".
- Figure text is at least 12 units (LG1-FIGTEXT); body labels 13. Use a second row instead of shrinking text.
- Write the `alt` text as the same picture in words (WCAG 1.1.1).
- Render each figure and look at it at phone width before committing; check that every value and connection matches the text.

**Step labels (00a K5).** A template with 4 or more steps needs a `label` on every step (lint L27): the step's goal as a short imperative, at most 60 characters ("Write KCL at node A"). Adding a label changes the hash, so the template needs G3 again.

## Phase -1 (parallel, no app)

Four weeks: Anki + generator sheets + spreadsheet (`00d` section 4). Same eight skill keys as the seed slice in `content-population-roadmap.md`. Does not replace G3 for production templates.

## After go/no-go (BL-0181)

1. Record decision in `docs/CHANGELOG.md` with scorecard metrics.
2. If **Go: extend**, pick **one** deferred group D1–D9 by logged pain (`00d` section 8)—not tutor and sandbox together unless pain order says so.
3. Expand templates per roadmap M2+; assessment pool doubles work for checkpoint skills (doc 07 section 2.2).

## Package hygiene

Before large content waves: `python3 reference/check_package.py`, `validate_backlog.py`, `validate_graph.py` exit 0.
