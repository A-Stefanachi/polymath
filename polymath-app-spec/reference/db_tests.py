#!/usr/bin/env python3
"""Apply schemas/schema.sql to a throwaway PostgreSQL 17 cluster and run the behavioural tests.

Usage: python3 reference/db_tests.py [--keep] [--workdir DIR]

What it does
  1. pglast parse of schemas/schema.sql (if pglast is installed).
  2. initdb in a temporary directory (as the 'postgres' OS user when run as root), Unix socket only, port 5544.
  3. Supabase stubs (auth, storage, roles) + schema.sql with ON_ERROR_STOP.
  4. Loads content/mvp-skill-graph.yaml and content/project-ladder.yaml (needs PyYAML).
  5. Runs reference/db_tests_cases.py (RLS isolation, hidden columns, anon denial, learner writes, constraints,
     job queue incl. the nightly_maintenance kind, experiment stickiness, strict view, cascades).
Needs: PostgreSQL 17 server binaries (initdb, pg_ctl, psql), psycopg2, PyYAML. Exit code 1 on any failure.
"""
import argparse, json, os, pathlib, pwd, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = "5544"

STUB = """
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role supabase_auth_admin nologin;
create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'anon') $$;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
grant usage on schema auth, storage to anon, authenticated, service_role;
grant all on schema auth to supabase_auth_admin; grant all on auth.users to supabase_auth_admin;
"""

def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

def content_sql():
    import yaml
    g = yaml.safe_load(open(ROOT / "content/mvp-skill-graph.yaml"))
    out = []
    mods = {m["key"]: m for m in g["modules"]}
    for m in g["modules"]:
        out.append(f"insert into public.modules(key,node,module,title,order_index) values({q(m['key'])},{q(m['node'])},{q(m['module'])},{q(m['title'])},{m['order']});")
    extra = sorted({s["node"] + "." + s["module"] for s in g["skills"]} - set(mods))
    for i, k in enumerate(extra):
        n, m = k.split(".")
        out.append(f"insert into public.modules(key,node,module,title,order_index,is_stub) values({q(k)},{q(n)},{q(m)},{q(m)},{1000+i},true);")
    def arr(a, t):
        return "array[" + ",".join(q(x) for x in a) + f"]::public.{t}[]" if a else "'{}'"
    for s in g["skills"]:
        out.append("insert into public.skills(key,node,module,title,description,tier_target,est_minutes,license,source,status,task_kinds,grader_types,phone_suitable) values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);" % (
            q(s["key"]), q(s["node"]), q(s["module"]), q(s["title"]), q(s["description"]), q(s["tier_target"]), s["est_minutes"],
            q(s["license"]), q(s["source"]), q(s["status"]), arr(s["task_kinds"], "task_kind"), arr(s["grader_types"], "grader_type"),
            str(s["phone_suitable"]).lower()))
    for s in g["skills"]:
        for pr in s["prerequisites"]:
            out.append(f"insert into public.skill_edges(from_skill_key,to_skill_key,strength,min_tier) values({q(pr['skill'])},{q(s['key'])},{q(pr['strength'])},{q(pr.get('min_tier') or 'L0')});")
    pl = yaml.safe_load(open(ROOT / "content/project-ladder.yaml"))
    for p in pl["projects"]:
        spec = {k: p[k] for k in ["learning_goals", "prerequisite_skill_keys", "grants_tier", "time_split_min", "tools", "safety_notes", "expected_measurements", "failure_modes"] if k in p}
        out.append("insert into public.projects(key,title,ladder_level,tier_gate,est_hours,bom,status,license,source,spec) values(%s,%s,%s,%s,%s,'[]','draft',%s,%s,%s);" % (
            q(p["key"]), q(p["title"]), p["ladder_level"], q(p["tier_gate"]), p["est_hours"], q(p["license"]), q(p["source"]), q(json.dumps(spec))))
        for s in p["steps"]:
            ev = "array[" + ",".join(q(x if isinstance(x, str) else x.get("kind")) for x in s["evidence_required"]) + "]::public.evidence_kind[]" if s["evidence_required"] else "'{}'"
            sk = "array[" + ",".join(q(x) for x in s["skill_keys"]) + "]::text[]" if s["skill_keys"] else "'{}'"
            out.append("insert into public.project_steps(key,project_key,position,title,est_min,session_type,skill_keys,evidence_required) values(%s,%s,%s,%s,%s,%s,%s,%s);" % (
                q(s["key"]), q(p["key"]), s["position"], q(s["title"]), s["est_min"], q(s["session_type"]), sk, ev))
    return "\n".join(out)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true", help="keep the cluster directory")
    ap.add_argument("--workdir")
    a = ap.parse_args()
    # 1. pglast
    try:
        import pglast
        stmts = pglast.parse_sql((ROOT / "schemas/schema.sql").read_text())
        print(f"pglast: {len(stmts)} statements parsed")
    except ImportError:
        print("pglast not installed: parse step skipped")
    bindir = next((str(p) for p in sorted(pathlib.Path("/usr/lib/postgresql").glob("*/bin"), reverse=True)), None)
    if not bindir:
        sys.exit("PostgreSQL server binaries not found (apt-get install postgresql)")
    work = pathlib.Path(a.workdir or tempfile.mkdtemp(prefix="pmdb_"))
    work.mkdir(parents=True, exist_ok=True)
    data = work / "data"; sock = work
    runas = []
    if os.geteuid() == 0:
        pw = pwd.getpwnam("postgres")
        os.chown(work, pw.pw_uid, pw.pw_gid); os.chmod(work, 0o755)
        runas = ["runuser", "-u", "postgres", "--"]
    env = dict(os.environ, PATH=bindir + ":" + os.environ["PATH"])
    def run(cmd, **kw):
        return subprocess.run(runas + cmd, env=env, check=True, **kw)
    try:
        run(["initdb", "-D", str(data), "-U", "postgres", "--auth=trust", "-E", "UTF8"], stdout=subprocess.DEVNULL)
        run(["pg_ctl", "-D", str(data), "-o", f"-p {PORT} -k {sock} -c listen_addresses=''", "-l", str(work / "log"), "-w", "start"], stdout=subprocess.DEVNULL)
        psql = ["psql", "-h", str(sock), "-p", PORT, "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]
        run(["psql", "-h", str(sock), "-p", PORT, "-U", "postgres", "-c", "create database pm", "-q", "postgres"])
        (work / "stub.sql").write_text(STUB); (work / "content.sql").write_text(content_sql())
        for f in (work / "stub.sql", work / "content.sql"):
            os.chmod(f, 0o644)
        # the schema file is read as the postgres user; copy it next to the stub
        shutil.copy(ROOT / "schemas/schema.sql", work / "schema.sql"); os.chmod(work / "schema.sql", 0o644)
        for f in ("stub.sql", "schema.sql", "content.sql"):
            run(psql + ["-d", "pm", "-f", str(work / f)], stdout=subprocess.DEVNULL)
            print(f"applied {f}")
        dsn = f"host={sock} port={PORT} user=postgres dbname=pm"
        r = subprocess.run([sys.executable, str(ROOT / "reference/db_tests_cases.py")], env=dict(os.environ, PM_DSN=dsn))
        return r.returncode
    finally:
        subprocess.run(runas + ["pg_ctl", "-D", str(data), "-m", "immediate", "stop"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not a.keep:
            shutil.rmtree(work, ignore_errors=True)

if __name__ == "__main__":
    sys.exit(main())
