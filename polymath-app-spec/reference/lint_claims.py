#!/usr/bin/env python3
"""Claims lint for the Polymath specification package (contract section 8).

Scans docs/, content/ (including content/prompts/), README.md, CLAUDE.md and backlog/ for the
forbidden claims of contract section 8 and reports each violation as file:line.

    python3 reference/lint_claims.py                 # scan the package, exit 1 on violations
    python3 reference/lint_claims.py --show-allowed  # also list hits that the allow-context rule excused
    python3 reference/lint_claims.py --selftest      # run the built-in positive/negative cases
    python3 reference/lint_claims.py --root PATH     # scan another package root

Forbidden claims (contract section 8): neuroplasticity "surge windows" or critical periods; targeted
memory replay / reactivation (TMR) or sleep-cueing as a feature; neurostimulation as a feature; "2 sigma";
the "85% rule" as a proven law; 90-minute brain cycles; "top 1%"; "mastery of all" disciplines; "novices
beat experts in 16 weeks"; emotion, biometric or neural-data inference.

ALLOW-CONTEXT RULE (explicit; a hit is excused when ANY of these holds)
  A. Line rule. The line itself contains a negation or discussion marker (or the pattern `no ... claim(s)`): never, do not, don't, must not,
     must never, no ... (claim|evidence|source|support), not (a|an|the|proven|supported|evidence|used|in v1|
     implemented|offered), forbidden, excluded, exclusion, exclude, deliberately, reject(ed), refuse(d),
     avoid, prohibit(ed), ban(ned), blocklist, blacklist, lint, claims policy, myth, refuted, unsupported,
     unverified, no credible, no adequate, out of scope, deferred, trigger to revisit, "-> forbidden".
  B. Section rule. The nearest enclosing Markdown heading (any level, searched upwards) matches one of:
     excluded, exclusion, forbidden, claims, claim, avoid, deliberately, policy, blocklist, lint, non-goal,
     out of scope, deferred, what not to, not claim, risk, never, evidence gaps, unverified. Table rows and
     bullets under such a heading are excused as a block until the next heading of the same or higher level.
  C. Window rule. A hit within 2 lines of a line that matches rule A inside the same paragraph (no blank
     line between) is excused, so a sentence wrapped across lines is treated as one unit.
  D. YAML/JSON files have no headings: only rules A and C apply, plus: a hit on a line of a backlog
     task whose `id`/`slug`/`title` mentions "claims" or "lint" is excused by rule E.
  E. Context-key rule (YAML): lines inside a mapping entry whose nearest preceding `title:`, `slug:` or `id:`
     value contains "claim", "lint" or "forbidden".

Anything else is a violation. The script is deliberately conservative: a real violation inside an excluded
section would be excused, so reviewers must still read `--show-allowed` output when a section is edited.
Stdlib only.
"""
from __future__ import annotations

import os
import re
import sys
from typing import Dict, List, Tuple

CATEGORIES: Dict[str, List[str]] = {
    "neuroplasticity-window": [
        r"neuro-?plasticity", r"critical[- ]period", r"surge window", r"plasticity window", r"window of plasticity",
    ],
    "targeted-memory-replay": [
        r"targeted memory (?:reactivation|replay)", r"\bTMR\b", r"sleep[- ]cueing", r"closed[- ]loop sleep",
        r"memory replay",
    ],
    "neurostimulation": [
        r"neuro-?stimulation", r"\btDCS\b", r"\btaVNS\b", r"\bTMS\b", r"transcranial", r"neuro-?modulation",
        r"photobiomodulation",
    ],
    "two-sigma": [r"\b2[- ]sigma\b", r"\btwo[- ]sigma\b", r"\b2\s?σ\b"],
    "85-percent-rule": [r"85\s?%\s?rule", r"85 percent rule", r"eighty-five percent rule"],
    "90-minute-cycle": [r"90[- ]minute (?:brain )?(?:cycle|rhythm)", r"ultradian", r"90[- ]min(?:ute)? cycle"],
    "top-1-percent": [r"top 1\s?%", r"top one percent", r"top 1 percent", r"top-1%"],
    "mastery-of-all": [r"mastery of all", r"master(?:ing)? all (?:the )?disciplines", r"mastery of every"],
    "novices-beat-experts": [r"novices? (?:beat|outperform\w*|surpass\w*) experts?", r"16[- ]weeks?[^.\n]{0,60}\bexperts?\b",
                             r"\bexperts?\b[^.\n]{0,60}16[- ]weeks?"],
    "emotion-biometric-inference": [
        r"emotion (?:inference|recognition|detection|sensing)", r"infer\w* (?:the )?(?:learner'?s? )?emotion",
        r"\bbiometric", r"heart[- ]rate variability", r"\bHRV\b", r"\bEEG\b", r"webcam gaze", r"neural data",
        r"brain[- ]computer", r"facial expression",
    ],
}
CASE_SENSITIVE = {r"\bTMR\b", r"\btDCS\b", r"\btaVNS\b", r"\bTMS\b", r"\bHRV\b", r"\bEEG\b"}
COMPILED = {c: [re.compile(p, 0 if p in CASE_SENSITIVE else re.I) for p in ps] for c, ps in CATEGORIES.items()}

