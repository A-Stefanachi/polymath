"""Template loading, deterministic parameter sampling, evaluation and rendering (reference implementation).

This is the Python reference for docs/07 sections 3 to 5. The production worker must behave identically:
same seed -> same params -> same rendered item, on any machine.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
from decimal import Decimal
from pathlib import Path

import yaml

from polymath_worker.content import safe_expr as se

# Port of polymath-app-spec/reference/verifiers/tplkit.py (BL-0015). Only the imports and this path
# differ; the reference copy stays the vector source. Repository root = four levels above this file.
CONTENT_DIR = Path(__file__).resolve().parents[4] / "polymath-app-spec" / "content"
TEMPLATE_DIR = CONTENT_DIR / "sample-problem-templates"

E_SERIES = {
    "E6": [1.0, 1.5, 2.2, 3.3, 4.7, 6.8],
    "E12": [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
    "E24": [
        1.0,
        1.1,
        1.2,
        1.3,
        1.5,
        1.6,
        1.8,
        2.0,
        2.2,
        2.4,
        2.7,
        3.0,
        3.3,
        3.6,
        3.9,
        4.3,
        4.7,
        5.1,
        5.6,
        6.2,
        6.8,
        7.5,
        8.2,
        9.1,
    ],
}


class NoDateLoader(yaml.SafeLoader):
    pass


NoDateLoader.yaml_implicit_resolvers = {
    k: [(t, r) for t, r in v if t != "tag:yaml.org,2002:timestamp"]
    for k, v in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def load_template(path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=NoDateLoader)  # nosec B506 - NoDateLoader subclasses SafeLoader


def load_all(directory=TEMPLATE_DIR) -> dict:
    return {t["key"]: t for t in (load_template(p) for p in sorted(Path(directory).glob("*.yaml")))}


def template_sha256(tpl: dict) -> str:
    """Hash of the canonical template body. Review sign-offs are valid only for this hash."""
    body = {k: v for k, v in tpl.items() if k not in ("authoring_status",)}
    body["provenance"] = {k: v for k, v in tpl["provenance"].items() if k != "review"}
    return hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()


def rng_for(tpl: dict, seed: int) -> random.Random:
    h = hashlib.sha256(f"{tpl['key']}|{tpl['version']}|{seed}".encode()).digest()
    return random.Random(int.from_bytes(h[:8], "big"))


# ----------------------------------------------------------------------------- sampling


def _draw(p: dict, rng: random.Random):
    t = p["type"]
    if t == "int":
        cands = [v for v in range(p["min"], p["max"] + 1) if not (p.get("nonzero") and v == 0)]
        return rng.choice(cands)
    if t == "float":
        k = int(round((p["max"] - p["min"]) / p["step"]))
        cands = [
            round(p["min"] + i * p["step"], 12)
            for i in range(k + 1)
            if not (p.get("nonzero") and p["min"] + i * p["step"] == 0)
        ]
        return rng.choice(cands)
    if t == "choice":
        return rng.choice(p["values"])
    if t == "e_series":
        m = rng.choice(E_SERIES[p["series"]])
        d = rng.randint(p["decade_min"], p["decade_max"])
        return float(Decimal(str(m)).scaleb(d))
    if t == "bool":
        return rng.random() < 0.5
    raise ValueError(f"unknown parameter type {t}")


def build_context(tpl: dict, params: dict, mode: str = "float", symbols: dict | None = None) -> dict:
    """Return {names..., derived..., outputs...}. mode 'float' uses Python floats; 'exact' uses SymPy rationals;
    'sympy' is 'exact' plus free symbols (for symbolic_equivalence outputs)."""
    if mode == "float":
        funcs, consts, names = se.float_funcs(), se.float_consts(), dict(params)
    else:
        import sympy as sp

        funcs, consts = se.sympy_funcs(allow_diff=True), se.sympy_consts()
        names = {k: _exact(v) for k, v in params.items()}
        names.update(symbols or {})
    ctx = dict(names)
    for d in tpl.get("derived", []):
        ctx[d["name"]] = se.evaluate(d["expr"], ctx, funcs, consts)
    gen = tpl["solution"]["generator"]
    if gen["method"] in ("closed_form", "reference_netlist") and gen.get("outputs"):
        for k, expr in gen["outputs"].items():
            ctx[k] = se.evaluate(expr, ctx, funcs, consts)
    elif gen["method"] == "fault_table":
        table = gen["tables"]["readings"][ctx["fault"]]
        for k, expr in table.items():
            ctx[k] = se.evaluate(expr, ctx, funcs, consts)
    return ctx


def _exact(v):
    import sympy as sp

    if isinstance(v, bool) or isinstance(v, str):
        return v
    if isinstance(v, int):
        return sp.Integer(v)
    if isinstance(v, float):
        return sp.Rational(repr(v))
    return v


def _symbols(tpl: dict) -> dict:
    ans = tpl["answer"]
    if tpl["grader_type"] == "symbolic_equivalence":
        import sympy as sp

        return {v: sp.Symbol(v, real=True) for v in ans["variables"]}
    return {}


def eval_context(tpl: dict, params: dict) -> dict:
    """The context used for serving: sympy mode for symbolic templates, float otherwise."""
    if tpl["grader_type"] == "symbolic_equivalence":
        return build_context(tpl, params, "sympy", _symbols(tpl))
    return build_context(tpl, params, "float")


def option_values(tpl: dict, ctx: dict) -> dict:
    out = {}
    if tpl["grader_type"] == "multiple_choice":
        for o in tpl["answer"]["options"]:
            if "value_expr" in o:
                out[o["id"]] = float(se.evaluate(o["value_expr"], ctx))
    return out


def _separated(vals: list[float], rel: float) -> bool:
    for i in range(len(vals)):
        for j in range(i + 1, len(vals)):
            a, b = vals[i], vals[j]
            if abs(a - b) < rel * max(abs(a), abs(b), 1e-300):
                return False
    return True


def sample_params(tpl: dict, seed: int, max_tries: int = 500):
    """Deterministic rejection sampling. Returns (params, ctx, tries). Raises RuntimeError if no valid draw."""
    rng = rng_for(tpl, seed)
    for tries in range(1, max_tries + 1):
        params = {p["name"]: _draw(p, rng) for p in tpl["parameters"]}
        try:
            ctx = eval_context(tpl, params)
            ok = True
            plain = {k: v for k, v in ctx.items()}
            for c in tpl.get("constraints", []):
                if not se.evaluate(c["expr"], plain):
                    ok = False
                    break
            if ok and tpl["grader_type"] == "multiple_choice":
                rel = tpl["answer"].get("min_separation_rel", 0)
                vals = list(option_values(tpl, ctx).values())
                if rel and vals and not _separated(vals, rel):
                    ok = False
        except se.ExprError:
            ok = False
        if ok:
            return params, ctx, tries
    raise RuntimeError(f"no valid parameter draw after {max_tries} tries for {tpl['key']} seed {seed}")


# ----------------------------------------------------------------------------- formatting

_SI = [
    (1e12, "T"),
    (1e9, "G"),
    (1e6, "M"),
    (1e3, "k"),
    (1.0, ""),
    (1e-3, "m"),
    (1e-6, "u"),
    (1e-9, "n"),
    (1e-12, "p"),
]
_UNIT_SYM = {"ohm": "Ω", "V": "V", "A": "A", "F": "F", "Hz": "Hz", "s": "s", "H": "H", "W": "W"}
_UNIT_TEX = {
    "ohm": r"\Omega",
    "V": r"\mathrm{V}",
    "A": r"\mathrm{A}",
    "F": r"\mathrm{F}",
    "Hz": r"\mathrm{Hz}",
    "s": r"\mathrm{s}",
    "H": r"\mathrm{H}",
    "W": r"\mathrm{W}",
}


def _sig(x: float, n: int = 3) -> str:
    if x == 0:
        return "0"
    s = f"{x:.{n}g}"
    if "e" in s:
        s = f"{x:.{n}e}"
        m, e = s.split("e")
        m = m.rstrip("0").rstrip(".")
        return f"{m}e{int(e)}"
    return s


def eng_parts(value: float, n: int = 3):
    if value == 0:
        return "0", ""
    a = abs(value)
    for scale, pre in _SI:
        if a >= scale * 0.9995:
            return _sig(value / scale, n), pre
    return _sig(value / 1e-12, n), "p"


def fmt_eng(value: float, unit: str, tex: bool = False) -> str:
    num, pre = eng_parts(value)
    if tex:
        base = r"\Omega" if unit == "ohm" else _UNIT_TEX.get(unit, r"\mathrm{%s}" % unit)
        if pre == "u":
            # "u" is only the ASCII alias for micro; KaTeX shows it as the letter u (issue #14).
            u = r"\mu" + base
        elif unit == "ohm":
            u = (r"\mathrm{%s}" % pre if pre else "") + base
        else:
            u = (
                r"\mathrm{%s%s}" % (pre, base[len(r"\mathrm{") : -1])
                if base.startswith(r"\mathrm{")
                else base
            )
        return rf"{num}\,{u}"
    pre = "µ" if pre == "u" else pre
    return f"{num} {pre}{_UNIT_SYM.get(unit, unit)}"


def _cplx_str(z: complex, tex: bool = False) -> str:
    z = complex(z)
    re_, im_ = z.real, z.imag
    r = _num(re_)
    i = _num(abs(im_))
    if abs(im_) < 1e-12:
        return r
    ipart = ("" if i == "1" else i) + "j"
    if abs(re_) < 1e-12:
        return ("-" if im_ < 0 else "") + ipart
    return f"{r} {'-' if im_ < 0 else '+'} {ipart}"


def _num(x: float) -> str:
    if abs(x - round(x)) < 1e-9:
        return str(int(round(x)))
    return _sig(x, 4)


def apply_filter(value, filt: str | None, default_unit: str | None):
    if filt is None or filt == "":
        if isinstance(value, bool):
            return str(value).lower()
        if isinstance(value, (int, float)):
            return _num(float(value))
        return str(value)
    name, _, arg = filt.partition(":")
    if name == "eng":
        return fmt_eng(float(value), arg or default_unit or "")
    if name == "tex":
        return fmt_eng(float(value), arg or default_unit or "", tex=True)
    if name == "sig":
        return _sig(float(value), int(arg))
    if name == "fixed":
        return f"{float(value):.{int(arg)}f}"
    if name == "int":
        return str(int(round(float(value))))
    if name == "paren":
        v = int(round(float(value)))
        return f"({v})" if v < 0 else str(v)
    if name in ("cplx", "tex_cplx"):
        return _cplx_str(value, tex=name == "tex_cplx")
    if name == "spice":
        return repr(float(value))
    if name == "raw":
        return str(value)
    raise ValueError(f"unknown filter {name}")


_PH = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\|\s*([^}]*?))?\s*\}\}")


def render_text(text: str, ctx: dict, units: dict, extra: dict | None = None) -> str:
    extra = extra or {}

    def sub(m):
        name, filt = m.group(1), m.group(2)
        if name in extra:
            return extra[name] if filt is None else apply_filter(extra[name], filt, units.get(name))
        if name not in ctx:
            raise KeyError(f"placeholder '{name}' is not defined")
        return apply_filter(ctx[name], filt, units.get(name))

    return _PH.sub(sub, text)


def unit_map(tpl: dict) -> dict:
    u = {p["name"]: p.get("unit") for p in tpl["parameters"] if p.get("unit")}
    u.update({d["name"]: d.get("unit") for d in tpl.get("derived", []) if d.get("unit")})
    return u


# ----------------------------------------------------------------------------- items


def served_option_id(tpl: dict, seed: int, option_id: str) -> str:
    return hashlib.sha256(f"{tpl['key']}|{tpl['version']}|{seed}|{option_id}".encode()).hexdigest()[:12]


def generate_item(tpl: dict, seed: int) -> dict:
    params, ctx, tries = sample_params(tpl, seed)
    units = unit_map(tpl)
    r = tpl["render"]
    extra = {}
    if tpl["grader_type"] == "spice_compare":
        extra["skeleton"] = render_text(tpl["answer"]["skeleton"], ctx, units).rstrip("\n")
    stem = render_text(r["stem_md"], ctx, units, extra)
    rendered = {
        "stem_md": stem,
        "alt_text": render_text(r["alt_text"], ctx, units),
        "answer_prompt": r.get("answer_prompt", ""),
    }
    if r.get("reading_table"):
        rendered["reading_table"] = [
            {"label": row["label"], "text": apply_filter(ctx[row["value_expr"]], row["format"], None)}
            for row in r["reading_table"]
        ]
    option_ids = {}
    if tpl["grader_type"] == "multiple_choice":
        opts = []
        vals = option_values(tpl, ctx)
        for o in tpl["answer"]["options"]:
            text = (
                render_text(o["text_md"], ctx, units, {"value": vals[o["id"]]} if o["id"] in vals else None)
                if "{{" in o["text_md"]
                else o["text_md"]
            )
            if "{{value|" in o["text_md"] and o["id"] in vals:
                text = _PH.sub(lambda m: apply_filter(vals[o["id"]], m.group(2), "ohm"), o["text_md"])
            opts.append({"id": o["id"], "text_md": text})
        correct = correct_option_id(tpl, ctx)
        rng = rng_for(tpl, seed + 10**9)
        wrong = [o for o in opts if o["id"] != correct]
        k = tpl["answer"]["n_shown"] - 1
        shown_wrong = rng.sample(wrong, k) if k < len(wrong) else wrong
        shown = [o for o in opts if o["id"] == correct][0:1] + shown_wrong
        if tpl["answer"]["shuffle"]:
            rng.shuffle(shown)
        else:
            order = [o["id"] for o in tpl["answer"]["options"]]
            shown.sort(key=lambda o: order.index(o["id"]))
        # Served ids are opaque per item (CLAUDE.md rule 6); the mapping is server-side and belongs in item_secrets
        option_ids = {served_option_id(tpl, seed, o["id"]): o["id"] for o in shown}
        rendered["options"] = [{**o, "id": served_option_id(tpl, seed, o["id"])} for o in shown]
    return {
        "template_key": tpl["key"],
        "template_version": tpl["version"],
        "seed": seed,
        "params": params,
        "rejections": tries - 1,
        "rendered": rendered,
        "_option_ids": option_ids,
        "_ctx": ctx,  # server-side only; never sent to the client
    }


def correct_option_id(tpl: dict, ctx: dict) -> str:
    ids = []
    for o in tpl["answer"]["options"]:
        if "correct_when" in o:
            if se.evaluate(o["correct_when"], ctx):
                ids.append(o["id"])
        elif o.get("correct"):
            ids.append(o["id"])
    if len(ids) != 1:
        raise RuntimeError(f"expected exactly one correct option, got {ids}")
    return ids[0]
