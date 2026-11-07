#!/usr/bin/env python3
"""Validate concept primers (lessons) in content/lessons/ (00a K6).

Checks, per file:
  1. schemas/lesson.schema.json validates the file.
  2. The file is named <skill_key>.yaml and the skill exists in content/mvp-skill-graph.yaml and is not a stub.
  3. Word limits: each screen body at most 150 words, the recap at most 60 words.
  4. Screen ids, check ids and option ids within a check are unique; each check has exactly one correct option.
  5. When any template of the skill (content/templates/**) declares misconception tags, the lesson's
     misconception.tag is one of them, so a graded misconception can link back to the lesson (00a K8).
  6. Figures (on screens, and on checks since 00a M5) are safe, self-contained SVG: well-formed XML with an
     <svg> root, no script, foreignObject or event attributes, and no reference outside the document.
  7. Visual first (00a M6): every lesson has at least one figure, and no figure text is smaller than 12.

Usage: python3 reference/validate_lessons.py [lesson.yaml ...]
Exit code 0 when every file passes (an empty folder passes), 1 otherwise.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "schemas" / "lesson.schema.json"
LESSON_DIR = ROOT / "content" / "lessons"
TEMPLATE_DIR = ROOT / "content" / "templates"
GRAPH = ROOT / "content" / "mvp-skill-graph.yaml"

MAX_SCREEN_WORDS = 150
MAX_RECAP_WORDS = 60
MIN_FIGURE_FONT = 12  # 00a M6: figure text size in SVG user units (figures are drawn about 300 wide)
SVG_NS = "{http://www.w3.org/2000/svg}"
FORBIDDEN_TAGS = {"script", "foreignobject", "iframe", "object", "embed", "image", "use"}
HREF_ATTRS = {"href", "{http://www.w3.org/1999/xlink}href"}


class NoDateLoader(yaml.SafeLoader):
    """SafeLoader that keeps ISO dates as strings."""


NoDateLoader.yaml_implicit_resolvers = {
    k: [(tag, rx) for tag, rx in v if tag != "tag:yaml.org,2002:timestamp"]
    for k, v in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=NoDateLoader)


def words(text):
    """Word count of Markdown text, with inline and display math counted as one word each."""
    text = re.sub(r"\$\$.*?\$\$|\$[^$]*\$", " m ", text, flags=re.S)
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'’.-]*", text))


def skill_index():
    graph = load_yaml(GRAPH)
    return {s["key"]: s for s in graph["skills"]}


def template_tags():
    tags = {}
    for p in sorted(TEMPLATE_DIR.glob("*/*.yaml")):
        t = load_yaml(p)
        for m in t.get("misconceptions") or []:
            tags.setdefault(t["skill_key"], set()).add(m["tag"])
    return tags


def svg_problems(svg):
    out = []
    try:
        root = ET.fromstring(svg)
    except ET.ParseError as exc:
        return [f"figure is not well-formed XML ({exc})"]
    if root.tag not in ("svg", SVG_NS + "svg"):
        out.append("figure root element must be <svg>")
    for el in root.iter():
        name = el.tag.split("}")[-1].lower()
        if name in FORBIDDEN_TAGS:
            out.append(f"figure uses forbidden element <{name}>")
        for attr, value in el.attrib.items():
            local = attr.split("}")[-1].lower()
            if local.startswith("on"):
                out.append(f"figure has event attribute {local}")
            if attr in HREF_ATTRS and not value.startswith("#"):
                out.append(f"figure references outside the document ({value[:40]})")
            if "url(" in value and not re.fullmatch(r"\s*url\(#[^)]+\)\s*", value):
                out.append(f"figure attribute {local} uses a non-local url()")
    return out


def check_file(path, validator, skills, tags):
    problems = []
    doc = load_yaml(path)
    for e in sorted(validator.iter_errors(doc), key=lambda e: list(e.absolute_path)):
        loc = "/".join(str(x) for x in e.absolute_path) or "(root)"
        problems.append(f"schema at {loc}: {e.message[:200]}")
    if problems or not isinstance(doc, dict):
        return problems
    key = doc["skill_key"]
    if path.name != f"{key}.yaml":
        problems.append(f"file name must be {key}.yaml")
    skill = skills.get(key)
    if skill is None:
        problems.append(f"skill {key} is not in content/mvp-skill-graph.yaml")
    elif skill.get("status") == "stub":
        problems.append(f"skill {key} is a stub; stubs are never taught")
    screen_ids = [s["id"] for s in doc["screens"]]
    if len(screen_ids) != len(set(screen_ids)):
        problems.append("screen ids are not unique")
    for s in doc["screens"]:
        n = words(s["body_md"])
        if n > MAX_SCREEN_WORDS:
            problems.append(f"screen {s['id']} has {n} words (max {MAX_SCREEN_WORDS})")
        if "figure" in s:
            problems += [f"screen {s['id']}: {p}" for p in svg_problems(s["figure"]["svg"])]
    n = words(doc["recap_md"])
    if n > MAX_RECAP_WORDS:
        problems.append(f"recap has {n} words (max {MAX_RECAP_WORDS})")
    check_ids = [c["id"] for c in doc["checks"]]
    if len(check_ids) != len(set(check_ids)):
        problems.append("check ids are not unique")
    for c in doc["checks"]:
        if "figure" in c:  # 00a M5
            problems += [f"check {c['id']}: {p}" for p in svg_problems(c["figure"]["svg"])]
        opt_ids = [o["id"] for o in c["options"]]
        if len(opt_ids) != len(set(opt_ids)):
            problems.append(f"check {c['id']}: option ids are not unique")
        n_correct = sum(1 for o in c["options"] if o["correct"])
        if n_correct != 1:
            problems.append(f"check {c['id']}: {n_correct} correct options (exactly 1 required)")
    # 00a M6, visual first: at least one figure per lesson, and figure text large enough to read on a phone
    figures = [(f"screen {x['id']}", x["figure"]) for x in doc["screens"] if "figure" in x] + \
              [(f"check {x['id']}", x["figure"]) for x in doc["checks"] if "figure" in x]
    if not figures:
        problems.append("the lesson has no figure; draw the idea (00a M6)")
    for where, fig in figures:
        small = [float(n) for n in re.findall(r'font-size="([0-9.]+)"', fig["svg"]) if float(n) < MIN_FIGURE_FONT]
        if small:
            problems.append(f"{where}: figure text of size {', '.join(f'{n:g}' for n in small)} (min {MIN_FIGURE_FONT})")
    known = tags.get(key)
    if known and doc["misconception"]["tag"] not in known:
        problems.append(
            f"misconception tag {doc['misconception']['tag']} matches no template of {key} "
            f"(known: {', '.join(sorted(known))})"
        )
    return problems


def main(argv):
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    paths = [Path(a) for a in argv] if argv else sorted(LESSON_DIR.glob("*.yaml"))
    skills, tags = skill_index(), template_tags()
    failures = 0
    for p in paths:
        problems = check_file(p, validator, skills, tags)
        if problems:
            failures += 1
            print(f"FAIL {p.name}")
            for msg in problems[:20]:
                print(f"   {msg}")
        else:
            print(f"ok   {p.name}")
    print(f"{len(paths) - failures}/{len(paths)} lessons valid")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
