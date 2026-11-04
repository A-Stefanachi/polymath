"""Generate, verify and store items for one template (BL-0017; doc 07 sections 5 to 7, FR-060, FR-067).

`write_items` loads the `item_templates` row, rebuilds the template dict, runs `verify.verify_item` for each
seed and inserts `items` (+ `item_secrets`). The status rule is doc 07 section 6:

- decision verified and template status verified      -> items.status `verified`
- decision verified but template not verified, or the only non-passing verifiers were `skipped`
  (code and SPICE verifiers run in the sandbox, later tasks)   -> `needs_human_review` (founder only)
- decision rejected (a verifier or the self-grade failed)       -> `draft`, report kept, never servable

Only this module and the verification pipeline's approval step may set `verified` (CLAUDE.md rule 3).
Idempotent on (template_key, template_version, seed, user_id): the baseline unique constraint treats NULL
user_ids as distinct, so the pool case (user_id null) is guarded here with a transaction-scoped advisory lock
and an explicit lookup. A verified, retired or already-reviewed row is never changed by a re-run.
"""

from __future__ import annotations

import json
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any

import structlog

from polymath_worker.content import safe_expr as se
from polymath_worker.content import tplkit, verify

log = structlog.get_logger("polymath_worker.content.item_writer")

MAX_REPORT_BYTES = 64 * 1024  # doc 07 section 6: size cap per report
# Columns hoisted out of the template file into item_templates (BL-0013); everything else is `body`.
_ALWAYS_HOISTED = ("key", "skill_key", "task_kind", "grader_type", "difficulty_prior", "version")
REWRITABLE = ("draft", "needs_human_review")  # an existing row in another status is left alone


@dataclass(frozen=True)
class WrittenItem:
    item_id: str
    seed: int
    status: str  # items.status of the row (existing or new)
    decision: str | None  # report decision; None when an existing row was left untouched
    created: bool
    untouched: bool


class TemplateNotUsable(Exception):
    """The template row is missing or retired: nothing is generated."""


def _rows(conn: Any, sql: str, params: Sequence[Any] = ()) -> list[tuple[Any, ...]]:
    cur = conn.cursor()
    try:
        cur.execute(sql, tuple(params))
        return [tuple(r) for r in cur.fetchall()] if cur.description else []
    finally:
        cur.close()


@contextmanager
def _transaction(conn: Any) -> Iterator[None]:
    """One explicit transaction on an autocommit connection (connect_database sets autocommit)."""
    previous = conn.autocommit
    conn.autocommit = False
    try:
        yield
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.autocommit = previous


def load_template(conn: Any, key: str, version: int) -> tuple[dict, str]:
    """Rebuild the template dict (row columns plus body) and return it with the row's status.

    pool, interleave, reference_time_s and mastery_eligible are put back only when they differ from the
    column defaults, so a template file that does not declare them keeps the hash of the file
    (`tplkit.template_sha256`) that the sync computed it from.
    """
    rows = _rows(
        conn,
        "select skill_key, task_kind::text, grader_type::text, difficulty_prior, status::text, body, pool,"
        " interleave, reference_time_s, mastery_eligible from public.item_templates"
        " where key = %s and version = %s",
        (key, version),
    )
    if not rows:
        raise TemplateNotUsable(f"template {key} v{version} not found")
    skill_key, task_kind, grader_type, prior, status, body, pool, interleave, ref_time, eligible = rows[0]
    if status == "retired":
        raise TemplateNotUsable(f"template {key} v{version} is retired")
    # `_sync` is the sync's bookkeeping (hash, run id, fuzz job id), not part of the template file.
    tpl = {k: v for k, v in dict(body).items() if k != "_sync"}
    tpl.update(key=key, version=version, skill_key=skill_key, task_kind=task_kind, grader_type=grader_type)
    tpl["difficulty_prior"] = prior
    if pool != "practice":
        tpl["pool"] = pool
    if interleave:
        tpl["interleave"] = True
    if ref_time is not None:
        tpl["reference_time_s"] = ref_time
    if not eligible:
        tpl["mastery_eligible"] = False
    return tpl, status


