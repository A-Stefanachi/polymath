"""BL-0052: the G2 fuzz run (doc 07 section 7) and its CI entry point."""

from __future__ import annotations

import copy

import pytest
import yaml

from polymath_worker.content import fuzz, fuzz_cli, tplkit

VD_PATH = fuzz_cli.TEMPLATE_DIR / "elec" / "tpl.elec.voltage-divider-vout.yaml"


@pytest.fixture(scope="module")
def divider() -> dict:
    return tplkit.load_template(VD_PATH)


def _prefix_bug(tpl: dict) -> dict:
    """r1 is entered in kilohms but the generator treats it as ohms (an off-by-prefix defect)."""
    bad = copy.deepcopy(tpl)
    bad["solution"]["generator"]["outputs"]["vout"] = "vin * r2 / (r1 * 1000 + r2)"
    return bad


def _write(tmp_path, tpl: dict, name: str):
    p = tmp_path / name
    p.write_text(yaml.safe_dump(tpl), encoding="utf-8")
    return str(p)


def test_voltage_divider_passes_200_samples(divider):
    s = fuzz.fuzz_template(divider)
    assert s["passed"], s
    assert s["samples"] == 200
    assert s["failed_seeds"] == 0 and s["first_failing_seed"] is None
    assert s["distinct_param_sets"] >= divider["fuzz"].get("min_distinct_param_sets", 1)


def test_off_by_prefix_bug_fails_and_reports_the_first_failing_seed(divider):
    s = fuzz.fuzz_template(_prefix_bug(divider))
    assert not s["passed"]
    assert "seed_failures" in s["failed_checks"]
    assert s["first_failing_seed"] == divider["fuzz"]["seed_base"]
    assert s["failed_seeds"] == s["samples"] == 200


def test_cli_exit_0_when_the_template_passes(capsys):
    assert fuzz_cli.main([str(VD_PATH)]) == 0
    out = capsys.readouterr().out
    assert "PASS tpl.elec.voltage-divider-vout" in out and "samples=200" in out


def test_cli_exit_2_on_fuzz_failure_and_prints_the_seed(divider, tmp_path, capsys):
    path = _write(tmp_path, _prefix_bug(divider), "bad.yaml")
    assert fuzz_cli.main([path]) == 2
    out = capsys.readouterr().out
    assert f"first_failing_seed={divider['fuzz']['seed_base']}" in out
    assert "FAIL tpl.elec.voltage-divider-vout" in out


def test_cli_draft_template_failure_is_a_warning(divider, tmp_path, capsys):
    bad = _prefix_bug(divider)
    bad["authoring_status"] = "draft"
    assert fuzz_cli.main(["--samples", "3", _write(tmp_path, bad, "draft.yaml")]) == 0
    assert "WARN" in capsys.readouterr().out


def test_cli_exit_1_on_unreadable_template(tmp_path):
    assert fuzz_cli.main([str(tmp_path / "missing.yaml")]) == 1


def test_cli_rejects_non_positive_samples():
    assert fuzz_cli.main(["--samples", "0", str(VD_PATH)]) == 1


def test_no_fuzz_is_refused_in_ci_and_allowed_locally(monkeypatch):
    monkeypatch.setenv("CI", "true")
    assert fuzz_cli.main(["--no-fuzz"]) == 1
    monkeypatch.delenv("CI")
    assert fuzz_cli.main(["--no-fuzz"]) == 0


def test_changed_since_limits_to_changed_templates(monkeypatch):
    changed = ["polymath-app-spec/content/templates/elec/tpl.elec.voltage-divider-vout.yaml", "README.md"]
    monkeypatch.setattr(fuzz_cli, "changed_paths", lambda ref: changed)
    assert [p.name for p in fuzz_cli.select_templates([], "base")] == ["tpl.elec.voltage-divider-vout.yaml"]
    monkeypatch.setattr(fuzz_cli, "changed_paths", lambda ref: ["docs/x.md"])
    assert fuzz_cli.select_templates([], "base") == []
    monkeypatch.setattr(fuzz_cli, "changed_paths", lambda ref: [fuzz_cli.ENGINE_DIR + "verify.py"])
    assert len(fuzz_cli.select_templates([], "base")) == len(list(fuzz_cli.TEMPLATE_DIR.rglob("*.yaml")))
