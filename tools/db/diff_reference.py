#!/usr/bin/env python3
"""pnpm db:diff-reference: the migrations produce the catalogue of schemas/schema.sql (BL-0008).

polymath-app-spec/schemas/schema.sql is the reference baseline (CLAUDE.md section 9): every
migration under supabase/migrations must be mirrored there in the same pull request. This check
builds two databases in a throwaway PostgreSQL 17 cluster, both on the Supabase stubs of
polymath-app-spec/reference/db_tests.py (roles, auth, storage):

  ref  <- schemas/schema.sql
  mig  <- every supabase/migrations/*.sql in file-name order

and compares `pg_dump --schema-only` of the public and app_private schemas, normalised (comments,
SET lines and pg_dump's per-run \\restrict keys removed). Exit 0 when identical, 1 with a unified
diff when not, 2 when the check could not run.

Needs the PostgreSQL 17 server binaries (initdb, pg_ctl, psql, pg_dump): PG_BINDIR, else
`pg_config --bindir`, else /usr/lib/postgresql/17/bin. Stdlib only.
"""

from __future__ import annotations

import difflib
import os
import pwd
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "polymath-app-spec" / "schemas" / "schema.sql"
MIGRATIONS = ROOT / "supabase" / "migrations"
PORT = "5545"

sys.path.insert(0, str(ROOT / "polymath-app-spec" / "reference"))
from db_tests import STUB  # the one definition of the Supabase stubs

ROLES = {
    "create role anon nologin;",
    "create role authenticated nologin;",
    "create role service_role nologin bypassrls;",
    "create role supabase_auth_admin nologin;",
}


def bindir() -> Path:
    if os.environ.get("PG_BINDIR"):
        return Path(os.environ["PG_BINDIR"])
    found = shutil.which("pg_config")
    if found:
        out = subprocess.run(
            [found, "--bindir"], capture_output=True, text=True, check=False
        )
        cand = Path(out.stdout.strip())
        if (cand / "initdb").exists():
            return cand
    return Path("/usr/lib/postgresql/17/bin")


def split_stub() -> tuple[str, str]:
    """Cluster-wide role statements, and the per-database rest of the stub."""
    statements = [s.strip() + ";" for s in STUB.split(";") if s.strip()]
    roles = [s for s in statements if s in ROLES]
    rest = [s for s in statements if s not in ROLES]
    if len(roles) != len(ROLES):
        raise SystemExit(
            "db:diff-reference: the stub in reference/db_tests.py changed shape"
        )
    # Function bodies contain ';' inside $$...$$ only in the stub's create function lines, which
    # have no inner ';', so the split above keeps each statement whole.
    return "\n".join(roles), "\n".join(rest)


def normalise(dump: str) -> list[str]:
    out = []
    for line in dump.splitlines():
        if line.startswith(
            ("--", "SET ", "SELECT pg_catalog.set_config", "\\restrict", "\\unrestrict")
        ):
            continue
        out.append(line.rstrip())
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()
    return text.splitlines()


def main() -> int:
    bins = bindir()
    if not (bins / "initdb").exists():
        print(
            f"db:diff-reference: no PostgreSQL 17 server binaries in {bins} (set PG_BINDIR)"
        )
        return 2
    migrations = sorted(MIGRATIONS.glob("*.sql"))
    if not migrations:
        print("db:diff-reference: no migrations in supabase/migrations")
        return 1
    work = Path(tempfile.mkdtemp(prefix="pm_diffref_"))
    runas: list[str] = []
    if os.geteuid() == 0:  # initdb refuses root; the containers run as root
        pw = pwd.getpwnam("postgres")
        os.chown(work, pw.pw_uid, pw.pw_gid)
        work.chmod(0o755)
        runas = ["runuser", "-u", "postgres", "--"]
    env = dict(os.environ, PATH=f"{bins}:{os.environ['PATH']}")
    data = work / "data"

    def run(cmd: list[str], **kw: object) -> subprocess.CompletedProcess[str]:
        return subprocess.run(runas + cmd, env=env, check=True, text=True, **kw)  # type: ignore[call-overload]

    psql = [
        "psql",
        "-h",
        str(work),
        "-p",
        PORT,
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-X",
    ]
    try:
        run(
            ["initdb", "-D", str(data), "-U", "postgres", "--auth=trust", "-E", "UTF8"],
            stdout=subprocess.DEVNULL,
        )
        run(
            [
                "pg_ctl",
                "-D",
                str(data),
                "-o",
                f"-p {PORT} -k {work} -c listen_addresses=''",
                "-l",
                str(work / "log"),
                "-w",
                "start",
            ],
            stdout=subprocess.DEVNULL,
        )
        roles, per_db = split_stub()
        files = {"roles.sql": roles, "stub.sql": per_db}
        for name, text in files.items():
            (work / name).write_text(text + "\n")
        shutil.copy(SCHEMA, work / "schema.sql")
        for i, m in enumerate(migrations):
            shutil.copy(m, work / f"mig_{i:04d}.sql")
        for f in work.glob("*.sql"):
            f.chmod(0o644)
        run(
            psql + ["-d", "postgres", "-f", str(work / "roles.sql")],
            stdout=subprocess.DEVNULL,
        )
        for db in ("ref", "mig"):
            run(
                psql + ["-d", "postgres", "-c", f"create database {db}"],
                stdout=subprocess.DEVNULL,
            )
            run(
                psql + ["-d", db, "-f", str(work / "stub.sql")],
                stdout=subprocess.DEVNULL,
            )
        run(
            psql + ["-d", "ref", "-f", str(work / "schema.sql")],
            stdout=subprocess.DEVNULL,
        )
        for i, m in enumerate(migrations):
            print(f"applying {m.relative_to(ROOT)}")
            run(
                psql + ["-d", "mig", "-f", str(work / f"mig_{i:04d}.sql")],
                stdout=subprocess.DEVNULL,
            )
        dumps = {}
        for db in ("ref", "mig"):
            out = run(
                [
                    "pg_dump",
                    "-h",
                    str(work),
                    "-p",
                    PORT,
                    "-U",
                    "postgres",
                    "--schema-only",
                    "-n",
                    "public",
                    "-n",
                    "app_private",
                    db,
                ],
                capture_output=True,
            )
            dumps[db] = normalise(out.stdout)
        diff = list(
            difflib.unified_diff(
                dumps["ref"],
                dumps["mig"],
                "schemas/schema.sql",
                "supabase/migrations",
                lineterm="",
            )
        )
        if diff:
            print("\n".join(diff))
            print(
                f"db:diff-reference: migrations differ from schemas/schema.sql ({len(diff)} diff lines)"
            )
            return 1
        print(
            f"db:diff-reference: {len(migrations)} migration(s) match schemas/schema.sql ({len(dumps['ref'])} catalogue lines)"
        )
        return 0
    except subprocess.CalledProcessError as exc:
        print(
            f"db:diff-reference: {' '.join(map(str, exc.cmd))} failed with exit {exc.returncode}"
        )
        log = work / "log"
        if log.exists():
            print(log.read_text()[-2000:])
        return 2
    finally:
        subprocess.run(
            runas + ["pg_ctl", "-D", str(data), "-m", "immediate", "stop"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
