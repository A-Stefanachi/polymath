#!/usr/bin/env python3
"""Validate backlog/backlog.yaml against the specification package.

Usage: python3 reference/validate_backlog.py [--quiet]
Exit code 0 when there are no errors. Prints totals per milestone and the critical path.

Checks: unique ids; dependencies exist; no cycles; no dependency on a later milestone;
FR-/US-/NFR- ids exist in docs/01-PRD.md; document numbers (and section numbers) exist;
tables exist in schemas/schema.sql; operationIds exist in schemas/api.openapi.yaml;
every task has acceptance tests; estimates in range; other ids (ST-, T-PRJ-, ADR-, etc.)
occur in the package; R-nn ids occur in docs/14-risk-register.md.

Lean slice (docs/00d-lean-slice-plan.md): every task carries `lean` (bool) and `lean_phase` (L0..L3 when lean,
D1..D9 when deferred); lean tasks may depend only on lean tasks and never on a later lean phase; the script
prints lean totals per phase and the founder-attention model (low/central/high, meta.founder_attention_model)
for the lean slice and the full plan, with weeks at 8 and 5 h/week.
"""
import re
import sys
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
MS = ["M0", "M1", "M2", "M3", "M4", "M5"]
WEEKLY_H = 8.0  # explicit unvalidated assumption [P]
LEAN_PHASES = ["L0", "L1", "L2", "L3"]
SCN = ["low", "central", "high"]


def read(p):
    return Path(p).read_text(encoding="utf-8", errors="replace")


