"""Prints {file name: template_sha256} as JSON for every *.yaml under the directories given as
arguments, using the reference oracle polymath-app-spec/reference/verifiers/tplkit.py.
Used by canonical.test.ts; also how python-sample-hashes.json was produced."""

import importlib
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[4] / "polymath-app-spec"
sys.path.insert(0, str(root / "reference" / "verifiers"))
tplkit = importlib.import_module("tplkit")

out = {}
for directory in sys.argv[1:]:
    for path in sorted(Path(directory).rglob("*.yaml")):
        out[path.name] = tplkit.template_sha256(tplkit.load_template(path))
json.dump(out, sys.stdout, indent=2)
