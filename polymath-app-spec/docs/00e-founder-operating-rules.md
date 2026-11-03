# Founder operating rules (dark factory)

Status: v1.0, 1 Nov 2026. **Process for the solo founder + agents** — complements `CLAUDE.md` (agent law) and `lean-build-gate.md` (automation scope). Not a contract change.

## Weekly rhythm (8 h/week default)

1. **Learning block first** — reserve the hours in `00d` section 6 before build hours (PA-9, R-22).
2. **One wave at a time** — follow `factory-wave-manifest.md`; do not start D1–D9 until BL-0181 is recorded in `CHANGELOG.md`.
3. **Green commands before merge** — re-run validators in README section 5 after any `content/`, `schemas/`, or `backlog/` edit.

## Content and curriculum

| Rule | Action |
|------|--------|
| G3 is human | After G2 fuzz passes, hand-solve five items per template; log in `content/REVIEW-LOG.md`. Do not mark hand-solve done without doing it. |
| No batch review | Lean templates: edit by hand → verify → `g3_review.py`, one template at a time. |
| Spine vs graph | Promote skills only per `spine-promotion-policy.md`. |
| Safety before bench | No `safety_gate` step is “real” until `content/safety/{project_key}.md` exists and matches `brief_version` `2026-10-31-1`. |

## Spec hygiene

- **Package lint:** `python reference/check_package.py` → 0 findings.
- **Architecture questions:** start at `architecture-index.md`.
- **Scope disputes:** `00a` wins; open a CCR in `00a` rather than patching around the contract.

## Go/no-go (BL-0181)

Four weeks after first daily use with the micro runner (when built), fill the scorecard in `00d` section 8 and append one entry to `CHANGELOG.md` before extending scope.

## What agents must not do without you

- Change FR/US/NFR ids, enums, or skill keys (rename/forbidden paths in doc 05).
- Mark REVIEW-LOG hand-solves as complete.
- Present [P] or [R] claims as product copy (claims policy, contract §8).
