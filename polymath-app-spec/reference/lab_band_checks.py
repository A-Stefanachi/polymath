#!/usr/bin/env python3
"""Monte Carlo check that spine lab pass bands are achievable by a correct learner.

This is simulation, not bench evidence. Error sizes are assumptions [P], listed in each check.
A band a correct build rarely meets would fail honest work, so a pass rate below 0.80 needs review.
usage: py -3 reference/lab_band_checks.py
"""
from __future__ import annotations

import numpy as np

N = 20000
rng = np.random.default_rng(20261102)


def u(pct: float, n: int = N) -> np.ndarray:
    """Relative error, uniform within plus or minus pct percent."""
    return 1 + rng.uniform(-pct, pct, n) / 100


def buck_efficiency() -> tuple[float, str]:
    """pwr.conv.buck-lab: 12 V to 5 V, 2 A, predicted efficiency within 3 points."""
    vo, io, vin = 5.0, 2.0, 12.0
    d = vo / vin
    rds, dcr, tsw, cap_loss = 0.03, 0.03, 15e-9, 0.15

    def loss(r, l, t, core):
        return io**2 * (r * d + r * (1 - d)) + io**2 * l + vin * io * t * 300e3 + cap_loss + core

    pred = vo * io / (vo * io + loss(rds, dcr, tsw, 0.1))
    true_p = vo * io / (vo * io + loss(rds * u(30), dcr * u(20), tsw * u(50), rng.uniform(0.05, 0.5, N)))
    meas = true_p * u(0.5) * u(0.5) * u(1.0) * u(1.0)  # V and I readings on both sides
    return float(np.mean(abs(meas - pred) * 100 <= 3)), "Rds 30%, DCR 20%, switching 50%, core loss 0.05-0.5 W, meters 0.5-1%"


def pack_sag() -> tuple[float, str]:
    """pwr.batt.equivalent-circuit: predict sag within 5 percent from one pulse fit."""
    r0, r1, tau = 0.014, 0.006, 9.1
    r0_true, r1_true = r0 * u(10), r1 * u(15)
    noise = 0.002
    r0_fit = r0_true + rng.normal(0, noise * np.sqrt(2) / 10, N)
    r1_fit = r1_true + rng.normal(0, noise * np.sqrt(2) / 10, N)
    temp_drift = u(5)  # pack warms or cools between pulses
    t = 5.0
    pred = 20 * (r0_fit + r1_fit * (1 - np.exp(-t / tau)))
    meas = 20 * (r0_true + r1_true * (1 - np.exp(-t / (tau * u(15))))) * temp_drift
    return float(np.mean(abs(pred - meas) / meas <= 0.05)), "2 mV noise, 5% resistance drift between pulses, tau 15%"


def thermal_curve() -> tuple[float, str]:
    """phys.thermal.transients: the curve stays within 10 degC of prediction."""
    t = np.linspace(0, 400, 81)
    rth, cth, p = 3.0, 60.0, 25.0
    pred = p * rth * (1 - np.exp(-t / (rth * cth)))
    ok = 0
    for _ in range(4000):
        r, c = rth * u(10, 1)[0], cth * u(15, 1)[0]
        pwr = p * u(5, 1)[0]
        meas = pwr * r * (1 - np.exp(-t / (r * c))) + rng.normal(0, 1.0)
        ok += np.max(abs(meas - pred)) <= 10
    return ok / 4000, "fitted Rth 10%, Cth 15%, power 5%, 1 degC sensor offset"


def motor_model() -> tuple[float, str]:
    """pwr.bldc.motor-model: current and RPM both within 10 percent."""
    kv, r, i0, c, v = 96.34, 0.08, 0.6, 2.0e-7, 14.0

    def solve(kv_, r_, i0_, c_, v_):
        w = kv_ * v_ * 0.8
        for _ in range(40):
            i = i0_ + c_ * w**2 * kv_
            w = 0.5 * w + 0.5 * kv_ * (v_ - r_ * i)
        return w, i

    pw, pi = solve(kv, r, i0, c, v)
    mw, mi = solve(kv * u(3), r * u(10), i0 * u(15), c * u(10), v * u(1) * (1 - rng.uniform(0, 0.03, N)))
    return float(np.mean((abs(mw - pw) / pw <= 0.10) & (abs(mi - pi) / pi <= 0.10))), "Kv 3%, R 10%, I0 15%, prop coefficient 10%, supply sag up to 3%"


