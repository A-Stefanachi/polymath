---
brief_version: "2026-10-31-1"
project_key: prj.L0.blink-led
title: L0 blink LED — bench safety brief
rules: [S1, S2, S5, S17, S19]
---

# Safety brief — Blink LED (L0)

This brief is practical lab guidance, not medical advice. Acknowledging it records that you were told these rules; it does not certify that you are safe. You remain responsible for your bench.

## Rules for this project

1. **USB-only power.** Power the Pico from a USB port or a known-good USB power supply. Do not use mains-connected bench supplies above 5 V for this project.
2. **Resistor before the LED.** Always place a current-limiting resistor in series with the LED before applying power.
3. **Power off before rewiring.** Unplug USB before moving wires or components.
4. **Static precautions (ESD).** Touch a grounded metal part of the bench before handling the Pico or the LED. Handle boards by the edges.
5. **Stop if something is wrong.** If anything smells hot, smokes, or a part heats unexpectedly: unplug USB, wait, then inspect. Do not keep powering the circuit.

## Check questions (answer before acknowledging)

1. What is the maximum supply you will use on this project? *(Expected: USB / 5 V or less from USB only.)*
2. When must you unplug USB? *(Expected: before changing wiring.)*
3. What should you do first if a component smells hot? *(Expected: unplug / remove power, then inspect.)*

## Scope

No soldering, no batteries, and no voltages above USB levels in this project. Li-ion and LiPo cells are not used in L0–L5 v1 projects.
