#!/usr/bin/env python3
"""check_package.py - mechanical consistency checks for the Polymath specification package.

Usage:
    python3 reference/check_package.py            # run every check, exit 1 on any error
    python3 reference/check_package.py --only a,d # run selected checks (a b c d e f)
    python3 reference/check_package.py --quiet    # print findings only, no OK lines

Dependencies: Python 3.9+ standard library and PyYAML.

Checks (each finding is printed as file:line  message, grouped by check):

  (a) Cross-references. Forms such as "doc 06 section 4.2", "see 06 §3", "06 section 4", "(03 §15)",
      "09§S02", "contract §7.5", "00a section C". The target document must have a numbered heading
      (or, for the contract, a numbered list item inside the section) with that number. Bare "§N.M"
      and "section N.M" inside a document are checked against the same document (check a2).
  (b) Identifier references. FR-/US-/SM-/NFR- (home: 01), LS-/PRM- (02), EXP-/BETA-/H<n>/OM-/DR- (11),
      T-PRJ- (10), ADR- (03), R- (14), BL- (backlog/backlog.yaml). The id must be defined in its home
      document. "Defined" means: it begins a line or a table cell, or is a heading or bold token.
  (c) Schema vocabulary. Backticked table names that look like tables must exist in schemas/schema.sql;
      near misses (plural/singular, known stale names) are flagged; "table.column" must name a real column;
      enum values written next to an enum name (session_type, task_kind, grader_type, mastery_state,
      evidence_kind, evidence_status, tier, context, pool, assessment_kind) must be legal values.
  (d) API routes. "METHOD /path" in docs and backlog must match a path and method of
      schemas/api.openapi.yaml (base /api/v1; the optional /api or /api/v1 prefix is stripped; path
      parameters are compared by position, not name). Old informal routes of 00c are reported with their
      replacement. 00b and 00c are exempt: they quote old routes as history.
  (e) Events. Event names in the catalogue of doc 11 section 9 are unique; every event name used in docs
      06, 08, 09, 10 and backlog/backlog.yaml appears in the catalogue. Event names are found in the
      event tables/lists of 06 section 12 and 10 section 8.6, after the word "Events:", and in any
      text that mentions events and contains a backticked (docs) or bare (backlog) snake_case token
      ending in a recognised event suffix (EVENT_SUFFIXES).
  (f) Skill keys. Keys like elec.dc.voltage-divider mentioned in docs 07, 08, 09, 10, the sample
      templates and the backlog must exist in content/mvp-skill-graph.yaml.
  (g) Syllabi bundle. docs-site/assets/syllabi-data.js must exist and be at least as new as every
      content/syllabi/pillar-*.md file (regenerate via reference/generate_pillar_syllabi.py).
  (h) Companion validators. reference/validate_lean_slice.py and reference/validate_spine_coherence.py
      must exit 0.
  (i) Lean content factory. validate_lean_manifest.py and validate_safety_briefs.py must exit 0.

Whitelist (low-false-positive policy). Everything here is deliberate and documented at the constant:
  XREF_IGNORE, ID_IGNORE, ROUTE_IGNORE_PREFIXES, ROUTE_IGNORE_FILES, TABLE_WORDS_IGNORE, EVENT_IGNORE,
  SKILL_IGNORE. Add to them only with a comment saying why.

Exit status: 0 when no finding, 1 otherwise, 2 on setup error (missing input file).
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import subprocess
import sys
from collections import defaultdict

try:
    import yaml
except ImportError:  # pragma: no cover
    print("PyYAML is required: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def P(*parts):
    return os.path.join(ROOT, *parts)


def rel(path):
    return os.path.relpath(path, ROOT)


# --------------------------------------------------------------------------------------------
# Configuration and whitelists
# --------------------------------------------------------------------------------------------

DOC_FILES = {  # doc number -> path
}
for _p in sorted(glob.glob(P("docs", "*.md"))):
    _m = re.match(r"(\d{2}[a-f]?)-", os.path.basename(_p))
    if _m:
        DOC_FILES[_m.group(1)] = _p

BACKLOG = P("backlog", "backlog.yaml")
SCHEMA_SQL = P("schemas", "schema.sql")
OPENAPI = P("schemas", "api.openapi.yaml")
GRAPH = P("content", "mvp-skill-graph.yaml")
RENAME_MAP = P("docs", "00c-route-rename-map.md")

EXTRA_TEXT_FILES = [P("README.md"), P("CLAUDE.md"), BACKLOG] + sorted(glob.glob(P("content", "prompts", "*.md")))
TEXT_FILES = [DOC_FILES[k] for k in sorted(DOC_FILES)] + [f for f in EXTRA_TEXT_FILES if os.path.exists(f)]

# Files that quote old routes, old ids or findings as history: exempt from route, event and id checks.
HISTORY_FILES = {P("docs", "00b-consistency-report.md"), P("docs", "00c-route-rename-map.md")}

# (a) cross-references that are deliberately not headings (document -> set of tokens allowed).
XREF_IGNORE = {
    # none at present
}

# (b) ids that are placeholders or examples and not meant to exist.
ID_IGNORE = {
    "FR-000", "US-000", "T-PRJ-0", "BL-0000", "EXP-000", "R-00", "H0",
}

# (d) path prefixes that are not routes of the Next.js API (worker service, sandbox service, UI pages).
ROUTE_IGNORE_PREFIXES = ("/healthz", "/internal", "/worker", "/sandbox", "/v1/", "/grade", "/verify", "/run")
ROUTE_IGNORE_FILES = HISTORY_FILES

# (c) backticked words that look like tables but are not (JSON keys, concepts).
TABLE_WORDS_IGNORE = {
    "attempt_id", "session_id", "item_id", "skill_key", "user_id",
    "anon", "public", "authenticated", "service_role",  # Postgres roles/schemas, not tables
}

# (e) tokens ending in an event-like suffix that are not event names.
EVENT_IGNORE = {
    "client_attempt_id",
    "evidence_status",      # enum names
    "session_status",
    "idempotency_key_reuse",
    "grade_status",
    "task_submitted_at",
}

# (f) strings that look like skill keys but are not.
SKILL_IGNORE = set()

NODE_CODES = ("math phys sw ml elec sig ctl mech sens net matl sys sec econ prof def rf robo cv pwr").split()

# Event name suffixes recognised in free text (the explicit event lists are parsed without this filter).
EVENT_SUFFIXES = (
    "started completed shown submitted requested changed sent opened reported retired scheduled assigned "
    "exposure override suggested due recorded viewed issued renewed expired done applied written suspended "
    "saved checked reviewed ack computed generated missed rebalanced detected flag updated built calibration "
    "assigned ended created deleted accepted rejected consumed granted"
).split()


# --------------------------------------------------------------------------------------------
# Findings
# --------------------------------------------------------------------------------------------

class Findings:
    def __init__(self):
        self.by_check = defaultdict(list)

    def add(self, check, path, line, msg):
        self.by_check[check].append((rel(path) if os.path.isabs(path) else path, line, msg))

    def count(self, check=None):
        if check:
            return len(self.by_check.get(check, []))
        return sum(len(v) for v in self.by_check.values())


F = Findings()

CHECK_TITLES = {
    "a": "(a) document cross-references resolve to a numbered heading",
    "a2": "(a2) bare section references inside a document resolve (same document)",
    "b": "(b) ids exist in their home document",
    "c": "(c) schema vocabulary: tables, columns, enum values",
    "d": "(d) API routes match schemas/api.openapi.yaml",
    "e": "(e) event names: unique catalogue; all used names are in the catalogue",
    "f": "(f) skill keys exist in content/mvp-skill-graph.yaml",
    "g": "(g) docs-site syllabi bundle is fresh vs pillar markdown",
    "h": "(h) lean slice and spine coherence validators pass",
    "i": "(i) lean template manifest and safety briefs",
}


# --------------------------------------------------------------------------------------------
# Loading
# --------------------------------------------------------------------------------------------

_text_cache = {}


def lines_of(path):
    if path not in _text_cache:
        with open(path, encoding="utf-8") as fh:
            _text_cache[path] = fh.read().split("\n")
    return _text_cache[path]


def require(path):
    if not os.path.exists(path):
        print(f"setup error: missing {rel(path)}", file=sys.stderr)
        sys.exit(2)


for _f in (SCHEMA_SQL, OPENAPI, GRAPH, DOC_FILES.get("00"), DOC_FILES.get("11")):
    require(_f)


def fenced_flags(lines):
    """Return a list of booleans: True when the line is inside a ``` fenced block (fence lines included)."""
    flags, inside = [], False
    for ln in lines:
        if ln.lstrip().startswith("```"):
            flags.append(True)
            inside = not inside
        else:
            flags.append(inside)
    return flags


