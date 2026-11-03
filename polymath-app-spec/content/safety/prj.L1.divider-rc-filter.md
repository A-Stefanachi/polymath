---
brief_version: "2026-10-31-1"
project_key: prj.L1.divider-rc-filter
title: L1 divider and RC filter — bench safety brief
rules: [S1, S2, S3, S4, S5, S17, S19]
---

# Safety brief — Divider and RC filter (L1)

Practical lab guidance only; not medical advice. Acknowledgement records that you read these rules.

## Rules

- **12 V DC maximum** on any circuit you build (S1). This project uses USB and low-voltage signals.
- **No mains work** (S2). Use instruments as supplied.
- **Oscilloscope ground** is earth-referenced: clip it only to circuit ground (S3).
- **One ground reference**; do not tie unrelated supplies together (S4).
- **Resistor power:** compute V²/R and use parts rated at least 2× (S5).
- **ESD:** discharge static before handling boards (S17).
- **Stop condition:** unplug if anything smells hot or smokes (S19).

## Check questions

1. Where must the scope ground clip connect?
2. What is the maximum DC voltage you may apply in v1 projects?
3. What do you do first if a resistor starts smelling hot?
