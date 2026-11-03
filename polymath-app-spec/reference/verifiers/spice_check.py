"""Reference SPICE netlist linter and ngspice batch runner for spice_compare. See docs/08 section 4.

Design status: [P] proposal. No retrieved source evaluates SPICE-based grading; this prototype only shows the
pipeline is implementable. NOT a secure sandbox: the production worker must run ngspice inside the same
isolation as learner code (docs/08 section 3). Protection implemented here is by construction: learner text
is reduced to a whitelisted element subset and re-serialised; the deck never contains .control, .include,
.lib, .model, .subckt, shell, or any learner-written directive.
"""
from __future__ import annotations

import math
import os
import re
import sys
try:
    import resource
except ImportError:
    resource = None  # type: ignore[assignment]
import shutil
import subprocess
import tempfile
from pathlib import Path

import safe_expr as se

_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,15}$")
_NODE = re.compile(r"^[A-Za-z0-9_]{1,16}$")
_VALUE = re.compile(r"^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(meg|mil|[tgkmunpfa])?[a-zA-Z]*$", re.I)
_SCALE = {"t": 1e12, "g": 1e9, "meg": 1e6, "k": 1e3, "mil": 25.4e-6, "m": 1e-3, "u": 1e-6, "n": 1e-9, "p": 1e-12, "f": 1e-15, "a": 1e-18}
_DROPPED = {".ac", ".op", ".tran", ".dc", ".print", ".plot", ".probe", ".save", ".meas", ".measure", ".options", ".option", ".temp", ".title"}
_VALUE_RANGE = {"R": (1e-3, 1e9), "C": (1e-15, 1e-3), "L": (1e-12, 1e3)}
MAX_LINE = 200


def parse_value(tok: str) -> float:
    m = _VALUE.match(tok.strip())
    if not m:
        raise ValueError(f"cannot read value '{tok}'")
    num, suf = float(m.group(1)), (m.group(2) or "").lower()
    return num * _SCALE.get(suf, 1.0)


def lint_netlist(text: str, spec: dict) -> dict:
    """Returns {ok, errors, warnings, elements:{name:{type,nodes,value}}, deck_lines}. Never executes anything."""
    errors, warnings = [], []
    if len(text) > 20000 or "\x00" in text:
        return {"ok": False, "errors": ["netlist too large or contains NUL"], "warnings": [], "elements": {}, "deck_lines": []}
    try:
        text.encode("ascii")
    except UnicodeEncodeError:
        errors.append("netlist must be plain ASCII")
    raw_lines = text.replace("\r\n", "\n").split("\n")
    if len(raw_lines) > spec["submission"].get("max_lines", 100):
        errors.append("too many lines")
    # join continuation lines
    lines: list[str] = []
    for ln in raw_lines:
        if len(ln) > MAX_LINE:
            errors.append("line longer than 200 characters")
            continue
        if ln.lstrip().startswith("+") and lines:
            lines[-1] += " " + ln.lstrip()[1:]
        else:
            lines.append(ln)
    allowed = {e.upper() for e in spec["allowed_elements"]}
    elements: dict[str, dict] = {}
    for idx, ln in enumerate(lines):
        s = ln.split(";")[0].strip()
        if idx == 0 or not s or s.startswith("*"):
            continue  # first line is the SPICE title line; comments
        if s.startswith("."):
            d = s.split()[0].lower()
            if d == ".end":
                continue
            if d in _DROPPED:
                warnings.append(f"directive {d} ignored: the grader runs its own analysis")
                continue
            errors.append(f"directive {d} is not allowed")
            continue
        if re.search(r"[{}$\\]|\bparam\b", s, re.I):
            errors.append(f"line {idx + 1}: expressions and parameters are not allowed")
            continue
        toks = s.split()
        name = toks[0]
        if not _NAME.match(name):
            errors.append(f"line {idx + 1}: bad element name '{name[:20]}'")
            continue
        et = name[0].upper()
        if et not in allowed:
            errors.append(f"line {idx + 1}: element type {et} is not allowed here")
            continue
        if name.upper() in elements:
            errors.append(f"line {idx + 1}: duplicate element {name}")
            continue
        if et in "RCL":
            if len(toks) != 4:
                errors.append(f"line {idx + 1}: {et} elements need 'name node1 node2 value'")
                continue
            nodes, val_tok = toks[1:3], toks[3]
            try:
                val = parse_value(val_tok)
            except ValueError as e:
                errors.append(f"line {idx + 1}: {e}")
                continue
            lo, hi = _VALUE_RANGE[et]
            if not (lo <= val <= hi):
                errors.append(f"line {idx + 1}: value {val_tok} outside the allowed range")
                continue
        elif et == "V":
            if len(toks) < 4 or len(toks) > 6:
                errors.append(f"line {idx + 1}: V sources need 'name n+ n- AC <mag>' or 'DC <v>'")
                continue
            nodes = toks[1:3]
            kind = toks[3].upper()
            if kind not in ("AC", "DC"):
                errors.append(f"line {idx + 1}: only AC or DC sources are allowed")
                continue
            try:
                val = parse_value(toks[4]) if len(toks) > 4 else 0.0
            except ValueError as e:
                errors.append(f"line {idx + 1}: {e}")
                continue
        else:
            errors.append(f"line {idx + 1}: element type {et} is not supported by this reference linter")
            continue
        if not all(_NODE.match(n) for n in nodes):
            errors.append(f"line {idx + 1}: bad node name")
            continue
        elements[name.upper()] = {"type": et, "nodes": [n.lower() for n in nodes], "value": val, "raw": s}
    used = {n for e in elements.values() for n in e["nodes"]}
    for req in spec["required_nodes"]:
        if req.lower() not in used:
            errors.append(f"required node '{req}' is not used")
    if not elements:
        errors.append("no circuit elements found")
    deck_lines = [lines[0] if lines and not lines[0].lstrip().startswith(".") else "* submission"]
    deck_lines += [e["raw"] for e in elements.values()]
    return {"ok": not errors, "errors": errors, "warnings": warnings, "elements": elements, "deck_lines": deck_lines}