# ---- headings ------------------------------------------------------------------------------

HEADING = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
NUM_HEAD = re.compile(r"^(?:§\s*)?(\d+(?:\.\d+)*)\.?(?:\s|$|\))")
LETTER_HEAD = re.compile(r"^(?:Appendix\s+)?([A-F])[.:)]\s")
SCREEN_HEAD = re.compile(r"^(S\d{2})\b")


def section_tokens(doc_no):
    """Set of heading numbers/ids of a document, e.g. {'4', '4.2', 'S01', 'C'}."""
    path = DOC_FILES[doc_no]
    toks = set()
    flags = fenced_flags(lines_of(path))
    for i, ln in enumerate(lines_of(path)):
        if flags[i]:
            continue
        m = HEADING.match(ln)
        if not m:
            continue
        text = m.group(2)
        mm = NUM_HEAD.match(text)
        if mm:
            toks.add(mm.group(1))
            continue
        mm = LETTER_HEAD.match(text)
        if mm:
            toks.add(mm.group(1))
            continue
        mm = SCREEN_HEAD.match(text)
        if mm:
            toks.add(mm.group(1))
    return toks


SECTIONS = {k: section_tokens(k) for k in DOC_FILES}


def contract_items():
    """Contract section -> number of numbered list items (7.5 means list item 5 of section 7)."""
    items = defaultdict(set)
    cur = None
    path = DOC_FILES["00"]
    flags = fenced_flags(lines_of(path))
    for i, ln in enumerate(lines_of(path)):
        if flags[i]:
            continue
        m = HEADING.match(ln)
        if m:
            mm = NUM_HEAD.match(m.group(2))
            cur = mm.group(1) if mm else None
            continue
        if cur:
            mm = re.match(r"^\s*(\d+)\.\s", ln)
            if mm:
                items[cur].add(mm.group(1))
            # first column ids of tables such as "| D1 |" are not numeric: ignored here
    return items


CONTRACT_ITEMS = contract_items()


# --------------------------------------------------------------------------------------------
# (a) cross-references
# --------------------------------------------------------------------------------------------

