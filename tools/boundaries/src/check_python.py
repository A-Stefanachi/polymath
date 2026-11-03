"""Python part of the module boundary rules (doc 03 section 13.1), stdlib only.

- sandbox-no-worker-import: services/sandbox-runner imports nothing from services/worker
  (it shares no code and no environment with the worker).
- worker-no-learner-state-writes: services/worker never writes skill_state, review_log or
  sessions; learner state is written only by the TypeScript domain code (CLAUDE.md rule 2.8),
  the worker reports grades through the signed internal callback.

Usage: python3 check_python.py [--root DIR]. Prints one `file:line [rule] message` line per
violation and exits 1 when there is any.
"""

from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path

WORKER_MODULES = {"polymath_worker", "worker"}
LEARNER_STATE_WRITE = re.compile(
    r"\b(insert\s+into|update|delete\s+from|merge\s+into|truncate(\s+table)?)\s+"
    r"(only\s+)?(\"?public\"?\.)?\"?(skill_state|review_log|sessions)\"?\b",
    re.IGNORECASE,
)
SKIP_PARTS = {".venv", "__pycache__", "node_modules", ".pytest_cache"}


def _files(base: Path, suffixes: tuple[str, ...]) -> list[Path]:
    if not base.is_dir():
        return []
    return sorted(
        p
        for p in base.rglob("*")
        if p.is_file() and p.suffix in suffixes and not SKIP_PARTS.intersection(p.parts)
    )


def sandbox_imports(root: Path) -> list[str]:
    found: list[str] = []
    base = root / "services" / "sandbox-runner"
    for path in _files(base, (".py",)):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as exc:
            found.append(
                f"{path.relative_to(root)}:{exc.lineno} [parse-error] {exc.msg}"
            )
            continue
        for node in ast.walk(tree):
            names: list[str] = []
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                names = [node.module]
            for name in names:
                if name.split(".")[0] in WORKER_MODULES:
                    found.append(
                        f"{path.relative_to(root)}:{node.lineno} [sandbox-no-worker-import] "
                        f"services/sandbox-runner must not import {name}; it shares no code "
                        "with the worker (doc 03 section 13.1)."
                    )
    return found


def worker_writes(root: Path) -> list[str]:
    found: list[str] = []
    base = root / "services" / "worker"
    for path in _files(base, (".py", ".sql")):
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            match = LEARNER_STATE_WRITE.search(line)
            if match:
                found.append(
                    f"{path.relative_to(root)}:{lineno} [worker-no-learner-state-writes] "
                    f"the worker writes {match.group(5)}; report the grade through the signed "
                    "internal callback instead (CLAUDE.md rule 2.8)."
                )
    return found


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=".", help="repository root to check")
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()
    violations = sandbox_imports(root) + worker_writes(root)
    for line in violations:
        print(line)
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
