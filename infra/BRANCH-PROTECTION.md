# Branch protection for `main` (BL-0003, BL-0195; 00a L1)

CI runs only on the founder's machine (00a L1, 4 Nov 2026). There is no GitHub Actions CI
workflow, so GitHub has no status checks to require. `main` changes only through a pull request
whose head commit passed `pnpm ci:local` (`tools/ci/local-ci.sh`), with the summary lines pasted
into the pull request (polymath-app-spec/CLAUDE.md sections 8 and 10: squash merge, no force push,
no merge without a passing local CI run).

Settings in GitHub, under Settings → Branches → Branch protection rules (or a ruleset) for `main`:

| Setting | Value |
|---|---|
| Require a pull request before merging | on; dismiss stale approvals on new commits |
| Require status checks to pass | **off**. The checks it used to require came from the deleted `ci.yml`; left on, every pull request waits for checks that never report |
| Block force pushes | on |
| Restrict deletions | on |
| Allow merge methods | squash only |

`.github/workflows/deploy-staging.yml` stays: it deploys `main` to staging after a merge and is
not a check.

## The local run

`pnpm ci:local` runs, in order, what the deleted `ci.yml` ran:

| Job | Steps |
|---|---|
| typescript | generated API and event types current, lint, boundaries, claims lint, typecheck, Vitest |
| secrets | gitleaks over the tree and the whole history, with a negative control |
| python | ruff check and format, pytest of each service |
| content | G2 fuzz of every template (CI fuzzed only the changed ones) |
| docker | worker image build; the image runs as non-root with ngspice |
| parity | Python and TypeScript `exact_numeric` graders agree |
| package-checks | every specification validator (`tools/ci/spec-validators.sh`), including `validate_lessons.py` |
| database | local Supabase, `db reset`, table count, `db:diff-reference`, pgTAP, RLS suite and mutation check, worker DB tests, DB types current, content-schema and content-sync against the database, `e2e:auth` |
| web-db | the apps/web integration tests with a database (beyond the old CI) |

`--only JOB` and `--skip JOB` pick jobs. A job that cannot run on a machine (for example no Docker
for `docker` and `database`) is a failed run, not a pass: say in the pull request which jobs did
not run and why, and do not merge until they have run somewhere.

## How to check it works

1. Add a deliberately failing test (for example `expect(1).toBe(2)` in any `*.test.ts`).
2. `pnpm ci:local --only typescript` prints `FAIL vitest` and `LOCAL CI FAILED`, and exits 1.
3. Remove the test.

The same works for `package-checks`: a reference to a missing section (for example "doc 03
section 42.7" added to a document) fails `check_package.py` with the file and line.