DOCNO = r"(0[0-9][a-d]?|1[0-4])"
SECREF = r"(\d+(?:\.\d+)*|S\d{2}|[A-F](?![A-Za-z0-9]))"
XREF = re.compile(
    r"(?<![\w./#-])(?:docs?\s+|documents?\s+)?" + DOCNO + r"(?:\s*,)?\s*(?:§§?\s*|[Ss]ections?\s+)" + SECREF
)
# "docs/03 section 5.8", "`docs/12` section 13.3", "docs/00d-lean-slice-plan.md section 6"
XREF2 = re.compile(r"docs/(0[0-9][a-d]?|1[0-4])[-\w.]*`?,?\s*(?:§\s*|[Ss]ections?\s+)" + SECREF)
# "section 9.1 of `03-architecture.md`", "section 4 of doc 11", "section 7.5 of the 06"
XREF3 = re.compile(SECREF.join([r"(?:§\s*|[Ss]ections?\s+)", ""]) + r"\s+of\s+(?:the\s+)?(?:`?docs/)?(?:doc(?:ument)?\s+)?`?(0[0-9][a-d]?|1[0-4])(?![\w])")
DOCPATH = re.compile(r"docs/(\d{2}[a-f]?-[\w-]+\.md)")
# "contract §7.5", "contract 7.5", "contract section 10", "(contract 7.14)"
CONTRACT_REF = re.compile(r"\b[Cc]ontract(?:\s+(?:v\d+(?:\.\d+)*))?\s*(?:§\s*|[Ss]ections?\s+|\s)(\d+(?:\.\d+)*)(?![\d.]*\s*(?:h|hours|min|%))")
# continuation: "11 §9 and §14", "06 §4.2, §4.3"
CONT_REF = re.compile(r"(?:,|and|or|/)\s*§\s*" + SECREF)


def resolve_ref(doc_no, tok):
    """Return True if heading token exists in doc (contract: also list items)."""
    if doc_no not in SECTIONS:
        return False
    if tok in SECTIONS[doc_no]:
        return True
    if doc_no == "00" and "." in tok:
        sec, item = tok.split(".", 1)
        if sec in SECTIONS["00"] and item in CONTRACT_ITEMS.get(sec, set()):
            return True
    return False


def check_a():
    for path in TEXT_FILES:
        lines = lines_of(path)
        own = re.match(r"(\d{2}[a-f]?)-", os.path.basename(path))
        own = own.group(1) if own else None
        for i, ln in enumerate(lines, 1):
            if path in HISTORY_FILES and False:
                continue
            seen = set()
            for m in XREF.finditer(ln):
                doc_no, tok = m.group(1), m.group(2)
                key = (doc_no, tok)
                if key in seen:
                    continue
                seen.add(key)
                if (doc_no, tok) in XREF_IGNORE.get("pairs", set()):
                    continue
                if not resolve_ref(doc_no, tok):
                    why = "no such document" if doc_no not in SECTIONS else f"document {doc_no} has no numbered heading {tok}"
                    F.add("a", path, i, f"'{m.group(0).strip()}' - {why}")
            for rx, gi in ((XREF2, (1, 2)), (XREF3, (2, 1))):
                for m in rx.finditer(ln):
                    doc_no, tok = m.group(gi[0]), m.group(gi[1])
                    if not resolve_ref(doc_no, tok):
                        why = "no such document" if doc_no not in SECTIONS else f"document {doc_no} has no numbered heading {tok}"
                        F.add("a", path, i, f"'{m.group(0).strip()}' - {why}")
            for m in DOCPATH.finditer(ln):
                if not os.path.exists(P("docs", m.group(1))):
                    F.add("a", path, i, f"'docs/{m.group(1)}' - file does not exist in the package")
            for m in CONTRACT_REF.finditer(ln):
                tok = m.group(1)
                # avoid false hits such as "contract 2 weeks": require a heading/list match or a clear section marker
                marker = "§" in m.group(0) or "ection" in m.group(0)
                if not marker and not (re.fullmatch(r"\d+\.\d+|\d+", tok) and tok in SECTIONS["00"]):
                    # bare "contract 7.5": check only when it looks like a dotted section number
                    if "." not in tok:
                        continue
                if not resolve_ref("00", tok):
                    F.add("a", path, i, f"'{m.group(0).strip()}' - the contract has no section/item {tok}")


BARE = re.compile(r"(?<![\w.#-])(?:§\s*|[Ss]ections?\s+)(\d+(?:\.\d+)*)")
NAMED_DOCS = {  # words before a bare ref that make it point at another document
    "prd": "01", "architecture": "03", "data model": "04", "learning-science": "02", "learning science": "02",
    "contract": "00", "00a": "00a", "openapi": None, "register": "14", "risk register": "14",
    "roadmap": "13", "backlog": "13", "ux": "09", "evaluation plan": "11", "security": "12",
}


def check_a2():
    for key, path in sorted(DOC_FILES.items()):
        if path in HISTORY_FILES or key in ("00a", "00e", "00f"):
            continue
        lines = lines_of(path)
        flags = fenced_flags(lines)
        for i, ln in enumerate(lines, 1):
            if flags[i - 1]:
                continue
            for m in BARE.finditer(ln):
                before = ln[max(0, m.start() - 40):m.start()].lower()
                # a doc number or a named document before the ref: handled by (a) or belongs elsewhere
                if re.search(r"(?:\b\d{2}[a-f]?|contract|prd|architecture|data model|learning[- ]science|"
                             r"openapi|register|roadmap|ux|evaluation plan|security|00a|doc(?:ument)? \d+|"
                             r"brief|report|reports|notes|iso|nist|owasp|rfc|iec|\bkicad|datasheet|"
                             r"article|art\.|clause|annex|gdpr|ai act|act|wcag|schema)[\s,(\"']*(?:the\s+)?$", before):
                    continue
                if re.search(r"\b(?:sections?|§)\s*(?:\d+(?:\.\d+)*\s*(?:,|and|or|to|–|-)\s*)*$", before):
                    pass  # continuation of an earlier ref in the same list: still checked against own doc
                tok = m.group(1)
                if re.search(r"docs/\d{2}[a-f]?[-\w.]*`?,?\s*$", before) or re.match(r"\s*of\s+(?:the\s+)?(?:`?docs/)?(?:doc(?:ument)?\s+)?`?(?:0[0-9][a-f]?|1[0-4])(?![\w])", ln[m.end():]):
                    continue  # handled by (a): explicit "docs/NN section X" or "section X of NN"
                if not resolve_ref(key, tok):
                    F.add("a2", path, i, f"'{m.group(0).strip()}' - this document has no numbered heading {tok}")


