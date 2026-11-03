#!/usr/bin/env python3
"""Validate the Polymath skill graph.

Usage (from the repository root):
    python3 reference/validate_graph.py [content/mvp-skill-graph.yaml] [schemas/skill-node.schema.json]

Exit code 0 = no errors (warnings allowed). Exit code 1 = at least one error.
Dependencies: pip install jsonschema pyyaml --break-system-packages
"""
import json
import re
import sys
from collections import defaultdict, deque
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
KEY_RE = re.compile(r"^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$")
TIERS = ["L0", "L1", "L2", "L3"]
DETERMINISTIC = {"exact_numeric", "symbolic_equivalence", "multiple_choice", "code_tests",
                 "spice_compare", "drc_erc", "measurement_check"}
MAX_DEPTH_WARN = 22       # longest hard-prerequisite chain, in skills
FAN_IN_WARN = 4           # hard prerequisites per skill
FAN_IN_ERROR = 7
MODULE_MIN_WARN = 60      # minutes
MODULE_MIN_MAX_WARN = 600

errors, warnings = [], []
def err(m): errors.append(m)
def warn(m): warnings.append(m)


def main():
    gpath = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "content" / "mvp-skill-graph.yaml"
    spath = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "schemas" / "skill-node.schema.json"
    graph = yaml.safe_load(gpath.read_text(encoding="utf-8"))
    schema = json.loads(spath.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)

    # 1. JSON Schema
    for e in sorted(Draft202012Validator(schema).iter_errors(graph), key=lambda e: list(e.absolute_path)):
        err("schema: /" + "/".join(map(str, e.absolute_path)) + ": " + e.message[:200])
    if errors:
        report(graph)
        return

    skills = graph["skills"]
    by_key = {}
    for s in skills:
        k = s["key"]
        if not KEY_RE.match(k):
            err(f"{k}: key does not match contract regex")
        if k in by_key:
            err(f"{k}: duplicate key")
        by_key[k] = s
        node, module, _ = k.split(".")
        if node != s["node"] or module != s["module"]:
            err(f"{k}: node/module fields disagree with key")
        if not s["description"].endswith("."):
            err(f"{k}: description must end with a full stop")
        if s["description"].count(". ") > 0:
            warn(f"{k}: description may contain more than one sentence")

    # modules
    mods = {m["key"]: m for m in graph["modules"]}
    orders = [m["order"] for m in graph["modules"]]
    if len(set(orders)) != len(orders):
        err("modules: duplicate order values")
    used_modules = {f'{s["node"]}.{s["module"]}' for s in skills if s["status"] != "stub"}
    for mk in used_modules:
        if mk not in mods:
            err(f"module {mk}: used by skills but not declared in modules")
    for mk in mods:
        if mk not in used_modules:
            err(f"module {mk}: declared but has no non-stub skills")

    # 2. edges
    adj = defaultdict(list)      # prereq -> dependents (all edges)
    hard_pre = defaultdict(list)
    all_pre = defaultdict(list)
    n_hard = n_soft = 0
    for s in skills:
        seen = set()
        for e in s["prerequisites"]:
            p = e["skill"]
            if p not in by_key:
                err(f'{s["key"]}: prerequisite {p} does not exist (orphan prerequisite)')
                continue
            if p == s["key"]:
                err(f'{s["key"]}: depends on itself')
            if p in seen:
                err(f'{s["key"]}: duplicate prerequisite {p}')
            seen.add(p)
            if TIERS.index(e["min_tier"]) > TIERS.index(by_key[p]["tier_target"]):
                err(f'{s["key"]}: min_tier {e["min_tier"]} on {p} exceeds that skill\'s tier_target {by_key[p]["tier_target"]}')
            if by_key[p]["status"] == "stub" and s["status"] != "stub":
                err(f'{s["key"]}: non-stub skill depends on stub {p}')
            adj[p].append(s["key"])
            all_pre[s["key"]].append(p)
            if e["strength"] == "hard":
                hard_pre[s["key"]].append(p)
                n_hard += 1
            else:
                n_soft += 1
        nh = len(hard_pre[s["key"]])
        if nh > FAN_IN_ERROR:
            err(f'{s["key"]}: {nh} hard prerequisites (limit {FAN_IN_ERROR})')
        elif nh > FAN_IN_WARN:
            warn(f'{s["key"]}: {nh} hard prerequisites (review threshold {FAN_IN_WARN})')

    # 3. cycles (Kahn) over all edges
    indeg = {k: len(all_pre[k]) for k in by_key}
    q = deque(k for k, d in indeg.items() if d == 0)
    topo = []
    while q:
        k = q.popleft()
        topo.append(k)
        for d in adj[k]:
            indeg[d] -= 1
            if indeg[d] == 0:
                q.append(d)
    if len(topo) != len(by_key):
        cyc = sorted(k for k, d in indeg.items() if d > 0)
        err(f"cycle detected; {len(cyc)} skills are on or downstream of a cycle, first 12: " + ", ".join(cyc[:12]))
        report(graph)
        return

    # 4. reachability from roots (skills with no prerequisites)
    roots = [k for k in by_key if not all_pre[k]]
    reach = set(roots)
    q = deque(roots)
    while q:
        k = q.popleft()
        for d in adj[k]:
            if d not in reach:
                reach.add(d)
                q.append(d)
    for k in by_key:
        if k not in reach:
            err(f"{k}: not reachable from any root")
    nonstub_roots = [k for k in roots if by_key[k]["status"] != "stub"]
    for k in roots:
        if by_key[k]["status"] == "stub":
            err(f"{k}: stub with no prerequisites (a stub must attach to the graph)")
    if len(nonstub_roots) > 8:
        warn(f"{len(nonstub_roots)} root skills (review threshold 8)")

    # 5. transitive-redundancy and depth
    depth = {}
    for k in topo:
        depth[k] = 1 + max((depth[p] for p in hard_pre[k]), default=0)
    longest_hard = max(depth.values())
    end = max(depth, key=depth.get)
    path = [end]
    while hard_pre[path[-1]]:
        path.append(max(hard_pre[path[-1]], key=lambda p: depth[p]))
    path.reverse()
    if longest_hard > MAX_DEPTH_WARN:
        warn(f"longest hard chain is {longest_hard} skills (review threshold {MAX_DEPTH_WARN})")

    anc = {}
    for k in topo:
        a = set()
        for p in hard_pre[k]:
            a |= anc[p] | {p}
        anc[k] = a
    for k in by_key:
        for p in hard_pre[k]:
            if any(p in anc[q] for q in hard_pre[k] if q != p):
                warn(f"{k}: hard edge from {p} is redundant (already implied through another hard prerequisite)")

    # 6. per-skill content checks
    for s in skills:
        k = s["key"]
        if s["status"] == "stub":
            continue
        tk, gt = set(s["task_kinds"]), set(s["grader_types"])
        if not {"worked_example", "retrieval"} <= tk:
            err(f"{k}: task_kinds must include worked_example and retrieval (contract learning loop)")
        if "faded_problem" not in tk and "problem" not in tk and "debug_case" not in tk and "perceptual_drill" not in tk and "project_step" not in tk and "explain_back" not in tk:
            warn(f"{k}: no practice task kind besides worked_example/retrieval")
        if not (gt & DETERMINISTIC):
            err(f"{k}: needs at least one deterministic grader (not only rubric_llm/human_review)")
        if "explain_back" in tk and "rubric_llm" not in gt and "human_review" not in gt:
            err(f"{k}: explain_back requires rubric_llm or human_review")
        if "project_step" in tk and not (gt & {"measurement_check", "human_review", "drc_erc"}):
            err(f"{k}: project_step requires measurement_check, human_review or drc_erc")
        if "code_tests" in gt and not any(x in tk for x in ("problem", "faded_problem", "debug_case")):
            err(f"{k}: code_tests grader without a code task kind")
        if s["phone_suitable"] and gt <= {"code_tests", "spice_compare", "measurement_check", "drc_erc"}:
            err(f"{k}: phone_suitable but no phone-gradable grader")
        if s["phone_suitable"] and ("project_step" in tk):
            err(f"{k}: phone_suitable skill cannot include project_step")
        if "spice_compare" in gt and s["phone_suitable"]:
            err(f"{k}: spice_compare skills cannot be phone_suitable")

    # 13. every edge (hard and soft, entry skill or not) must point to the same module or an earlier one.
    #     Exceptions are whitelisted explicitly in the YAML (`module_order_exceptions`, each with a reason).
    exc = {}
    for x in graph.get("module_order_exceptions", []):
        exc[(x["from"], x["to"])] = x["reason"]
        if x["from"] not in by_key or x["to"] not in by_key:
            err(f'module_order_exceptions: {x["from"]} -> {x["to"]} names a skill that does not exist')
    used_exc = set()
    n_back = 0
    for s in skills:
        sm = mods.get(f'{s["node"]}.{s["module"]}')
        if not sm:
            continue
        for e in s["prerequisites"]:
            p = by_key.get(e["skill"])
            if p is None:
                continue
            pm = mods.get(f'{p["node"]}.{p["module"]}')
            if pm and pm["order"] > sm["order"]:
                if (p["key"], s["key"]) in exc:
                    used_exc.add((p["key"], s["key"]))
                    n_back += 1
                else:
                    err(f'{s["key"]}: {e["strength"]} edge from {p["key"]} in later module {pm["key"]} (order {pm["order"]} > {sm["order"]}); '
                        f'fix the edge or whitelist it in module_order_exceptions with a reason')
    for pair in exc:
        if pair not in used_exc:
            err(f"module_order_exceptions: {pair[0]} -> {pair[1]} is not a backward edge (stale whitelist entry)")
    graph["_n_back_whitelisted"] = n_back

    # 14. confusable sets: at least 2 members, all in one module (interleaving is within a module), tags are explicit
    sets = defaultdict(list)
    for s in skills:
        if s.get("confusable_set"):
            sets[s["confusable_set"]].append(s)
    for name, members in sets.items():
        if len(members) < 2:
            err(f"confusable_set {name}: only one member ({members[0]['key']})")
        mset = {f'{m["node"]}.{m["module"]}' for m in members}
        if len(mset) > 1:
            err(f"confusable_set {name}: members span several modules {sorted(mset)}; interleaving is within one module")
        if any(m["status"] == "stub" for m in members):
            err(f"confusable_set {name}: stubs cannot be members")
    graph["_confusable"] = {n: len(m) for n, m in sets.items()}
    if len(sets) < 8:
        warn(f"only {len(sets)} confusable sets (00a G9 asks for at least 8)")

    # 15b. est_minutes above 40 is allowed (schema maximum 60) but is a split candidate (docs/05 section 2, rule 3)
    for s in skills:
        if s["status"] != "stub" and s["est_minutes"] > 40:
            warn(f'{s["key"]}: est_minutes {s["est_minutes"]} exceeds 40; candidate to split at the next minor graph version')

    # 7. minute totals
    mod_min = defaultdict(int)
    mod_n = defaultdict(int)
    for s in skills:
        if s["status"] != "stub":
            mk = f'{s["node"]}.{s["module"]}'
            mod_min[mk] += s["est_minutes"]
            mod_n[mk] += 1
    for mk, t in mod_min.items():
        if t < MODULE_MIN_WARN:
            warn(f"module {mk}: only {t} minutes in total")
        if t > MODULE_MIN_MAX_WARN:
            warn(f"module {mk}: {t} minutes in total, consider splitting")

    report(graph, by_key, mod_min, mod_n, n_hard, n_soft, roots, longest_hard, path)


