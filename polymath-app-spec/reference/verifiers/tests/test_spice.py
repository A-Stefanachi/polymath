import shutil

import pytest

import spice_check as sc
import tplkit

pytestmark = pytest.mark.skipif(shutil.which("ngspice") is None, reason="ngspice not installed")
T = tplkit.load_all()["tpl.elec.rc-lowpass-netlist"]
A = T["answer"]
PARAMS, CTX, _ = tplkit.sample_params(T, 3)


def netlist(r, extra=""):
    return f"* t\nV1 in 0 AC 1\nR1 in out {r!r}\nC1 out 0 {PARAMS['c']!r}\n{extra}.end\n"


def test_correct_netlist_and_nearest_e24_pass():
    assert sc.grade_spice(netlist(CTX["r_ideal"]), A, CTX)["correct"]
    assert sc.grade_spice(netlist(CTX["r_ideal"] * 1.04), A, CTX)["correct"]  # within 6 percent


def test_wrong_value_fails_with_measurement_in_feedback():
    g = sc.grade_spice(netlist(CTX["r_ideal"] * 2), A, CTX)
    assert not g["correct"] and "cutoff" in g["feedback"]


@pytest.mark.parametrize("extra", [
    ".include /etc/passwd\n", ".lib /etc/passwd x\n", ".control\nshell id\n.endc\n", ".model x d\n", ".subckt a b\n.ends\n",
    ".param r={1/0}\n", ".csparam x=1\n", ".system id\n",
])
def test_dangerous_directives_rejected(extra):
    g = sc.grade_spice(netlist(CTX["r_ideal"], extra), A, CTX)
    assert not g["correct"] and g["graders"][0]["detail"]["stage"] == "lint"


def test_analysis_directives_are_dropped_not_executed():
    g = sc.grade_spice(netlist(CTX["r_ideal"], ".ac lin 1000000000 1 1e9\n.tran 1n 1000\n"), A, CTX)
    assert g["correct"]
    assert any("ignored" in w for w in g["graders"][0]["detail"]["warnings"])


def test_disallowed_elements_and_changed_fixed_parts():
    assert not sc.grade_spice(netlist(CTX["r_ideal"], "L1 out 0 1\n"), A, CTX)["correct"]
    changed = f"* t\nV1 in 0 AC 1\nR1 in out {CTX['r_ideal']!r}\nC1 out 0 {PARAMS['c'] * 3!r}\n.end\n"
    g = sc.grade_spice(changed, A, CTX)
    assert not g["correct"] and "must not be changed" in g["feedback"]


def test_floating_node_gives_simulator_failure_not_crash():
    g = sc.grade_spice("* t\nV1 in 0 AC 1\nR1 in x 1k\nC1 out 0 100n\n.end\n", A, CTX)
    assert not g["correct"]