# --------------------------------------------------------------------------------------------
# (b) ids
# --------------------------------------------------------------------------------------------

ID_HOME = [  # (regex of full id, home key or 'backlog', prefix label)
    (re.compile(r"(?<![A-Za-z0-9-])(FR-\d+)(?![\w-])"), "01"),
    (re.compile(r"(?<![A-Za-z0-9-])(US-\d+)(?![\w-])"), "01"),
    (re.compile(r"(?<![A-Za-z0-9-])(SM-\d+)(?![\w-])"), "01"),
    (re.compile(r"(?<![A-Za-z0-9-])(NFR-\d+)(?![\w-])"), "01"),
    (re.compile(r"(?<![A-Za-z0-9-])(LS-\d+)(?![\w-])"), "02"),
    (re.compile(r"(?<![A-Za-z0-9-])(PRM-\d+)(?![\w-])"), "02"),
    (re.compile(r"(?<![A-Za-z0-9-])(EXP-\d+)(?![\w-])"), "11"),
    (re.compile(r"(?<![A-Za-z0-9-])(BETA-\d+)(?![\w-])"), "11"),
    (re.compile(r"(?<![A-Za-z0-9-])(OM-\d+)(?![\w-])"), "11"),
    (re.compile(r"(?<![A-Za-z0-9-])(DR-\d+)(?![\w-])"), "11"),
    (re.compile(r"(?<![A-Za-z0-9-.])(H\d{1,2})(?![\w-])"), "11"),
    (re.compile(r"(?<![A-Za-z0-9-])(T-PRJ-\d+)(?![\w-])"), "10"),
    (re.compile(r"(?<![A-Za-z0-9-])(ADR-\d+)(?![\w-])"), "03"),
    (re.compile(r"(?<![A-Za-z0-9-])(R-\d+)(?![\w-])"), "14"),
    (re.compile(r"(?<![A-Za-z0-9-])(BL-\d+)(?![\w-])"), "backlog"),
]


def norm_id(s):
    """FR-003 == FR-3 (strip leading zeros of the numeric tail)."""
    m = re.match(r"^(.*?)(\d+)$", s)
    return f"{m.group(1)}{int(m.group(2))}" if m else s


def definitions_in(path, rx):
    """Ids defined (line start, table cell, heading or bold) in a file."""
    defs = set()
    for ln in lines_of(path):
        stripped = ln.strip()
        # table cells
        if stripped.startswith("|"):
            for cell in stripped.strip("|").split("|"):
                c = cell.strip().strip("*`")
                m = rx.fullmatch(c) or (rx.match(c) if re.match(r"^\S+\s*[-–—:]", c) else None)
                if m:
                    defs.add(norm_id(m.group(1)))
        # line start, optional list marker/bold/heading
        m = re.match(r"^(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+)?\**\s*" + rx.pattern, stripped)
        if m:
            defs.add(norm_id(m.group(1)))
        # "id: BL-0023" yaml, "**ID**:", etc.
        m = re.match(r"^(?:-\s+)?(?:id|ID)\s*:\s*['\"]?" + rx.pattern, stripped)
        if m:
            defs.add(norm_id(m.group(1)))
        # headings that contain the id anywhere (### R-01 Content error rate)
        if stripped.startswith("#"):
            for mm in rx.finditer(stripped):
                defs.add(norm_id(mm.group(1)))
        # bold anywhere: **FR-001**
        for mm in re.finditer(r"\*\*\s*" + rx.pattern, stripped):
            defs.add(norm_id(mm.group(1)))
    return defs


def check_b():
    homes = {}
    for rx, home in ID_HOME:
        path = BACKLOG if home == "backlog" else DOC_FILES[home]
        homes[rx.pattern] = (home, definitions_in(path, rx))
    for path in TEXT_FILES:
        if path in HISTORY_FILES:
            continue
        lines = lines_of(path)
        for i, ln in enumerate(lines, 1):
            for rx, home in ID_HOME:
                for m in rx.finditer(ln):
                    tok = m.group(1)
                    if tok in ID_IGNORE:
                        continue
                    # H<n> must be a hypothesis only inside doc 11 context words, elsewhere ambiguous (H1 heading)
                    if rx.pattern.startswith("(?<![A-Za-z0-9-.])(H"):
                        # the id cell of a 00a decision row defines a 00a id, not a doc 11 hypothesis
                        if os.path.basename(path).startswith("00a") and ln[:m.start()].strip() == "|":
                            continue
                        if not re.search(r"\b(hypothes|H\d+\s*(\(|[a-d]\b)|\bH\d+[,/]|\bsee\b|\btest|\bH\d+ and\b)", ln, re.I) \
                                and "11" not in os.path.basename(path)[:2]:
                            continue
                    # skip the home document's own definition lines? no: definitions are always valid
                    defs = homes[rx.pattern][1]
                    if norm_id(tok) not in defs:
                        F.add("b", path, i, f"{tok} is not defined in its home ({home if home == 'backlog' else 'doc ' + home})")


