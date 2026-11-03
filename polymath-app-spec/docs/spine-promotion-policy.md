# Spine skill promotion policy

Status: v1.0, 1 Nov 2026. **Planning / content-as-code policy** — not a contract amendment. Binding graph rules remain in [05-skill-graph-and-curriculum-spec.md](05-skill-graph-and-curriculum-spec.md) and `00-contract.md`.

## Two registries

| Registry | File | Meaning |
|----------|------|---------|
| **MVP graph** | `content/mvp-skill-graph.yaml` | Skills the product can schedule, sync, and attach templates to. Keys here are real for validators and (when built) Postgres. |
| **Spine plan** | `content/syllabi/spine-module-plan.yaml` | Curriculum narrative for pillars T1–T6 (and foundation plan for T0). |
| **Planned-only** | `content/syllabi/spine-planned-skills.yaml` | Skills named in the spine syllabus but **not** yet in the MVP graph. |

`reference/validate_spine_coherence.py` enforces: every spine-planned skill is either in the graph **or** listed in `spine-planned-skills.yaml`, with no duplicates across registries.

## When to promote a planned skill into the graph

Promote when **all** of the following hold:

1. **Lean or MVP scope** — the skill is in an active milestone slice (lean slice, a project step, or an approved template wave), not merely mentioned in a pillar syllabus.
2. **Graph metadata complete** — `node`, `module`, `tier_target`, `est_minutes`, prerequisites, `task_kinds`, `grader_types`, `license`, `source` per doc 05.
3. **Edges acyclic** — run `python reference/validate_graph.py` after adding prerequisites and dependents.
4. **Content path** — at least one `authoring_status: ready` template (or an explicit stub with `status: stub` if the skill is a placeholder for scheduling only).
5. **No silent rename** — use `content/graph-migrations.yaml` if retiring a key (contract CCR-05-3); never rename in place.

## Promotion steps (checklist)

1. Add the skill dict to `mvp-skill-graph.yaml` (or flip `status` from `stub` to `draft` / `verified` per doc 05).
2. Remove the key from `spine-planned-skills.yaml` if it was listed there.
3. Regenerate pillar markdown if module outcomes changed: `python reference/generate_pillar_syllabi.py`.
4. Run `validate_graph.py`, `validate_spine_coherence.py`, `check_package.py`.

## When **not** to promote

- Pillar T1–T6 skills that exist only for **long-horizon planning** (doc 15–17) and have no template, project, or lean-slice dependency.
- Skills that would **inflate the lean slice** without a go/no-go decision (`00d`, BL-0181).

## Stubs vs planned

- **`status: stub` in the graph** — key exists for dependency wiring and sync visibility; minimal or no templates.
- **Planned registry only** — key appears in syllabi and spine plan but not in Postgres-bound graph yet; safest for large spine expansions.

**Curriculum registry (Nov 2026):** All **108** spine-plan skill refs are in `mvp-skill-graph.yaml` — **142** foundation skills (`draft`/`verified`) plus **107** attachment stubs (18 MVP + **89** T1–T6 spine). `spine-planned-skills.yaml` is empty until new keys appear only in the syllabus plan.

**Update, 2 Nov 2026 (00a H12):** 238 T1 to T6 skills are now `needs_human_review` at the founder's request; 7 stubs remain.

Promote a **stub → draft** when a wave needs templates (metadata per checklist above); do not bulk-promote stubs to `draft` without content.
