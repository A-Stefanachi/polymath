"""Reference code_tests runner for C. FOR LOCAL DEMONSTRATION ONLY.

!!! THIS IS NOT A SECURE SANDBOX !!!
It compiles and runs untrusted C with gcc and subprocess, using a timeout and POSIX rlimits (CPU time,
address space, file size, process count). It does NOT use namespaces, seccomp, a read-only root, network
isolation or a separate user. Learner code can read files the worker user can read, can open sockets, and
could read /proc to learn the result nonce. Never run learner code with this module in production. The
production sandbox requirements are in docs/08 section 3 (gVisor/Firecracker-class isolation, no network,
read-only filesystem, seccomp allowlist).

What it does demonstrate: harness design (trusted harness + learner translation unit), hidden tests, expected
outputs from an independent model, per-case isolation, nonce-framed results, output caps, compile-error
reporting, and mutation testing of the test suite.
"""
from __future__ import annotations

import os
import re
import secrets
import sys
try:
    import resource
except ImportError:  # Windows reference runs only; production sandbox is Linux-only (doc 08).
    resource = None  # type: ignore[assignment]
import shutil
import subprocess
import tempfile
from pathlib import Path

DEFAULT_HARNESS = r'''
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "debounce.h"
/* argv[1] = nonce. stdin line 1: "<n> <initial>". stdin line 2: sequence of '0'/'1'.
   stdout: "<nonce> <stable level after each sample>" */
int main(int argc, char **argv)
{
    static char seq[8192];
    static char out[8192];
    unsigned n = 0, initial = 0;
    debounce_t d;
    size_t len, i;
    if (argc != 2) return 2;
    if (scanf("%u %u", &n, &initial) != 2) return 3;
    if (scanf("%8000s", seq) != 1) return 3;
    len = strlen(seq);
    debounce_init(&d, (uint8_t)initial);
    for (i = 0; i < len; i++) {
        out[i] = (char)('0' + (debounce_update(&d, (uint8_t)(seq[i] == '1'), (uint8_t)n) ? 1 : 0));
    }
    out[len] = 0;
    printf("%s %s\n", argv[1], out);
    return 0;
}
'''

FORBIDDEN_TOKENS = re.compile(r"\b(asm|__asm__|__asm|system|popen|fork|execv?[lpe]*|dlopen)\b")


def _limits(cpu_s: int, mem_mb: int, out_kb: int):
    def apply():
        if resource is not None:
            resource.setrlimit(resource.RLIMIT_CPU, (cpu_s, cpu_s))
            resource.setrlimit(resource.RLIMIT_AS, (mem_mb * 1024 * 1024, mem_mb * 1024 * 1024))
            resource.setrlimit(resource.RLIMIT_FSIZE, (out_kb * 1024, out_kb * 1024))
            # RLIMIT_NPROC is per user and not reliable for a worker running as root: process limits need cgroups.
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        if hasattr(os, "setsid"):
            os.setsid()

    return apply


def static_check(source: str, forbid_includes: list[str]) -> list[str]:
    errs = []
    for m in re.finditer(r'^\s*#\s*include\s*[<"]([^>"]+)[>"]', source, re.M):
        inc = m.group(1)
        if inc == "debounce.h" or any(inc == f or (f.endswith("/") and inc.startswith(f)) for f in forbid_includes):
            if inc != "debounce.h":
                errs.append(f"#include <{inc}> is not allowed in this exercise")
    if FORBIDDEN_TOKENS.search(source):
        errs.append("use of asm/system/fork/exec/dlopen is not allowed")
    return errs


class Compiled:
    def __init__(self, workdir: Path, binary: Path | None, ok: bool, diagnostics: str):
        self.workdir, self.binary, self.ok, self.diagnostics = workdir, binary, ok, diagnostics

    def cleanup(self):
        shutil.rmtree(self.workdir, ignore_errors=True)