def report(graph, by_key=None, mod_min=None, mod_n=None, n_hard=0, n_soft=0, roots=None, longest=0, path=None):
    print("== Polymath skill graph validation ==")
    if by_key is not None:
        real = [s for s in by_key.values() if s["status"] != "stub"]
        stubs = [s for s in by_key.values() if s["status"] == "stub"]
        total_min = sum(s["est_minutes"] for s in real)
        print(f"skills: {len(real)} real + {len(stubs)} stubs; edges: {n_hard + n_soft} ({n_hard} hard, {n_soft} soft)")
        print(f"roots: {len(roots)}; longest hard chain: {longest} skills")
        print("  " + " -> ".join(path))
        by_node = defaultdict(int)
        for s in real:
            by_node[s["node"]] += 1
        print("skills per node: " + ", ".join(f"{k}={v}" for k, v in sorted(by_node.items())))
        print("stubs per node: " + ", ".join(f"{k}={v}" for k, v in sorted(
            {n: sum(1 for s in stubs if s["node"] == n) for n in {s["node"] for s in stubs}}.items())))
        print("module (order): skills, est minutes, est core hours")
        for m in sorted(graph["modules"], key=lambda m: m["order"]):
            mk = m["key"]
            print(f"  {m['order']:>2} {mk:<11} {mod_n[mk]:>3} skills {mod_min[mk]:>5} min {mod_min[mk]/60:>5.1f} h")
        print(f"total est_minutes: {total_min} = {total_min/60:.1f} h core learning time (planning multiplier 2.5x = {total_min*2.5/60:.0f} h, unvalidated)")
        node_min = defaultdict(int)
        for s in real:
            node_min[s["node"]] += s["est_minutes"]
        print("core hours per node: " + ", ".join(f"{k}={v/60:.1f}" for k, v in sorted(node_min.items())))
        leaves = sorted(k for k in by_key if by_key[k]["status"] != "stub" and not any(
            k == e["skill"] for s in by_key.values() for e in s["prerequisites"]))
        print(f"real skills with no dependents (terminal): {len(leaves)}")
        cs = graph.get("_confusable", {})
        print(f"confusable sets: {len(cs)} covering {sum(cs.values())} skills; module-order exceptions whitelisted: {graph.get('_n_back_whitelisted', 0)}")
        print(f"mean est_minutes per skill: {total_min/len(real):.1f} (builder reference: 28.5 min = 15.5 focus chunk + 10 practice problem + 3 for two retrievals)")
    for w in warnings:
        print("WARNING:", w)
    for e in errors:
        print("ERROR:", e)
    print(f"RESULT: {'FAIL' if errors else 'PASS'} ({len(errors)} errors, {len(warnings)} warnings)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