def beam() -> tuple[float, str]:
    """mech.struct.beam-bending: deflection within 15 percent of a prediction that uses measured
    tube sizes and a clamp compliance calibrated on a same-diameter reference bar in the same clamp."""
    e, od, idia, l, f = 70e9, 0.012, 0.010, 0.12, 12.0
    sec = lambda o, i_: np.pi / 64 * (o**4 - i_**4)
    od_t, id_t, e_t = od * u(1), idia * u(1.2), e * u(5)  # true part: stock tolerance, alloy E
    od_m = od_t + rng.uniform(-2e-5, 2e-5, N)  # caliper reading, +/-0.02 mm
    id_m = id_t + rng.uniform(-2e-5, 2e-5, N)
    clamp = rng.uniform(0.02, 0.30, N)  # true clamp share of beam deflection
    beam_t = f * l**3 / (3 * e_t * sec(od_t, id_t))
    meas = beam_t * (1 + clamp) + rng.normal(0, 0.005e-3 / np.sqrt(5), N)  # slope of 5 loads, gauge 5 um
    clamp_cal = beam_t * clamp * u(25)  # reclamping and reference-bar error, 25% of the clamp term
    pred = f * l**3 / (3 * e * sec(od_m, id_m)) + clamp_cal
    return float(np.mean(abs(meas - pred) / pred <= 0.15)), "E 5%, OD/ID measured +/-0.02 mm, clamp 2-30% calibrated to 25%, gauge 5 um over 5 loads"


def tap_test() -> tuple[float, str]:
    """mech.struct.vibration-modes: tap frequency within 10 percent of a prediction that uses the
    static stiffness measured on the same arm in the same clamp."""
    k_meas = u(5)  # measured k (beam test) vs true installed k
    m_meas = u(2)  # weighed masses vs true
    added = 1 + rng.uniform(0, 0.05, N)  # sensor or wire mass not in the prediction
    dyn = 1 - rng.uniform(0, 0.03, N)  # Rayleigh and dynamic clamp effects
    meas = dyn / np.sqrt(added) + rng.uniform(-0.005, 0.005, N)  # spectrum bin at most 1% of f
    pred = np.sqrt(k_meas / m_meas)
    return float(np.mean(abs(meas - pred) / pred <= 0.10)), "measured k 5%, mass 2%, added mass up to 5%, dynamic 0-3%, bin 1%"


def rig_overshoot() -> tuple[float, str]:
    """ctl.pid.closed-loop-rig: PM within 10 degrees of prediction when the fitted model is imperfect."""
    k, tau, theta = 150.0, 0.15, 0.03
    kc, ti = tau / (k * 2 * theta), tau
    w = np.logspace(0, 3, 1500)

    def pm(k2, tau2, th2):
        l = kc * (1 + 1 / (1j * w * ti)) * k2 * np.exp(-1j * w * th2) / (tau2 * 1j * w + 1)
        i = np.argmin(abs(abs(l) - 1))
        return 180 + np.degrees(np.unwrap(np.angle(l))[i])

    base = pm(k, tau, theta)
    ok = sum(abs(pm(k * u(10, 1)[0], tau * u(15, 1)[0], theta * u(25, 1)[0]) - base) <= 10 for _ in range(2000))
    return ok / 2000, "gain 10%, time constant 15%, delay 25%"


CHECKS = [buck_efficiency, pack_sag, thermal_curve, motor_model, beam, tap_test, rig_overshoot]

if __name__ == "__main__":
    print("| Check | Pass rate | Verdict | Assumed errors [P] |\n|---|---|---|---|")
    for check in CHECKS:
        rate, note = check()
        print(f"| {check.__name__} | {rate:.2f} | {'fine' if rate >= 0.8 else 'REVIEW BAND'} | {note} |")
