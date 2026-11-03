#!/usr/bin/env python3
"""Validate every sample template against schemas/problem-template.schema.json.

Usage: python3 reference/validate_templates.py [template.yaml ...]
Exit code 0 when every file validates, 1 otherwise.
"""
import json
import sys
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "schemas" / "problem-template.schema.json"
DEFAULT_DIRS = (
    ROOT / "content" / "sample-problem-templates",
    ROOT / "content" / "templates",
)


class NoDateLoader(yaml.SafeLoader):
    """SafeLoader that keeps ISO dates as strings (YAML 1.2 core-schema behaviour)."""


NoDateLoader.yaml_implicit_resolvers = {
    k: [(tag, rx) for tag, rx in v if tag != "tag:yaml.org,2002:timestamp"]
    for k, v in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=NoDateLoader)


def validate(paths):
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    failures = 0
    for p in paths:
        doc = load_yaml(p)
        errors = sorted(validator.iter_errors(doc), key=lambda e: list(e.absolute_path))
        if errors:
            failures += 1
            print(f"FAIL {Path(p).name}")
            for e in errors[:15]:
                loc = "/".join(str(x) for x in e.absolute_path) or "(root)"
                print(f"   at {loc}: {e.message[:200]}")
        else:
            print(f"ok   {Path(p).name}")
    print(f"{len(paths) - failures}/{len(paths)} templates valid")
    return failures


if __name__ == "__main__":
    if len(sys.argv) > 1:
        args = [Path(a) for a in sys.argv[1:]]
    else:
        args = []
        for d in DEFAULT_DIRS:
            if d.is_dir():
                args.extend(sorted(d.rglob("*.yaml")))
    args = sorted(set(args))
    sys.exit(1 if validate(args) else 0)
