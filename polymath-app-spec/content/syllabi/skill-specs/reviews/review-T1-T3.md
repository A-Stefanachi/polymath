# Review of pillars T1 and T3

Date: 2026-11-02. Scope: `T1.yaml` (42 skills), `T3.yaml` (31 skills), both pillar files, their OPEN-CHECKS rows and `content/safety/prj.L6.bldc-esc-bench.md`.

**This is an AI review. It does not replace human G3 sign-off.** No skill was given a status and nothing was marked verified. Citing a source here does not mean a person has checked it.

## Result

| Measure | Count |
|---|---|
| Skills reviewed | 73 |
| Passed with no edit | 56 |
| Edited | 17 (12 in T1, 5 in T3) |
| Skills with wrong numbers | 2 (`pwr.conv.dc-link`, `mech.struct.stress-strain`) |
| Skills with a safety text fix | 5 (`pwr.batt.charge-storage`, `pwr.batt.damage-disposal`, `sw.rel.watchdog-supervisor`, `pwr.conv.buck-lab`, `pwr.bldc.motor-model`) |
| Flags fully settled | 5 (derate, LFP, UF2 boot type, BOD threshold, clash boolean) |
| Flags narrowed, still open | 2 (BattDG, crash-capture SRAM) |

The arithmetic is mostly very good. I recomputed every worked example and unaided check in Python, and only two skills had wrong numbers, one of them a tenfold error. The largest problems are not numeric:

- Doc 10 S9 conflicts with the BMS-free pack skill (open item 1).
- The L6 brief says nothing about rotating parts (open item 2).
- Many lab times are not credible.

"Passed" means no clear error was found. It does not mean each claim was traced to a primary source. See the last section.

The checks after editing passed: YAML loads, `py -3 -B reference/validate_skill_specs.py` gives 247 specs and 0 errors, and `validate_safety_briefs.py` is OK. A comparison with a backup confirmed `key`, `est_minutes`, `task_kinds`, `grader_types` and `phone_suitable` are unchanged.

## Fixes made

Safety fixes come first.

