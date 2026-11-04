"""The port's tex unit filter matches the reference: micro is written as \\mu, not the ASCII alias u (issue #14)."""

import pytest

from polymath_worker.content import tplkit


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (304e-6, "S", r"304\,\mu\mathrm{S}"),
        (47e-6, "A", r"47\,\mu\mathrm{A}"),
        (2.5e-6, "ohm", r"2.5\,\mu\Omega"),
        (1.51e-3, "A", r"1.51\,\mathrm{mA}"),
        (4.7e3, "ohm", r"4.7\,\mathrm{k}\Omega"),
    ],
)
def test_tex_filter_matches_reference_format(value: float, unit: str, expected: str) -> None:
    assert tplkit.fmt_eng(value, unit, tex=True) == expected
