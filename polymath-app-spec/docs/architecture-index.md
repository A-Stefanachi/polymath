# Architecture index (spec package)

Status: v1.0, 1 Nov 2026. **Navigation aid only** — binding behaviour remains in `00-contract.md`, `00a-change-decisions.md`, and the numbered specs below.

## System shape (read first)

| Topic | Document | Schemas / code |
|--------|-----------|----------------|
| Containers, flows, queue, cost, repo layout | [03-architecture.md](03-architecture.md) | — |
| ADRs (001–019+) | [03-architecture.md §14](03-architecture.md) | — |
| Tables, RLS, retention | [04-data-model.md](04-data-model.md) | [schemas/schema.sql](../schemas/schema.sql) |
| HTTP API | [03 §5–6](03-architecture.md), backlog `operations` | [schemas/api.openapi.yaml](../schemas/api.openapi.yaml) |
| Reader explainer (HTML) | [docs-site/architecture-explainer.html](../docs-site/architecture-explainer.html) | — |

## Cross-cutting concerns

| Concern | Document |
|---------|----------|
| Security, sandbox, privacy, ST- tests | [12-security-privacy-compliance.md](12-security-privacy-compliance.md) |
| Grading matrix, tutor, sandbox runners | [08-grading-and-tutor-spec.md](08-grading-and-tutor-spec.md) |
| Content pipeline G0–G4, sync | [07-content-pipeline-and-verification-spec.md](07-content-pipeline-and-verification-spec.md) |
| Scheduler, mastery, session builder | [06-learner-model-and-scheduler-spec.md](06-learner-model-and-scheduler-spec.md) |
| Projects, evidence, safety briefs | [10-build-projects-and-verification-spec.md](10-build-projects-and-verification-spec.md) |

## Curriculum and content (architecture of “what ships”)

| Artefact | Location |
|----------|----------|
| MVP skill graph | [content/mvp-skill-graph.yaml](../content/mvp-skill-graph.yaml) |
| Lean M1 slice (19 skills) | [content/lean-skill-slice.yaml](../content/lean-skill-slice.yaml) |
| Lean templates (30) | [content/templates/](../content/templates/), [lean-template-manifest.yaml](../content/lean-template-manifest.yaml) |
| Spine vs graph (planned skills) | [docs/spine-promotion-policy.md](spine-promotion-policy.md), [content/syllabi/spine-planned-skills.yaml](../content/syllabi/spine-planned-skills.yaml) |
| Project ladder | [content/project-ladder.yaml](../content/project-ladder.yaml) |
| Safety briefs | [content/safety/](../content/safety/) |

## Reference oracles (ports must match)

| Area | Path |
|------|------|
| Graph / projects / backlog | `reference/validate_*.py` |
| Template fuzz + graders | `reference/verifiers/` |
| Scheduler vectors | `reference/scheduler_test_vectors.json` |
| Package lint | `reference/check_package.py` |

## Planning (not deployment architecture)

Long-term tracks (L6–L13), hardware phases, and capability outcomes: docs **15–17**. They do not add v1 enums or tables until promoted via contract change.
