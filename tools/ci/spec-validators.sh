#!/usr/bin/env bash
# Runs every validator of the specification package (root CLAUDE.md "Commands from the repository root";
# polymath-app-spec/CLAUDE.md section 4). One script so the local gates and CI run the same list.
# validate_lean_pool.py is included: it passes now that the lean pool covers its 19 skills.
set -euo pipefail
cd "$(dirname "$0")/../.."
PY="${PYTHON:-python3}"
REF=polymath-app-spec/reference
fail=()
run() {
  local name="$1"; shift
  echo "::group::$name"
  if "$PY" -B "$@"; then echo "PASS $name"; else echo "FAIL $name"; fail+=("$name"); fi
  echo "::endgroup::"
}
run check_package "$REF/check_package.py"
run validate_backlog "$REF/validate_backlog.py"
run validate_graph "$REF/validate_graph.py"
run validate_lean_slice "$REF/validate_lean_slice.py"
run validate_lean_manifest "$REF/validate_lean_manifest.py"
run validate_lean_pool "$REF/validate_lean_pool.py"
run validate_safety_briefs "$REF/validate_safety_briefs.py"
run validate_spine_coherence "$REF/validate_spine_coherence.py"
run validate_projects "$REF/validate_projects.py"
run validate_templates "$REF/validate_templates.py"
run validate_skill_specs "$REF/validate_skill_specs.py"
run scheduler_vectors "$REF/scheduler_reference.py" check "$REF/scheduler_test_vectors.json"
echo "::group::verifier_tests"
if (cd "$REF/verifiers" && "$PY" -B -m pytest tests -q -p no:cacheprovider); then echo "PASS verifier_tests"; else echo "FAIL verifier_tests"; fail+=(verifier_tests); fi
echo "::endgroup::"
if ((${#fail[@]})); then echo "spec validators FAILED: ${fail[*]}"; exit 1; fi
echo "spec validators: all passed"
