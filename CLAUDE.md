# CLAUDE.md - Polymath repository root

This repository holds the Polymath specification and the app built from it. The rules for agents are in the specification's CLAUDE.md, imported below. Read it fully before every task. This file only says where things live, because the specification and the app sit at different roots.

@polymath-app-spec/CLAUDE.md

## Where things live (this overrides the layout in section 3 of the imported file)

The specification package is in `polymath-app-spec/`. The app code is at the repository root. Every path the specification writes as `docs/`, `content/`, `schemas/`, `reference/` or `backlog/` means the folder under `polymath-app-spec/`. Every path it writes as `apps/`, `services/`, `packages/`, `supabase/`, `prompts/`, `infra/` or `tools/` means the folder at the repository root.

| Specification says | Path in this repository | Kind |
|---|---|---|
| `docs/` | `polymath-app-spec/docs/` | specification (amend only through 00a) |
| `content/` | `polymath-app-spec/content/` | skills, edges, templates, projects (YAML, source of truth) |
| `schemas/` | `polymath-app-spec/schemas/` | `api.openapi.yaml`, `schema.sql` reference baseline, JSON Schemas |
| `reference/` | `polymath-app-spec/reference/` | reference implementations, validators, test vectors (oracles) |
| `backlog/backlog.yaml` | `polymath-app-spec/backlog/backlog.yaml` | the task list |
| `apps/`, `services/`, `packages/` | `apps/`, `services/`, `packages/` | app code |
| `supabase/`, `prompts/`, `infra/` | `supabase/`, `prompts/`, `infra/` | app code and config |
| `tools/` | `tools/` | the app's CLIs (`polymath-app-spec/tools/content_sync.py` is only a reference sketch) |

Consequences for the build:

- App code that reads content or schemas uses these paths from the repository root: `polymath-app-spec/content/`, `polymath-app-spec/schemas/api.openapi.yaml` and `polymath-app-spec/schemas/schema.sql`. Keep each in one config constant; never copy the files.
- `pnpm db:diff-reference` compares the migrated database with `polymath-app-spec/schemas/schema.sql`.
- Never edit files under `polymath-app-spec/reference/` to make code pass (rule 2.10 of the imported file).
- Branches, pull requests and the `BL-xxxx` commit convention apply to the whole repository.

## Commands from the repository root

On Windows use `py -3` in place of `python3` in every command. The validators resolve their own paths, so they run from the root:

- `py -3 -B polymath-app-spec/reference/check_package.py`, the package cross-reference check
- `py -3 -B polymath-app-spec/reference/validate_graph.py`, and the other `validate_*.py` scripts in the same folder
- `py -3 -B polymath-app-spec/reference/scheduler_reference.py check polymath-app-spec/reference/scheduler_test_vectors.json`
- `cd polymath-app-spec/reference/verifiers && py -3 -m pytest tests -q`

Run them after any change under `polymath-app-spec/`.
