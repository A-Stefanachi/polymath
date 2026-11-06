#!/usr/bin/env python3
"""Reference implementation for docs/06-learner-model-and-scheduler-spec.md.

Pure standard library. Deterministic. Not production code: production uses TypeScript
and the `ts-fsrs` library for FSRS. This file defines the *behaviour* that the
production code must reproduce; the test vectors in scheduler_test_vectors.json are
generated from this file and are the acceptance tests.

Usage:
    python3 scheduler_reference.py generate  scheduler_test_vectors.json
    python3 scheduler_reference.py check     scheduler_test_vectors.json
    python3 scheduler_reference.py selftest
    python3 scheduler_reference.py sim [weeks] [seeds]    (workload simulation for docs/00f; needs PyYAML; not an oracle)
"""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Protocol, Tuple

# --------------------------------------------------------------------------------------
# Parameters (spec section 9). Every value here is a default; experiments may override.
# --------------------------------------------------------------------------------------
PARAMS: Dict[str, Any] = {
    "elo_scale": 400.0,
    "elo_init_default": 1300.0,
    "k0": 48.0,
    "k_min": 16.0,
    "k_half_n": 10.0,
    "k_item0": 24.0,
    "k_item_min": 4.0,
    "k_item_half_n": 20.0,
    "w_hint2": 0.5,
    "w_hint3": 0.25,
    "w_hint4": 0.5,          # learner update weight after a reveal (score forced to 0)
    "w_scaffold": 0.5,       # faded_problem
    "w_rapid_guess": 0.5,
    "w_hiconf_wrong": 1.25,
    "rapid_guess_ratio": 0.15,
    "rapid_guess_floor_ms": 3000,
    "correct_threshold": 0.8,
    "fail_threshold": 0.5,
    "latency_slow_ratio": 2.0,
    "latency_fast_ratio": 0.6,
    "easy_min_confidence": 4,
    "easy_min_reps": 2,
    "mastery_min_correct": 3,
    "mastery_min_days": 1,        # 00a M2: one session can master a skill (was 2 distinct local days)
    "mastery_min_variants": 2,
    "mastery_min_span_days": 0,   # 00a M2: off (00a G3 had 2 calendar days, learner-local, between the first and the last qualifying attempt)
    "mastery_min_templates": 2,   # 00a G3: distinct verified templates among qualifying attempts, required only when the skill has >= 2 verified templates
    "decay_threshold_r": 0.70,
    "prereq_r_threshold": 0.80,
    "continue_r_threshold": 0.70,
    "placement_grace_days": 14,   # 00a B6: placement card in `reviewing` satisfies the frontier test for 14 days
    "target_retention": 0.85,     # 00a G5: first-8-weeks default (alias of desired_retention_initial); see desired_retention()
    "desired_retention_initial": 0.85,
    "desired_retention_mature": 0.90,
    "retention_initial_weeks": 8,
    "retention_calibration_tolerance": 0.07,   # |observed - predicted| recall must be within this to move to the mature value
    "latency_min_obs": 20,        # 00a G5: latency rows of the rating map are ignored until a template has this many observations
    "lab_fallback_cap_min": 120,  # 00a G4: a lab slot with no eligible project step is served as a focus session capped at this length
    "planning_new_skills_per_week": [5, 7],   # 00a G8: planning rate (documentation constant, not used by the packer)
    "reliance_gap_threshold": 0.15,           # 00a G6
    "reliance_min_attempts": 10,              # 00a G6
    "reliance_checkpoints": 2,                # 00a G6
    "target_success": 0.80,
    "slack_fraction": 0.10,
    "max_review_share": 0.70,
    "max_new_skills": {"micro": 1, "focus": 3, "lab": 0},
    "practice_fill_max_per_skill": 2,
    "applied_gap_max": {"micro": 1, "focus": 3, "lab": 0},   # design review F-01: applied-gap slots per session (not new skills)
    "max_node_share": 0.60,
    "checkpoint_interval_days": 14,
    "checkpoint_reserve_after_days": 12,
    "module_checkpoint_fraction": 0.80,
    "interleave_stage2_acc": 0.60,
    "interleave_stage3_acc": 0.70,
    "interleave_regress_acc": 0.40,
    "placement_grace_max_tier": "L1",   # 00a G1: placement grace satisfies min_tier up to this tier, for the frontier test only
    "stuck_consecutive_fails": 3,
    "stuck_reveals_in_last4": 2,
    "trace_max_depth": 3,
    "frontier_w_project": 3.0,
    "frontier_w_unlocks": 1.0,
    "frontier_w_soft_unmet": 2.0,
    "frontier_w_balance": 2.0,
    "frontier_w_cost": 0.25,
}

TASK_MINUTES: Dict[str, float] = {
    "retrieval": 1.5,
    "worked_example": 4.0,
    "faded_problem": 5.0,
    "problem": 10.0,
    "problem_short": 4.0,
    "perceptual_drill": 2.0,
    "explain_back": 4.0,
    "debug_case": 12.0,
    "diagnostic": 2.5,       # 00a G7: constructed-response items, about 2.5 minutes each
    "checkpoint": 2.5,
}
PHONE_KINDS = ["retrieval", "worked_example", "faded_problem", "perceptual_drill", "problem_short", "checkpoint"]
TIERS = ["L0", "L1", "L2", "L3"]
REVIEW_KINDS = {"retrieval", "problem", "perceptual_drill", "debug_case", "explain_back", "checkpoint"}
APPLIED_KINDS = {"problem", "debug_case", "checkpoint"}