def decide_status(report: dict, template_status: str) -> str:
    """Doc 07 section 6, decision to items.status."""
    if report["decision"] == "verified":
        return "verified" if template_status == "verified" else "needs_human_review"
    # Rejected: a skipped verifier alone is "cannot decide here" (needs a human); any failure is a draft.
    only_skips = bool(report["reasons"]) and all(
        any(r.startswith(f"{v['id']}: skipped") for v in report["verifiers"] if v["status"] == "skipped")
        for r in report["reasons"]
    )
    return "needs_human_review" if only_skips else "draft"


def _cap_report(report: dict) -> dict:
    """Doc 07 section 6: verifier evidence is truncated, never the decision."""
    if len(json.dumps(report, default=str).encode()) <= MAX_REPORT_BYTES:
        return report
    slim = dict(report)
    slim["verifiers"] = [
        {
            **{k: v[k] for k in ("id", "kind", "status", "ms") if k in v},
            "detail": str(v.get("detail", ""))[:300],
        }
        for v in report["verifiers"]
    ]
    slim["self_grade"] = {"truncated": True}
    slim["reasons"] = [r[:500] for r in report["reasons"]][:50]
    slim["truncated"] = True
    return slim


def build_answer_key(tpl: dict, item: dict) -> dict:
    """The server-side answer key (item_secrets.answer_key); never learner-visible (rule 6)."""
    g, a, c = tpl["grader_type"], tpl["answer"], item["_ctx"]
    key: dict[str, Any] = {"grader_type": g, "answer_spec": a}
    if g == "exact_numeric":
        if a["kind"] == "numeric":
            key["reference"] = float(c[a["value"]])
        else:
            key["reference"] = {"re": float(c[a["re"]]), "im": float(c[a["im"]])}
    elif g == "multiple_choice":
        correct = tplkit.correct_option_id(tpl, c)
        key["reference"] = {
            "correct_option": tplkit.served_option_id(tpl, item["seed"], correct),
            "option_ids": item["_option_ids"],
        }
    elif g == "symbolic_equivalence":
        key["reference"] = str(c[a["reference"]])
        key["misconceptions"] = symbolic_misconceptions(tpl, item)
    return key


def symbolic_misconceptions(tpl: dict, item: dict) -> list[dict[str, str]]:
    """Each misconception's tag and wrong-answer expression evaluated for the item's parameters (00a J4).

    Written with `^` for powers, the spelling the learner grader reads; the verifier's self-grade checks the same
    expressions, so a key built here tags exactly what the pipeline verified."""
    ctx = verify._exact_ctx(tpl, item["params"])
    out: list[dict[str, str]] = []
    for m in tpl.get("misconceptions", []):
        if "wrong_answer_expr" not in m:
            continue
        expr = se.evaluate(m["wrong_answer_expr"], ctx, se.sympy_funcs(), se.sympy_consts())
        out.append(
            {
                "tag": m["tag"],
                "expr": str(expr).replace("**", "^"),
                "feedback_md": m.get("feedback_md", ""),
            }
        )
    return out


def _solution_step(step: dict, ctx: dict, units: dict) -> dict:
    out = {"id": step["id"], "text_md": tplkit.render_text(step["text_md"], ctx, units)}
    if step.get("label"):
        out["label"] = tplkit.render_text(step["label"], ctx, units)
    return out


def build_solution(tpl: dict, item: dict) -> dict:
    c, u = item["_ctx"], tplkit.unit_map(tpl)
    # 00a K5: an optional step label is template text, so it is filled in like text_md; no label, no key.
    sol: dict[str, Any] = {"steps": [_solution_step(s, c, u) for s in tpl["solution"]["steps"]]}
    if tpl["solution"].get("explanation_md"):
        sol["explanation_md"] = tplkit.render_text(tpl["solution"]["explanation_md"], c, u)
    return sol


def _json(value: Any) -> str:
    return json.dumps(value, default=str, allow_nan=False)