# --------------------------------------------------------------------------------------------
# (c) schema vocabulary
# --------------------------------------------------------------------------------------------

def parse_schema():
    text = "\n".join(lines_of(SCHEMA_SQL))
    # strip comments for parsing
    nocom = re.sub(r"--[^\n]*", "", text)
    tables, views, enums, funcs = {}, set(), {}, set()
    for m in re.finditer(r"create\s+type\s+(?:public\.)?(\w+)\s+as\s+enum\s*\(([^)]*)\)", nocom, re.I):
        enums[m.group(1)] = re.findall(r"'([^']*)'", m.group(2))
    for m in re.finditer(r"create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\.)?(\w+)\s*\(", nocom, re.I):
        schema, name = m.group(1) or "public", m.group(2)
        # find matching paren
        start = m.end()
        depth, j = 1, start
        while j < len(nocom) and depth:
            if nocom[j] == "(":
                depth += 1
            elif nocom[j] == ")":
                depth -= 1
            j += 1
        body = nocom[start:j - 1]
        cols = set()
        d = 0
        buf = ""
        parts = []
        for ch in body:
            if ch == "(":
                d += 1
            elif ch == ")":
                d -= 1
            if ch == "," and d == 0:
                parts.append(buf)
                buf = ""
            else:
                buf += ch
        parts.append(buf)
        for part in parts:
            pm = re.match(r"\s*(\w+)\s+\S", part)
            if pm and pm.group(1).lower() not in ("constraint", "primary", "unique", "check", "foreign", "like", "exclude"):
                cols.add(pm.group(1))
        tables[name] = {"schema": schema, "cols": cols}
    for m in re.finditer(r"alter\s+table\s+(?:\w+\.)?(\w+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)", nocom, re.I):
        if m.group(1) in tables:
            tables[m.group(1)]["cols"].add(m.group(2))
    for m in re.finditer(r"create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:\w+\.)?(\w+)", nocom, re.I):
        views.add(m.group(1))
    for m in re.finditer(r"create\s+(?:or\s+replace\s+)?function\s+(?:\w+\.)?(\w+)", nocom, re.I):
        funcs.add(m.group(1))
    return tables, views, enums, funcs


TABLES, VIEWS, ENUMS, FUNCS = parse_schema()

# enum vocabulary the checker enforces (contract section 5); schema enums plus contract-only domains
ENUM_VALUES = {
    "session_type": set(ENUMS.get("session_type", [])),
    "task_kind": set(ENUMS.get("task_kind", [])),
    "grader_type": set(ENUMS.get("grader_type", [])),
    "mastery_state": set(ENUMS.get("mastery_state", [])),
    "evidence_kind": set(ENUMS.get("evidence_kind", [])),
    "evidence_status": set(ENUMS.get("evidence_status", [])),
    "tier": set(ENUMS.get("tier", [])),
    "context": set(ENUMS.get("context", [])),
    "pool": {"practice", "assessment", "transfer"},
    "assessment_kind": {"diagnostic", "module_end", "periodic", "delayed", "transfer"},
}

# Names known to have been retired or never adopted (decisions 00a and the contract).
STALE_TABLE_NAMES = {
    "notification_prefs": "reminder settings live in profiles.reminder_prefs (00a section C)",
    "structural_check": "not a grader_type; structural checks are evidence verification (00a D1)",
    "notification_preferences": "reminder settings live in profiles.reminder_prefs (00a section C)",
}

ALL_SCHEMA_IDS = set(TABLES) | VIEWS | FUNCS | set(ENUMS)
for _t in TABLES.values():
    ALL_SCHEMA_IDS |= _t["cols"]
for _v in ENUMS.values():
    ALL_SCHEMA_IDS |= set(_v)

TICK = re.compile(r"`([^`\n]+)`")
TABLE_CTX = re.compile(r"(?:\btables?\s+`([a-z_][a-z0-9_.]*)`)|(?:`([a-z_][a-z0-9_.]*)`\s+(?:table\b|tables\b))", re.I)
ENUM_NAMES = "|".join(sorted(ENUM_VALUES, key=len, reverse=True))
ENUM_TICK = re.compile(
    r"`(" + ENUM_NAMES + r")(?:\s*(?:=|==|!=|<>|:)\s*|`\s*(?:=|==|!=|<>|:|is|of|in|->|→|to)?\s*)"
    r"\s*(?:'([A-Za-z0-9_]+)'|\"([A-Za-z0-9_]+)\"|`([A-Za-z0-9_]+)`)"
)
ENUM_TICK2 = re.compile(r"`(" + ENUM_NAMES + r")\s*(?:=|==|!=|<>)\s*'([A-Za-z0-9_]+)'")
ENUM_BARE_CODE = re.compile(r"\b(" + ENUM_NAMES + r")\s*(?:=|==|:)\s*['\"]?([a-z_][a-z0-9_]*)['\"]?")


def singular_plural_variants(tok):
    v = {tok + "s", tok + "es"}
    if tok.endswith("s"):
        v.add(tok[:-1])
    if tok.endswith("es"):
        v.add(tok[:-2])
    if tok.endswith("ies"):
        v.add(tok[:-3] + "y")
    if tok.endswith("y"):
        v.add(tok[:-1] + "ies")
    return v


NEGATION = re.compile(r"\b(no|not|never|rejected|replaces?|replaced|instead|without|separate|retired|there is no|dropped|removed)\b", re.I)


