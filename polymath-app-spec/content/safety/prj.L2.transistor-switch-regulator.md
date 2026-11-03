---
brief_version: "2026-10-31-1"
project_key: prj.L2.transistor-switch-regulator
title: L2 transistor switch and regulator — safety brief
rules: [S1, S2, S5, S6, S7, S8, S17, S19]
---

# Safety brief — Transistor switch and regulator (L2)

Practical lab guidance only; not medical advice.

## Rules

- **12 V DC ceiling** on supplies you wire (S1). Use listed adapters or alkaline cells only (S8)—no Li-ion in L0–L5.
- **No mains work** (S2).
- **Resistor power ratings** before energising loads (S5).
- **Hot regulators:** do not touch tabs; let them cool before rewiring (S6).
- **Inductive spikes:** do not touch coils while switching; use flyback diodes (S7).
- **Reversed flyback diode:** never fit it backwards. With the MOSFET on, it shorts the 5 V supply through the diode.
- **Never back-feed** the Pico: one ground reference, do not connect regulator outputs to USB-powered rails (S4).
- **ESD** before handling MOSFETs (S17).
- **Stop** on smell, smoke, or unexpected heat (S19).

## Check questions

1. For a 100 Ω resistor on 12 V, is 0.25 W enough? (Compute P = V²/R.)
2. Why must alkaline cells be used instead of bare lithium cells in this ladder?
3. What is the first action if a MOSFET or regulator tab is too hot to touch?