def compile_submission(header: str, source: str, harness: str, compile_cfg: dict, limits: dict) -> Compiled:
    work = Path(tempfile.mkdtemp(prefix="polymath_c_"))
    (work / "debounce.h").write_text(header)
    (work / "learner.c").write_text(source)
    (work / "harness.c").write_text(harness)
    errs = static_check(source, compile_cfg.get("forbid_includes", []))
    if errs:
        return Compiled(work, None, False, "; ".join(errs))
    std = f"-std={compile_cfg['std']}"
    try:
        r1 = subprocess.run(["gcc", std, *compile_cfg["flags"], "-c", "learner.c", "-o", "learner.o"], cwd=work,
                            capture_output=True, text=True, timeout=limits["compile_s"], env={"PATH": "/usr/bin:/bin"})
        if r1.returncode != 0:
            return Compiled(work, None, False, r1.stderr[-4000:])
        r2 = subprocess.run(["gcc", std, "-O1", "-c", "harness.c", "-o", "harness.o"], cwd=work, capture_output=True, text=True,
                            timeout=limits["compile_s"], env={"PATH": "/usr/bin:/bin"})
        if r2.returncode != 0:
            return Compiled(work, None, False, "harness failed to compile (template bug): " + r2.stderr[-2000:])
        r3 = subprocess.run(["gcc", "learner.o", "harness.o", "-o", "prog"], cwd=work, capture_output=True, text=True,
                            timeout=limits["compile_s"], env={"PATH": "/usr/bin:/bin"})
        if r3.returncode != 0:
            return Compiled(work, None, False, r3.stderr[-4000:])
    except subprocess.TimeoutExpired:
        return Compiled(work, None, False, "compile timed out")
    return Compiled(work, work / "prog", True, r1.stderr[-2000:])


def run_case(comp: Compiled, stdin_text: str, limits: dict) -> dict:
    nonce = secrets.token_hex(8)
    try:
        preexec = None if sys.platform == "win32" else _limits(limits["run_s"], limits["memory_mb"], limits["output_kb"])
        p = subprocess.run([str(comp.binary), nonce], input=stdin_text, capture_output=True, text=True, cwd=comp.workdir,
                           timeout=limits["run_s"] + 1, env={}, preexec_fn=preexec)
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "output": None}
    if p.returncode < 0:
        return {"status": f"signal_{-p.returncode}", "output": None}
    if p.returncode != 0:
        return {"status": f"exit_{p.returncode}", "output": None}
    lines = [l for l in p.stdout.splitlines() if l.startswith(nonce + " ")]
    if len(lines) != 1:
        return {"status": "bad_output", "output": None}
    return {"status": "ok", "output": lines[0][len(nonce) + 1:]}


def load_model(model_src: str):
    ns: dict = {}
    exec(compile(model_src, "<reference_model_py>", "exec"), ns)  # trusted, reviewed template code
    return ns["model"]


def expected_for(answer: dict, params: dict, s: str) -> str:
    return load_model(answer["reference_model_py"])(params, s)


def stdin_for(params: dict, s: str, order: list[str]) -> str:
    return " ".join(str(int(params[k])) for k in order) + "\n" + s + "\n"


def grade_code(answer: dict, params: dict, source: str, param_order: list[str], harness: str = DEFAULT_HARNESS,
               which: tuple[str, ...] = ("visible", "hidden")) -> dict:
    """Return the contract grade shape. Hidden test inputs are never included in feedback."""
    comp = compile_submission(answer["header"], source, harness, answer["compile"], answer["limits"])
    try:
        if not comp.ok:
            return {"score": 0.0, "correct": False,
                    "graders": [{"type": "code_tests", "score": 0.0, "detail": {"stage": "compile", "diagnostics": comp.diagnostics}}],
                    "feedback": "Your code did not compile:\n" + comp.diagnostics[:1500], "misconception_tags": []}
        results, tags = [], []
        aborted = False  # after one timeout or CPU-limit kill, stop running: keeps p95 grading latency bounded
        for group in which:
            for case in answer["tests"][group]:
                if aborted:
                    results.append({"id": case["id"], "group": group, "passed": False, "status": "not_run"})
                    continue
                exp = expected_for(answer, params, case["input"])
                r = run_case(comp, stdin_for(params, case["input"], param_order), answer["limits"])
                if r["status"] in ("timeout", "signal_9", "signal_24"):
                    aborted = True
                ok = r["status"] == "ok" and r["output"] == exp
                results.append({"id": case["id"], "group": group, "passed": ok, "status": r["status"]})
                if not ok and case.get("misconception_tag"):
                    tags.append(case["misconception_tag"])
        passed = sum(1 for r in results if r["passed"])
        if len(results) - passed > 3:
            tags = []  # many failures: a tag from any single test would be a guess
        score = passed / len(results)
        failed_vis = [r["id"] for r in results if not r["passed"] and r["group"] == "visible"]
        n_hidden_fail = sum(1 for r in results if not r["passed"] and r["group"] == "hidden")
        fb = f"{passed}/{len(results)} tests passed."
        if failed_vis:
            fb += " Failing visible tests: " + ", ".join(failed_vis) + "."
        if n_hidden_fail:
            fb += f" {n_hidden_fail} hidden test(s) failed."
        return {"score": score, "correct": passed == len(results),
                "graders": [{"type": "code_tests", "score": score, "detail": {"stage": "run", "results": results}}],
                "feedback": fb, "misconception_tags": sorted(set(tags))}
    finally:
        comp.cleanup()
