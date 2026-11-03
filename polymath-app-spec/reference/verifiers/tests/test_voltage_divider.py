import copy
import subprocess
import sys
from pathlib import Path

import pytest

import tplkit
import verify_template as vt
import voltage_divider_demo as demo


def test_demo_generator_and_verifier_agree_over_many_seeds():
    for seed in range(300):
        it = demo.generate(seed)
        assert demo.verify(it)["decision"] == "verified"


def test_verifier_catches_a_wrong_generator():
    swapped = lambda vin, r1, r2: vin * r1 / (r1 + r2)  # classic bug: wrong resistor in numerator
    it = demo.generate(5, generator=swapped)
    rep = demo.verify(it)
    assert rep["decision"] == "rejected"
    assert rep["verifiers"][0]["status"] == "fail"


def test_verifier_catches_a_dimension_error():
    # A "current" divider formula mistakenly returned as volts has the wrong dimension.
    tpl = copy.deepcopy(tplkit.load_all()["tpl.elec.voltage-divider-vout"])
    tpl["verifiers"][1]["spec"]["checks"] = [{"expr": "vin / (r1 + r2)", "result_unit": "V"}]
    item = tplkit.generate_item(tpl, 3)
    with pytest.raises(vt.Fail):
        vt.v_pint_dimension(tpl, item, tpl["verifiers"][1])


def test_engine_rejects_broken_template_expression():
    tpl = copy.deepcopy(tplkit.load_all()["tpl.elec.voltage-divider-vout"])
    tpl["solution"]["generator"]["outputs"]["vout"] = "vin * r1 / (r1 + r2)"
    r = vt.verify_item(tpl, 11)
    assert r["report"]["decision"] == "rejected"
    assert any("kcl-exact" in x for x in r["report"]["reasons"])


def test_sampling_is_deterministic_and_varied():
    tpl = tplkit.load_all()["tpl.elec.voltage-divider-vout"]
    a = tplkit.generate_item(tpl, 42)
    b = tplkit.generate_item(tpl, 42)
    assert a["params"] == b["params"] and a["rendered"] == b["rendered"]
    assert len({tuple(tplkit.generate_item(tpl, s)["params"].items()) for s in range(50)}) > 40


def test_determinism_across_processes():
    code = "import tplkit,json;t=tplkit.load_all()['tpl.elec.voltage-divider-vout'];print(json.dumps(tplkit.generate_item(t,7)['params']))"
    outs = {subprocess.run([sys.executable, "-c", code], cwd=Path(tplkit.__file__).parent, capture_output=True, text=True,
                           env={"PYTHONHASHSEED": str(h), "PATH": "/usr/bin:/bin"}).stdout for h in (1, 2, 3)}
    assert len(outs) == 1


def test_degenerate_draws_never_served():
    tpl = tplkit.load_all()["tpl.elec.voltage-divider-vout"]
    for s in range(500):
        p = tplkit.generate_item(tpl, s)["params"]
        assert p["r1"] != p["r2"]
        assert 0.1 <= p["r2"] / (p["r1"] + p["r2"]) <= 0.9