def check_c():
    for path in TEXT_FILES:
        if path in HISTORY_FILES:
            continue
        lines = lines_of(path)
        flags = fenced_flags(lines)
        for i, ln in enumerate(lines, 1):
            # --- table names in context
            for m in TABLE_CTX.finditer(ln):
                full = (m.group(1) or m.group(2)).strip(".")
                parts_ = full.split(".")
                base = parts_[1] if parts_[0] in ("app_private", "public") and len(parts_) > 1 else parts_[0]
                if base in TABLES or base in VIEWS or base in TABLE_WORDS_IGNORE:
                    continue
                if base in STALE_TABLE_NAMES:
                    if NEGATION.search(ln):
                        continue  # the stale name is being retired/explained on this line (documented heuristic)
                    F.add("c", path, i, f"`{full}` - {STALE_TABLE_NAMES[base]}")
                elif re.fullmatch(r"[a-z]+(_[a-z]+)*", base) and base not in ALL_SCHEMA_IDS:
                    F.add("c", path, i, f"`{full}` is written as a table but is not in schemas/schema.sql")
            # --- backticked tokens
            if not flags[i - 1]:
                for m in TICK.finditer(ln):
                    tok = m.group(1).strip()
                    t0 = tok
                    if tok.startswith("app_private.") or tok.startswith("public."):
                        tok = tok.split(".", 1)[1]
                    if tok in STALE_TABLE_NAMES:
                        if NEGATION.search(ln):
                            continue
                        F.add("c", path, i, f"`{tok}` - {STALE_TABLE_NAMES[tok]}")
                        continue
                    # table.column
                    mm = re.fullmatch(r"([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)(?:\.[A-Za-z0-9_.\[\]*-]+)?", tok)
                    if mm and mm.group(1) in TABLES:
                        col = mm.group(2)
                        if col not in TABLES[mm.group(1)]["cols"] and not NEGATION.search(ln):
                            F.add("c", path, i, f"`{t0}` - table {mm.group(1)} has no column {col}")
                        continue
                    # near-miss table names (plural/singular), only for multi-word identifiers
                    if "_" in tok and re.fullmatch(r"[a-z]+(_[a-z]+)+", tok) and tok not in ALL_SCHEMA_IDS \
                            and tok not in TABLE_WORDS_IGNORE:
                        hits = [v for v in singular_plural_variants(tok) if v in TABLES]
                        if hits:
                            F.add("c", path, i, f"`{tok}` is not a table; did you mean `{hits[0]}`?")
            # --- enum values written next to an enum name
            seen = set()
            for rx in (ENUM_TICK, ENUM_TICK2):
                for m in rx.finditer(ln):
                    en = m.group(1)
                    val = next((g for g in m.groups()[1:] if g), None)
                    if (en, val, m.start()) in seen or val is None:
                        continue
                    seen.add((en, val, m.start()))
                    if val not in ENUM_VALUES[en]:
                        F.add("c", path, i, f"{en} value '{val}' is not legal (allowed: {', '.join(sorted(ENUM_VALUES[en]))})")
            if flags[i - 1]:
                for m in (x for x in ENUM_BARE_CODE.finditer(ln) if x.group(1) != "context"):
                    en, val = m.group(1), m.group(2)
                    if val not in ENUM_VALUES[en] and val not in ("null", "none", "true", "false"):
                        F.add("c", path, i, f"{en} value '{val}' is not legal (allowed: {', '.join(sorted(ENUM_VALUES[en]))})")
    # YAML content: enums used in sample templates and the project ladder
    for ypath in sorted(glob.glob(P("content", "sample-problem-templates", "*.yaml"))):
        try:
            data = yaml.safe_load(open(ypath, encoding="utf-8"))
        except Exception as exc:  # pragma: no cover
            F.add("c", ypath, 1, f"YAML error {exc}")
            continue
        for fld, en in (("task_kind", "task_kind"), ("grader_type", "grader_type")):
            v = data.get(fld) if isinstance(data, dict) else None
            if v and v not in ENUM_VALUES[en]:
                F.add("c", ypath, 1, f"{fld} '{v}' is not legal")


# --------------------------------------------------------------------------------------------
# (d) routes
# --------------------------------------------------------------------------------------------

def load_openapi():
    spec = yaml.safe_load(open(OPENAPI, encoding="utf-8"))
    routes = {}
    for path, item in spec["paths"].items():
        norm = re.sub(r"\{[^}]+\}", "{}", path)
        for meth in item:
            if meth.lower() in ("get", "post", "put", "patch", "delete"):
                routes.setdefault(norm, {})[meth.upper()] = item[meth].get("operationId")
    ops = {}
    for path, item in spec["paths"].items():
        for meth, op in item.items():
            if meth.lower() in ("get", "post", "put", "patch", "delete") and isinstance(op, dict):
                ops[op.get("operationId")] = (meth.upper(), path)
    return routes, ops


ROUTES, OPERATIONS = load_openapi()

METH = r"(GET|POST|PUT|PATCH|DELETE)"
ROUTE_RX = re.compile(
    r"(?<![A-Za-z])(" + METH + r"(?:\s*/\s*" + METH + r")*)\s+`?(/[A-Za-z0-9_\-{}:\[\].*<>$%=?&,/]*)"
)


def norm_route(p):
    p = p.rstrip("`.,;:)…")
    p = p.split("?")[0]
    p = re.sub(r"^/api(/v\d+)?(?=/|$)", "", p)
    p = re.sub(r"\{[^}]+\}|:[A-Za-z_]+|\[[^\]]+\]|<[^>]+>", "{}", p)
    p = p.rstrip("/")
    return p or "/"