| Skill | What was wrong | Fix | Source |
|---|---|---|---|
| `sw.rel.watchdog-supervisor` | Advised `pause_on_debug` with no warning. A halted CPU stops the watchdog, while hardware PWM can keep driving the last throttle. | Allowed only with the motor disconnected or no propeller. | SDK docs for the setting; the PWM behaviour is reviewer knowledge, so see open item 9 |
| `pwr.batt.damage-disposal` | The worked example told the learner to move a puffed pack without a condition. The fire response was only "call emergency services". | Move it only if not hot, hissing or smoking. Do not fight a fire: leave, close the door, call 112 from outside. Gases are toxic and reignition is possible. | [NSW Fire](https://www.fire.nsw.gov.au/batteries/what-to-do), L6 brief |
| `pwr.conv.buck-lab` | "Not earth-safe to clip" was ambiguous about tip and ground, and it implied a floating supply makes things safe. | States that the ground clip never goes on the switch node, and where tip and spring go. | Same mechanism as `pwr.emc.probe-validity` |
| `pwr.batt.charge-storage` | The check refused a pack at 3 °C as outside the datasheet range, but the skill states 0 to 45 °C, so the test contradicted its own text. | Changed to −3 °C. | Molicel P42A sheet |
| `pwr.bldc.motor-model` | Required prediction "before first spin", but Kv and I0 need a spin, so a learner could read it as skipping the no-prop step. | Now "before the first loaded run", with no-prop spins stated first. | Internal logic |
| `pwr.conv.dc-link` | C = 3 × 40 × 41.7e-6 / 0.5 gave "1000 µF". The real value is 10,008 µF. | Corrected, and noted the ripple must be relaxed. See open item 7. | [TI SLVAFT0](https://www.ti.com/lit/an/slvaft0/slvaft0.pdf) eq. 6 |
| `mech.struct.stress-strain` | Strain 6.05e-4 and stretch 0.0605 mm do not follow from 69 GPa (6.04e-4, 0.0604 mm). The core idea says use minimums, but the examples used typical 270 MPa. | Numbers fixed. Factors now on 240 MPa, 5.76 and 1.51, with the typical value alongside. | Recompute; skill's own text |
| `mech.struct.fatigue-design` | Same inconsistency in the yield check. | 1.82 on 240 MPa. The verdict is unchanged. | Same |
| `pwr.batt.equivalent-circuit` | "Sample time shifts apparent R0 into R1" is backwards. A slow first sample counts RC drop as R0. | Reversed. | Model equation |
| `sw.rel.reset-causes` | `rom_get_last_reboot_type()` does not exist. The UF2 behaviour rested on a forum post. | Corrected to `rom_get_last_boot_type()` and `BOOT_TYPE_FLASH_UPDATE`. Flag removed. | [pico-sdk bootrom.h](https://raw.githubusercontent.com/raspberrypi/pico-sdk/master/src/rp2_common/pico_bootrom/include/pico/bootrom.h), RP2350 datasheet |
| `sw.rel.brownout` | Flagged as a datasheet self-contradiction. | Section 7.6.2.2 and the reset value 0x0b agree on 0.946 V (0.913 to 0.979 V). The 0.860 V "default" label is the outlier. Flag removed. | [RP2350 datasheet](https://pip-assets.raspberrypi.com/categories/1214-rp2350/documents/RP-008373-DS-2-rp2350-datasheet.pdf?disposition=inline), SDK `powman.h` |
| `sw.rel.crash-capture` | Macro unconfirmed. | Macro confirmed. Flag narrowed to SRAM across reset types. | [pico-sdk sections.h](https://raw.githubusercontent.com/raspberrypi/pico-sdk/master/src/rp2_common/pico_platform_sections/include/pico/platform/sections.h) |
| `pwr.batt.pack-wiring` | Derate flagged as a secondary rule of thumb. | Confirmed from the maker's guide: at most 75 percent of nominal at 25 °C. Flag removed. | [Littelfuse guide](https://info.littelfuse.com/hubfs/Fuseology%20Design%20Guide.pdf) |
| `pwr.batt.cell-formats` | LFP numbers from memory. | Range widened to 3.2 to 3.3 V nominal and 3.6 to 3.65 V full. Flag removed. | [Lithium Werks](https://lithiumwerks.com/?p=3097); EVE figures from listings only |
| `pwr.batt.damage-disposal` | BattDG seen only in secondary pages. | Citation and §§ 14, 15 added. Flag narrowed to the unread section wording. | [gesetze-im-internet](https://www.gesetze-im-internet.de/battdg/), [Umweltpakt Bayern](https://www.umweltpakt.bayern.de/abfall/recht/bund/508/battdg-batterierecht-durchfuehrungsgesetz) |
| `mech.cad.assemblies` | Boolean clash method from memory. | Named Part Common and added its source. Flag removed. | [FreeCAD Part Common](https://raw.githubusercontent.com/FreeCAD/FreeCAD-documentation/main/wiki/Part_Common.md) |
| `matl.select.ashby-indices` | The worked example gave answers without E or density, so it could not be solved. | Inputs added. They reproduce every stated value. | Reverse-derived; PLA 2.68 GPa and 1.24 g/cm3 match the Bambu sheet |
| `matl.select.cfrp-plate` | "T300 UD 140 GPa, 76 MPa" is not on the cited page. | Replaced with that page's standard UD values, 135 GPa and 50 MPa. | [Performance Composites](https://www.performance-composites.com/carbonfibre/mechanicalproperties_2.asp) |

## Open items for the founder

1. **Decide whether BMS-free packs are allowed at all.** `pwr.batt.high-discharge-packs` quotes doc 10 S9 as only keeping them out of v1. S9(c) also says a future step must "use only certified, protected, commercially assembled packs". So the skill, the L6 brief and the 4S hobby-pack examples conflict with S9. Recommendation: L6 uses a bench supply or a protected pack until S9 is formally changed. Note that `pwr.batt.bms-literacy` shows a protector tripping at motor currents, so a protected pack may not work. I did not edit this because it is a contract-level choice.
2. **Add rotating-part hazards to the L6 brief.** The brief is titled for a BLDC bench but says nothing on clamping, guards, eye protection, the rotor plane or a reachable power cut. These appear only in skills. Recommendation: add them, and add a check question, before L6 is promoted.
3. **Add a fire response to the L6 brief.** It has no instruction for actual fire, toxic smoke or reignition. Use the wording now in `pwr.batt.damage-disposal`.
4. **Check the fire-bag instruction.** I found no independent test that these bags contain a pack fire, only vendor claims, and at least one bag is limited to 30 Wh. A 4S 1500 mAh pack is about 22 Wh, but larger packs may exceed such a limit. Recommendation: treat the bag as damage reduction, and add a smoke alarm and a clear exit.
5. **Regenerate OPEN-CHECKS.** It is now stale. Run `reference/build_open_checks.py`. This review could edit only the two YAML files and this report.
6. **Update the T1 pillar file.** The `pwr.bldc.esc` hard task still says "before first spin". It needs the same fix, through `spine-module-plan.yaml`.
7. **Choose the DC-link method.** TI's formula is for ripple in a brushed motor, with k from one eval board. Applied to a 40 A chopped swing it gives 10,000 µF, while square-wave charge balance at D = 0.5 gives about 830 µF for the same 0.5 V. I fixed only the arithmetic. Recommendation: teach the charge-balance form and keep k as a caution.
8. **Confirm the project limits.** The 80 °C case limit and the 0.05 V spread are project values with no source, and they affect safety.
9. **Have a person confirm two reviewer judgements.** These are the PWM behaviour under debug halt, which I did not find stated in a source, and moving examples to the 240 MPa minimum.
10. **Fix `pwr.bldc.foc-lab`.** It asks for no prop, yet the check compares a measured reaction torque, which is near zero on a free shaft. Choose a load or a locked-rotor test with a stated current and time limit.
11. **Buy or open the remaining references.** These are the Amass XT60 document (listings conflict at 30 A and 35 A), ISO 286, ISO 8015, ISO 22081 and ASME Y14.5, as the syllabus already plans.

## Curriculum weaknesses, ranked

1. **Lab times are not plausible.** `pwr.bldc.foc-lab` (60 min), `pwr.conv.buck-lab` (60), `elec.pcb.pdb-layout` (40, including a build), `mech.tol.stack-analysis` (40, including ten parts), `pwr.batt.equivalent-circuit` (45, including rests), `phys.thermal.transients` (35, including a run) and `mech.draw.drawings-datums` (45) all understate real work. The pillars admit this with a much wider planning band, but the per-skill numbers will mislead the scheduler if they are used as task time.
2. **The level is working literacy, not expert grade.** That fits tier L1. Most T3 numeric checks are the worked example with one input changed, so they test substitution more than judgement.
3. **Fuse sizing is incomplete.** The `pwr.batt.pack-wiring` example never picks a wire, checks clearing time or tests I²t, though the skill lists those as required.
4. **`pwr.batt.preflight-checklist` has a weak source.** Its only source is a PX4 DShot page, which does not support an inspection procedure.
5. **Motor screw length is missing.** `mech.tol.fastener-stack` covers blind threads but not a screw that reaches the windings, a common way to short a motor.
6. **Stress limits conflict in `matl.select.printed-polymers`.** It advises 25 percent of strength for sustained stress, yet works to a factor of 3, which is 33 percent.
7. **`mech.tol.fit` has one fixed answer to a loose method.** 5.245 mm comes from the largest pin, while a true window centre gives 5.24 mm. An exact-numeric grader must allow both.
8. **`sw.rel.crash-capture` omits M33 detail.** It does not cover SecureFault, or the stacked state added by TrustZone and floating point.
9. **Sources are uneven.** Several rest on reseller copies, Wikipedia or exam-prep pages.

## Flags reviewed and left open

- `pwr.emc.motor-noise`: search excerpts of several Analog Devices copies agree on "up to 90 percent at 50 percent of rated current", but both full-text attempts failed.
- `phys.thermal.transients`: excerpts of AN11261 support the Foster claim, but the PDF timed out.
- `mech.struct.fatigue-concentration`: Heywood stays flagged. A Peterson polynomial I recalled from memory gives 2.506 against 2.512, which agrees but is not a source.
- `mech.cad.mass-cg-export`: the bifilar formula is correct by my own derivation, but the snippet flag stands.
- `pwr.emc.connector-current`: unresolved, see open item 11.
- `elec.pcb.copper-weight`: IPC lists the 2009 edition as current, but one store shows a 2023 date.
- `elec.pcb.kicad-schematic-erc`: PWR_FLAG and no-connect text confirmed. The page has no ERC chapter, so the flag stands.
- `pwr.batt.c-rate-limits`: hobby C-rating claims remain unstandardised, as the flag says.
- Standards-based T3 flags (ISO, ASME, VDI 2230) stay open because the texts are paid.

## What I could not check

- **Paid standards:** ISO 286, ISO 8015, ISO 22081, ISO 10303, ASME Y14.5, VDI 2230 and IPC-2152 were not read. Their claims match general knowledge only.
- **NASA TM-106943** is a scan I could not read. Lubricated ±25 percent and K 0.11 to 0.15 are supported by excerpts. The dry ±35 percent figure has weak support, and one source gives ±35 percent for feel rather than a wrench.
- **PMC9230522** blocked access, so the PLA 21.7 and 9.5 MPa values are unconfirmed. The worked example uses 9.55 MPa while the core idea says 9.5.
- **Not opened this review:** INA240 and HX711 datasheets, SPRA953, the Aavid guide, TI SLUA618, SLVA477 and slvaeq9, the Tyto, Prusa, CNC Kitchen, Memfault and Hubs pages, and the Hannover notice. Numbers from these were recomputed, but the claims were not traced.
- **Physical results** were not tested. No hardware was used, and no abuse testing was done.