LINE_MARKERS = re.compile(
    r"\b(?:never|do not|don't|doesn't|does not|must not|must never|cannot|can't|forbidden|forbids|excluded|exclusion|exclude|"
    r"deliberately|reject\w*|refus\w*|avoid\w*|prohibit\w*|ban(?:ned|s)?|blocklist|blacklist|lint\w*|claims policy|myth|"
    r"refuted|unsupported|unverified|no credible|no adequate|out of scope|out of v1|deferred|trigger to revisit|not claim\w*|"
    r"without claims|no (?:claim|evidence|source|support|medical|health|emotion|biometric|neural)\w*|"
    r"not (?:a|an|the|proven|supported|evidence|used|in v1|implemented|offered|collected|shipped|applicable|deliverable|validated|"
    r"treated|presented|cited|described|available|reopened)|"
    r"is (?:a )?(?:non-?goal|out)|no [a-z-]+ (?:data|inference)|v1 forbids)\b"
    r"|\bno\b[^.\n]{0,90}\bclaims?\b|\bmakes no\b", re.I)
HEADING_MARKERS = re.compile(
    r"(?:excluded|exclusion|forbidden|claims?\b|avoid|deliberately|policy|blocklist|lint|non-goal|out of scope|deferred|"
    r"what not to|not claim|\brisks?\b|never|evidence gaps|unverified|safety|security|privacy|legal|compliance|techniques)", re.I)
CONTEXT_KEYS = re.compile(r"^\s*-?\s*(?:title|slug|id|name):\s*(.*)$")
CONTEXT_WORDS = re.compile(r"claim|lint|forbidden|neuro|biometric|emotion", re.I)

SCAN_DIRS = ["docs", "content", "backlog"]
SCAN_FILES = ["README.md", "CLAUDE.md"]
EXTS = {".md", ".yaml", ".yml", ".txt", ".json", ".sql", ".py"}
SKIP_NAMES = {"lint_claims.py", "scheduler_test_vectors.json"}
SKIP_DIRS = {"__pycache__", ".pytest_cache", "node_modules", ".git"}


def hits_in_line(line: str) -> List[Tuple[str, str]]:
    out = []
    for cat, pats in COMPILED.items():
        for p in pats:
            m = p.search(line)
            if m:
                out.append((cat, m.group(0)))
                break
    return out


def heading_stack(lines: List[str]) -> List[List[str]]:
    """For each line index, the list of enclosing heading titles (outermost first)."""
    stack: List[Tuple[int, str]] = []
    out: List[List[str]] = []
    in_fence = False
    for ln in lines:
        if ln.lstrip().startswith("```"):
            in_fence = not in_fence
        m = None if in_fence else re.match(r"^(#{1,6})\s+(.*\S)\s*$", ln)
        if m:
            lvl = len(m.group(1))
            while stack and stack[-1][0] >= lvl:
                stack.pop()
            stack.append((lvl, m.group(2)))
        out.append([t for _, t in stack])
    return out