def load_rename_map():
    """Informal route string (as written in 00c, METHOD /api/...) -> replacement text of the OpenAPI column."""
    mp = {}
    for ln in lines_of(RENAME_MAP):
        if not ln.startswith("|") or ln.startswith("|---") or "Informal route" in ln:
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if len(cells) < 3:
            continue
        for tok in re.findall(r"`([^`]+)`", cells[1]):
            mp[tok] = cells[2]
    return mp


RENAME = load_rename_map()


def check_d():
    for path in TEXT_FILES:
        if path in ROUTE_IGNORE_FILES:
            continue
        for i, ln in enumerate(lines_of(path), 1):
            for m in ROUTE_RX.finditer(ln):
                methods = set(re.findall(METH, m.group(1)))
                raw = m.group(0)
                rawpath = m.group(len(m.groups()))
                rawpath = rawpath.rstrip("`.,;:)…")
                if "..." in rawpath or "…" in rawpath or rawpath == "/":
                    continue
                if rawpath.startswith(ROUTE_IGNORE_PREFIXES):
                    continue
                np_ = norm_route(rawpath)
                if np_ == "/" or "*" in np_:
                    continue
                known = ROUTES.get(np_)
                if known is None:
                    hint = ""
                    for informal, repl in RENAME.items():
                        if informal.replace("`", "") == f"{'/'.join(sorted(methods))} {rawpath}" or \
                                (rawpath.rstrip("/") in informal and any(mt in informal for mt in methods)):
                            hint = f" (old route, 00c maps it to: {repl})"
                            break
                    F.add("d", path, i, f"'{' '.join([m.group(1), rawpath])}' is not a path of the OpenAPI file{hint}")
                    continue
                for mt in methods:
                    if mt not in known:
                        F.add("d", path, i, f"'{mt} {rawpath}' - path exists but not with method {mt} (has {', '.join(sorted(known))})")


# --------------------------------------------------------------------------------------------
# (e) events
# --------------------------------------------------------------------------------------------

def catalogue():
    """Parse the table under '## 9. Event catalogue' in doc 11: list of (name, line)."""
    path = DOC_FILES["11"]
    lines = lines_of(path)
    start = None
    for i, ln in enumerate(lines):
        if re.match(r"^##\s+9\.\s+Event catalogue", ln):
            start = i
        elif start is not None and re.match(r"^##\s+\d+\.", ln):
            end = i
            break
    else:
        end = len(lines)
    names = []
    if start is None:
        return names, start, end
    for i in range(start, end):
        ln = lines[i]
        if not ln.startswith("|") or ln.startswith("|---") or ln.startswith("| Name"):
            continue
        first = ln.strip().strip("|").split("|")[0]
        for tok in re.findall(r"`([a-z][a-z0-9_]*)`", first):
            names.append((tok, i + 1))
    return names, start, end


def check_e():
    names, start, end = catalogue()
    path11 = DOC_FILES["11"]
    if start is None:
        F.add("e", path11, 1, "section '9. Event catalogue' not found")
        return
    seen = {}
    for n, ln in names:
        if n in seen:
            F.add("e", path11, ln, f"event name `{n}` appears twice in the catalogue (first at line {seen[n]})")
        seen[n] = ln
    cat = set(seen)
    suffix_rx = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*_(?:" + "|".join(EVENT_SUFFIXES) + r")$")
    schema_ids = ALL_SCHEMA_IDS
    checked_docs = [DOC_FILES[k] for k in ("06", "08", "09", "10")] + [BACKLOG]

    def consider(path, i, tok, why):
        if tok in cat or tok in EVENT_IGNORE:
            return
        if tok in schema_ids or tok in ENUM_VALUES.get("task_kind", ()):
            return
        F.add("e", path, i, f"event `{tok}` ({why}) is not in the catalogue of doc 11 section 9")

    for path in checked_docs:
        lines = lines_of(path)
        is_backlog = path == BACKLOG
        section = ""
        for i, ln in enumerate(lines, 1):
            hm = HEADING.match(ln)
            if hm:
                section = hm.group(2)
            low = ln.lower()
            # explicit lists: doc 06 section 12 table, doc 10 section 8.6 paragraph, lines with "Events:"
            explicit = False
            if path == DOC_FILES["06"] and section.startswith("12.") and ln.startswith("|") and not ln.startswith("|---") \
                    and not ln.startswith("| Event"):
                first = ln.strip().strip("|").split("|")[0]
                for tok in re.findall(r"`([a-z][a-z0-9_]*)`", first):
                    consider(path, i, tok, "06 section 12 table")
                explicit = True
            elif path == DOC_FILES["10"] and section.startswith("8.6") and not hm and ln.strip():
                head = re.sub(r"\{[^}]*\}", "", ln)
                for tok in re.findall(r"`([a-z][a-z0-9_]*)`", head):
                    consider(path, i, tok, "10 section 8.6")
                explicit = True
            elif re.search(r"\bEvents?:", ln) and not is_backlog:
                for tok in re.findall(r"`([a-z][a-z0-9_]*)`", re.sub(r"\{[^}]*\}", "", ln.split(":", 1)[1] if ":" in ln else ln)):
                    consider(path, i, tok, "after 'Events:'")
                explicit = True
            if explicit:
                continue
            if "event" in low:
                if is_backlog:
                    toks = re.findall(r"(?<![\w.`/-])([a-z]+(?:_[a-z0-9]+)+)(?![\w.-])", ln)
                else:
                    toks = re.findall(r"`([a-z][a-z0-9_]*)`", ln)
                for tok in toks:
                    if suffix_rx.match(tok) or tok in cat:
                        consider(path, i, tok, "event mention")
            # SQL / code references: track('x'), emitEvent('x'), name = 'x'
            for m in re.finditer(r"(?:emitEvent|track|logEvent)\(\s*['\"]([a-z_]+)['\"]", ln):
                consider(path, i, m.group(1), "emit call")
            for m in re.finditer(r"events?\.name\s*=\s*'([a-z_]+)'|name\s*=\s*'([a-z_]+_(?:" + "|".join(EVENT_SUFFIXES) + r"))'", ln):
                tok = m.group(1) or m.group(2)
                consider(path, i, tok, "name = literal")


