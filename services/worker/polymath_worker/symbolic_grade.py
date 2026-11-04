"""POST /grade/symbolic: the symbolic_equivalence grader behind the HMAC gate (BL-0054; doc 08 section 2.2).

The web app sends the learner's expression and the server-side answer key (reference expression and the
template's answer block); it is the only caller and signs every request (hmac_auth). Learner text is never given
to eval(), sympify() or parse_expr(): `content.symbolic_equiv` tokenises it, checks an allowlist and evaluates with
the restricted evaluator, with a 200-character cap and a 1.5 s SIGALRM limit. Grading runs in a long-lived child
process (so SIGALRM has a main thread and a stuck grade can be killed). Unreadable, forbidden, oversize or
too-complex input comes back as `status: invalid_input` (never as a wrong answer, 00a D2/B4). The reference comes
from the answer key, not from the learner, but goes through the same restricted evaluator.

Nothing here logs the learner's text or the reference (CLAUDE.md rule 5): the access log records route and status.
"""

from __future__ import annotations

import multiprocessing
import re
import threading
from multiprocessing.connection import Connection
from multiprocessing.process import BaseProcess
from typing import Any

import sympy as sp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from polymath_worker.content import safe_expr as se
from polymath_worker.content import symbolic_equiv as sq

GRADER_TIMEOUT_S = 1.5
MAX_REFERENCE_LEN = 2000
MAX_VARIABLES = 8
MAX_MISCONCEPTIONS = 16
_IDENT = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,15}$")


class SymbolicSpec(BaseModel):
    """The template's answer block. Unknown keys (such as the name of the reference) are ignored."""

    model_config = ConfigDict(extra="ignore")

    variables: list[str] = Field(min_length=1, max_length=MAX_VARIABLES)
    sample_domain: dict[str, tuple[float, float]]
    forbid_functions: list[str] = Field(default_factory=list, max_length=32)
    form: str = "any"
    numeric_rel_tol: float = Field(default=1e-9, gt=0, le=1e-3)

    @field_validator("variables")
    @classmethod
    def _identifiers(cls, names: list[str]) -> list[str]:
        if any(not _IDENT.match(n) for n in names) or len(set(names)) != len(names):
            raise ValueError("variables must be distinct identifiers")
        return names

    @field_validator("form")
    @classmethod
    def _form(cls, form: str) -> str:
        if form not in ("any", "expanded", "factored"):
            raise ValueError("form must be any, expanded or factored")
        return form

    @model_validator(mode="after")
    def _domain_covers_variables(self) -> SymbolicSpec:
        for v in self.variables:
            lo_hi = self.sample_domain.get(v)
            if lo_hi is None or not lo_hi[0] < lo_hi[1]:
                raise ValueError("sample_domain needs an interval lo < hi for every variable")
        return self


class Misconception(BaseModel):
    """One entry of the answer key's `misconceptions` (00a J4): the wrong answer for this item's parameters."""

    model_config = ConfigDict(extra="ignore")

    tag: str = Field(min_length=1, max_length=100)
    expr: str = Field(min_length=1, max_length=MAX_REFERENCE_LEN)
    feedback_md: str = Field(default="", max_length=2000)


class SymbolicGradeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # No length cap here on purpose: oversize text is graded invalid_input by the checker, not a 422.
    response_text: str
    reference: str = Field(min_length=1, max_length=MAX_REFERENCE_LEN)
    spec: SymbolicSpec
    misconceptions: list[Misconception] = Field(default_factory=list, max_length=MAX_MISCONCEPTIONS)


def parse_reference(reference: str, variables: list[str]) -> sp.Expr:
    syms = {v: sp.Symbol(v, real=True) for v in variables}
    funcs = {k: v for k, v in se.sympy_funcs(allow_diff=False).items() if k in sq.FUNCS}
    consts = {k: v for k, v in se.sympy_consts().items() if k in sq.CONSTS}
    return sp.sympify(se.evaluate(reference, syms, funcs, consts, max_len=MAX_REFERENCE_LEN))


class InvalidReference(Exception):
    """The answer key's reference is unreadable: a data fault, not the learner's."""