def _p(overrides: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not overrides:
        return PARAMS
    q = dict(PARAMS)
    q.update(overrides)
    return q


def _t(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def _r(x: float, n: int = 4) -> float:
    return round(x + 0.0, n)


# --------------------------------------------------------------------------------------
# FSRS interface (stub) -- do NOT implement FSRS here.
# --------------------------------------------------------------------------------------
class FsrsPort(Protocol):
    """Interface the scheduler needs from the FSRS library (ts-fsrs in production)."""

    def new_card(self, now: datetime) -> Dict[str, Any]: ...
    def review(self, card: Dict[str, Any], rating: int, now: datetime) -> Dict[str, Any]:
        """Return {'card': <updated card>, 'log': {rating, elapsed_days, scheduled_days}}."""
        ...
    def retrievability(self, card: Dict[str, Any], now: datetime) -> float: ...


class FsrsStub:
    """Interface only. Production binds this to ts-fsrs; see spec section 3.7."""

    def new_card(self, now):  # pragma: no cover
        raise NotImplementedError("bind to ts-fsrs in production")

    def review(self, card, rating, now):  # pragma: no cover
        raise NotImplementedError("bind to ts-fsrs in production")

    def retrievability(self, card, now):  # pragma: no cover
        raise NotImplementedError("bind to ts-fsrs in production")


def test_double_retrievability(stability_days: float, elapsed_days: float) -> float:
    """TEST DOUBLE ONLY, not the FSRS algorithm. It is the exponential curve with
    R(stability) = 0.90 (the definition of FSRS stability). Used so tests are deterministic
    without the library. Test vectors pass retrievability in explicitly where possible."""
    if stability_days <= 0:
        return 0.0
    return 0.9 ** (max(elapsed_days, 0.0) / stability_days)


# --------------------------------------------------------------------------------------
# (b) Elo / IRT-lite learner model
# --------------------------------------------------------------------------------------
def difficulty_from_prior(prior: float) -> float:
    """item_templates.difficulty_prior in [0,1] -> Elo-scale difficulty 1200..1800."""
    return 1200.0 + 600.0 * min(max(prior, 0.0), 1.0)


def expected_score(theta: float, d: float, guess: float = 0.0, params=None) -> float:
    P = _p(params)
    logistic = 1.0 / (1.0 + 10.0 ** ((d - theta) / P["elo_scale"]))
    return guess + (1.0 - guess) * logistic


def k_factor(n: int, params=None) -> float:
    P = _p(params)
    return max(P["k_min"], P["k0"] / (1.0 + n / P["k_half_n"]))


def k_item(n: int, params=None) -> float:
    P = _p(params)
    return max(P["k_item_min"], P["k_item0"] / (1.0 + n / P["k_item_half_n"]))


def is_rapid_guess(latency_ms: Optional[int], expected_ms: Optional[int], score: float, params=None) -> bool:
    P = _p(params)
    if latency_ms is None or not expected_ms:
        return False
    return (score < P["fail_threshold"] and latency_ms < P["rapid_guess_floor_ms"]
            and latency_ms < P["rapid_guess_ratio"] * expected_ms)


def learner_weight(att: Dict[str, Any], params=None) -> float:
    """Weight in [0,1.25] applied to the learner-side Elo update."""
    P = _p(params)
    kind = att["task_kind"]
    if kind == "worked_example":
        return 0.0
    h = att.get("max_hint_level", 0)
    w = 1.0
    if h >= 4:
        w = P["w_hint4"]
    elif h == 3:
        w = P["w_hint3"]
    elif h == 2:
        w = P["w_hint2"]
    if kind == "faded_problem":
        w *= P["w_scaffold"]
    if is_rapid_guess(att.get("latency_ms"), att.get("expected_ms"), att["score"], P):
        w *= P["w_rapid_guess"]
    elif att.get("confidence") is not None and att["confidence"] >= 4 and att["score"] < P["fail_threshold"] and h <= 1:
        w = min(P["w_hiconf_wrong"], w * P["w_hiconf_wrong"])
    return w


def update_elo(theta: float, n_skill: int, d: float, n_item: int, att: Dict[str, Any],
               guess: float = 0.0, params=None) -> Dict[str, Any]:
    """Returns new skill rating, new template difficulty and diagnostics.
    att keys: task_kind, score, max_hint_level, unaided, confidence, latency_ms, expected_ms."""
    P = _p(params)
    s = 0.0 if att.get("max_hint_level", 0) >= 4 else float(att["score"])
    e = expected_score(theta, d, guess, P)
    w = learner_weight(att, P)
    new_theta = theta + k_factor(n_skill, P) * w * (s - e)
    # item side: only unaided, non-scaffolded, non-rapid-guess attempts are informative
    item_ok = (att.get("unaided", False) and att["task_kind"] not in ("worked_example", "faded_problem")
               and not is_rapid_guess(att.get("latency_ms"), att.get("expected_ms"), att["score"], P))
    new_d = d - k_item(n_item, P) * (s - e) if item_ok else d
    return {"expected": _r(e), "weight": _r(w), "theta": _r(new_theta), "d": _r(new_d),
            "n_skill": n_skill + (1 if w > 0 else 0), "n_item": n_item + (1 if item_ok else 0)}


def diagnostic_init(d: float, score: float, params=None) -> float:
    """Performance-rating initialisation from one diagnostic item: theta = d + 400*log10(p/(1-p)),
    p clipped to [0.1, 0.9]. Range: d - 382 .. d + 382."""
    P = _p(params)
    p = min(max(score, 0.1), 0.9)
    return _r(d + P["elo_scale"] * math.log10(p / (1.0 - p)))


def cold_start_theta(prereq_thetas: List[float], params=None) -> float:
    P = _p(params)
    if not prereq_thetas:
        return P["elo_init_default"]
    m = sum(prereq_thetas) / len(prereq_thetas)
    return _r(min(max(m - 50.0, 1100.0), 1700.0))


def target_item_difficulty(theta: float, params=None) -> float:
    """Difficulty at which expected score equals target_success (no guess floor)."""
    P = _p(params)
    p = P["target_success"]
    return _r(theta - P["elo_scale"] * math.log10(p / (1.0 - p)))


# --------------------------------------------------------------------------------------
# (a) Rating mapping: graded attempt -> FSRS rating 1..4
# --------------------------------------------------------------------------------------
def map_rating(att: Dict[str, Any], reps: int = 0, params=None) -> Dict[str, Any]:
    """Returns {'rating': 1..4, 'flags': [...]}.  Returns rating None if the attempt must not
    create a review (task kinds outside REVIEW_KINDS or rapid guess that is wrong is still Again)."""
    P = _p(params)
    kind = att["task_kind"]
    if kind not in REVIEW_KINDS:
        return {"rating": None, "flags": ["not_review_eligible"]}
    s = float(att["score"])
    h = att.get("max_hint_level", 0)
    conf = att.get("confidence")
    flags: List[str] = []
    ratio = None
    if att.get("latency_ms") is not None and att.get("expected_ms"):
        ratio = att["latency_ms"] / att["expected_ms"]
        # 00a G5: the latency rows (slow -> Hard, fast -> Easy) are ignored until the template has enough observations;
        # `template_n_obs` missing counts as 0. The ratio is still logged by the caller.
        if (att.get("template_n_obs") or 0) < P["latency_min_obs"]:
            ratio = None      # (no flag is added: the caller logs `latency_rows_ignored` itself)
    # Again
    if h >= 4 or s < P["fail_threshold"]:
        if conf is not None and conf >= 4 and h < 4:
            flags.append("high_confidence_error")
        return {"rating": 1, "flags": flags}
    # Hard
    if s < P["correct_threshold"] or h >= 2:
        return {"rating": 2, "flags": flags}
    if ratio is not None and ratio > P["latency_slow_ratio"]:
        return {"rating": 2, "flags": ["slow"]}
    # correct, hints <= 1, not slow: Good or Easy
    easy = (s >= 0.95 and h == 0 and ratio is not None and ratio <= P["latency_fast_ratio"]
            and conf is not None and conf >= P["easy_min_confidence"] and reps >= P["easy_min_reps"]
            and not att.get("rapid_flag") and att.get("grader_type") != "multiple_choice")
    if conf is not None and conf <= 2:
        flags.append("low_confidence_correct")
    return {"rating": 4 if easy else 3, "flags": flags}


def aggregate_attempts(atts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Review unit: all review-eligible attempts of ONE skill within ONE session become ONE review.
    score = mean, max_hint_level = max, latency ratio = median (expressed via latency_ms/expected_ms of
    the median attempt), confidence = median (lower median), task_kind = kind of the last attempt,
    grader_type = 'multiple_choice' only if all are MC."""
    n = len(atts)
    ratios = sorted((a["latency_ms"] / a["expected_ms"]) for a in atts if a.get("latency_ms") is not None and a.get("expected_ms"))
    confs = sorted(a["confidence"] for a in atts if a.get("confidence") is not None)
    out = {"task_kind": atts[-1]["task_kind"], "score": _r(sum(a["score"] for a in atts) / n),
           "max_hint_level": max(a.get("max_hint_level", 0) for a in atts),
           "grader_type": "multiple_choice" if all(a.get("grader_type") == "multiple_choice" for a in atts) else "mixed"}
    if ratios:
        out["latency_ms"] = int(round(ratios[(len(ratios) - 1) // 2] * 1000))
        out["expected_ms"] = 1000
    if confs:
        out["confidence"] = confs[(len(confs) - 1) // 2]
    if any("template_n_obs" in a for a in atts):          # 00a G5: the weakest template decides whether latency is trusted
        out["template_n_obs"] = min((a.get("template_n_obs") or 0) for a in atts)
    return out


# --------------------------------------------------------------------------------------
# (c) Mastery rule and tier attainment
# --------------------------------------------------------------------------------------
def _tier_idx(t: Optional[str]) -> int:
    return TIERS.index(t) if t in TIERS else -1


def is_qualifying(att: Dict[str, Any], tier: str, params=None) -> bool:
    P = _p(params)
    return (att["task_kind"] in REVIEW_KINDS or att["task_kind"] == "diagnostic") \
        and att.get("unaided", False) and att.get("max_hint_level", 0) <= 1 \
        and att["score"] >= P["correct_threshold"] \
        and att.get("verified", True) \
        and _tier_idx(att.get("item_tier", "L0")) >= _tier_idx(tier)


def mastery_rule(attempts: List[Dict[str, Any]], tier: str, tz_offset_min: int = 0,
                 has_non_mc: bool = True, has_applied: bool = True, params=None,
                 project_credit_applied: bool = False, n_verified_templates: int = 0) -> Dict[str, Any]:
    """attempts: chronological attempts SINCE the current mastery epoch, each with
    submitted_at (ISO), item_id, task_kind, score, max_hint_level, unaided, grader_type, item_tier.
    Rule (canonical): >=3 qualifying attempts, on >=2 local calendar days, on >=2 distinct item
    variants (item_id), the last two graded unaided attempts are not failures, at least one
    qualifying attempt is constructed-response (if the skill has such a template) and at least one
    is applied (problem/debug_case/checkpoint) when tier >= L1 (if the skill has such a template).
    `project_credit_applied` (00a B5): credit from a project step whose evidence is `accepted` satisfies
    the "applied" condition only; it is not an attempt and counts toward no other condition.
    00a G3 (contract v1.2): (7) the first and last qualifying attempts are at least `mastery_min_span_days` (default 2)
    learner-local calendar days apart; (8) when the skill has >= 2 verified templates (`n_verified_templates`), the
    qualifying attempts come from >= 2 distinct templates (`template_key` on the attempt)."""
    P = _p(params)
    q = [a for a in attempts if is_qualifying(a, tier, P)]
    days = sorted({(_t(a["submitted_at"]) + timedelta(minutes=tz_offset_min)).date().isoformat() for a in q})
    variants = {a["item_id"] for a in q}
    graded = [a for a in attempts if a["task_kind"] in REVIEW_KINDS and a.get("unaided", False)]
    last_two_ok = all(a["score"] >= P["fail_threshold"] for a in graded[-2:])
    non_mc_ok = (not has_non_mc) or any(a.get("grader_type") != "multiple_choice" for a in q)
    applied_ok = (not has_applied) or _tier_idx(tier) < 1 or project_credit_applied \
        or any(a["task_kind"] in APPLIED_KINDS for a in q)
    span_ok = True
    if P.get("mastery_min_span_days", 0) and q:
        local = sorted((_t(a["submitted_at"]) + timedelta(minutes=tz_offset_min)).date() for a in q)
        span_ok = (local[-1] - local[0]).days >= P["mastery_min_span_days"]
    templates_ok = True
    if n_verified_templates >= 2 and P.get("mastery_min_templates", 0):
        templates_ok = len({a.get("template_key") for a in q if a.get("template_key")}) >= P["mastery_min_templates"]
    checks = {
        "count": len(q) >= P["mastery_min_correct"],
        "days": len(days) >= P["mastery_min_days"] and span_ok,
        "variants": len(variants) >= P["mastery_min_variants"] and templates_ok,
        "last_two_not_failed": last_two_ok,
        "constructed_response": non_mc_ok,
        "applied": applied_ok,
    }
    return {"met": all(checks.values()), "qualifying": len(q), "days": len(days),
            "variants": len(variants), "checks": checks}


def mastery_state(attempts: List[Dict[str, Any]], tier: str, retrievability: Optional[float],
                  ever_mastered: bool, last_rating: Optional[int], recent_lapses_60d: int = 0,
                  post_decay_attempts: Optional[List[Dict[str, Any]]] = None,
                  has_non_mc: bool = True, has_applied: bool = True, params=None, n_verified_templates: int = 0) -> str:
    """Derive mastery_state. `attempts` = attempts since mastery epoch.
    ever_mastered=True means the rule was met at some earlier time in this epoch.
    post_decay_attempts: qualifying-eligible attempts made since the skill last became decayed."""
    P = _p(params)
    if not attempts:
        return "unseen"
    rule = mastery_rule(attempts, tier, 0, has_non_mc, has_applied, P, False, n_verified_templates)
    if ever_mastered:
        decayed = (retrievability is not None and retrievability < P["decay_threshold_r"]) or last_rating == 1
        if not decayed:
            return "mastered"
        need = 2 if recent_lapses_60d >= 2 else 1
        pd = [a for a in (post_decay_attempts or []) if is_qualifying(a, tier, P)]
        days = {a["submitted_at"][:10] for a in pd}
        if len(pd) >= need and len(days) >= need:
            return "mastered"
        return "decayed"
    if rule["met"] and (retrievability is None or retrievability >= P["decay_threshold_r"]) and last_rating != 1:
        return "mastered"
    q = [a for a in attempts if is_qualifying(a, tier, P)]
    qdays = {a["submitted_at"][:10] for a in q}
    if len(q) >= 2 and len(qdays) >= 2:
        return "reviewing"
    return "learning"


def tier_attained(attempts: List[Dict[str, Any]], tier_target: str, checkpoint_ok: bool,
                  span_days: float, has_non_mc: bool = True, has_applied: bool = True,
                  project_credit_applied: bool = False, params=None, n_verified_templates: int = 0) -> Optional[str]:
    """Highest tier whose rule is met. L0: rule on any item tier; L1: rule on items >=L1;
    L2: rule on items >=L2 + >=1 qualifying checkpoint attempt + span >= 14 days; L3: never automatic
    (needs human_review) -- returns at most L2 here. `project_credit_applied` (00a B5) can only satisfy the
    "applied" condition; a project never grants L2 or L3."""
    best = None
    for t in ("L0", "L1", "L2"):
        r = mastery_rule(attempts, t, 0, has_non_mc, has_applied, params, project_credit_applied, n_verified_templates)
        ok = r["met"]
        if t == "L2":
            ok = ok and checkpoint_ok and span_days >= 14
        if ok:
            best = t
        else:
            break
    return best


def needs_applied(attempts: List[Dict[str, Any]], tier: str, mastery_state_now: str, tz_offset_min: int = 0,
                  has_non_mc: bool = True, has_applied: bool = True, params=None,
                  project_credit_applied: bool = False, n_verified_templates: int = 0) -> bool:
    """00a G2: derived at read time (no stored column). True iff the skill is `reviewing` and the ONLY unmet mastery
    condition is the applied attempt (condition 6). The packer treats such a skill as in progress and gives it a problem."""
    if mastery_state_now != "reviewing":
        return False
    r = mastery_rule(attempts, tier, tz_offset_min, has_non_mc, has_applied, params, project_credit_applied, n_verified_templates)
    unmet = [k for k, v in r["checks"].items() if not v]
    return unmet == ["applied"]


def desired_retention(weeks_since_start: float, observed_minus_predicted: Optional[float], params=None) -> float:
    """00a G5: FSRS desired retention. 0.85 for the learner's first `retention_initial_weeks` weeks; afterwards 0.90 only if the
    calibration monitor reports |observed - predicted| recall within `retention_calibration_tolerance` (0.07), otherwise 0.85.
    No calibration data yet (None) also means 0.85."""
    P = _p(params)
    if weeks_since_start < P["retention_initial_weeks"] or observed_minus_predicted is None:
        return P["desired_retention_initial"]
    if abs(observed_minus_predicted) <= P["retention_calibration_tolerance"] + 1e-12:
        return P["desired_retention_mature"]
    return P["desired_retention_initial"]


# --------------------------------------------------------------------------------------
# (d) Frontier
# --------------------------------------------------------------------------------------
def prereq_satisfied(state: Dict[str, Any], edge: Dict[str, Any], hysteresis: bool = False, params=None) -> bool:
    """Frontier test for one hard edge (contract 7.1).
    00a G1: a `reviewing` card with source = 'placement' inside the 14-day grace (not yet verified, and no failed `verify`
    retrieval) satisfies the retrievability test regardless of R AND counts as tier L1 for the `min_tier` test, for THIS test only.
    It never sets `mastered`, and `tier_attained` (display, credit) stays at most L0."""
    P = _p(params)
    ms = state.get("mastery_state", "unseen")
    r = state.get("retrievability")
    thr = P["continue_r_threshold"] if hysteresis else P["prereq_r_threshold"]
    ok = ms == "mastered" or (ms == "reviewing" and r is not None and r >= thr)
    tier_idx = _tier_idx(state.get("tier_attained"))
    grace = False
    if ms == "reviewing" and state.get("source") == "placement" and not state.get("verified_after_placement", False) \
            and not state.get("placement_verify_failed", False):
        age = state.get("placement_age_days")
        grace = age is not None and age <= P["placement_grace_days"]
    if grace:
        ok = True
        tier_idx = max(tier_idx, _tier_idx(P["placement_grace_max_tier"]))
    if not ok:
        return False
    need = edge.get("min_tier")
    if need is None:
        return True
    return tier_idx >= _tier_idx(need)


def compute_available(graph: Dict[str, Any], states: Dict[str, Dict[str, Any]], hysteresis_for=None, params=None) -> List[str]:
    hysteresis_for = set(hysteresis_for or [])
    hard: Dict[str, List[Dict[str, Any]]] = {}
    for e in graph["edges"]:
        if e["strength"] == "hard":
            hard.setdefault(e["to"], []).append(e)
    out = []
    for key in sorted(graph["skills"]):
        ok = all(prereq_satisfied(states.get(e["from"], {}), e, key in hysteresis_for, params)
                 for e in hard.get(key, []))
        if ok:
            out.append(key)
    return out


def compute_frontier(graph, states, params=None) -> List[str]:
    """Outer fringe: available skills not yet reviewing/mastered/decayed (unseen or learning)."""
    av = compute_available(graph, states, [k for k, s in states.items() if s.get("mastery_state") == "learning"], params)
    return [k for k in av if states.get(k, {}).get("mastery_state", "unseen") in ("unseen", "learning")]


def frontier_scores(graph, states, frontier, project_pull: Dict[str, float], node_minutes: Dict[str, float],
                    params=None) -> List[Dict[str, Any]]:
    """score = w_p*pull + w_u*unlocks - w_s*unmet_soft - w_b*balance_excess - w_c*est_hours."""
    P = _p(params)
    total = sum(node_minutes.values())
    out = []
    for key in frontier:
        sk = graph["skills"][key]
        dependents = [e["to"] for e in graph["edges"] if e["from"] == key and e["strength"] == "hard"]
        unlocks = 0
        for dep in dependents:
            others = [e["from"] for e in graph["edges"] if e["to"] == dep and e["strength"] == "hard" and e["from"] != key]
            if all(states.get(o, {}).get("mastery_state") in ("mastered", "reviewing") for o in others):
                unlocks += 1
        unlocks_n = min(unlocks, 3) / 3.0
        softs = [e["from"] for e in graph["edges"] if e["to"] == key and e["strength"] == "soft"]
        unmet = (sum(1 for sft in softs if states.get(sft, {}).get("mastery_state") not in ("mastered", "reviewing"))
                 / len(softs)) if softs else 0.0
        share = (node_minutes.get(sk["node"], 0.0) / total) if total > 0 else 0.0
        excess = max(0.0, share - P["max_node_share"])
        sc = (P["frontier_w_project"] * project_pull.get(key, 0.0) + P["frontier_w_unlocks"] * unlocks_n
              - P["frontier_w_soft_unmet"] * unmet - P["frontier_w_balance"] * excess
              - P["frontier_w_cost"] * sk["est_minutes"] / 60.0)
        out.append({"key": key, "score": _r(sc), "unmet_soft": _r(unmet), "unlocks": unlocks})
    # soft ordering gate: skills with >50% unmet soft prereqs go last unless nothing else
    out.sort(key=lambda r: (r["unmet_soft"] > 0.5, -r["score"], r["key"]))
    return out


def project_pull(graph, step_skill_keys: List[str]) -> Dict[str, float]:
    """pull(s) = 1/(1+distance) over hard+soft ancestors of the project's upcoming step skills."""
    parents: Dict[str, List[str]] = {}
    for e in graph["edges"]:
        parents.setdefault(e["to"], []).append(e["from"])
    pull: Dict[str, float] = {}
    for root in step_skill_keys:
        dist = {root: 0}
        queue = [root]
        while queue:
            cur = queue.pop(0)
            for p in sorted(parents.get(cur, [])):
                if p not in dist:
                    dist[p] = dist[cur] + 1
                    queue.append(p)
        for k, dd in dist.items():
            pull[k] = max(pull.get(k, 0.0), 1.0 / (1.0 + dd))
    return {k: _r(v) for k, v in pull.items()}


# --------------------------------------------------------------------------------------
# interleaving schedule
# --------------------------------------------------------------------------------------
def interleave_stage(eligible_skills: int, interleaved_sets: List[float], current_stage: int, params=None) -> int:
    """Stage 0 blocked, 1 pairs, 2 triples, 3 whole module (max 5).
    eligible_skills: skills in the group with mastery_state in {reviewing, mastered}.
    interleaved_sets: accuracies of the most recent interleaved sets (oldest first)."""
    P = _p(params)
    if eligible_skills < 2:
        return 0
    stage = max(current_stage, 1) if current_stage else 1
    last = interleaved_sets[-1] if interleaved_sets else None
    if last is not None and last < P["interleave_regress_acc"]:
        return max(stage - 1, 0) if stage > 1 else 1
    if stage == 1 and eligible_skills >= 3 and len(interleaved_sets) >= 2 and all(a >= P["interleave_stage2_acc"] for a in interleaved_sets[-2:]):
        stage = 2
    if stage == 2 and eligible_skills >= 4 and len(interleaved_sets) >= 3 and all(a >= P["interleave_stage3_acc"] for a in interleaved_sets[-3:]):
        stage = 3
    return stage


def interleave_width(stage: int, eligible_skills: int) -> int:
    return {0: 1, 1: 2, 2: 3, 3: min(eligible_skills, 5)}[stage] if eligible_skills >= 1 else 1


def round_robin_order(skill_keys: List[str], n_items: int) -> List[str]:
    """Deterministic interleaved order with no skill repeated back-to-back when width >= 2."""
    if not skill_keys:
        return []
    return [skill_keys[i % len(skill_keys)] for i in range(n_items)]


# --------------------------------------------------------------------------------------
# (e) Session builder
# --------------------------------------------------------------------------------------
def estimate_minutes(kind: str, personal_ratio: Optional[float] = None, n_obs: int = 0, step_min: Optional[float] = None) -> float:
    base = step_min if (kind == "project_step" and step_min is not None) else TASK_MINUTES[kind]
    if personal_ratio is not None and n_obs >= 5:
        base *= min(max(personal_ratio, 0.6), 1.8)
    return _r(base, 2)


def phone_suitable(task_kind: str, skill: Dict[str, Any]) -> bool:
    kinds = skill.get("phone_kinds", PHONE_KINDS)
    return task_kind in kinds


def pack_session(inp: Dict[str, Any], params=None) -> Dict[str, Any]:
    """Greedy priority packer. Input keys:
      available_minutes, context, session_type, graph, states (skill_key -> state dict with
      mastery_state, retrievability, due (bool), loop_step), checkpoint ('none'|'due'|'overdue'),
      interleave (module -> stage), project_pull, node_minutes, backlog (bool).
    Returns ordered tasks with est_min and reason, plus totals."""
    P = _p(params)
    stype, ctx = inp["session_type"], inp["context"]
    avail = float(inp["available_minutes"])
    if stype == "micro":
        avail = min(avail, 20.0)
    budget = avail * (1.0 - P["slack_fraction"])
    graph, states = inp["graph"], inp["states"]
    skills = graph["skills"]
    tasks: List[Dict[str, Any]] = []
    used = 0.0

    def fits(m):
        return used + m <= budget + 1e-9

    def ok_ctx(kind, key):
        if ctx == "phone":
            return phone_suitable(kind, skills[key])
        if ctx == "bench":
            return False
        return True

    def add(kind, key, reason, minutes=None, **extra):
        nonlocal used
        m = minutes if minutes is not None else estimate_minutes(kind)
        tasks.append({"task_kind": kind, "skill_key": key, "est_min": m, "reason": reason, **extra})
        used += m

    if stype == "lab":
        # 00a G4: a lab slot with no eligible project step (none fits the budget) is served as a `focus` session of practice
        # tasks, capped at `lab_fallback_cap_min`. The plan_slots row stays `lab`; the sessions row is `focus`.
        eligible = [st for st in inp.get("project_steps", []) if st.get("session_type", "lab") == "lab" and st["est_min"] <= budget + 1e-9]
        if not eligible:
            sub = dict(inp)
            sub["session_type"] = "focus"
            sub["available_minutes"] = min(float(inp["available_minutes"]), P["lab_fallback_cap_min"])
            sub["project_steps"] = []
            out = pack_session(sub, params)
            out["served_as"] = "focus"
            return out
        for st in inp.get("project_steps", []):
            if st.get("session_type", "lab") in ("lab",) and fits(st["est_min"]):
                add("project_step", st.get("skill_key"), "project_step", st["est_min"], step_key=st["key"])
        rem_cap = min(10.0, budget * 0.1)
        for key in sorted([k for k, s in states.items() if s.get("due")], key=lambda k: (states[k].get("retrievability", 1.0), k)):
            m = estimate_minutes("retrieval")
            if used + m <= budget and sum(t["est_min"] for t in tasks if t["task_kind"] == "retrieval") + m <= rem_cap and ctx != "bench":
                add("retrieval", key, "lab_review")
        return _finish(tasks, avail, budget)

    # checkpoint (overdue => reserved first; due => appended if room at the end)
    cp = inp.get("checkpoint", "none")
    cp_items = inp.get("checkpoint_skills", [])
    if cp == "overdue":
        for key in cp_items:
            if ok_ctx("checkpoint", key) and fits(estimate_minutes("checkpoint")):
                add("checkpoint", key, "checkpoint_overdue")

    # (a) due reviews, lowest retrievability first, capped
    cap = budget if inp.get("backlog") else budget * P["max_review_share"]
    # A placed skill has no FSRS card until its first verification (06 section 3), so it can never be `due` by date.
    placed = {k for k, s in states.items() if s.get("mastery_state") == "reviewing" and s.get("loop_step") == "verify"}
    due = sorted([k for k, s in states.items() if s.get("due") or k in placed],
                 key=lambda k: (states[k].get("retrievability") or 0.0, k))
    review_used = 0.0
    by_set: Dict[Tuple[str, str], List[str]] = {}
    for k in due:
        if skills[k].get("confusable_set"):  # 06 section 7.6 (F-13): an untagged skill is never interleaved
            by_set.setdefault((skills[k]["module"], skills[k]["confusable_set"]), []).append(k)
    done_keys = set()
    for (mod, _), ks in sorted(by_set.items()):
        stage = inp.get("interleave", {}).get(mod, 0)
        if stage >= 1 and len(ks) >= 2 and all(phone_suitable("problem_short", skills[k]) or ctx != "phone" for k in ks):
            width = interleave_width(stage, len(ks))
            grp = ks[:width]
            order = round_robin_order(grp, max(4, 2 * len(grp)))
            m = estimate_minutes("problem_short")
            if review_used + m * len(order) <= cap and fits(m * len(order)):
                for i, k in enumerate(order):
                    add("problem", k, "due_review_interleaved", m, interleaved=True, strategy_prompt=True)
                review_used += m * len(order)
                done_keys.update(grp)
    for k in due:
        if k in done_keys:
            continue
        m = estimate_minutes("retrieval")
        if ok_ctx("retrieval", k) and review_used + m <= cap and fits(m):
            add("retrieval", k, "due_review", m)
            review_used += m

    # (b) continuation of in-progress skills, (c) new frontier skills
    max_new = P["max_new_skills"][stype]
    skill_slots = max_new
    same_day_retrievals: List[str] = []
    in_prog = sorted([k for k, s in states.items() if s.get("mastery_state") == "learning" and s.get("loop_step") not in (None, "done")
                      and not s.get("blocked_by")  # 06 section 10: trace-back removes a blocked skill from continuation
                      and not any(e["strength"] == "hard" and e["to"] == k and states.get(e["from"], {}).get("mastery_state") == "decayed"
                                  and (states[e["from"]].get("retrievability") or 0.0) < P["continue_r_threshold"] for e in graph["edges"])])  # 06 section 4.3
    practice_kind = "problem_short" if ctx == "phone" else "problem"

    def loop_seq(step, new_skill):
        faded_n = 2 if (stype == "focus" and new_skill) else 1
        if step == "worked_example":
            return ["worked_example"] + ["faded_problem"] * faded_n
        if step == "faded_problem":
            return ["faded_problem"]
        if step == "practice":
            return [practice_kind]
        if step == "verify":
            return ["retrieval"]
        return []

    verify_cap = 4
    for k in in_prog:
        step = states[k]["loop_step"]
        if step == "verify":
            if verify_cap > 0 and ok_ctx("retrieval", k) and fits(estimate_minutes("retrieval")):
                add("retrieval", k, "verify_inferred")
                verify_cap -= 1
            continue
        if skill_slots <= 0:
            break
        seq = loop_seq(step, False)
        need = sum(estimate_minutes(x) for x in seq) + (estimate_minutes("retrieval") if step != "practice" else 0.0)
        if seq and all(ok_ctx(x, k) for x in seq) and fits(need):
            for x in seq:
                add(x, k, "continue" if x != practice_kind else "practice")
            if step != "practice":
                same_day_retrievals.append(k)
            skill_slots -= 1
        elif step == "retrieval_same_day" and ok_ctx("retrieval", k) and fits(estimate_minutes("retrieval")):
            add("retrieval", k, "same_day_retrieval")
    # (b2) applied-gap (design review 00f F-01): a `reviewing` skill whose only open mastery condition is the "applied"
    # condition (06 section 4.2, condition 6) is *in progress*. Without this rule such skills get a `problem` only from
    # leftover focus-session fill, in lowest-retrievability order, and starve. The caller sets `needs_applied` on the state.
    # Does not use a new-skill slot. Ranked by number of hard dependents (what it unblocks), then key.
    gap_slots = P["applied_gap_max"][stype]
    if gap_slots > 0:
        n_dep = {}
        for e in graph["edges"]:
            if e["strength"] == "hard":
                n_dep[e["from"]] = n_dep.get(e["from"], 0) + 1
        gap_keys = sorted([k for k, s in states.items() if s.get("mastery_state") == "reviewing" and s.get("needs_applied")
                           and not any(t["skill_key"] == k and t["task_kind"] in APPLIED_KINDS for t in tasks)],
                          key=lambda k: (-n_dep.get(k, 0), k))
        for k in gap_keys:
            if gap_slots <= 0:
                break
            m = estimate_minutes(practice_kind)
            if ok_ctx(practice_kind, k) and fits(m):
                add("problem", k, "applied_gap", m)
                gap_slots -= 1
    if skill_slots > 0 and not inp.get("backlog_suspend_new", False):
        fr = compute_frontier(graph, states, P)
        ranked = frontier_scores(graph, states, fr, inp.get("project_pull", {}), inp.get("node_minutes", {}), P)
        for r in ranked:
            k = r["key"]
            if k in in_prog or skill_slots <= 0 or states.get(k, {}).get("blocked_by"):
                continue
            # 00a M1: a learning skill whose loop is done waits for its FSRS review; it is not taught again as new
            if states.get(k, {}).get("mastery_state") == "learning" and states.get(k, {}).get("loop_step") == "done":
                continue
            for seq in (loop_seq("worked_example", True), loop_seq("worked_example", False)):
                need = sum(estimate_minutes(x) for x in seq) + estimate_minutes("retrieval")
                if all(ok_ctx(x, k) for x in seq) and fits(need):
                    for x in seq:
                        add(x, k, "new_frontier")
                    same_day_retrievals.append(k)
                    skill_slots -= 1
                    break

    # (d) interleaved practice among confusable skills of one module (not already used above)
    used_mods = {skills[t["skill_key"]]["module"] for t in tasks if t.get("interleaved")}
    for mod, stage in sorted(inp.get("interleave", {}).items()):
        if stage < 1 or mod in used_mods:
            continue
        elig = sorted([k for k, s in states.items() if skills[k]["module"] == mod and skills[k].get("confusable_set")
                       and s.get("mastery_state") in ("reviewing", "mastered")], key=lambda k: (states[k].get("retrievability", 1.0), k))
        if len(elig) < 2:
            continue
        one_set = [k for k in elig if skills[k]["confusable_set"] == skills[elig[0]]["confusable_set"]]
        if len(one_set) < 2:
            continue
        grp = one_set[:interleave_width(stage, len(one_set))]
        m = estimate_minutes("problem_short")
        if not all(ok_ctx("problem_short", k) for k in grp):
            continue
        order = round_robin_order(grp, max(4, 2 * len(grp)))
        if fits(m * len(order) + estimate_minutes("retrieval") * len(same_day_retrievals)):
            for k in order:
                add("problem", k, "interleaved_practice", m, interleaved=True, strategy_prompt=True)

    # (b') practice fill (focus only): extra standard problems on skills still being learned
    if stype == "focus":
        learners = sorted([k for k, s in states.items() if s.get("mastery_state") in ("learning", "reviewing")
                           and k in compute_available(graph, states, list(states), P)],
                          key=lambda k: (states[k].get("retrievability", 1.0), k))
        counts = {k: (1 if any(t["skill_key"] == k and t["reason"] == "applied_gap" for t in tasks) else 0) for k in learners}
        progressed = True
        while progressed:
            progressed = False
            for k in learners:
                m = estimate_minutes("problem")
                if counts[k] < P["practice_fill_max_per_skill"] and ok_ctx("problem", k) and fits(m + estimate_minutes("retrieval") * len(same_day_retrievals)):
                    add("problem", k, "practice", m)
                    counts[k] += 1
                    progressed = True

    # (e) due (not overdue) checkpoint if there is room, appended before same-day retrievals
    if cp == "due":
        for key in cp_items:
            if ok_ctx("checkpoint", key) and fits(estimate_minutes("checkpoint")):
                add("checkpoint", key, "checkpoint_due")

    # same-day retrieval for skills that got a faded problem this session: last tasks
    for k in same_day_retrievals:
        m = estimate_minutes("retrieval")
        if ok_ctx("retrieval", k) and fits(m):
            add("retrieval", k, "same_day_retrieval", m)
    return _finish(tasks, avail, budget)


def _finish(tasks, avail, budget):
    order_rank = {"checkpoint_overdue": 0, "due_review": 1, "due_review_interleaved": 1, "verify_inferred": 1, "continue": 2,
                  "new_frontier": 2, "applied_gap": 2, "project_step": 2, "practice": 3, "interleaved_practice": 3,
                  "checkpoint_due": 3, "lab_review": 4, "same_day_retrieval": 5}
    idx = list(range(len(tasks)))
    idx.sort(key=lambda i: (order_rank.get(tasks[i]["reason"], 5), i))
    ordered = [tasks[i] for i in idx]
    for pos, t in enumerate(ordered, 1):
        t["position"] = pos
    total = _r(sum(t["est_min"] for t in ordered), 2)
    return {"tasks": ordered, "total_est_min": total, "available_minutes": avail,
            "fill": _r(total / avail if avail else 0.0, 3), "fits": total <= avail + 1e-9}


# --------------------------------------------------------------------------------------
# weekly plan and rebalancing
# --------------------------------------------------------------------------------------
def _round_to(x: float, step: int) -> int:
    return int(math.floor(x / step + 0.5) * step)


def weekly_plan_slots(weekly_minutes: int) -> Dict[str, Any]:
    W = weekly_minutes
    lab = min(240, max(120, _round_to(0.375 * W, 30))) if W >= 300 else 0
    micro_len = 20 if W >= 360 else (15 if W >= 150 else 10)
    micro_n = 5
    remaining = W - lab - micro_n * micro_len
    focus_n = 2 if remaining >= 90 else (1 if remaining >= 45 else 0)
    focus_len = 0
    if focus_n:
        focus_len = int(min(120, max(45, math.floor(remaining / focus_n / 15) * 15)))
    total = lab + micro_n * micro_len + focus_n * focus_len
    return {"micro": {"n": micro_n, "len_min": micro_len}, "focus": {"n": focus_n, "len_min": focus_len},
            "lab": {"n": 1 if lab else 0, "len_min": lab}, "planned_total_min": total, "slack_min": W - total}


def rebalance(plan_slots: List[Dict[str, Any]], today_idx: int, weekly_minutes: int) -> Dict[str, Any]:
    """plan_slots: [{'day': 0..6, 'type': 'micro'|'focus'|'lab', 'min': n, 'status': 'done'|'planned'|'missed'}].
    Rules: missed micro -> not made up as micro (reviews carry), but if >=2 micro missed add one
    micro on a free remaining day (max 7 micro/week, 1 per day). Missed focus -> move to next day
    with no focus within the week (not adjacent to another focus), else carry 50% (cap 120) to next week.
    Missed lab -> move to the last free day of the week, else carry fully to next week (cap 240).
    The sum of planned minutes in the next 7 days is capped at 1.25 * weekly_minutes."""
    slots = [dict(s) for s in plan_slots]
    actions: List[str] = []
    carry = {"focus_min": 0, "lab_min": 0}
    days_with = {}
    for s in slots:
        if s["status"] != "missed":
            days_with.setdefault(s["day"], []).append(s["type"])
    missed_micro = [s for s in slots if s["status"] == "missed" and s["type"] == "micro"]
    for s in slots:
        if s["status"] != "missed":
            continue
        if s["type"] == "focus":
            target = None
            for d in range(today_idx, 7):
                near_focus = any("focus" in days_with.get(x, []) for x in (d - 1, d, d + 1))
                if not near_focus and "lab" not in days_with.get(d, []):
                    target = d
                    break
            if target is None:
                carry["focus_min"] += min(120, s["min"] // 2)
                actions.append(f"focus day {s['day']}: carry {min(120, s['min'] // 2)} min to next week")
            else:
                s["day"], s["status"] = target, "planned"
                days_with.setdefault(target, []).append("focus")
                actions.append(f"focus: moved to day {target}")
        elif s["type"] == "lab":
            target = None
            for d in range(6, today_idx - 1, -1):
                if not days_with.get(d):
                    target = d
                    break
            if target is None:
                carry["lab_min"] += min(240, s["min"])
                actions.append(f"lab: carry {min(240, s['min'])} min to next week")
            else:
                s["day"], s["status"] = target, "planned"
                days_with.setdefault(target, []).append("lab")
                actions.append(f"lab: moved to day {target}")
    if len(missed_micro) >= 2:
        micro_count = len([s for s in slots if s["type"] == "micro" and s["status"] != "missed"])
        free = [d for d in range(today_idx, 7) if "micro" not in days_with.get(d, [])]
        if micro_count < 7 and free:
            slots.append({"day": free[0], "type": "micro", "min": missed_micro[0]["min"], "status": "planned"})
            actions.append(f"micro: added extra micro on day {free[0]}")
    for s in slots:
        if s["status"] == "missed" and s["type"] == "micro":
            actions.append(f"micro day {s['day']}: not made up; due reviews carry over")
    planned = sum(s["min"] for s in slots if s["status"] == "planned")
    cap = int(1.25 * weekly_minutes)
    if planned > cap:
        actions.append(f"planned {planned} exceeds cap {cap}: drop lowest priority extra micro")
    return {"slots": slots, "carry": carry, "actions": actions, "planned_remaining_min": planned}


# --------------------------------------------------------------------------------------
# (f) checkpoint scheduling
# --------------------------------------------------------------------------------------
def checkpoint_status(days_since_last_checkpoint: Optional[float], module_fraction_ready: Dict[str, float],
                      days_since_module_checkpoint: Dict[str, Optional[float]], params=None) -> Dict[str, Any]:
    """Global: due at >= reserve_after days (12), overdue at >= interval (14); never taken => due once
    >= 5 skills reviewing/mastered (caller passes None only then). Module: when fraction of the module's
    skills in {reviewing, mastered} >= 0.8 and no module checkpoint in the last 7 days."""
    P = _p(params)
    status = "none"
    if days_since_last_checkpoint is not None:
        if days_since_last_checkpoint >= P["checkpoint_interval_days"]:
            status = "overdue"
        elif days_since_last_checkpoint >= P["checkpoint_reserve_after_days"]:
            status = "due"
    mods = sorted(m for m, f in module_fraction_ready.items()
                  if f >= P["module_checkpoint_fraction"]
                  and (days_since_module_checkpoint.get(m) is None or days_since_module_checkpoint[m] >= 7))
    if mods and status == "none":
        status = "due"
    return {"status": status, "module_checkpoints": mods}


# --------------------------------------------------------------------------------------
# (g) stuck detection and trace-back to prerequisite
# --------------------------------------------------------------------------------------
def is_stuck(recent: List[Dict[str, Any]], params=None) -> Dict[str, Any]:
    """recent: chronological graded attempts on the skill. Stuck if (a) last 3 attempts all
    score < 0.5, spanning >=2 distinct item_ids AND >=2 local days, or (b) >=2 of last 4 are hint-4 reveals."""
    P = _p(params)
    n = P["stuck_consecutive_fails"]
    last = recent[-n:]
    a = (len(last) == n and all(x["score"] < P["fail_threshold"] or x.get("max_hint_level", 0) >= 4 for x in last)
         and len({x["item_id"] for x in last}) >= 2 and len({x["submitted_at"][:10] for x in last}) >= 2)
    b = sum(1 for x in recent[-4:] if x.get("max_hint_level", 0) >= 4) >= P["stuck_reveals_in_last4"]
    return {"stuck": bool(a or b), "reason": "consecutive_fails" if a else ("reveals" if b else None)}


def trace_back(graph, states, skill_key: str, probe_results: Optional[Dict[str, float]] = None,
               depth: int = 0, params=None) -> Dict[str, Any]:
    """Explicit trace rule.
    1. Direct hard prerequisites p of skill_key. Suspects = those not (mastered, or reviewing with R>=0.8).
    2. If no suspects, probe every hard prerequisite with one unaided retrieval (lowest elo first, max 4).
       Probe results are passed in `probe_results` (skill -> score); missing probe => status 'probe_needed'.
    3. A prerequisite is faulty if suspect or probe score < 0.5. Faulty p => if it was mastered mark it decayed (rating Again), else prioritise it in continuation,
       set skill_key blocked_by p; recurse trace on p (depth <= 3).
    4. No faulty prerequisite => problem is skill-specific: restart loop at worked_example for skill_key,
       flag template(s) for content review."""
    P = _p(params)
    probe_results = probe_results or {}
    hard = sorted(e["from"] for e in graph["edges"] if e["to"] == skill_key and e["strength"] == "hard")
    suspects = [p for p in hard if not prereq_satisfied(states.get(p, {}), {"min_tier": None}, False, P)]
    if suspects:
        faulty = suspects
        source = "state"
    else:
        need = [p for p in sorted(hard, key=lambda x: (states.get(x, {}).get("elo", 1300.0), x))[:4]]
        missing = [p for p in need if p not in probe_results]
        if missing:
            return {"skill": skill_key, "status": "probe_needed", "probe": need, "blocked_by": [], "chain": []}
        faulty = [p for p in need if probe_results[p] < P["fail_threshold"]]
        source = "probe"
    if not faulty:
        return {"skill": skill_key, "status": "skill_specific", "action": "restart_loop_at_worked_example",
                "flag_content_review": True, "blocked_by": [], "chain": []}
    chain = []
    if depth + 1 < P["trace_max_depth"]:
        for p in faulty:
            sub = trace_back(graph, states, p, probe_results, depth + 1, P)
            if sub["status"] == "blocked":
                chain.extend(sub["chain"])
    chain = sorted(set(chain + faulty))
    return {"skill": skill_key, "status": "blocked", "source": source, "blocked_by": faulty,
            "chain": chain,
            "mark_decayed": [p for p in faulty if states.get(p, {}).get("mastery_state") == "mastered"],
            "prioritise": [p for p in faulty if states.get(p, {}).get("mastery_state") != "mastered"]}


def hint_reliance(recent: List[Dict[str, Any]], window: int = 20, threshold: float = 0.5) -> Dict[str, Any]:
    last = recent[-window:]
    if not last:
        return {"rate": 0.0, "flag": False}
    rate = sum(1 for a in last if a.get("max_hint_level", 0) >= 2) / len(last)
    return {"rate": _r(rate), "flag": len(last) >= 8 and rate > threshold}


def tutor_overreliance(checkpoints: List[Dict[str, Any]], params=None) -> Dict[str, Any]:
    """00a G6 (thresholds are [P]). `checkpoints`: chronological records for ONE node, each
    {'unaided_n', 'unaided_correct', 'aided_n', 'aided_correct'}: strict-unaided checkpoint attempts, and the aided attempts
    (practice attempts with max_hint_level >= 1 or a tutor panel opened) on the same skills since the previous checkpoint.
    Looks at the last `reliance_checkpoints` (2) records pooled. Flag when strict-unaided accuracy trails aided accuracy by more
    than `reliance_gap_threshold` (0.15) and both pools have at least `reliance_min_attempts` (10) attempts. Effect: the tutor
    switches to post-attempt-only for the node; the rule is re-evaluated at every checkpoint, so the switch lifts by itself."""
    P = _p(params)
    last = checkpoints[-P["reliance_checkpoints"]:]
    if len(last) < P["reliance_checkpoints"]:
        return {"flag": False, "gap": None, "reason": "too_few_checkpoints", "tutor_mode": "normal"}
    un = sum(c["unaided_n"] for c in last)
    ad = sum(c["aided_n"] for c in last)
    if un < P["reliance_min_attempts"] or ad < P["reliance_min_attempts"]:
        return {"flag": False, "gap": None, "reason": "too_few_attempts", "tutor_mode": "normal"}
    acc_un = sum(c["unaided_correct"] for c in last) / un
    acc_ad = sum(c["aided_correct"] for c in last) / ad
    gap = _r(acc_ad - acc_un)
    flag = gap > P["reliance_gap_threshold"] + 1e-12
    return {"flag": flag, "gap": gap, "reason": "unaided_trails_aided" if flag else "within_threshold",
            "tutor_mode": "post_attempt_only" if flag else "normal"}


# --------------------------------------------------------------------------------------
# sample graph
# --------------------------------------------------------------------------------------
def sample_graph() -> Dict[str, Any]:
    def sk(node, module, minutes=60):
        return {"node": node, "module": module, "est_minutes": minutes, "tier_target": "L1"}
    skills = {
        "math.alg.linear-equations": sk("math", "alg", 45),
        "math.alg.exponents-logs": sk("math", "alg", 60),
        "math.calc.exponential-decay": sk("math", "calc", 60),
        "elec.dc.ohms-law": {**sk("elec", "dc", 45), "confusable_set": "dc-laws"},
        "elec.dc.series-parallel": {**sk("elec", "dc", 60), "confusable_set": "dc-laws"},
        "elec.dc.voltage-divider": sk("elec", "dc", 45),
        "elec.dc.kirchhoff-laws": {**sk("elec", "dc", 75), "confusable_set": "dc-laws"},
        "elec.rc.rc-time-constant": sk("elec", "rc", 75),
        "sw.c.variables": sk("sw", "c", 45),
        "sw.c.control-flow": sk("sw", "c", 60),
        "sw.fw.gpio": sk("sw", "fw", 60),
        "sw.fw.adc-reading": sk("sw", "fw", 75),
    }
    E = lambda a, b, s="hard", t=None: {"from": a, "to": b, "strength": s, "min_tier": t}
    edges = [
        E("math.alg.linear-equations", "elec.dc.ohms-law"),
        E("math.alg.exponents-logs", "math.calc.exponential-decay"),
        E("elec.dc.ohms-law", "elec.dc.series-parallel"),
        E("elec.dc.series-parallel", "elec.dc.voltage-divider"),
        E("elec.dc.series-parallel", "elec.dc.kirchhoff-laws"),
        E("math.alg.linear-equations", "elec.dc.kirchhoff-laws", "soft"),
        E("elec.dc.voltage-divider", "elec.rc.rc-time-constant", "hard", "L1"),
        E("math.calc.exponential-decay", "elec.rc.rc-time-constant"),
        E("sw.c.variables", "sw.c.control-flow"),
        E("sw.c.control-flow", "sw.fw.gpio"),
        E("elec.dc.ohms-law", "sw.fw.gpio", "soft"),
        E("sw.fw.gpio", "sw.fw.adc-reading"),
        E("elec.dc.voltage-divider", "sw.fw.adc-reading", "soft"),
    ]
    return {"skills": skills, "edges": edges}


# --------------------------------------------------------------------------------------
# vector dispatch
# --------------------------------------------------------------------------------------
def run_vector(fn: str, inp: Dict[str, Any]) -> Any:
    g = sample_graph()
    if fn == "expected_score":
        return _r(expected_score(inp["theta"], inp["d"], inp.get("guess", 0.0), inp.get("params")))
    if fn == "k_factor":
        return _r(k_factor(inp["n"]))
    if fn == "update_elo":
        return update_elo(inp["theta"], inp["n_skill"], inp["d"], inp["n_item"], inp["att"], inp.get("guess", 0.0), inp.get("params"))
    if fn == "diagnostic_init":
        return diagnostic_init(inp["d"], inp["score"])
    if fn == "cold_start_theta":
        return cold_start_theta(inp["prereq_thetas"])
    if fn == "target_item_difficulty":
        return target_item_difficulty(inp["theta"])
    if fn == "map_rating":
        return map_rating(inp["att"], inp.get("reps", 0), inp.get("params"))
    if fn == "aggregate_attempts":
        return aggregate_attempts(inp["attempts"])
    if fn == "mastery_rule":
        return mastery_rule(inp["attempts"], inp["tier"], inp.get("tz_offset_min", 0), inp.get("has_non_mc", True), inp.get("has_applied", True),
                            inp.get("params"), inp.get("project_credit_applied", False), inp.get("n_verified_templates", 0))
    if fn == "needs_applied":
        return needs_applied(inp["attempts"], inp["tier"], inp["mastery_state"], inp.get("tz_offset_min", 0), inp.get("has_non_mc", True),
                             inp.get("has_applied", True), inp.get("params"), inp.get("project_credit_applied", False), inp.get("n_verified_templates", 0))
    if fn == "desired_retention":
        return desired_retention(inp["weeks_since_start"], inp.get("observed_minus_predicted"), inp.get("params"))
    if fn == "tutor_overreliance":
        return tutor_overreliance(inp["checkpoints"], inp.get("params"))
    if fn == "prereq_satisfied":
        return prereq_satisfied(inp["state"], inp["edge"], inp.get("hysteresis", False), inp.get("params"))
    if fn == "mastery_state":
        return mastery_state(inp["attempts"], inp["tier"], inp.get("retrievability"), inp["ever_mastered"], inp.get("last_rating"),
                             inp.get("recent_lapses_60d", 0), inp.get("post_decay_attempts"), inp.get("has_non_mc", True), inp.get("has_applied", True),
                             inp.get("params"), inp.get("n_verified_templates", 0))
    if fn == "tier_attained":
        return tier_attained(inp["attempts"], inp["tier_target"], inp["checkpoint_ok"], inp["span_days"],
                             project_credit_applied=inp.get("project_credit_applied", False))
    if fn == "compute_frontier":
        return {"available": compute_available(g, inp["states"]), "frontier": compute_frontier(g, inp["states"])}
    if fn == "frontier_scores":
        fr = compute_frontier(g, inp["states"])
        return frontier_scores(g, inp["states"], fr, inp.get("project_pull", {}), inp.get("node_minutes", {}))
    if fn == "project_pull":
        return project_pull(g, inp["step_skill_keys"])
    if fn == "interleave_stage":
        return {"stage": interleave_stage(inp["eligible"], inp["sets"], inp["current"]), }
    if fn == "pack_session":
        inp = dict(inp)
        inp["graph"] = g
        return pack_session(inp)
    if fn == "weekly_plan_slots":
        return weekly_plan_slots(inp["weekly_minutes"])
    if fn == "rebalance":
        return rebalance(inp["slots"], inp["today_idx"], inp["weekly_minutes"])
    if fn == "checkpoint_status":
        return checkpoint_status(inp.get("days_since_last"), inp.get("module_fraction_ready", {}), inp.get("days_since_module", {}))
    if fn == "is_stuck":
        return is_stuck(inp["recent"])
    if fn == "trace_back":
        return trace_back(g, inp["states"], inp["skill_key"], inp.get("probe_results"))
    if fn == "hint_reliance":
        return hint_reliance(inp["recent"])
    if fn == "weekly_plan_slots_check":
        return weekly_plan_slots(inp["weekly_minutes"])
    raise KeyError(fn)


# --------------------------------------------------------------------------------------
# vector inputs
# --------------------------------------------------------------------------------------
def A(day, item, score=1.0, kind="problem", hint=0, unaided=True, grader="exact_numeric", tier="L1", sub="09:00:00", tpl=None):
    a = {"submitted_at": f"2026-10-{day:02d}T{sub}Z", "item_id": item, "task_kind": kind, "score": score,
         "max_hint_level": hint, "unaided": unaided, "grader_type": grader, "item_tier": tier}
    if tpl is not None:
        a["template_key"] = tpl
    return a


def S(ms, r=None, tier=None, **kw):
    d = {"mastery_state": ms}
    if r is not None:
        d["retrievability"] = r
    if tier is not None:
        d["tier_attained"] = tier
    d.update(kw)
    return d


def vector_inputs() -> List[Dict[str, Any]]:
    V: List[Dict[str, Any]] = []

    def add(id_, fn, inp, note):
        V.append({"id": id_, "fn": fn, "input": inp, "note": note})

    # Elo
    add("elo-expected-equal", "expected_score", {"theta": 1500, "d": 1500}, "equal ratings give 0.5")
    add("elo-expected-400", "expected_score", {"theta": 1500, "d": 1900}, "400 points easier-to-harder gives 1/11")
    add("elo-expected-guess", "expected_score", {"theta": 1500, "d": 1500, "guess": 0.25}, "4-option MC floor")
    add("elo-k-0", "k_factor", {"n": 0}, "K starts at 48")
    add("elo-k-10", "k_factor", {"n": 10}, "K halves at n=10")
    add("elo-k-floor", "k_factor", {"n": 100}, "K floors at 16")
    base = {"task_kind": "problem", "score": 1.0, "max_hint_level": 0, "unaided": True, "confidence": 3, "latency_ms": 40000, "expected_ms": 60000}
    add("elo-correct-unaided", "update_elo", {"theta": 1300, "n_skill": 0, "d": 1500, "n_item": 0, "att": base}, "first unaided correct on a hard-ish item")
    add("elo-wrong-unaided", "update_elo", {"theta": 1500, "n_skill": 10, "d": 1500, "n_item": 20, "att": dict(base, score=0.0)}, "unaided failure")
    add("elo-hint3", "update_elo", {"theta": 1400, "n_skill": 5, "d": 1450, "n_item": 5, "att": dict(base, score=1.0, max_hint_level=3, unaided=False)}, "hint 3: weight .25, item not updated")
    add("elo-reveal", "update_elo", {"theta": 1400, "n_skill": 5, "d": 1450, "n_item": 5, "att": dict(base, score=1.0, max_hint_level=4, unaided=False)}, "reveal forces score 0")
    add("elo-faded", "update_elo", {"theta": 1300, "n_skill": 0, "d": 1400, "n_item": 0, "att": dict(base, task_kind="faded_problem")}, "faded problem halves weight, no item update")
    add("elo-rapid-guess", "update_elo", {"theta": 1500, "n_skill": 10, "d": 1500, "n_item": 20, "att": dict(base, score=0.0, latency_ms=900)}, "rapid wrong guess: half weight, item not updated")
    add("elo-hiconf-wrong", "update_elo", {"theta": 1500, "n_skill": 10, "d": 1500, "n_item": 20, "att": dict(base, score=0.0, confidence=5)}, "high confidence wrong: weight 1.25")
    add("elo-worked-example", "update_elo", {"theta": 1500, "n_skill": 3, "d": 1500, "n_item": 3, "att": dict(base, task_kind="worked_example")}, "worked example never updates")
    add("elo-diag-correct", "diagnostic_init", {"d": 1500, "score": 1.0}, "clipped p=0.9")
    add("elo-diag-half", "diagnostic_init", {"d": 1500, "score": 0.5}, "p=0.5 -> d")
    add("elo-diag-wrong", "diagnostic_init", {"d": 1500, "score": 0.0}, "clipped p=0.1")
    add("elo-cold-none", "cold_start_theta", {"prereq_thetas": []}, "default 1300")
    add("elo-cold-prereqs", "cold_start_theta", {"prereq_thetas": [1500, 1600]}, "mean - 50")
    add("elo-target-diff", "target_item_difficulty", {"theta": 1500}, "difficulty giving 0.8 expected")
    # rating mapping
    ra = {"task_kind": "retrieval", "score": 1.0, "max_hint_level": 0, "confidence": 3, "latency_ms": 20000, "expected_ms": 30000, "grader_type": "exact_numeric", "template_n_obs": 25}
    add("rate-good", "map_rating", {"att": ra, "reps": 3}, "correct, normal speed -> Good")
    add("rate-easy", "map_rating", {"att": dict(ra, confidence=5, latency_ms=10000), "reps": 3}, "fast, confident, no hints -> Easy")
    add("rate-easy-first-rep", "map_rating", {"att": dict(ra, confidence=5, latency_ms=10000), "reps": 0}, "Easy blocked on first reps")
    add("rate-easy-mc", "map_rating", {"att": dict(ra, confidence=5, latency_ms=10000, grader_type="multiple_choice"), "reps": 3}, "MC can never be Easy")
    add("rate-slow", "map_rating", {"att": dict(ra, latency_ms=70000), "reps": 3}, "correct but >2x expected -> Hard")
    add("rate-hint2", "map_rating", {"att": dict(ra, max_hint_level=2), "reps": 3}, "hint level 2 -> Hard")
    add("rate-hint1", "map_rating", {"att": dict(ra, max_hint_level=1), "reps": 3}, "hint level 1 still Good")
    add("rate-partial", "map_rating", {"att": dict(ra, score=0.6), "reps": 3}, "partial credit -> Hard")
    add("rate-wrong-hiconf", "map_rating", {"att": dict(ra, score=0.0, confidence=5), "reps": 3}, "Again + high_confidence_error flag")
    add("rate-reveal", "map_rating", {"att": dict(ra, max_hint_level=4), "reps": 3}, "reveal -> Again")
    add("rate-faded", "map_rating", {"att": dict(ra, task_kind="faded_problem"), "reps": 0}, "faded problems create no review")
    add("rate-slow-ignored-n5", "map_rating", {"att": dict(ra, latency_ms=70000, template_n_obs=5), "reps": 3}, "00a G5: a template with 5 observations: the slow-latency row is ignored, so the correct answer stays Good")
    add("rate-slow-ignored-n19", "map_rating", {"att": dict(ra, latency_ms=70000, template_n_obs=19), "reps": 3}, "00a G5: 19 observations is still below the threshold of 20")
    add("rate-slow-n20", "map_rating", {"att": dict(ra, latency_ms=70000, template_n_obs=20), "reps": 3}, "00a G5: exactly 20 observations: latency rows apply again, slow -> Hard")
    add("rate-easy-ignored-n5", "map_rating", {"att": dict(ra, confidence=5, latency_ms=10000, template_n_obs=5), "reps": 3}, "00a G5: Easy needs the latency row, so it is impossible below 20 observations")
    add("rate-easy-no-obs-field", "map_rating", {"att": {k: v for k, v in dict(ra, confidence=5, latency_ms=10000).items() if k != "template_n_obs"}, "reps": 3}, "00a G5: missing template_n_obs counts as 0")
    add("rate-hint-rows-unaffected-n0", "map_rating", {"att": dict(ra, max_hint_level=2, latency_ms=70000, template_n_obs=0), "reps": 3}, "00a G5: only the latency rows are gated; hint level 2 still maps to Hard")
    # mastery
    ok3 = [A(24, "i1"), A(25, "i2", kind="retrieval"), A(27, "i3")]
    add("mast-met", "mastery_rule", {"attempts": ok3, "tier": "L1"}, "3 correct, 3 days, 3 variants")
    add("mast-one-day", "mastery_rule", {"attempts": [A(24, "i1"), A(24, "i2", sub="10:00:00"), A(24, "i3", sub="11:00:00")], "tier": "L1"}, "00a M2: three qualifying attempts in one session pass (they failed the days check before M2)")
    add("mast-one-day-param", "mastery_rule", {"attempts": [A(24, "i1"), A(24, "i2", sub="10:00:00"), A(24, "i3", sub="11:00:00")], "tier": "L1", "params": {"mastery_min_days": 2}}, "mastery_min_days = 2 (the rule before 00a M2): the same attempts fail the days check")
    add("mast-one-variant", "mastery_rule", {"attempts": [A(24, "i1"), A(25, "i1"), A(27, "i1")], "tier": "L1"}, "same item: fails variants")
    add("mast-hint2", "mastery_rule", {"attempts": [A(24, "i1"), A(25, "i2", hint=2, unaided=False), A(27, "i3")], "tier": "L1"}, "hint 2 attempt does not qualify")
    add("mast-last-fail", "mastery_rule", {"attempts": ok3 + [A(28, "i4", score=0.2)], "tier": "L1"}, "recent unaided failure blocks")
    add("mast-mc-only", "mastery_rule", {"attempts": [A(24, "i1", grader="multiple_choice"), A(25, "i2", grader="multiple_choice"), A(27, "i3", grader="multiple_choice")], "tier": "L1"}, "MC only fails constructed-response check")
    add("mast-mc-only-no-alt", "mastery_rule", {"attempts": [A(24, "i1", grader="multiple_choice"), A(25, "i2", grader="multiple_choice"), A(27, "i3", grader="multiple_choice")], "tier": "L1", "has_non_mc": False}, "no non-MC template exists: allowed")
    add("mast-day-boundary-tz", "mastery_rule", {"attempts": [A(24, "i1", sub="23:30:00"), A(25, "i2", sub="00:10:00"), A(25, "i3", sub="09:00:00")], "tier": "L1", "tz_offset_min": 0, "params": {"mastery_min_span_days": 0}}, "UTC days: 24 and 25 (span condition switched off so that the test is about the day boundary only; changed in v1.2, see mast-span-default-blocks)")
    add("mast-span-gaming", "mastery_rule", {"attempts": [A(24, "i1", sub="23:50:00"), A(25, "i2", sub="00:10:00"), A(25, "i3", sub="09:00:00")], "tier": "L1", "params": {"mastery_min_span_days": 0}}, "contract v1.1 rule (span condition off): two calendar days 20 minutes apart pass (the loophole of design review F-03); changed in v1.2: this vector now passes params mastery_min_span_days = 0")
    add("mast-span-2d-blocks", "mastery_rule", {"attempts": [A(24, "i1", sub="23:50:00"), A(25, "i2", sub="00:10:00"), A(25, "i3", sub="09:00:00")], "tier": "L1", "params": {"mastery_min_span_days": 2}}, "proposed span parameter set to 2 days: the same attempts fail the days check")
    add("mast-span-2d-ok", "mastery_rule", {"attempts": [A(24, "i1"), A(25, "i2"), A(27, "i3")], "tier": "L1", "params": {"mastery_min_span_days": 2}}, "proposed span parameter: attempts on day 24, 25, 27 pass")
    # --- contract v1.2 (00a G3): span default 2 calendar days; template diversity
    gam = [A(24, "i1", sub="23:50:00"), A(25, "i2", sub="00:10:00"), A(25, "i3", sub="09:00:00")]
    G3 = {"mastery_min_days": 2, "mastery_min_span_days": 2}  # the 00a G3 rule, now opt-in (00a M2); these vectors test the mechanism
    add("mast-span-default-blocks", "mastery_rule", {"attempts": gam, "tier": "L1", "params": G3}, "00a G3 (parameters passed since 00a M2 made 0 the default): with a span of 2 calendar days, qualifying attempts on day 24 and day 25 only fail the days check, even 20 minutes apart")
    add("mast-span-exactly-2", "mastery_rule", {"attempts": [A(24, "i1"), A(25, "i2"), A(26, "i3")], "tier": "L1"}, "00a G3: first and last qualifying attempt exactly 2 calendar days apart pass")
    add("mast-span-1-day-short", "mastery_rule", {"attempts": [A(24, "i1"), A(25, "i2", sub="08:00:00"), A(25, "i3", sub="21:00:00")], "tier": "L1", "params": G3}, "00a G3 parameters: three attempts on two consecutive days fail the span (1 calendar day)")
    add("mast-span-local-days", "mastery_rule", {"attempts": [A(24, "i1", sub="23:30:00"), A(25, "i2", sub="12:00:00"), A(26, "i3", sub="00:10:00")], "tier": "L1", "tz_offset_min": 120, "params": G3}, "00a G3 parameters: the span is counted in the learner's local days: UTC days 24 to 26 are local days 25 to 26, span 1, fails")
    tpl1 = [A(24, "i1", tpl="t1"), A(25, "i2", tpl="t1"), A(27, "i3", tpl="t1")]
    add("mast-tpl-single-blocks", "mastery_rule", {"attempts": tpl1, "tier": "L1", "n_verified_templates": 2}, "00a G3: the skill has 2 verified templates but every qualifying attempt used the same one: variants check fails")
    add("mast-tpl-two-ok", "mastery_rule", {"attempts": [A(24, "i1", tpl="t1"), A(25, "i2", tpl="t1"), A(27, "i3", tpl="t2")], "tier": "L1", "n_verified_templates": 2}, "00a G3: two distinct templates among the qualifying attempts pass")
    add("mast-tpl-only-one-exists", "mastery_rule", {"attempts": tpl1, "tier": "L1", "n_verified_templates": 1}, "00a G3: the diversity condition applies only when the skill has 2 or more verified templates")
    add("mast-tpl-missing-key", "mastery_rule", {"attempts": ok3, "tier": "L1", "n_verified_templates": 2}, "00a G3: attempts without a template_key cannot show diversity when 2 templates exist (callers must send the key)")
    add("mast-tpl-param-off", "mastery_rule", {"attempts": tpl1, "tier": "L1", "n_verified_templates": 2, "params": {"mastery_min_templates": 0}}, "00a G3: the template condition can be switched off with mastery_min_templates = 0")
    add("state-reviewing-single-template", "mastery_state", {"attempts": tpl1, "tier": "L1", "retrievability": 0.9, "ever_mastered": False, "last_rating": 3, "n_verified_templates": 2}, "00a G3: rule not met because of template diversity, but 2 qualifying attempts on 2 days: reviewing")
    add("tier-single-template-stays-below", "tier_attained", {"attempts": tpl1, "tier_target": "L1", "checkpoint_ok": False, "span_days": 3}, "tier_attained without the template count (default 0) is unchanged")
    # --- 00a G2: needs_applied is derived at read time
    r3 = [A(24, "i1", kind="retrieval"), A(25, "i2", kind="retrieval"), A(27, "i3", kind="retrieval")]
    add("needs-applied-yes", "needs_applied", {"attempts": r3, "tier": "L1", "mastery_state": "reviewing"}, "00a G2: reviewing, three correct retrievals on three days, no applied attempt: the applied condition is the only gap")
    add("needs-applied-count-also-short", "needs_applied", {"attempts": r3[:2], "tier": "L1", "mastery_state": "reviewing"}, "two attempts only: count is also unmet, so not flagged yet")
    add("needs-applied-span-also-short", "needs_applied", {"attempts": [A(24, "i1", kind="retrieval"), A(25, "i2", kind="retrieval"), A(25, "i3", kind="retrieval", sub="15:00:00")], "tier": "L1", "mastery_state": "reviewing", "params": G3}, "00a G3 parameters: span also unmet: not flagged")
    add("needs-applied-mastered", "needs_applied", {"attempts": ok3, "tier": "L1", "mastery_state": "mastered"}, "only reviewing skills are flagged")
    add("needs-applied-project-credit", "needs_applied", {"attempts": r3, "tier": "L1", "mastery_state": "reviewing", "project_credit_applied": True}, "accepted project credit satisfies the applied condition: nothing missing, not flagged")
    add("needs-applied-l0-skill", "needs_applied", {"attempts": r3, "tier": "L0", "mastery_state": "reviewing"}, "an L0 target never needs an applied attempt")
    add("needs-applied-no-applied-template", "needs_applied", {"attempts": r3, "tier": "L1", "mastery_state": "reviewing", "has_applied": False}, "no applied template exists: condition waived, not flagged")
    add("mast-day-boundary-tz2", "mastery_rule", {"attempts": [A(24, "i1", sub="23:30:00"), A(25, "i2", sub="00:10:00"), A(25, "i3", sub="09:00:00")], "tier": "L1", "tz_offset_min": 120, "params": {"mastery_min_days": 2, "mastery_min_span_days": 0}}, "UTC+2: all three fall on local day 25 (mastery_min_days = 2 passed since 00a M2)")
    add("mast-l0-items-for-l1", "mastery_rule", {"attempts": [A(24, "i1", tier="L0"), A(25, "i2", tier="L0"), A(27, "i3", tier="L0")], "tier": "L1"}, "L0 items do not qualify for an L1 skill")
    add("state-unseen", "mastery_state", {"attempts": [], "tier": "L1", "retrievability": None, "ever_mastered": False, "last_rating": None}, "no attempts")
    add("state-learning", "mastery_state", {"attempts": [A(24, "i1")], "tier": "L1", "retrievability": 0.95, "ever_mastered": False, "last_rating": 3}, "one qualifying attempt")
    add("state-reviewing", "mastery_state", {"attempts": [A(24, "i1"), A(25, "i2")], "tier": "L1", "retrievability": 0.9, "ever_mastered": False, "last_rating": 3}, "2 qualifying on 2 days")
    add("state-mastered", "mastery_state", {"attempts": ok3, "tier": "L1", "retrievability": 0.9, "ever_mastered": False, "last_rating": 3}, "rule met")
    add("state-decayed-r", "mastery_state", {"attempts": ok3, "tier": "L1", "retrievability": 0.6, "ever_mastered": True, "last_rating": 3}, "R below 0.70")
    add("state-decayed-lapse", "mastery_state", {"attempts": ok3, "tier": "L1", "retrievability": 0.85, "ever_mastered": True, "last_rating": 1}, "lapse -> decayed")
    add("state-remastered", "mastery_state", {"attempts": ok3, "tier": "L1", "retrievability": 0.6, "ever_mastered": True, "last_rating": 3, "post_decay_attempts": [A(30, "i9")]}, "one fresh unaided success restores mastery")
    add("state-remastered-2lapse", "mastery_state", {"attempts": ok3, "tier": "L1", "retrievability": 0.6, "ever_mastered": True, "last_rating": 3, "recent_lapses_60d": 2, "post_decay_attempts": [A(30, "i9")]}, "two recent lapses need 2 successes on 2 days")
    add("tier-l1", "tier_attained", {"attempts": ok3, "tier_target": "L1", "checkpoint_ok": False, "span_days": 3}, "L1 attained")
    add("tier-l2-needs-checkpoint", "tier_attained", {"attempts": [A(1, "a", tier="L2"), A(8, "b", tier="L2"), A(20, "c", tier="L2")], "tier_target": "L1", "checkpoint_ok": False, "span_days": 19}, "L2 without checkpoint stays L1")
    add("tier-l2", "tier_attained", {"attempts": [A(1, "a", tier="L2"), A(8, "b", tier="L2"), A(20, "c", kind="checkpoint", tier="L2")], "tier_target": "L1", "checkpoint_ok": True, "span_days": 19}, "L2 attained")
    add("mast-project-credit", "mastery_rule", {"attempts": [A(24, "i1", kind="retrieval"), A(25, "i2", kind="retrieval"), A(27, "i3", kind="retrieval")], "tier": "L1", "project_credit_applied": True}, "applied condition satisfied by accepted project credit")
    add("mast-no-project-credit", "mastery_rule", {"attempts": [A(24, "i1", kind="retrieval"), A(25, "i2", kind="retrieval"), A(27, "i3", kind="retrieval")], "tier": "L1"}, "same attempts without project credit fail the applied condition")
    add("mast-project-credit-only", "mastery_rule", {"attempts": [A(24, "i1", kind="retrieval")], "tier": "L1", "project_credit_applied": True}, "project credit does not replace conditions 1-3")
    add("tier-project-no-l2", "tier_attained", {"attempts": [A(1, "a", kind="retrieval", tier="L2"), A(8, "b", kind="retrieval", tier="L2"), A(20, "c", kind="retrieval", tier="L2")], "tier_target": "L1", "checkpoint_ok": False, "span_days": 19, "project_credit_applied": True}, "project credit never yields L2")
    # frontier
    st0 = {}
    add("frontier-empty", "compute_frontier", {"states": st0}, "new learner: roots only")
    st1 = {"math.alg.linear-equations": S("mastered", 0.9, "L1"), "elec.dc.ohms-law": S("reviewing", 0.85, "L0"),
           "sw.c.variables": S("learning"), "math.alg.exponents-logs": S("reviewing", 0.7, "L0")}
    add("frontier-mixed", "compute_frontier", {"states": st1}, "reviewing at R<.8 does not satisfy; learning hysteresis")
    st2 = {"elec.dc.series-parallel": S("mastered", 0.9, "L1"), "elec.dc.voltage-divider": S("mastered", 0.9, "L0"),
           "math.calc.exponential-decay": S("mastered", 0.9, "L1"), "elec.dc.ohms-law": S("mastered", 0.9, "L1"), "math.alg.linear-equations": S("mastered", 0.9, "L1")}
    add("frontier-min-tier", "compute_frontier", {"states": st2}, "divider tier L0 < min_tier L1 blocks rc-time-constant")
    st3 = dict(st2); st3["elec.dc.voltage-divider"] = S("mastered", 0.9, "L1")
    add("frontier-min-tier-ok", "compute_frontier", {"states": st3}, "with L1 divider, rc-time-constant is in the frontier")
    stP = {"elec.dc.series-parallel": S("mastered", 0.9, "L1"), "elec.dc.voltage-divider": S("reviewing", 0.4, "L1", source="placement", placement_age_days=10),
           "math.calc.exponential-decay": S("mastered", 0.9, "L1"), "elec.dc.ohms-law": S("mastered", 0.9, "L1"), "math.alg.linear-equations": S("mastered", 0.9, "L1")}
    add("frontier-placement-grace", "compute_frontier", {"states": stP}, "placement card in reviewing (R 0.4) satisfies the frontier test inside the 14-day grace")
    stP2 = {k: dict(v) for k, v in stP.items()}; stP2["elec.dc.voltage-divider"]["placement_age_days"] = 15
    add("frontier-placement-expired", "compute_frontier", {"states": stP2}, "after 14 days the normal retrievability test applies again")
    stP3 = {k: dict(v) for k, v in stP.items()}; stP3["elec.dc.voltage-divider"]["verified_after_placement"] = True
    add("frontier-placement-verified", "compute_frontier", {"states": stP3}, "after the first verification review the grace no longer applies")
    # --- 00a G1: placement grace satisfies min_tier up to L1 for the frontier test only
    def _plc(**kw):
        d = {k: dict(v) for k, v in stP.items()}
        d["elec.dc.voltage-divider"] = S("reviewing", kw.pop("r", 0.4), kw.pop("tier", "L0"), source=kw.pop("source", "placement"), **kw)
        return d
    add("frontier-placement-l0-grace", "compute_frontier", {"states": _plc(placement_age_days=10)}, "00a G1: placement card in reviewing, tier_attained L0, R 0.4, day 10: counts as L1 for the L1 edge, so rc-time-constant opens")
    add("frontier-placement-l0-grace-day14", "compute_frontier", {"states": _plc(placement_age_days=14)}, "00a G1: the grace includes day 14")
    add("frontier-placement-l0-expired", "compute_frontier", {"states": _plc(placement_age_days=15)}, "00a G1: after day 14 the normal tests apply again (R 0.4 and tier L0 both fail)")
    add("frontier-placement-l0-verify-failed", "compute_frontier", {"states": _plc(placement_age_days=5, placement_verify_failed=True)}, "00a G1: the grace ends early when a verify retrieval fails")
    add("frontier-placement-l0-verified", "compute_frontier", {"states": _plc(placement_age_days=5, verified_after_placement=True)}, "00a G1: after a successful verification the grace is replaced by the normal tests (tier L0 fails the L1 edge)")
    add("frontier-learned-l0-blocked", "compute_frontier", {"states": _plc(source="learned", r=0.95, placement_age_days=5)}, "control: a learned (not placed) reviewing card at tier L0 does not satisfy an L1 edge, whatever its R")
    pe = lambda tier: {"strength": "hard", "min_tier": tier}
    pst = lambda **kw: dict({"mastery_state": "reviewing", "retrievability": 0.4, "tier_attained": "L0", "source": "placement", "placement_age_days": 5}, **kw)
    add("prereq-placement-edge-l1", "prereq_satisfied", {"state": pst(), "edge": pe("L1")}, "00a G1: grace card passes an L1 edge")
    add("prereq-placement-edge-l2", "prereq_satisfied", {"state": pst(), "edge": pe("L2")}, "00a G1: the grace goes up to L1 only, an L2 edge still fails")
    add("prereq-placement-edge-null", "prereq_satisfied", {"state": pst(), "edge": pe(None)}, "no tier requirement: grace card passes")
    add("prereq-placement-high-r-l1", "prereq_satisfied", {"state": pst(retrievability=0.95), "edge": pe("L1")}, "00a G1: the tier relaxation also applies when R is already high")
    add("prereq-placement-learning-state", "prereq_satisfied", {"state": pst(mastery_state="learning"), "edge": pe(None)}, "an inferred skill still in `learning` (not yet verified) satisfies no edge")
    add("prereq-placement-mastered-needs-tier", "prereq_satisfied", {"state": pst(mastery_state="mastered", retrievability=0.9, source="learned"), "edge": pe("L1")}, "a mastered skill with tier L0 does not pass an L1 edge")
    add("frontier-decayed-prereq", "compute_frontier", {"states": {"math.alg.linear-equations": S("decayed", 0.5, "L1")}}, "decayed prerequisite blocks dependents")
    add("pull-gpio", "project_pull", {"step_skill_keys": ["sw.fw.adc-reading"]}, "ancestors of the capstone step get pull 1/(1+distance)")
    pp = project_pull(sample_graph(), ["sw.fw.adc-reading"])
    stF = {"math.alg.linear-equations": S("mastered", 0.9, "L1"), "elec.dc.ohms-law": S("mastered", 0.9, "L1"),
           "elec.dc.series-parallel": S("mastered", 0.9, "L1"), "elec.dc.voltage-divider": S("mastered", 0.9, "L1"),
           "sw.c.variables": S("mastered", 0.9, "L1")}
    add("frontier-scores", "frontier_scores", {"states": stF, "project_pull": pp, "node_minutes": {"elec": 300, "sw": 60, "math": 40}}, "ranking with project pull and node balance")
    # interleaving
    add("inter-single", "interleave_stage", {"eligible": 1, "sets": [], "current": 0}, "one fluent skill: blocked")
    add("inter-pairs", "interleave_stage", {"eligible": 2, "sets": [], "current": 0}, "two fluent skills: pairs")
    add("inter-to-triples", "interleave_stage", {"eligible": 3, "sets": [0.7, 0.65], "current": 1}, "two sets >=0.6 and 3 eligible: stage 2")
    add("inter-regress", "interleave_stage", {"eligible": 3, "sets": [0.7, 0.3], "current": 2}, "last set <0.4: regress one stage")
    # packer
    sp = {"math.alg.linear-equations": S("mastered", 0.95, "L1"),
          "elec.dc.ohms-law": S("mastered", 0.82, "L1", due=True),
          "elec.dc.series-parallel": S("learning", 0.9, "L0", loop_step="faded_problem"),
          "sw.c.variables": S("mastered", 0.75, "L1", due=True),
          "math.alg.exponents-logs": S("mastered", 0.7, "L1", due=True)}
    add("pack-micro-phone", "pack_session", {"available_minutes": 20, "context": "phone", "session_type": "micro", "states": sp, "project_pull": pp, "node_minutes": {}}, "20 min phone micro")
    add("pack-micro-5", "pack_session", {"available_minutes": 5, "context": "phone", "session_type": "micro", "states": sp, "node_minutes": {}}, "5 min: reviews only, no new skill")
    add("pack-focus-desktop", "pack_session", {"available_minutes": 90, "context": "desktop", "session_type": "focus", "states": sp, "project_pull": pp, "node_minutes": {}}, "90 min desktop focus")
    spi = dict(sp); spi["elec.dc.kirchhoff-laws"] = S("mastered", 0.8, "L1", due=True); spi["elec.dc.series-parallel"] = S("mastered", 0.8, "L1", due=True); spi["elec.dc.ohms-law"] = S("mastered", 0.82, "L1", due=True)
    add("pack-interleave", "pack_session", {"available_minutes": 30, "context": "desktop", "session_type": "focus", "states": spi, "interleave": {"dc": 1}, "node_minutes": {}}, "due skills in same module interleaved as a stage-1 set")
    add("pack-checkpoint-overdue", "pack_session", {"available_minutes": 20, "context": "phone", "session_type": "micro", "states": sp, "checkpoint": "overdue", "checkpoint_skills": ["math.alg.linear-equations", "elec.dc.ohms-law", "sw.c.variables"], "node_minutes": {}}, "overdue checkpoint reserved first")
    add("pack-bench", "pack_session", {"available_minutes": 60, "context": "bench", "session_type": "micro", "states": sp, "node_minutes": {}}, "bench context yields no cards in micro")
    add("pack-lab", "pack_session", {"available_minutes": 180, "context": "desktop", "session_type": "lab", "states": sp,
                                      "project_steps": [{"key": "prj.L1.divider#s01", "est_min": 40, "skill_key": "elec.dc.voltage-divider"},
                                                         {"key": "prj.L1.divider#s02", "est_min": 60, "skill_key": "elec.dc.voltage-divider"},
                                                         {"key": "prj.L1.divider#s03", "est_min": 90, "skill_key": "elec.dc.voltage-divider"}], "node_minutes": {}}, "lab: steps that fit, then <=10 min reviews")
    sn = {"math.alg.linear-equations": S("mastered", 0.95, "L1"),
          "elec.dc.ohms-law": S("mastered", 0.82, "L1", due=True),
          "sw.c.variables": S("mastered", 0.75, "L1", due=True)}
    add("pack-micro-new-skill", "pack_session", {"available_minutes": 20, "context": "phone", "session_type": "micro", "states": sn, "project_pull": pp, "node_minutes": {}}, "no in-progress skill: one new frontier skill (worked + faded) plus same-day retrieval")
    sd = dict(sn); sd["elec.dc.series-parallel"] = S("learning", 0.9, "L0", loop_step="done")  # the top-ranked frontier skill of pack-micro-new-skill
    add("pack-loop-done-waits", "pack_session", {"available_minutes": 15, "context": "phone", "session_type": "micro", "states": sd, "project_pull": pp, "node_minutes": {}}, "00a M1: a learning skill whose loop is done is not taught again as new; the slot goes to another frontier skill")
    sv = dict(sn); sv["elec.dc.series-parallel"] = S("learning", 0.9, "L0", loop_step="verify"); sv["math.alg.exponents-logs"] = S("learning", 0.9, "L0", loop_step="verify")
    spu = {"elec.dc.ohms-law": S("mastered", 0.82, "L1", due=True), "elec.dc.voltage-divider": S("mastered", 0.8, "L1", due=True)}
    add("pack-untagged-not-interleaved", "pack_session", {"available_minutes": 30, "context": "desktop", "session_type": "focus", "states": spu, "interleave": {"dc": 1}, "node_minutes": {}}, "06 section 7.6: a skill with no confusable_set is never interleaved")
    add("pack-blocked-not-continued", "pack_session", {"available_minutes": 20, "context": "desktop", "session_type": "micro", "states": {"math.alg.linear-equations": S("mastered", 0.95, "L1"), "elec.dc.ohms-law": S("learning", 0.9, "L0", loop_step="faded_problem", blocked_by="math.alg.linear-equations")}, "node_minutes": {}}, "06 section 10: a blocked skill leaves continuation")
    add("pack-decayed-prereq-low-r", "pack_session", {"available_minutes": 20, "context": "desktop", "session_type": "micro", "states": {"math.alg.linear-equations": S("decayed", 0.5, "L1"), "elec.dc.ohms-law": S("learning", 0.9, "L0", loop_step="faded_problem")}, "node_minutes": {}}, "06 section 4.3: below R 0.70 a decayed prerequisite stops continuation")
    add("pack-decayed-prereq-high-r", "pack_session", {"available_minutes": 20, "context": "desktop", "session_type": "micro", "states": {"math.alg.linear-equations": S("decayed", 0.75, "L1"), "elec.dc.ohms-law": S("learning", 0.9, "L0", loop_step="faded_problem")}, "node_minutes": {}}, "06 section 4.3: at R 0.70 or above the in-progress skill continues (hysteresis)")
    add("pack-placed-verify", "pack_session", {"available_minutes": 10, "context": "phone", "session_type": "micro", "states": {"math.alg.linear-equations": S("reviewing", None, "L0", loop_step="verify", source="placement")}, "node_minutes": {}}, "06 section 3: a placed skill has no card, so its verification is a class (a) task")
    add("pack-verify-inferred", "pack_session", {"available_minutes": 10, "context": "phone", "session_type": "micro", "states": sv, "node_minutes": {}}, "diagnostic-inferred skills get cheap verification retrievals and do not use a new-skill slot")
    add("agg-two-items", "aggregate_attempts", {"attempts": [
        {"task_kind": "problem", "score": 1.0, "max_hint_level": 0, "latency_ms": 20000, "expected_ms": 40000, "confidence": 4, "grader_type": "exact_numeric"},
        {"task_kind": "problem", "score": 0.0, "max_hint_level": 1, "latency_ms": 60000, "expected_ms": 40000, "confidence": 2, "grader_type": "exact_numeric"}]}, "interleaved set of 2 items for one skill becomes one review unit")
    add("pack-backlog-suspend", "pack_session", {"available_minutes": 20, "context": "phone", "session_type": "micro", "states": sn, "backlog_suspend_new": True, "node_minutes": {}}, "backlog: no new skills")
    spr = dict(sn); spr["elec.dc.series-parallel"] = S("learning", 0.9, "L0", loop_step="practice"); spr["math.alg.exponents-logs"] = S("reviewing", 0.88, "L0")
    add("pack-focus-practice", "pack_session", {"available_minutes": 90, "context": "desktop", "session_type": "focus", "states": spr, "project_pull": pp, "node_minutes": {}}, "focus: reviews, practice, new skills with two faded problems, practice fill")
    add("pack-lab-no-steps", "pack_session", {"available_minutes": 180, "context": "desktop", "session_type": "lab", "states": spr, "project_pull": pp, "node_minutes": {}, "project_steps": []}, "00a G4: a lab slot with no project step is served as a focus session capped at 120 minutes")
    add("pack-lab-step-too-big", "pack_session", {"available_minutes": 150, "context": "desktop", "session_type": "lab", "states": spr, "project_pull": pp, "node_minutes": {},
                                                  "project_steps": [{"key": "prj.L1.divider#s09", "est_min": 200, "skill_key": "elec.dc.voltage-divider"}]}, "00a G4: the only step does not fit the slot, so no step is eligible: focus fallback")
    add("pack-lab-short-no-steps", "pack_session", {"available_minutes": 90, "context": "desktop", "session_type": "lab", "states": spr, "project_pull": pp, "node_minutes": {}, "project_steps": []}, "00a G4: the 120-minute cap does not extend a shorter slot")
    sag = dict(sn); sag["math.alg.exponents-logs"] = S("reviewing", 0.88, "L0", needs_applied=True); sag["elec.dc.ohms-law"] = S("reviewing", 0.9, "L0", needs_applied=True)
    add("pack-applied-gap-micro", "pack_session", {"available_minutes": 20, "context": "phone", "session_type": "micro", "states": sag, "project_pull": pp, "node_minutes": {}}, "reviewing skills missing only the applied attempt: one problem_short (the one with more dependents) before the new-skill slot")
    add("pack-applied-gap-focus", "pack_session", {"available_minutes": 90, "context": "desktop", "session_type": "focus", "states": sag, "project_pull": pp, "node_minutes": {}}, "focus: both applied-gap skills get one problem, ahead of new frontier skills")
    # weekly plan
    for w in (480, 300, 240, 600):
        add(f"week-{w}", "weekly_plan_slots", {"weekly_minutes": w}, f"weekly plan for {w} min")
    add("rebal-focus-moved", "rebalance", {"weekly_minutes": 480, "today_idx": 3, "slots": [
        {"day": 0, "type": "micro", "min": 20, "status": "done"}, {"day": 1, "type": "focus", "min": 90, "status": "missed"},
        {"day": 3, "type": "focus", "min": 90, "status": "planned"}, {"day": 5, "type": "lab", "min": 180, "status": "planned"}]}, "missed focus on day 1; day 3 focus exists; day 4 adjacent, day 5 has lab, so moved to day 6")
    add("rebal-two-micro", "rebalance", {"weekly_minutes": 480, "today_idx": 3, "slots": [
        {"day": 0, "type": "micro", "min": 20, "status": "missed"}, {"day": 1, "type": "micro", "min": 20, "status": "missed"},
        {"day": 2, "type": "micro", "min": 20, "status": "done"}, {"day": 5, "type": "lab", "min": 180, "status": "planned"}]}, "2 missed micro: add one extra, no make-up of the rest")
    add("rebal-lab-moved", "rebalance", {"weekly_minutes": 480, "today_idx": 4, "slots": [
        {"day": 5, "type": "lab", "min": 180, "status": "missed"}]}, "lab moved to last free day")
    # checkpoints
    add("cp-none", "checkpoint_status", {"days_since_last": 5, "module_fraction_ready": {"dc": 0.5}, "days_since_module": {}}, "nothing due")
    add("cp-due", "checkpoint_status", {"days_since_last": 12, "module_fraction_ready": {}, "days_since_module": {}}, "day 12: reserve")
    add("cp-overdue", "checkpoint_status", {"days_since_last": 15, "module_fraction_ready": {}, "days_since_module": {}}, "day 15: overdue")
    add("cp-module", "checkpoint_status", {"days_since_last": 3, "module_fraction_ready": {"dc": 0.85, "c": 0.5}, "days_since_module": {"dc": None}}, "module 80% ready")
    # stuck / trace
    f = lambda day, item, sc=0.2, h=0: A(day, item, score=sc, hint=h)
    add("stuck-yes", "is_stuck", {"recent": [A(24, "a"), f(25, "b"), f(26, "c"), f(26, "d", 0.1)]}, "3 fails over 2 variants and 2 days")
    add("stuck-same-day", "is_stuck", {"recent": [f(25, "b"), f(25, "c"), f(25, "d")]}, "3 fails same day: not yet")
    add("stuck-reveals", "is_stuck", {"recent": [A(24, "a"), f(25, "b", 0.0, 4), A(26, "c"), f(27, "d", 0.0, 4)]}, "2 reveals in last 4")
    sg = {"math.alg.linear-equations": S("mastered", 0.9, "L1", elo=1500), "elec.dc.ohms-law": S("mastered", 0.9, "L1", elo=1450),
          "elec.dc.series-parallel": S("reviewing", 0.6, "L0", elo=1400)}
    add("trace-state-suspect", "trace_back", {"states": sg, "skill_key": "elec.dc.voltage-divider"}, "prereq with R<0.8 is the suspect")
    sg2 = dict(sg); sg2["elec.dc.series-parallel"] = S("mastered", 0.9, "L1", elo=1400)
    add("trace-probe-needed", "trace_back", {"states": sg2, "skill_key": "elec.dc.voltage-divider"}, "no suspect: probe prereq")
    add("trace-probe-fail-recurse", "trace_back", {"states": sg2, "skill_key": "elec.dc.voltage-divider", "probe_results": {"elec.dc.series-parallel": 0.0, "elec.dc.ohms-law": 1.0}}, "failed probe on series-parallel; recursion probes ohms-law")
    add("trace-skill-specific", "trace_back", {"states": sg2, "skill_key": "elec.dc.voltage-divider", "probe_results": {"elec.dc.series-parallel": 1.0}}, "all probes pass: skill-specific")
    add("hint-reliance", "hint_reliance", {"recent": [A(d, f"i{d}", hint=(2 if d % 2 else 0)) for d in range(1, 13)]}, "50% hinted: not above threshold")
    add("hint-reliance-high", "hint_reliance", {"recent": [A(d, f"i{d}", hint=(3 if d % 3 else 0)) for d in range(1, 13)]}, "8 of 12 hinted: flag")
    # --- 00a G5: desired retention
    for wk, gap, note in ((0, None, "week 0, no calibration data: 0.85"), (7.9, 0.0, "inside the first 8 weeks: 0.85 even with a perfect calibration"),
                          (8, 0.02, "week 8, observed - predicted = +0.02: 0.90"), (8, -0.07, "boundary: exactly -0.07 is still within 0.07: 0.90"),
                          (8, -0.08, "observed 0.08 below predicted: stay at 0.85"), (12, 0.10, "observed 0.10 above predicted: the model is off the other way, stay at 0.85 (two-sided)"),
                          (20, None, "no calibration data after week 8: stay at 0.85")):
        add(f"retention-w{str(wk).replace('.', '_')}-{'none' if gap is None else str(gap).replace('-', 'm').replace('.', '_')}", "desired_retention", {"weeks_since_start": wk, "observed_minus_predicted": gap}, "00a G5: " + note)
    # --- 00a G6: tutor over-reliance trigger
    ck = lambda un, unc, ad, adc: {"unaided_n": un, "unaided_correct": unc, "aided_n": ad, "aided_correct": adc}
    add("reliance-trigger", "tutor_overreliance", {"checkpoints": [ck(10, 6, 20, 18), ck(10, 5, 20, 17)]}, "00a G6: strict-unaided 11/20 = 0.55 against aided 35/40 = 0.875: gap 0.325, post-attempt-only")
    add("reliance-exactly-threshold", "tutor_overreliance", {"checkpoints": [ck(10, 8, 10, 10), ck(10, 9, 10, 10)]}, "00a G6: gap exactly 0.15 is not more than 0.15: no flag")
    add("reliance-just-over", "tutor_overreliance", {"checkpoints": [ck(10, 8, 10, 10), ck(10, 8, 10, 10)]}, "00a G6: gap 0.20: flag")
    add("reliance-too-few-attempts", "tutor_overreliance", {"checkpoints": [ck(4, 1, 20, 18), ck(5, 1, 20, 18)]}, "00a G6: only 9 strict-unaided attempts in the window: no decision")
    add("reliance-one-checkpoint", "tutor_overreliance", {"checkpoints": [ck(12, 3, 30, 28)]}, "00a G6: needs two checkpoints")
    add("reliance-recovery", "tutor_overreliance", {"checkpoints": [ck(10, 3, 20, 18), ck(10, 4, 20, 18), ck(10, 8, 20, 17), ck(10, 8, 20, 17)]}, "00a G6: only the last two checkpoints count, so the switch lifts when the gap closes")
    add("reliance-unaided-better", "tutor_overreliance", {"checkpoints": [ck(10, 9, 20, 12), ck(10, 9, 20, 12)]}, "00a G6: unaided accuracy above aided accuracy: no flag")
    add("reliance-uses-last-two", "tutor_overreliance", {"checkpoints": [ck(10, 9, 20, 18), ck(10, 4, 20, 18), ck(10, 5, 20, 18)]}, "00a G6: three checkpoints: the first is ignored")
    return V


def generate(path: str) -> int:
    vecs = vector_inputs()
    for v in vecs:
        v["expected"] = run_vector(v["fn"], v["input"])
    doc = {"generated_by": "reference/scheduler_reference.py generate", "reference_date": "2026-10-31",
           "params_version": "06-spec-1.0", "count": len(vecs), "vectors": vecs}
    with open(path, "w") as fh:
        json.dump(doc, fh, indent=1, sort_keys=True)
        fh.write("\n")
    return len(vecs)


def check(path: str) -> int:
    with open(path) as fh:
        doc = json.load(fh)
    bad = 0
    for v in doc["vectors"]:
        got = json.loads(json.dumps(run_vector(v["fn"], v["input"]), sort_keys=True))
        if got != v["expected"]:
            bad += 1
            print("FAIL", v["id"], "\n  expected", v["expected"], "\n  got     ", got)
    print(f"{len(doc['vectors']) - bad}/{len(doc['vectors'])} vectors pass")
    return bad


def selftest() -> int:
    """Property checks beyond the vectors."""
    assert abs(expected_score(1500, 1500) - 0.5) < 1e-12
    assert k_factor(0) == 48 and k_factor(10) == 24 and k_factor(1000) == 16
    # monotone: higher theta -> higher expected
    assert expected_score(1600, 1500) > expected_score(1500, 1500)
    # Elo conservation without weights: correct always raises, wrong always lowers
    for th in (1100, 1300, 1700):
        up = update_elo(th, 5, 1500, 5, {"task_kind": "problem", "score": 1.0, "max_hint_level": 0, "unaided": True})
        dn = update_elo(th, 5, 1500, 5, {"task_kind": "problem", "score": 0.0, "max_hint_level": 0, "unaided": True})
        assert up["theta"] > th > dn["theta"]
    # frontier never contains a skill with unmet hard prereq
    g = sample_graph()
    fr = compute_frontier(g, {})
    for k in fr:
        assert not [e for e in g["edges"] if e["to"] == k and e["strength"] == "hard"]
    # packer never exceeds available minutes and micro never exceeds 20
    for mins in (3, 5, 10, 20, 45, 90):
        for ctx in ("phone", "desktop"):
            for stype in ("micro", "focus"):
                out = pack_session({"available_minutes": mins, "context": ctx, "session_type": stype, "graph": g,
                                    "states": {"elec.dc.ohms-law": S("mastered", 0.8, "L1", due=True)}, "node_minutes": {}})
                assert out["total_est_min"] <= min(mins, 20 if stype == "micro" else mins) + 1e-9, (mins, ctx, stype, out)
                if ctx == "phone":
                    assert all(t["task_kind"] in PHONE_KINDS or t["task_kind"] == "problem" and t.get("interleaved") or False
                               for t in out["tasks"]), out
    for w in range(60, 1200, 30):
        assert weekly_plan_slots(w)["planned_total_min"] <= w
    assert weekly_plan_slots(480)["planned_total_min"] == 460
    # contract v1.2 additions (00a G1-G6)
    # 00a M2 (6 Nov 2026) replaced the G3 span of 2 days and the 2-day rule: one session can master a skill
    assert PARAMS["mastery_min_span_days"] == 0 and PARAMS["mastery_min_days"] == 1 and PARAMS["mastery_min_templates"] == 2
    assert PARAMS["desired_retention_initial"] == 0.85 and PARAMS["latency_min_obs"] == 20
    assert desired_retention(0, None) == 0.85 and desired_retention(9, 0.0) == 0.90 and desired_retention(9, 0.2) == 0.85
    pl = {"mastery_state": "reviewing", "retrievability": 0.3, "tier_attained": "L0", "source": "placement", "placement_age_days": 3}
    assert prereq_satisfied(pl, {"min_tier": "L1"}) and not prereq_satisfied(pl, {"min_tier": "L2"})
    assert not prereq_satisfied(dict(pl, source="learned"), {"min_tier": "L1"})
    # the grace never changes tier_attained or the mastery state (it is a frontier-test relaxation only)
    assert pl["tier_attained"] == "L0" and pl["mastery_state"] == "reviewing"
    # lab fallback: a lab slot without an eligible project step is served as focus and never exceeds the cap
    out = pack_session({"available_minutes": 240, "context": "desktop", "session_type": "lab", "graph": g,
                        "states": {"elec.dc.ohms-law": S("mastered", 0.8, "L1", due=True)}, "node_minutes": {}, "project_steps": []})
    assert out["served_as"] == "focus" and out["total_est_min"] <= PARAMS["lab_fallback_cap_min"] + 1e-9
    # tutor trigger is monotone in the unaided accuracy
    base = [{"unaided_n": 10, "unaided_correct": 10, "aided_n": 10, "aided_correct": 10}] * 2
    prev = None
    for c in range(10, -1, -1):
        r = tutor_overreliance([{"unaided_n": 10, "unaided_correct": c, "aided_n": 10, "aided_correct": 10}] * 2)
        assert prev is None or (not prev) or r["flag"]
        prev = r["flag"]
    assert not tutor_overreliance(base)["flag"]
    print("selftest ok")
    return 0



# --------------------------------------------------------------------------------------
# Workload simulation (design review 00f). NOT part of the behaviour oracle: it is not covered
# by the vectors and does not change any function above. It drives pack_session() and the
# mastery functions with a synthetic learner and a SIMPLIFIED, RECALLED FSRS-5-like memory model
# (default weights recalled from memory [R]; NOT the pinned FSRS-6 library). Use it to size load
# and compare parameter settings, never as a prediction. Needs PyYAML (the rest of this file does not).
#   python3 reference/scheduler_reference.py sim [weeks] [seeds]
# --------------------------------------------------------------------------------------
import random as _random

_W5 = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
       1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]       # [R] FSRS-5 defaults as recalled
_DECAY, _FACTOR = -0.5, 19.0 / 81.0


def _fs_r(t: float, s: float) -> float:
    return (1.0 + _FACTOR * t / s) ** _DECAY


def _fs_interval(s: float, ret: float, max_days: int = 180) -> int:
    i = s / _FACTOR * (ret ** (1.0 / _DECAY) - 1.0)
    return int(min(max(round(i), 1), max_days))


def _fs_d0(g: int) -> float:
    return min(max(_W5[4] - math.exp(_W5[5] * (g - 1)) + 1, 1.0), 10.0)


def _fs_next(card: Dict[str, float], g: int, t: float, stab_mult: float = 1.0) -> None:
    """Update a card in place after rating g (1..4) when t days elapsed. `stab_mult` < 1 models
    fresh-variant reviews growing stability more slowly than same-card reviews (an assumption, [inf])."""
    if card["s"] <= 0:
        card["s"], card["d"] = _W5[g - 1], _fs_d0(g)
        return
    s, d = card["s"], card["d"]
    r = _fs_r(t, s)
    if g == 1:
        ns = _W5[11] * d ** (-_W5[12]) * ((s + 1) ** _W5[13] - 1) * math.exp(_W5[14] * (1 - r))
        ns = min(ns, s)
        card["lapses"] += 1
    else:
        hard = _W5[15] if g == 2 else 1.0
        easy = _W5[16] if g == 4 else 1.0
        inc = math.exp(_W5[8]) * (11 - d) * s ** (-_W5[9]) * (math.exp(_W5[10] * (1 - r)) - 1) * hard * easy
        ns = s * (1 + inc * stab_mult)
    nd = d - _W5[6] * (g - 3)
    card["d"] = min(max(_W5[7] * _fs_d0(4) + (1 - _W5[7]) * nd, 1.0), 10.0)
    card["s"] = max(ns, 0.01)


def sim_graph(path: str) -> Dict[str, Any]:
    import yaml  # local import: only the simulator needs it
    with open(path) as fh:
        y = yaml.safe_load(fh)
    skills, edges = {}, []
    for s in y["skills"]:
        if s["status"] == "stub":
            continue
        skills[s["key"]] = {"node": s["node"], "module": s["module"], "est_minutes": s["est_minutes"],
                            "tier_target": s["tier_target"], "phone_kinds": PHONE_KINDS if s["phone_suitable"] else []}
    for s in y["skills"]:
        if s["status"] == "stub":
            continue
        for p in s["prerequisites"]:
            p = {"skill": p} if isinstance(p, str) else p
            edges.append({"from": p["skill"], "to": s["key"], "strength": p.get("strength", "hard"), "min_tier": p.get("min_tier")})
    return {"skills": skills, "edges": edges}


def simulate(graph: Dict[str, Any], weeks: int = 12, seed: int = 1, weekly_minutes: int = 480,
             interleave: bool = True, time_mult: float = 1.0, miss_rate: float = 0.0, p_new: float = 0.85,
             variant_penalty: float = 0.0, stab_mult: float = 1.0, retention: Optional[float] = None,
             params: Optional[Dict[str, Any]] = None, applied_gap: bool = True,
             pull_steps: Optional[List[str]] = None, lab_as_focus: bool = False, n_templates: int = 1) -> Dict[str, Any]:
    """Day-level simulation of the plan from weekly_plan_slots(weekly_minutes) driving pack_session().
    Loop-step transitions after a new-skill chunk (worked -> faded -> same-day retrieval -> one 'practice' problem -> done)
    are NOT specified by document 06; this function states the assumption it uses. Returns weekly metrics."""
    rnd = _random.Random(seed)
    P = dict(_p(params))
    if not applied_gap:
        P["applied_gap_max"] = {"micro": 0, "focus": 0, "lab": 0}
    plan = weekly_plan_slots(weekly_minutes)
    pull = project_pull(graph, pull_steps) if pull_steps else {}
    skills = graph["skills"]
    st: Dict[str, Dict[str, Any]] = {}
    iid = [0]
    base = datetime(2026, 11, 2, tzinfo=timezone.utc)       # a Monday
    weeks_out: List[Dict[str, Any]] = []
    last_cp = None
    cp_started = False
    suspend = False
    node_log: List[Any] = []                                  # (day, node, minutes)
    first_mastered: Dict[str, int] = {}
    mon = {"n": 0, "sum": 0.0}                                 # calibration monitor (00a G5): observed - predicted recall

    def refresh(k, day):
        s = st[k]
        r = _fs_r(day - s["card"]["last"], s["card"]["s"]) if s.get("card") else None
        s["retrievability"] = r
        s["due"] = bool(s.get("card") and (s["card"]["due"] <= day or s["mastery_state"] == "decayed"))
        att = s["attempts"]
        ntpl = n_templates if n_templates >= 2 else 0
        ms = mastery_state(att, skills[k]["tier_target"], r, s["ever"], s["last_rating"], s["lapses60"], att[s["decay_idx"]:] if s["decay_idx"] is not None else None, True, True, P, ntpl)
        if ms == "mastered":
            s["ever"] = True
            s["decay_idx"] = None
        elif ms == "decayed" and s["decay_idx"] is None:
            s["decay_idx"] = len(att)
        if ms == "mastered" and k not in first_mastered:
            first_mastered[k] = day
        s["mastery_state"] = ms
        s["needs_applied"] = bool(applied_gap and needs_applied(att, skills[k]["tier_target"], ms, 0, True, True, P, False, ntpl))
        ta = tier_attained(att, skills[k]["tier_target"], False, 0.0, params=P) if att else None
        if ta and _tier_idx(ta) > _tier_idx(skills[k]["tier_target"]):
            ta = skills[k]["tier_target"]
        s["tier_attained"] = ta

    def new_state():
        return {"mastery_state": "learning", "attempts": [], "ever": False, "last_rating": None, "lapses60": 0,
                "decay_idx": None, "card": None, "loop_step": "worked_example", "needs_applied": False, "due": False, "retrievability": None,
                "tier_attained": None, "reviewed_day": None}

    def attempt(k, kind, day, p_ok, reason):
        s = st[k]
        ok = rnd.random() < p_ok
        iid[0] += 1
        sc = 1.0 if ok else 0.3
        s["attempts"].append({"submitted_at": (base + timedelta(days=day, hours=9)).isoformat(), "item_id": f"i{iid[0]}",
                              "task_kind": kind, "score": sc, "max_hint_level": 0, "unaided": True,
                              "grader_type": "exact_numeric", "item_tier": skills[k]["tier_target"],
                              **({"template_key": f"t{rnd.randrange(n_templates)}"} if n_templates >= 2 else {})})
        if s["reviewed_day"] == day:                                   # one review_log row per skill per local day
            return ok
        s["reviewed_day"] = day
        if ok:
            u = rnd.random()
            g = 2 if u < 0.12 else (4 if u > 0.95 and (s["card"] and s["card"]["reps"] >= 2) else 3)
        else:
            g = 1
        s["last_rating"] = g
        c = s["card"]
        if c is None:
            c = s["card"] = {"s": 0.0, "d": 5.0, "last": day, "due": day, "reps": 0, "lapses": 0}
            _fs_next(c, g, 0)
        else:
            if day - c["last"] >= 1:
                mon["n"] += 1
                mon["sum"] += (1.0 if ok else 0.0) - _fs_r(day - c["last"], c["s"])
            _fs_next(c, g, day - c["last"], stab_mult if g != 1 else 1.0)
        c["reps"] += 1
        c["last"] = day
        ret = retention if retention is not None else desired_retention(day / 7.0, (mon["sum"] / mon["n"]) if mon["n"] >= 30 else None, P)
        c["due"] = day + (1 if g == 1 else _fs_interval(c["s"], ret))
        if g == 1:
            s["lapses60"] += 1
        return ok

    for w in range(weeks):
        wk = {"week": w + 1, "min_review": 0.0, "min_new": 0.0, "min_practice": 0.0, "min_checkpoint": 0.0,
              "min_total": 0.0, "new_started": 0, "reviews": 0, "sessions": 0, "short_sessions": 0}
        due_start = 0
        for dow in range(7):
            day = w * 7 + dow
            for k in st:
                refresh(k, day)
            if dow == 0:
                due_start = sum(1 for s in st.values() if s["due"])
            slots = []
            if dow <= 4:
                slots.append(("micro", "phone", plan["micro"]["len_min"]))
            if dow in (1, 3) and plan["focus"]["n"]:
                slots.append(("focus", "desktop", plan["focus"]["len_min"]))
            if dow == 5 and plan["lab"]["n"]:
                if lab_as_focus:      # review F-08: no project step is eligible yet, so the lab slot is served as a focus session (<= 120)
                    slots.append(("focus", "desktop", min(120, plan["lab"]["len_min"])))
                else:
                    slots.append(("lab", "desktop", plan["lab"]["len_min"]))
            for (stype, ctx, length) in slots:
                if rnd.random() < miss_rate:
                    continue
                for k in st:
                    refresh(k, day)
                due_n = sum(1 for s in st.values() if s["due"])
                if due_n * 1.5 > 120:
                    suspend = True
                elif due_n * 1.5 < 60:
                    suspend = False
                mastered_like = [k for k, s in st.items() if s["mastery_state"] in ("reviewing", "mastered")]
                if not cp_started and len(mastered_like) >= 5:
                    cp_started, last_cp = True, day - 12
                cps = checkpoint_status(None if last_cp is None else day - last_cp, {}, {})["status"]
                cp_sk = sorted(mastered_like, key=lambda k: (st[k]["retrievability"] if st[k]["retrievability"] is not None else 1, k))[:8]
                mods = {}
                for k, s in st.items():
                    if s["mastery_state"] in ("reviewing", "mastered"):
                        mods.setdefault(skills[k]["module"], []).append(k)
                stages = {}
                if interleave:
                    for m, ks in mods.items():
                        stages[m] = interleave_stage(len(ks), [0.75, 0.75, 0.75], 1)
                nm: Dict[str, float] = {}
                for (d0, nd, mm) in node_log:
                    if day - d0 < 7:
                        nm[nd] = nm.get(nd, 0.0) + mm
                res = pack_session({"available_minutes": length / time_mult, "context": ctx, "session_type": stype, "graph": graph,
                                    "states": st, "checkpoint": cps if stype != "lab" else "none", "checkpoint_skills": cp_sk,
                                    "interleave": stages, "node_minutes": nm, "project_pull": pull, "backlog": suspend,
                                    "backlog_suspend_new": suspend, "project_steps": []}, P)
                wk["sessions"] += 1
                if res["total_est_min"] < 0.5 * length / time_mult:
                    wk["short_sessions"] += 1
                chunk: Dict[str, List[str]] = {}
                for t in res["tasks"]:
                    k, kind, why, m = t["skill_key"], t["task_kind"], t["reason"], t["est_min"] * time_mult
                    wk["min_total"] += m
                    if why in ("new_frontier", "continue"):
                        if k not in st:
                            st[k] = new_state()
                            wk["new_started"] += 1
                            refresh(k, day)
                        chunk.setdefault(k, []).append(kind)
                        wk["min_new"] += m
                        node_log.append((day, skills[k]["node"], m))
                        continue
                    if kind == "checkpoint":
                        wk["min_checkpoint"] += m
                        r = st[k]["retrievability"] or 0.9
                        attempt(k, "checkpoint", day, max(0.05, r - variant_penalty), why)
                        continue
                    if why in ("practice",) or (kind == "problem" and why in ("interleaved_practice",)):
                        wk["min_practice"] += m
                        node_log.append((day, skills[k]["node"], m))
                    else:
                        wk["min_review"] += m
                    if k not in st:
                        continue
                    s = st[k]
                    r = s["retrievability"]
                    p_ok = p_new if r is None else max(0.05, r - variant_penalty)
                    if kind == "problem":
                        p_ok *= 0.95
                    ok = attempt(k, kind if kind in REVIEW_KINDS else "retrieval", day, p_ok, why)
                    wk["reviews"] += 1
                    if why == "practice":
                        s["loop_step"] = "done"
                    if why == "same_day_retrieval":
                        s["loop_step"] = "practice"
                    if why == "verify_inferred":
                        s["loop_step"] = "done"
                    if not ok and s["loop_step"] == "done":
                        pass
                if res["tasks"] and cps in ("due", "overdue") and any(t["task_kind"] == "checkpoint" for t in res["tasks"]):
                    last_cp = day
                for k, kinds in chunk.items():
                    if "worked_example" in kinds:
                        st[k]["loop_step"] = "retrieval_same_day"
                    elif "faded_problem" in kinds and st[k]["loop_step"] == "worked_example":
                        st[k]["loop_step"] = "retrieval_same_day"
        day = w * 7 + 6
        for k in st:
            refresh(k, day + 1)
        wk["due_at_week_start"] = due_start
        wk["due_at_week_end"] = sum(1 for s in st.values() if s["due"])
        wk["started_total"] = len(st)
        wk["mastered"] = sum(1 for s in st.values() if s["mastery_state"] == "mastered")
        wk["reviewing"] = sum(1 for s in st.values() if s["mastery_state"] == "reviewing")
        wk["decayed"] = sum(1 for s in st.values() if s["mastery_state"] == "decayed")
        wk["learning"] = sum(1 for s in st.values() if s["mastery_state"] == "learning")
        wk["frontier_size"] = len(compute_frontier(graph, st, P))
        weeks_out.append(wk)
    return {"weeks": weeks_out, "first_mastered_day": first_mastered, "started": sorted(st)}


def demand_curve(graph: Dict[str, Any], per_week: int, weeks: int = 12, seed: int = 1, intro_min: float = 10.5,
                 review_min: float = 1.5, practice_min: float = 6.0, checkpoint_min: float = 20.0,
                 retention: float = 0.85, stab_mult: float = 1.0, variant_penalty: float = 0.0, max_skills: int = 142) -> List[Dict[str, float]]:
    """Unconstrained demand: introduce `per_week` skills each week (graph order ignored, capped at max_skills),
    every skill is reviewed when due, plus one applied practice problem the day after introduction and a
    checkpoint every 14 days. Returns minutes per week with no time cap: what the plan would have to hold."""
    rnd = _random.Random(seed)
    cards: List[Dict[str, float]] = []
    out = []
    for w in range(weeks):
        mins = {"intro": 0.0, "review": 0.0, "practice": 0.0, "checkpoint": 0.0}
        n_rev = 0
        due_days = []
        for dow in range(7):
            day = w * 7 + dow
            if dow < 6:
                n_int = per_week // 6 + (1 if dow < per_week % 6 else 0)
                for _ in range(n_int):
                    if len(cards) < max_skills:
                        c = {"s": 0.0, "d": 5.0, "last": day, "due": day, "reps": 0, "lapses": 0, "intro": day}
                        _fs_next(c, 3, 0)
                        c["due"] = day + _fs_interval(c["s"], retention)
                        c["reps"] = 1
                        cards.append(c)
                        mins["intro"] += intro_min
            day_reviews = 0
            for c in cards:
                if c["intro"] == day - 1:
                    mins["practice"] += practice_min
                if c["due"] <= day and c["last"] < day:
                    r = _fs_r(day - c["last"], c["s"])
                    ok = rnd.random() < max(0.05, r - variant_penalty)
                    g = 1 if not ok else (2 if rnd.random() < 0.12 else 3)
                    _fs_next(c, g, day - c["last"], stab_mult if g != 1 else 1.0)
                    c["reps"] += 1
                    c["last"] = day
                    c["due"] = day + (1 if g == 1 else _fs_interval(c["s"], retention))
                    mins["review"] += review_min
                    day_reviews += 1
            n_rev += day_reviews
            if (day + 1) % 14 == 0 and len(cards) >= 5:
                mins["checkpoint"] += checkpoint_min
            due_days.append(day_reviews)
        total = sum(mins.values())
        out.append({"week": w + 1, "skills": len(cards), "reviews": n_rev, "review_min": round(mins["review"], 1),
                    "intro_min": round(mins["intro"], 1), "practice_min": round(mins["practice"], 1),
                    "checkpoint_min": round(mins["checkpoint"], 1), "total_min": round(total, 1),
                    "max_reviews_per_day": max(due_days)})
    return out


def _sim_summary(runs: List[Dict[str, Any]], weeks: int) -> Dict[str, float]:
    n = len(runs)
    def m(key, a, b):
        return sum(r["weeks"][i][key] for r in runs for i in range(a, b)) / (n * (b - a))
    lo = min(4, weeks - 1)
    tot = m("min_total", lo, weeks) or 1.0
    return {"mastered": m("mastered", weeks - 1, weeks), "new_per_wk": m("new_started", 0, weeks), "new_per_wk_late": m("new_started", lo, weeks),
            "review_share": 100.0 * m("min_review", lo, weeks) / tot, "due_start": m("due_at_week_start", max(weeks - 4, 0), weeks),
            "frontier": m("frontier_size", weeks - 1, weeks), "reviewing": m("reviewing", weeks - 1, weeks),
            "short": m("short_sessions", 0, weeks), "min_total": m("min_total", 0, weeks)}


SIM_SCENARIOS = [
    ("v1.2 defaults (span 2, lab as focus, desired retention 0.85 then monitor, applied-gap on, 1 template)", {}),
    ("same, 2 verified templates per skill (template-diversity condition active)", {"n_templates": 2}),
    ("contract v1.1 mastery and retention (span 0, retention 0.90 fixed; lab-as-focus and applied-gap still on)", {"params": {"mastery_min_span_days": 0}, "retention": 0.90}),
    ("span 4 days (sensitivity)", {"params": {"mastery_min_span_days": 4}}),
    ("retention 0.90 fixed (no 0.85 start)", {"retention": 0.90}),
    ("applied-gap rule off (the rule as ratified in 00a B3, before G2)", {"applied_gap": False}),
    ("pessimistic memory (variants -0.10 recall, stability x0.7)", {"variant_penalty": 0.10, "stab_mult": 0.7}),
    ("tasks take 1.5x the builder estimate", {"time_mult": 1.5}),
    ("tasks take 2.0x the builder estimate", {"time_mult": 2.0}),
    ("20% of sessions missed", {"miss_rate": 0.2}),
    ("150-minute week (builder keeps 2.5 of 8 hours, 00d)", {"weekly_minutes": 150}),
]


def _sim_main(argv: List[str]) -> int:
    weeks = int(argv[0]) if argv else 12
    seeds = int(argv[1]) if len(argv) > 1 else 10
    import os
    g = sim_graph(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "mvp-skill-graph.yaml"))
    print("graph:", len(g["skills"]), "skills,", len(g["edges"]), "edges; weeks", weeks, "seeds", seeds)
    print("== Demand curve (no time cap), minutes/week, mean of", seeds, "seeds ==")
    for per in (5, 7, 10, 20):
        runs = [demand_curve(g, per, weeks, s, max_skills=len(g["skills"])) for s in range(seeds)]
        print(f"-- {per} new skills/week")
        for i in (0, 3, 5, 7, 11):
            if i >= weeks:
                continue
            m = {k: sum(r[i][k] for r in runs) / seeds for k in ("skills", "reviews", "review_min", "intro_min", "practice_min", "checkpoint_min", "total_min", "max_reviews_per_day")}
            print(f"  w{i + 1:02d} skills={m['skills']:.0f} reviews={m['reviews']:.0f} rev_min={m['review_min']:.0f} intro={m['intro_min']:.0f} "
                  f"prac={m['practice_min']:.0f} cp={m['checkpoint_min']:.0f} total={m['total_min']:.0f} max/day={m['max_reviews_per_day']:.0f}")
    print("== pack_session-driven simulation (480 min/week unless stated); columns: mastered@end, new skills/week (all weeks, weeks 5+), review share of minutes (weeks 5+), reviews due at week start (last 4 weeks), frontier size@end, reviewing@end, total minutes/week ==")
    for name, kw in SIM_SCENARIOS:
        runs = [simulate(g, weeks, s, **kw) for s in range(seeds)]
        r = _sim_summary(runs, weeks)
        print(f"  {name}\n      mastered={r['mastered']:.1f} new/wk={r['new_per_wk']:.1f} ({r['new_per_wk_late']:.1f} from wk5) review%={r['review_share']:.0f} due@start={r['due_start']:.1f} frontier={r['frontier']:.1f} reviewing={r['reviewing']:.1f} min/wk={r['min_total']:.0f}")
    print("== weekly detail, v1.2 defaults ==")
    runs = [simulate(g, weeks, s) for s in range(seeds)]
    keys = ["new_started", "min_new", "min_review", "min_practice", "min_checkpoint", "min_total", "due_at_week_start", "mastered", "reviewing", "learning", "decayed", "frontier_size", "short_sessions"]
    for i in range(weeks):
        print(f"  w{i + 1:02d} " + " ".join(f"{k}={sum(r['weeks'][i][k] for r in runs) / seeds:.1f}" for k in keys))
    return 0


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "selftest":
        sys.exit(selftest())
    if len(sys.argv) == 3 and sys.argv[1] == "generate":
        print(generate(sys.argv[2]), "vectors written")
        sys.exit(0)
    if len(sys.argv) == 3 and sys.argv[1] == "check":
        sys.exit(1 if check(sys.argv[2]) else 0)
    if len(sys.argv) >= 2 and sys.argv[1] == "sim":
        sys.exit(_sim_main(sys.argv[2:]))
    print(__doc__)
    sys.exit(2)