def _limits(cpu_s: int, mem_mb: int):
    def apply():
        if resource is not None:
            resource.setrlimit(resource.RLIMIT_CPU, (cpu_s, cpu_s))
            resource.setrlimit(resource.RLIMIT_AS, (mem_mb * 1024 * 1024 * 4, mem_mb * 1024 * 1024 * 4))
            resource.setrlimit(resource.RLIMIT_FSIZE, (5 * 1024 * 1024, 5 * 1024 * 1024))
        if hasattr(os, "setsid"):
            os.setsid()

    return apply


def run_ngspice(deck_lines: list[str], grader_directives: list[str], run_s: int = 10, mem_mb: int = 256) -> dict:
    """Run `ngspice -n -b` (no spinit, batch). Returns {ok, measures:{name:value}, log}."""
    work = Path(tempfile.mkdtemp(prefix="polymath_spice_"))
    try:
        deck = "\n".join(deck_lines + grader_directives + [".end"]) + "\n"
        (work / "deck.cir").write_text(deck)
        preexec = None if sys.platform == "win32" else _limits(run_s, mem_mb)
        env = {"HOME": str(work)} if sys.platform == "win32" else {"PATH": "/usr/bin:/bin", "HOME": str(work)}
        try:
            p = subprocess.run(["ngspice", "-n", "-b", "deck.cir"], cwd=work, capture_output=True, text=True, timeout=run_s,
                               env=env, preexec_fn=preexec)
        except subprocess.TimeoutExpired:
            return {"ok": False, "measures": {}, "log": "ngspice timed out"}
        except FileNotFoundError:
            return {"ok": False, "measures": {}, "log": "ngspice is not installed"}
        out = p.stdout + p.stderr
        measures = {}
        for m in re.finditer(r"^([a-z_][a-z0-9_]*)\s*=\s*([-+0-9.eE]+)", out, re.M | re.I):
            measures[m.group(1).lower()] = float(m.group(2))
        fatal = re.search(r"^(Error|fatal).*", out, re.M | re.I)
        return {"ok": p.returncode == 0 and not fatal, "measures": measures, "log": out[-3000:]}
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _within(x, ref, tol):
    return abs(x - ref) <= max(tol.get("abs", 0.0), tol.get("rel", 0.0) * abs(ref))


def grade_spice(netlist: str, answer: dict, ctx: dict, wrong: list[dict] | None = None) -> dict:
    lint = lint_netlist(netlist, answer)
    if not lint["ok"]:
        return {"score": 0.0, "correct": False,
                "graders": [{"type": "spice_compare", "score": 0.0, "detail": {"stage": "lint", "errors": lint["errors"]}}],
                "feedback": "Netlist problems: " + "; ".join(lint["errors"][:4]), "misconception_tags": []}
    ref_lint = lint_netlist(render(answer["reference_netlist"], ctx), answer)
    for fixed in answer.get("fixed_elements", []):
        a, b = lint["elements"].get(fixed.upper()), ref_lint["elements"].get(fixed.upper())
        if a is None:
            return _fail(f"Element {fixed} is missing.", {"stage": "fixed", "element": fixed})
        if b and (a["nodes"] != b["nodes"] or not _within(a["value"], b["value"], {"rel": 1e-3})):
            return _fail(f"Element {fixed} must not be changed.", {"stage": "fixed", "element": fixed})
    run = run_ngspice(lint["deck_lines"], answer["analysis"]["grader_directives"], answer["limits"]["run_s"], answer["limits"]["memory_mb"])
    if not run["ok"]:
        return _fail("The simulator could not run your circuit. Check that every node has a DC path to ground.", {"stage": "sim", "log": run["log"][-500:]})
    results, total = [], 0.0
    for c in answer["checks"]:
        exp = float(se.evaluate(c["expected"], ctx))
        key = {"ac_cutoff_hz": "fc_3db", "ac_gain_db_at": "gain_lf"}.get(c["kind"])
        got = run["measures"].get(key)
        ok = got is not None and _within(got, exp, c["tolerance"])
        results.append({"id": c["id"], "expected": exp, "measured": got, "passed": ok})
        total += c.get("weight", 1.0) * (1.0 if ok else 0.0)
    wsum = sum(c.get("weight", 1.0) for c in answer["checks"])
    score = total / wsum
    correct = all(r["passed"] for r in results)
    fb = "Correct." if correct else "; ".join(
        f"{r['id']}: measured {r['measured']:.4g}, target {r['expected']:.4g}" if r["measured"] is not None else f"{r['id']}: no measurement" for r in results if not r["passed"])
    return {"score": round(score, 6), "correct": correct,
            "graders": [{"type": "spice_compare", "score": score, "detail": {"stage": "compare", "checks": results, "warnings": lint["warnings"]}}],
            "feedback": fb, "misconception_tags": []}


def _fail(msg, detail):
    return {"score": 0.0, "correct": False, "graders": [{"type": "spice_compare", "score": 0.0, "detail": detail}], "feedback": msg, "misconception_tags": []}


def render(text: str, ctx: dict) -> str:
    import tplkit

    return tplkit.render_text(text, ctx, {})