def main():
    quiet = "--quiet" in sys.argv
    errors, warnings = [], []
    doc = yaml.safe_load(read(ROOT / "backlog" / "backlog.yaml"))
    tasks = doc["tasks"]
    epic_ids = {e["id"] for e in doc["epics"]}

    prd = read(ROOT / "docs" / "01-PRD.md")
    prd_ids = set(re.findall(r"\b(?:FR|US|NFR)-\d+\b", prd))
    fr_must = set()
    for m in re.finditer(r"\*\*(FR-\d+) [^*]*\((Must)", prd):
        fr_must.add(m.group(1))

    docs = {}
    for p in sorted((ROOT / "docs").glob("*.md")):
        mm = re.match(r"(\d{2}[a-f]?)-", p.name)
        if mm:
            docs[mm.group(1)] = read(p)

    schema_sql = read(ROOT / "schemas" / "schema.sql")
    tables = {m.group(1) for m in re.finditer(r"create table (?:if not exists )?(?:[a-z_]+\.)?([a-z_]+)", schema_sql, re.I)}
    api = read(ROOT / "schemas" / "api.openapi.yaml")
    ops = set(re.findall(r"operationId:\s*(\S+)", api))

    corpus = ""
    for p in ROOT.rglob("*"):
        if p.is_file() and p.suffix in {".md", ".yaml", ".yml", ".sql", ".json", ".py"}:
            rel = p.relative_to(ROOT).as_posix()
            if rel.startswith("backlog/") or rel in ("docs/13-roadmap-and-backlog.md", "reference/validate_backlog.py"):
                continue
            corpus += read(p) + "\n"
    risk_doc = read(ROOT / "docs" / "14-risk-register.md") if (ROOT / "docs" / "14-risk-register.md").exists() else ""

    ids = [t["id"] for t in tasks]
    if len(ids) != len(set(ids)):
        errors.append("duplicate task ids: " + ", ".join(i for i in set(ids) if ids.count(i) > 1))
    by_id = {t["id"]: t for t in tasks}
    for i, t in enumerate(tasks, 1):
        if not re.fullmatch(r"BL-\d{4}", t["id"]):
            errors.append(f"{t['id']}: bad id format")
    if tasks and tasks[0]["id"] != "BL-0001":
        errors.append("ids must start at BL-0001")

    ms_idx = {m: i for i, m in enumerate(MS)}
    refs_seen = defaultdict(set)
    for t in tasks:
        tid = t["id"]
        for k in ("title", "milestone", "epic", "description", "owner", "estimate_h", "acceptance_tests", "dependencies", "references"):
            if k not in t:
                errors.append(f"{tid}: missing field {k}")
        lp, ln = t.get("lean_phase"), t.get("lean")
        if not isinstance(ln, bool):
            errors.append(f"{tid}: field lean must be true or false")
        elif ln and lp not in LEAN_PHASES:
            errors.append(f"{tid}: lean task needs lean_phase in {LEAN_PHASES}, got {lp}")
        elif not ln and not (isinstance(lp, str) and re.fullmatch(r"D[1-9]", lp)):
            errors.append(f"{tid}: deferred task needs lean_phase D1..D9, got {lp}")
        if t.get("milestone") not in ms_idx:
            errors.append(f"{tid}: bad milestone {t.get('milestone')}")
        if t.get("epic") not in epic_ids:
            errors.append(f"{tid}: unknown epic {t.get('epic')}")
        if t.get("owner") not in ("agent", "founder"):
            errors.append(f"{tid}: owner must be agent or founder")
        if not t.get("acceptance_tests"):
            errors.append(f"{tid}: no acceptance tests")
        h = t.get("estimate_h", 0)
        if not isinstance(h, (int, float)) or h <= 0:
            errors.append(f"{tid}: bad estimate")
        elif t.get("owner") == "agent" and not (0.5 <= h <= 8):
            errors.append(f"{tid}: agent estimate {h} outside 0.5-8")
        if t.get("owner") == "founder" and h > 20:
            warnings.append(f"{tid}: founder task over 20 h, consider splitting")
        for d in t.get("dependencies", []):
            if d not in by_id:
                errors.append(f"{tid}: dependency {d} does not exist")
            elif ms_idx.get(by_id[d]["milestone"], 0) > ms_idx.get(t.get("milestone"), 0):
                errors.append(f"{tid} ({t['milestone']}) depends on later milestone task {d} ({by_id[d]['milestone']})")
            if d == tid:
                errors.append(f"{tid}: depends on itself")
        r = t.get("references", {})
        for req in r.get("requirements", []):
            refs_seen["req"].add(req)
            if req not in prd_ids:
                errors.append(f"{tid}: requirement {req} not in docs/01-PRD.md")
        for dref in r.get("documents", []):
            m = re.fullmatch(r"(\d{2}[a-f]?)(?:§(\S+))?", dref)
            if not m:
                errors.append(f"{tid}: malformed document ref {dref}")
                continue
            num, sec = m.groups()
            if num not in docs:
                errors.append(f"{tid}: document {num} does not exist")
                continue
            if sec and not re.search(rf"^#{{2,4}} {re.escape(sec)}[. ]", docs[num], re.M):
                errors.append(f"{tid}: section {sec} not found in document {num}")
        for tb in r.get("tables", []):
            if tb not in tables:
                errors.append(f"{tid}: table {tb} not in schemas/schema.sql")
        for op in r.get("operations", []):
            refs_seen["op"].add(op)
            if op not in ops:
                errors.append(f"{tid}: operationId {op} not in schemas/api.openapi.yaml")
        for o in r.get("other_ids", []):
            if re.fullmatch(r"R-\d+", o):
                if o not in risk_doc:
                    errors.append(f"{tid}: risk id {o} not in docs/14-risk-register.md")
            elif o not in corpus:
                errors.append(f"{tid}: other id '{o}' does not occur anywhere in the package")

    # cycles + critical path (longest path by estimate)
    state, order = {}, []
    def visit(n, stack):
        if state.get(n) == 2:
            return
        if state.get(n) == 1:
            errors.append("dependency cycle: " + " -> ".join(stack + [n]))
            return
        state[n] = 1
        for d in by_id[n].get("dependencies", []):
            if d in by_id:
                visit(d, stack + [n])
        state[n] = 2
        order.append(n)
    for n in ids:
        visit(n, [])
    best, prev = {}, {}
    for n in order:
        deps = [d for d in by_id[n].get("dependencies", []) if d in best]
        b = max(deps, key=lambda d: best[d], default=None)
        best[n] = by_id[n]["estimate_h"] + (best[b] if b else 0)
        prev[n] = b
    end = max(best, key=best.get) if best else None
    path = []
    while end:
        path.append(end)
        end = prev[end]
    path.reverse()

    # coverage
    all_fr = {i for i in prd_ids if i.startswith("FR-")}
    uncovered = sorted(all_fr - refs_seen["req"])
    uncovered_must = sorted(set(uncovered) & fr_must)
    all_ops = ops
    uncovered_ops = sorted(all_ops - refs_seen["op"])
    if uncovered_must:
        errors.append("Must-have FRs with no task: " + ", ".join(uncovered_must))
    if uncovered:
        warnings.append("FRs with no task: " + ", ".join(uncovered))
    if uncovered_ops:
        warnings.append("operationIds with no task: " + ", ".join(uncovered_ops))


    # ---- lean slice checks and founder-attention model ----
    meta = doc.get("meta", {})
    lean_ids = {t["id"] for t in tasks if t.get("lean") is True}
    rank = {p: i for i, p in enumerate(LEAN_PHASES)}
    for t in tasks:
        if t.get("lean") is not True:
            continue
        for d in t.get("dependencies", []):
            if d in by_id and d not in lean_ids:
                errors.append(f"{t['id']}: lean task depends on non-lean task {d}")
            elif d in by_id and rank.get(by_id[d].get("lean_phase"), 9) > rank.get(t.get("lean_phase"), 0):
                errors.append(f"{t['id']} ({t['lean_phase']}) depends on later lean phase task {d} ({by_id[d]['lean_phase']})")
    ls = meta.get("lean_slice", {})
    fdu = ls.get("first_daily_use_task")
    if fdu and (fdu not in lean_ids):
        errors.append(f"meta.lean_slice.first_daily_use_task {fdu} is not a lean task")
    model = meta.get("founder_attention_model")
    if not model:
        errors.append("meta.founder_attention_model missing")

    def fh(t, scn):
        """Modelled founder-attention hours for one task under scenario low/central/high [P]."""
        if t["owner"] == "agent":
            a = model["agent"]
            return a["fixed_h"][scn] + a["variable_fraction"][scn] * t["estimate_h"]
        for g in model["founder_groups"].values():
            if t["id"] in g.get("tasks", []):
                return g["multiplier"][scn] * t["estimate_h"]
        return model["founder_groups"]["other"]["multiplier"][scn] * t["estimate_h"]

    split = {int(k): v for k, v in meta.get("weekly_split_h", {}).items()}

    # totals
    tot = defaultdict(lambda: [0, 0.0, 0.0, 0.0])
    for t in tasks:
        row = tot[t["milestone"]]
        row[0] += 1
        row[1] += t["estimate_h"]
        row[2 if t["owner"] == "agent" else 3] += t["estimate_h"]
    print(f"{'MS':<4}{'tasks':>6}{'hours':>9}{'agent_h':>9}{'founder_h':>10}{'cum_h':>8}{'cum_weeks@8h':>14}")
    cum = 0.0
    gt = [0, 0.0, 0.0, 0.0]
    for m in MS:
        row = tot[m]
        cum += row[1]
        print(f"{m:<4}{row[0]:>6}{row[1]:>9.1f}{row[2]:>9.1f}{row[3]:>10.1f}{cum:>8.1f}{cum / WEEKLY_H:>14.1f}")
        for i in range(4):
            gt[i] += row[i]
    print(f"{'ALL':<4}{gt[0]:>6}{gt[1]:>9.1f}{gt[2]:>9.1f}{gt[3]:>10.1f}")
    tier_h = defaultdict(float)
    tier_n = defaultdict(int)
    for t in tasks:
        tier_h[t.get("cut_tier", 1)] += t["estimate_h"]
        tier_n[t.get("cut_tier", 1)] += 1
    print("cut tiers (1 = core, 2 = important, 3 = stretch, cut first): " + "; ".join(
        f"tier {k}: {tier_n[k]} tasks {tier_h[k]:.0f} h ({tier_h[k] / WEEKLY_H:.0f} weeks@8h)" for k in sorted(tier_h)))
    cp_h = sum(by_id[n]["estimate_h"] for n in path)
    print(f"critical path (longest dependency chain by estimate): {len(path)} tasks, {cp_h:.1f} h")
    print("  " + " > ".join(path))
    # ---- lean report ----
    def lean_sum(sel):
        ts = [t for t in tasks if sel(t)]
        return len(ts), sum(t["estimate_h"] for t in ts), {c: sum(fh(t, c) for t in ts) for c in SCN}
    print()
    print("LEAN SLICE (tasks with lean: true) - hours are founder-attention hours from the model in meta.founder_attention_model [P]")
    print(f"{'phase':<6}{'tasks':>6}{'est_h':>8}{'low':>8}{'central':>9}{'high':>8}")
    cum = {c: 0.0 for c in SCN}
    cum_est = 0.0
    for ph in LEAN_PHASES:
        n_, e_, m_ = lean_sum(lambda t, ph=ph: t.get("lean") is True and t.get("lean_phase") == ph)
        for c in SCN:
            cum[c] += m_[c]
        cum_est += e_
        print(f"{ph:<6}{n_:>6}{e_:>8.1f}{m_['low']:>8.1f}{m_['central']:>9.1f}{m_['high']:>8.1f}")
        if ph == "L2":
            print(f"  -> through L2 (first daily use): est {cum_est:.1f} h; model low/central/high {cum['low']:.0f}/{cum['central']:.0f}/{cum['high']:.0f} h")
    n_, e_, m_ = lean_sum(lambda t: t.get("lean") is True)
    print(f"LEAN TOTAL: {n_} tasks, estimate {e_:.1f} h, founder hours low/central/high = {m_['low']:.0f}/{m_['central']:.0f}/{m_['high']:.0f}")
    print(f"  weeks at 8 h/week, all hours on building (raw estimate / 8): {e_ / 8:.0f}")
    for hpw, label in ((8, "8 h/week"), (5, "5 h/week")):
        sp = split.get(hpw)
        if not sp:
            errors.append(f"meta.weekly_split_h missing {hpw}")
            continue
        wk = {c: m_[c] / sp["build"] for c in SCN}
        print(f"  weeks at {label} with learning {sp['learning']} h + review {sp['review']} h reserved (build {sp['build']} h/week): "
              f"low {wk['low']:.0f} / central {wk['central']:.0f} / high {wk['high']:.0f}")
    opt = set(ls.get("optional_tasks", []))
    for o in opt:
        if o not in lean_ids:
            errors.append(f"meta.lean_slice.optional_tasks: {o} is not a lean task")
    no_, eo_, mo_ = lean_sum(lambda t: t.get("lean") is True and t["id"] not in opt)
    print(f"LEAN CORE (without the {len(opt)} optional tasks {', '.join(sorted(opt))}): {no_} tasks, estimate {eo_:.1f} h, "
          f"founder hours low/central/high = {mo_['low']:.0f}/{mo_['central']:.0f}/{mo_['high']:.0f}")
    lo, hi = ls.get("target_founder_hours", [100, 200])
    if not (lo <= mo_["central"] <= hi):
        warnings.append(f"lean core central founder hours {mo_['central']:.0f} outside the target range {lo}-{hi}")
    n2, e2, m2 = lean_sum(lambda t: True)
    print(f"FULL PLAN: {n2} tasks, estimate {e2:.1f} h, founder hours low/central/high = {m2['low']:.0f}/{m2['central']:.0f}/{m2['high']:.0f}")
    for hpw in (8, 5):
        sp = split.get(hpw)
        if sp:
            print(f"  weeks at {hpw} h/week with learning reserved (build {sp['build']} h/week): "
                  f"low {m2['low'] / sp['build']:.0f} / central {m2['central'] / sp['build']:.0f} / high {m2['high'] / sp['build']:.0f}")
    dn, de, dm = lean_sum(lambda t: t.get("lean") is not True)
    print(f"DEFERRED: {dn} tasks, estimate {de:.1f} h, founder hours low/central/high = {dm['low']:.0f}/{dm['central']:.0f}/{dm['high']:.0f}")
    for g in sorted(ls.get("deferred_groups", {})):
        gn, ge, gm = lean_sum(lambda t, g=g: t.get("lean_phase") == g)
        print(f"  {g}: {gn:>3} tasks, est {ge:>6.1f} h, central {gm['central']:>6.1f} h  {ls['deferred_groups'][g]}")
    print("NOTE: all estimates are unvalidated proposals [P]; weeks assume %.0f h/week and one person working serially." % WEEKLY_H)
    if not quiet:
        for w in warnings:
            print("WARNING:", w)
    for e in errors:
        print("ERROR:", e)
    print(f"RESULT: {'PASS' if not errors else 'FAIL'} ({len(errors)} errors, {len(warnings)} warnings)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
