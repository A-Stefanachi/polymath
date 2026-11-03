import copy
import json
import shutil
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

import tplkit
import verify_template as vt
import validate_templates as vtpl  # reference/validate_templates.py (parent dir on path via conftest)

ALL = tplkit.load_all()
SCHEMA = json.loads(vtpl.SCHEMA.read_text())
V = Draft202012Validator(SCHEMA)


def test_at_least_seven_templates_covering_required_grader_types():
    assert len(ALL) >= 7
    graders = {t["grader_type"] for t in ALL.values()}
    assert {"exact_numeric", "symbolic_equivalence", "multiple_choice", "code_tests", "spice_compare"} <= graders
    assert "perceptual_drill" in {t["task_kind"] for t in ALL.values()}


@pytest.mark.parametrize("key", sorted(ALL))
def test_sample_validates_against_schema(key):
    assert list(V.iter_errors(ALL[key])) == []


def _bad(mutator):
    t = copy.deepcopy(ALL["tpl.elec.voltage-divider-vout"])
    mutator(t)
    return [e.message for e in V.iter_errors(t)]


def test_schema_rejects_bad_documents():
    assert _bad(lambda t: t.update(skill_key="elec.voltage"))                      # contract regex
    assert _bad(lambda t: t.update(key="elec.divider"))                            # tpl. prefix
    assert _bad(lambda t: t.update(grader_type="llm_magic"))                       # enum
    assert _bad(lambda t: t.update(authoring_status="verified"))                   # only the pipeline may set verified
    assert _bad(lambda t: t.update(license="CC-BY-NC-SA-4.0"))                     # non-commercial licence
    assert _bad(lambda t: t.update(difficulty_prior=1.5))
    assert _bad(lambda t: t.update(verifiers=t["verifiers"][:1]))                  # ready needs >= 2 verifiers
    assert _bad(lambda t: t["hints"].pop("l2"))                                    # ready needs l1..l3
    assert _bad(lambda t: t["answer"].pop("tolerance"))                            # grader-specific answer block
    assert _bad(lambda t: t["verifiers"][0].pop("independence"))
    assert _bad(lambda t: t["fuzz"].update(samples=50))                            # 200-sample minimum
    assert _bad(lambda t: t.update(surprise=1))                                    # additionalProperties false
    assert _bad(lambda t: t["provenance"]["llm_assistance"].pop("prompt_version"))


@pytest.mark.parametrize("key", sorted(ALL))
def test_hints_never_contain_the_final_answer_text(key):
    tpl = ALL[key]
    if tpl["grader_type"] != "exact_numeric" or tpl["answer"]["kind"] != "numeric":
        pytest.skip("only numeric answers are checked textually")
    for seed in range(30):
        item = tplkit.generate_item(tpl, seed)
        ans = tplkit.apply_filter(item["_ctx"][tpl["answer"]["value"]], "eng", tpl["answer"]["unit"])
        for lvl in ("l1", "l2", "l3"):
            text = tplkit.render_text(tpl["hints"][lvl], item["_ctx"], tplkit.unit_map(tpl))
            assert ans not in text


@pytest.mark.parametrize("key", sorted(ALL))
def test_quick_fuzz_30_samples(key):
    if key == "tpl.sw.debounce-counter-c" and shutil.which("gcc") is None:
        pytest.skip("gcc missing")
    if key == "tpl.elec.rc-lowpass-netlist" and shutil.which("ngspice") is None:
        pytest.skip("ngspice missing")
    s = vt.fuzz(ALL[key], 30)
    assert s["failures"] == 0, s


def test_template_hash_changes_when_content_changes():
    t = ALL["tpl.elec.voltage-divider-vout"]
    h = tplkit.template_sha256(t)
    t2 = copy.deepcopy(t)
    t2["hints"]["l1"] += " "
    assert tplkit.template_sha256(t2) != h
    t3 = copy.deepcopy(t)
    t3["provenance"]["review"] = {"reviewer": "x"}
    assert tplkit.template_sha256(t3) == h  # adding a review block does not invalidate the hash


def test_mc_distractor_collision_is_rejected_by_sampler():
    t = copy.deepcopy(ALL["tpl.elec.series-parallel-req-mc"])
    t["answer"]["min_separation_rel"] = 0.04
    for s in range(100):
        item = tplkit.generate_item(t, s)
        vals = sorted(tplkit.option_values(t, item["_ctx"]).values())
        assert all(b / a > 1.04 for a, b in zip(vals, vals[1:]))
