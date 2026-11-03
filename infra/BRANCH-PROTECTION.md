# Branch protection for `main` (BL-0003, BL-0195)

`main` only changes through a reviewed pull request whose CI is green (polymath-app-spec/CLAUDE.md
sections 8 and 10: squash merge, no force push, no merge with red CI). Settings in GitHub, under
Settings → Branches → Branch protection rules (or a ruleset) for `main`:

| Setting | Value |
|---|---|
| Require a pull request before merging | on, 1 approval; dismiss stale approvals on new commits |
| Require status checks to pass | on; require branches to be up to date |
| Required checks (from `.github/workflows/ci.yml`) | `typescript (lint, typecheck, vitest)`, `secrets (gitleaks tree and history, negative control)`, `python (ruff, pytest)`, `package-checks`, `database (migrations, reference diff, SQL tests)`, `python-vs-ts parity` |
| Block force pushes | on |
| Restrict deletions | on |
| Allow merge methods | squash only |

A required check's name is the job's `name:`; renaming a job in `ci.yml` needs the same change
here and in GitHub, or every pull request waits for a check that never reports.

`package-checks` (BL-0195) runs every specification validator through
`tools/ci/spec-validators.sh`: `check_package.py`, `validate_backlog.py`, `validate_graph.py`,
the lean, safety, spine, project, template and skill-spec validators, `lint_claims.py`, the
scheduler reference vectors and the verifier tests. It runs on every push, not only on changes
under the specification folders, because a required check that a path filter skips never
reports.

## How to check it works

1. Push a branch with a deliberately failing test (for example `expect(1).toBe(2)` in any
   `*.test.ts`) and open a pull request.
2. The `typescript` check is red and the merge button says required checks have not passed.
3. Close the pull request and delete the branch.

The same works for `package-checks`: a reference to a missing section (for example "doc 03
section 42.7" added to a document) fails `check_package.py` with the file and line, and a task
that depends on a later-milestone task fails `validate_backlog.py`.
