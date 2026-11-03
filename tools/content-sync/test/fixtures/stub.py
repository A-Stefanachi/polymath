"""Prints the Supabase stub of reference/db_tests.py as JSON {roles: [statement], rest: sql}.

Roles are cluster-wide and already exist on a shared server, so the test harness creates them only
when missing; `rest` (auth and storage schemas and helpers) is per database. Same split as
tools/db/diff_reference.py."""

import importlib
import json
import sys
from pathlib import Path

reference = Path(__file__).resolve().parents[4] / "polymath-app-spec" / "reference"
sys.path.insert(0, str(reference))
STUB = importlib.import_module("db_tests").STUB

statements = [s.strip() + ";" for s in STUB.split(";") if s.strip()]
roles = [s for s in statements if s.lower().startswith("create role")]
rest = [s for s in statements if not s.lower().startswith("create role")]
json.dump({"roles": roles, "rest": "\n".join(rest) + "\n"}, sys.stdout)
