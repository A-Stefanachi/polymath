---
brief_version: "2026-10-31-1"
project_key: prj.L4.state-machine-interrupt
title: L4 state machine and interrupts — bench safety brief
rules: [S1, S2, S3, S4, S17, S19]
---

# Safety brief — State machine bench work (L4)

Practical lab guidance only; not medical advice.

## Rules

- **USB / low-voltage only** for the assembled station (S1); no mains wiring.
- **Scope and logic analyzer grounds** tied to circuit ground only (S3).
- **Power off** before rewiring jumpers or sensors (L4 fault-injection steps still require safe disconnect).
- **ESD** when handling the Pico and sensor boards (S17).
- **Stop** on hot parts, smoke, or smell (S19).

## Check questions

1. What must you do before moving jumper wires on a powered breadboard?
2. Where do you attach the oscilloscope ground clip?
3. What is the first step if you smell hot plastic from the board?