# --------------------------------------------------------------------------------------------
# (f) skill keys
# --------------------------------------------------------------------------------------------

def load_skill_keys():
    g = yaml.safe_load(open(GRAPH, encoding="utf-8"))
    keys = set()

    def walk(o):
        if isinstance(o, dict):
            k = o.get("key")
            if isinstance(k, str) and re.fullmatch(r"[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+", k):
                keys.add(k)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(g)
    return keys


SKILLS = load_skill_keys()
SKILL_RX = re.compile(r"(?<![\w./#-])((?:" + "|".join(NODE_CODES) + r")\.[a-z0-9-]+\.[a-z0-9-]*[a-z0-9])(?![\w-]|\.[a-z0-9_]|\()")


def check_f():
    files = [DOC_FILES[k] for k in ("07", "08", "09", "10")] + sorted(glob.glob(P("content", "sample-problem-templates", "*.yaml"))) + [BACKLOG]
    for path in files:
        lines = lines_of(path)
        for i, ln in enumerate(lines, 1):
            for m in SKILL_RX.finditer(ln):
                key = m.group(1)
                if key in SKILLS or key in SKILL_IGNORE:
                    continue
                if re.search(r"\b(replaced|renamed|formerly|previously|was)\b", ln):
                    continue  # history sentence that names a retired key (documented heuristic)
                # a file name such as sw.main.c or a version number is not a skill key
                if re.search(r"\.(c|h|py|ts|yaml|yml|md|json|sql|csv|log|txt)$", key) and key.count(".") == 2 and \
                        key.rsplit(".", 1)[1] in ("c", "h", "py", "ts", "yaml", "yml", "md", "json", "sql", "csv", "log", "txt"):
                    continue
                F.add("f", path, i, f"skill key `{key}` is not in content/mvp-skill-graph.yaml")


def check_g():
    bundle = P("docs-site", "assets", "syllabi-data.js")
    pillars = sorted(glob.glob(P("content", "syllabi", "pillar-*.md")))
    if not pillars:
        F.add("g", rel(bundle), 1, "no content/syllabi/pillar-*.md files found")
        return
    if not os.path.isfile(bundle):
        F.add("g", rel(bundle), 1, "missing; run python reference/generate_pillar_syllabi.py")
        return
    bundle_m = os.path.getmtime(bundle)
    for path in pillars:
        pm = os.path.getmtime(path)
        if pm > bundle_m + 0.5:
            F.add(
                "g",
                rel(bundle),
                1,
                f"stale vs {rel(path)}; run python reference/generate_pillar_syllabi.py",
            )
            break


def _run_validator_scripts(check_key: str, scripts: list[str]) -> None:
    for script in scripts:
        if not os.path.isfile(script):
            F.add(check_key, rel(script), 1, "missing validator script")
            continue
        proc = subprocess.run(
            [sys.executable, script],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            msg = (proc.stderr or proc.stdout or "exit non-zero").strip().split("\n")[0]
            F.add(check_key, rel(script), 1, msg)


def check_h():
    _run_validator_scripts(
        "h",
        [
            P("reference", "validate_lean_slice.py"),
            P("reference", "validate_spine_coherence.py"),
        ],
    )


def check_i():
    _run_validator_scripts(
        "i",
        [
            P("reference", "validate_lean_manifest.py"),
            P("reference", "validate_safety_briefs.py"),
        ],
    )


# --------------------------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------------------------

CHECKS = {
    "a": check_a,
    "a2": check_a2,
    "b": check_b,
    "c": check_c,
    "d": check_d,
    "e": check_e,
    "f": check_f,
    "g": check_g,
    "h": check_h,
    "i": check_i,
}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--only", help="comma separated check letters, e.g. a,d (a includes a2)")
    ap.add_argument("--quiet", action="store_true", help="do not print OK lines")
    ap.add_argument("--files", help="only report findings whose file path contains this text (e.g. docs/09)")
    args = ap.parse_args(argv)
    sel = set(args.only.split(",")) if args.only else set(CHECKS)
    if "a" in sel:
        sel.add("a2")
    for key in CHECKS:
        if key in sel:
            CHECKS[key]()
    total = 0
    for key in CHECKS:
        if key not in sel:
            continue
        items = sorted(F.by_check.get(key, []), key=lambda t: (t[0], t[1]))
        if args.files:
            items = [t for t in items if args.files in t[0]]
        print(f"\n== {CHECK_TITLES[key]}  [{len(items)} finding(s)]")
        if not items:
            if not args.quiet:
                print("   OK")
        for f, line, msg in items:
            print(f"   {f}:{line}  {msg}")
        total += len(items)
    print(f"\nSummary: {total} finding(s) in {len([k for k in CHECKS if k in sel])} check groups; "
          f"{len(DOC_FILES)} documents, {len(TABLES)} tables, {len(ROUTES)} route paths, {len(SKILLS)} skill keys, "
          f"{len(catalogue()[0])} catalogue events.")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