def scan_text(text: str, path: str, is_markdown: bool) -> Tuple[List[Tuple[int, str, str, str]], List[Tuple[int, str, str, str, str]]]:
    lines = text.splitlines()
    heads = heading_stack(lines) if is_markdown else [[] for _ in lines]
    violations, allowed = [], []
    # context key per line for YAML (nearest preceding title/slug/id value, reset on a new list item at column 0-2)
    ctx_ok = [False] * len(lines)
    if not is_markdown:
        cur = False
        for i, ln in enumerate(lines):
            m = CONTEXT_KEYS.match(ln)
            if m and not ln.startswith("        "):
                cur = bool(CONTEXT_WORDS.search(m.group(1)))
            ctx_ok[i] = cur
    marker_lines = [bool(LINE_MARKERS.search(ln)) for ln in lines]
    for i, ln in enumerate(lines):
        hs = hits_in_line(ln)
        if not hs:
            continue
        for cat, frag in hs:
            reason = None
            if marker_lines[i]:
                reason = "A:line-marker"
            elif is_markdown and any(HEADING_MARKERS.search(t) for t in heads[i]):
                reason = "B:section=" + next(t for t in reversed(heads[i]) if HEADING_MARKERS.search(t))[:40]
            else:
                for j in (i - 2, i - 1, i + 1, i + 2):
                    if 0 <= j < len(lines) and marker_lines[j]:
                        # same paragraph: no blank line between i and j
                        lo, hi = sorted((i, j))
                        if all(lines[k].strip() for k in range(lo, hi + 1)):
                            reason = "C:paragraph-window"
                            break
            if reason is None and not is_markdown and ctx_ok[i]:
                reason = "E:context-key"
            if reason:
                allowed.append((i + 1, cat, frag, ln.strip()[:140], reason))
            else:
                violations.append((i + 1, cat, frag, ln.strip()[:160]))
    return violations, allowed


def iter_files(root: str):
    for d in SCAN_DIRS:
        base = os.path.join(root, d)
        for dp, dn, fn in os.walk(base):
            dn[:] = [x for x in dn if x not in SKIP_DIRS]
            for f in sorted(fn):
                if f in SKIP_NAMES:
                    continue
                if os.path.splitext(f)[1].lower() in EXTS:
                    yield os.path.join(dp, f)
    for f in SCAN_FILES:
        p = os.path.join(root, f)
        if os.path.exists(p):
            yield p


def selftest() -> int:
    bad = [
        ("Unlock your brain's neuroplasticity window with our daily sprint.", True),
        ("Learn like the top 1% of engineers.", True),
        ("Our tutor delivers 2 sigma gains.", True),
        ("Use the 85% rule to keep every learner at the optimum.", True),
        ("We use targeted memory reactivation while you sleep.", True),
        ("Take 90-minute brain cycles for best results.", True),
        ("Achieve mastery of all disciplines.", True),
        ("Novices beat experts in 16 weeks.", True),
        ("The app reads your heart rate variability to adapt the lesson.", True),
        ("A tDCS headband boosts retention.", True),
        ("The app infers emotion from your webcam.", True),
        ("Spaced retrieval and graded feedback help you practise.", False),
        ("The UI must never claim neuroplasticity windows.", False),
        ("Do not advertise the top 1% claim.", False),
        ("tDCS is excluded from v1.", False),
    ]
    fails = 0
    for text, should_flag in bad:
        v, _ = scan_text(text, "selftest", True)
        if bool(v) != should_flag:
            fails += 1
            print("SELFTEST FAIL:", repr(text), "expected flag" if should_flag else "expected clean", "got", v)
    md = "# Claims\n\n- the 85% rule is described here\n\n# Plans\n\nWe promise 2 sigma.\n"
    v, a = scan_text(md, "selftest", True)
    if len(a) != 1 or len(v) != 1 or v[0][0] != 7:
        fails += 1
        print("SELFTEST FAIL: section rule", v, a)
    print("lint_claims selftest ok" if not fails else f"lint_claims selftest FAILED ({fails})")
    return 1 if fails else 0


def main(argv: List[str]) -> int:
    if "--selftest" in argv:
        return selftest()
    show_allowed = "--show-allowed" in argv
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    if "--root" in argv:
        root = argv[argv.index("--root") + 1]
    root = os.path.abspath(root)
    nviol = nallowed = nfiles = 0
    for path in iter_files(root):
        nfiles += 1
        try:
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
        except (UnicodeDecodeError, OSError):
            continue
        rel = os.path.relpath(path, root)
        v, a = scan_text(text, rel, path.endswith(".md"))
        nallowed += len(a)
        for (ln, cat, frag, snip) in v:
            nviol += 1
            print(f"{rel}:{ln}: VIOLATION [{cat}] '{frag}' :: {snip}")
        if show_allowed:
            for (ln, cat, frag, snip, why) in a:
                print(f"{rel}:{ln}: allowed({why}) [{cat}] '{frag}'")
    print(f"lint_claims: scanned {nfiles} files, {nviol} violation(s), {nallowed} hit(s) excused by the allow-context rule")
    return 1 if nviol else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
