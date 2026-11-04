"""The tex unit filter writes the micro prefix as \\mu, not the ASCII alias u (issue #14, doc 07 section 3)."""

import pytest

import tplkit


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (304e-6, "S", r"304\,\mu\mathrm{S}"),
        (47e-6, "A", r"47\,\mu\mathrm{A}"),
        (2.5e-6, "ohm", r"2.5\,\mu\Omega"),
    ],
)
def test_tex_filter_writes_micro_as_mu(value, unit, expected):
    assert tplkit.fmt_eng(value, unit, tex=True) == expected


def test_tex_filter_leaves_other_prefixes_unchanged():
    assert tplkit.fmt_eng(1.51e-3, "A", tex=True) == r"1.51\,\mathrm{mA}"
    assert tplkit.fmt_eng(4.7e3, "ohm", tex=True) == r"4.7\,\mathrm{k}\Omega"
    assert tplkit.fmt_eng(12.0, "V", tex=True) == r"12\,\mathrm{V}"


def test_plain_filter_already_writes_micro_sign():
    assert tplkit.fmt_eng(47e-6, "A") == "47 µA"
