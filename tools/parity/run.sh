#!/usr/bin/env bash
# Python-vs-TypeScript parity for exact_numeric (BL-0019, doc 08 section 4.1): runs the reference grader
# (polymath-app-spec/reference/verifiers/numeric_grader.py) and packages/grading-core on the same cases,
# the numeric and complex vectors plus tools/parity/extra-cases.json, and diffs the JSON grades.
# Needs node 24 and Python 3.12 with tools/ci/requirements-spec.txt (pint). Set PYTHON to a ready
# interpreter (CI does); otherwise uv provides one.
set -euo pipefail
cd "$(dirname "$0")/../.."
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

if [ -n "${PYTHON:-}" ]; then
  py=("$PYTHON")
else
  py=(uv run --python 3.12 --no-project --with-requirements tools/ci/requirements-spec.txt python)
fi

"${py[@]}" -B tools/parity/grade_py.py >"$out/py.json"
node tools/parity/grade_ts.mts>"$out/ts.json"
"${py[@]}" -B tools/parity/compare.py "$out/py.json" "$out/ts.json"