def _existing(conn: Any, key: str, version: int, seed: int, user_id: str | None) -> tuple[str, str] | None:
    rows = _rows(
        conn,
        "select id::text, status::text from public.items where template_key = %s and template_version = %s"
        " and seed = %s and user_id is not distinct from %s::uuid",
        (key, version, seed, user_id),
    )
    return rows[0] if rows else None


def _store(
    conn: Any,
    tpl: dict,
    version: int,
    seed: int,
    user_id: str | None,
    result: dict,
    status: str,
    report: dict,
) -> WrittenItem:
    item = result["item"]
    secrets = (_json(build_answer_key(tpl, item)), _json(build_solution(tpl, item)))
    hidden = ((tpl.get("answer") or {}).get("tests") or {}).get("hidden")
    key = tpl["key"]
    with _transaction(conn):
        _rows(
            conn,
            "select pg_advisory_xact_lock(hashtextextended(%s, 0))",
            (f"item:{key}:{version}:{seed}:{user_id}",),
        )
        existing = _existing(conn, key, version, seed, user_id)
        if existing is not None and existing[1] not in REWRITABLE:
            return WrittenItem(existing[0], seed, existing[1], None, False, True)
        if existing is None:
            row = _rows(
                conn,
                "insert into public.items (template_key, template_version, seed, params, rendered,"
                " verification_report, status, user_id) values (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,"
                " %s::public.content_status, %s::uuid) returning id::text",
                (
                    key,
                    version,
                    seed,
                    _json(item["params"]),
                    _json(item["rendered"]),
                    _json(report),
                    status,
                    user_id,
                ),
            )
            item_id, created = row[0][0], True
        else:
            item_id, created = existing[0], False
            _rows(
                conn,
                "update public.items set params = %s::jsonb, rendered = %s::jsonb, verification_report = %s::jsonb,"
                " status = %s::public.content_status where id = %s::uuid",
                (_json(item["params"]), _json(item["rendered"]), _json(report), status, item_id),
            )
        _rows(
            conn,
            "insert into public.item_secrets (item_id, answer_key, solution, hidden_tests)"
            " values (%s::uuid, %s::jsonb, %s::jsonb, %s::jsonb)"
            " on conflict (item_id) do update set answer_key = excluded.answer_key,"
            " solution = excluded.solution, hidden_tests = excluded.hidden_tests",
            (item_id, secrets[0], secrets[1], _json(hidden) if hidden is not None else None),
        )
    return WrittenItem(item_id, seed, status, report["decision"], created, False)


def write_items(
    conn: Any, template_key: str, template_version: int, seeds: Sequence[int], user_id: str | None = None
) -> list[WrittenItem]:
    """Generate and verify one item per seed and store it; see the module docstring for the rules."""
    tpl, template_status = load_template(conn, template_key, template_version)
    out: list[WrittenItem] = []
    for seed in seeds:
        existing = _existing(conn, template_key, template_version, seed, user_id)
        if existing is not None and existing[1] not in REWRITABLE:
            out.append(WrittenItem(existing[0], seed, existing[1], None, False, True))
            continue
        try:
            result = verify.verify_item(tpl, seed)
        except RuntimeError as e:  # the parameter sampler found no draw that satisfies the constraints
            log.warning(
                "item_generation_failed",
                template_key=template_key,
                template_version=template_version,
                seed=seed,
                error=str(e)[:300],
            )
            continue
        report = result["report"]
        # Summary fields required by items_verified_has_report (NFR-03): ids that passed, and agreement.
        report["verifier"] = [v["id"] for v in report["verifiers"] if v["status"] == "pass"]
        report["agreed"] = report["decision"] == "verified"
        status = decide_status(report, template_status)
        written = _store(conn, tpl, template_version, seed, user_id, result, status, _cap_report(report))
        if report["decision"] != "verified":
            # The event item_verification_failed (doc 07 section 6) needs events.user_id, which pool items lack,
            # so a structured log line stands in until that gap is decided (see progress.md).
            log.warning(
                "item_verification_failed",
                template_key=template_key,
                template_version=template_version,
                seed=seed,
                item_status=status,
                reasons=report["reasons"][:10],
            )
        out.append(written)
    return out