def grade_symbolic(req: SymbolicGradeRequest) -> dict[str, Any]:
    """The grade JSON of doc 08 section 1.2 with `status` of 00a D2 (`graded` or `invalid_input`).

    Runs in the grader process (main thread, so the SIGALRM limit works)."""
    try:
        reference = parse_reference(req.reference, req.spec.variables)
    except se.ExprError as e:
        raise InvalidReference from e
    wrong = [m.model_dump() for m in req.misconceptions]
    try:
        grade = sq.check_equivalent(
            req.response_text, reference, req.spec.model_dump(), wrong, seconds=GRADER_TIMEOUT_S
        )
    except (
        se.ExprError
    ) as e:  # the learner's text is handled inside the checker; this is a misconception expr
        raise InvalidReference from e
    grade.setdefault("status", "graded")
    # Only the first matching misconception is reported (00a J4), with its own feedback.
    tags = grade["misconception_tags"]
    if tags:
        first = next(m for m in req.misconceptions if m.tag == tags[0])
        grade["misconception_tags"] = [first.tag]
        grade["feedback"] = first.feedback_md or "Not equivalent to the correct expression."
    return grade


def timeout_grade() -> dict[str, Any]:
    """Result when the grader process did not answer in time (doc 08 section 2: invalid_input, never wrong)."""
    detail = {"method": "timeout"}
    return {
        "status": "invalid_input",
        "score": 0.0,
        "correct": False,
        "graders": [{"type": "symbolic_equivalence", "score": 0.0, "detail": detail}],
        "feedback": "That expression was too complex to check in time. Try simplifying it.",
        "misconception_tags": [],
    }


def _serve(conn: Connection) -> None:
    """Child process loop. A separate process gives SIGALRM a main thread and lets the parent kill a grade that
    is stuck inside native code, which an in-process alarm cannot interrupt."""
    grade_symbolic(
        SymbolicGradeRequest(
            response_text="x+x",
            reference="2*x",
            spec=SymbolicSpec(variables=["x"], sample_domain={"x": (1.0, 2.0)}),
        )
    )  # warm SymPy's caches before the first learner request
    conn.send(("ready", None))
    while True:
        try:
            payload = conn.recv()
        except EOFError:
            return
        try:
            conn.send(("ok", grade_symbolic(SymbolicGradeRequest.model_validate(payload))))
        except InvalidReference:
            conn.send(("invalid_reference", None))


class GraderProcess:
    """One long-lived grader process; calls are serialised. A call past `hard_timeout_s` kills it and the next
    call starts a fresh one."""

    START_TIMEOUT_S = 60.0

    def __init__(self, hard_timeout_s: float = GRADER_TIMEOUT_S + 1.5) -> None:
        self._hard_timeout_s = hard_timeout_s
        self._lock = threading.Lock()
        self._proc: BaseProcess | None = None
        self._conn: Connection | None = None

    def _start(self) -> Connection:
        ctx = multiprocessing.get_context("spawn")  # fork is unsafe with the server's threads
        parent, child = ctx.Pipe()
        proc = ctx.Process(target=_serve, args=(child,), daemon=True, name="symbolic-grader")
        proc.start()
        child.close()
        self._proc, self._conn = proc, parent
        if not parent.poll(self.START_TIMEOUT_S) or parent.recv()[0] != "ready":
            self._kill()
            raise RuntimeError("grader process did not start")
        return parent

    def _kill(self) -> None:
        if self._proc is not None:
            self._proc.kill()
            self._proc.join(5)
        if self._conn is not None:
            self._conn.close()
        self._proc = self._conn = None

    def warm_up(self) -> None:
        with self._lock:
            if self._conn is None:
                self._start()

    def close(self) -> None:
        with self._lock:
            self._kill()

    def grade(self, req: SymbolicGradeRequest) -> dict[str, Any]:
        with self._lock:
            conn = self._conn or self._start()
            try:
                conn.send(req.model_dump())
                if not conn.poll(self._hard_timeout_s):
                    self._kill()
                    return timeout_grade()
                kind, value = conn.recv()
            except (EOFError, OSError):
                self._kill()
                raise RuntimeError("grader process died") from None
        if kind == "invalid_reference":
            raise InvalidReference
        return value  # type: ignore[no-any-return]


grader = GraderProcess()
router = APIRouter()


@router.post("/grade/symbolic")
def grade_symbolic_route(req: SymbolicGradeRequest) -> dict[str, Any]:
    try:
        return grader.grade(req)
    except InvalidReference:
        # No detail: the reference is the answer key. The caller treats any non-200 as a worker failure.
        raise HTTPException(status_code=422, detail={"code": "invalid_reference"}) from None
