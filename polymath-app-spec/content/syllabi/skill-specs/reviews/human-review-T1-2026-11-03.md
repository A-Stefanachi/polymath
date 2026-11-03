# Human-review research pass, T1 (power and motion), 3 Nov 2026

Scope: the 25 T1 rows in `OPEN-CHECKS.md` and founder items 1 to 4, 6 to 10 and 11 (XT60 part) from `review-T1-T3.md`. Files edited: `content/syllabi/skill-specs/T1.yaml` and `content/safety/prj.L6.bldc-esc-bench.md`. No `status` changed. Nothing became `verified`.

Checks run after editing:

- `py -3 -B -c "import yaml; yaml.safe_load(...)"` on T1.yaml: ok.
- `py -3 -B reference/validate_skill_specs.py`: 247 specs checked, 0 errors.
- `py -3 -B reference/validate_safety_briefs.py`: OK.
- The `build_open_checks.py` pattern now finds 6 T1 flags, down from 25. All 6 are the `open` rows below.

## 1. Summary counts

| Outcome | Count |
|---|---|
| confirmed | 9 |
| corrected | 7 |
| convention | 3 |
| open | 6 |
| **Total** | **25** |

## 2. OPEN-CHECKS rows

| # | Skill | Outcome | Source used | What changed |
|---|---|---|---|---|
| 1 | `pwr.batt.c-rate-limits` (C ratings) | confirmed | Model Aviation, R. Scholefield, "Battery Clinic", May 2013, pp. 95-96 (library.modelaviation.com/article/battery-clinic-5) | The column says vendors use no common method and that there is "cause to suspect these ratings". It suggests an internal-resistance check from a 1C to 10C voltage change. The hedge is gone, and the text now says plainly that percentages come from hobby testers. |
| 2 | `pwr.batt.c-rate-limits` (source) | confirmed | Same | Removed "(snippet)" and added the author, issue and pages. |
| 3 | `pwr.batt.preflight-checklist` (0.05 V spread) | convention | None (no standard sets a cell-spread limit) | Now `[project convention: ...]`. The reason: a balance charger leaves cells far closer than 0.05 V, so a larger resting spread points to a weak cell, and 0.05 V is tighter than common hobby practice. The `[P` tag was removed. |
| 4 | `pwr.batt.damage-disposal` (BattDG wording) | corrected | gesetze-im-internet.de/battdg/__14.html and __15.html | § 14: retailers take back, free, the portable-battery categories they sell, "unabhängig von ... Beschaffenheit" (whatever the condition), in the quantities private users usually return. § 15: public waste authorities accept portable and LV batteries from households, free and whatever the condition. Neither section has a separate rule for damaged packs, and the text now says so. Section-level URLs replace the index URL. |
| 5 | `pwr.batt.damage-disposal` (Hannover) | confirmed | hannover.de aha notice, updated 7 Jan 2026 | Since 1 Jan 2026, LV batteries and portable batteries over 500 g go only to the hazardous-waste store (SZL) in Lahe, not to ordinary recycling centres. The worked example now states this, and "(snippet)" is gone. |
| 6 | `pwr.emc.motor-noise` (ferrite figures) | open | ADI article and AN-1368 timed out or were refused on 6 attempts (analog.com, the wcm-cce PDF, the AllAboutCircuits copy) | No change. Search excerpts agree: "With 50% of the rated currents, the inductance decreases by up to 90%", from tests on a TDK MPZ1608S101A and a Würth 742 791 510. |
| 7 | `pwr.emc.motor-noise` (source) | open | As above | Flag kept. |
| 8 | `pwr.emc.connector-current` (XT60 rating) | corrected | Changzhou Amass catalogue (rcscomponents.kiev.ua/datasheets/Amas-cat1.pdf), XT60 table p. 12 and XT90 table | The maker gives the XT60 family 35 A MAX with 12 AWG under a "<85" temperature condition (the unit is lost in text extraction), and the XT90 family 45 A MAX with 10 AWG. It gives no contact resistance. The 30 A continuous / 60 A peak figures are seller listings. The 0.5 mΩ is now labelled an assumed value, and the worked example compares 40 A with the 35 A maximum. |
| 9 | `pwr.emc.connector-current` (Electrokit source) | corrected | As above, plus NBS Handbook 100 | The reseller page was replaced by the Amass catalogue. Also added NBS Handbook 100 for the 0.00393 per °C copper coefficient. |
| 10 | `pwr.emc.probe-validity` (Tek) | confirmed | Tektronix, "Fundamentals of Floating Measurements and Isolated Input Oscilloscopes", pp. 1-4 (copy hosted at physics.wisc.edu; tek.com returned 403) | Confirms that the signal reference is tied to protective earth, that a passive probe's reference lead can heat or melt open on a floating node, and that floating the scope is "unsafe and dangerous". The core idea now cites these points, and the source is replaced. |
| 11 | `phys.thermal.esc-motor-hotspot` (80 °C) | convention | Eclipse Magnetics NdFeB datasheet rev1: standard Nxx grades "operate at up to +80 degrees C", guideline values | Now `[project convention: ...]` and made **more conservative**: stop at 80 °C on the case *or* the winding average, whichever comes first. The unaided-check expectation (79.1 °C) now says "just under the limit, do not raise the load". |
| 12 | `phys.thermal.esc-motor-hotspot` (EEP source) | confirmed | NBS Handbook 100, Copper Wire Tables (nvlpubs.nist.gov): α20 = 0.00393, inferred zero-resistance temperature 234.5 °C at 100 percent conductivity | The weak EEP snippet was replaced by the primary NBS table. T2 = (R2/R1)(234.5 + T1) − 234.5 follows directly. Recheck: 1.25 × 256.5 − 234.5 = 86.1 °C, and 0.118/0.095 × 252.5 − 234.5 = 79.1 °C. |
| 13 | `phys.thermal.transients` (AN11261) | open | Mouser, Nexperia and ampnuts copies all timed out or were refused | No change. A search excerpt of AN11261 rev 5.0 (March 2021) says Foster models have no physical meaning. |
| 14 | `sw.rel.crash-capture` (SRAM across resets) | corrected | RP2350 datasheet (RP-008373-DS-2): 6.2 ("SRAMs that are powered on retain their contents when the switched core is powered off"), 4.3 (boot RAM holds the pre-boot stack), 5.2.2 (bootrom erases SRAM0-9 before USB BOOTSEL) | The hedge is replaced by these facts. The text keeps "test each reset kind", because the datasheet has no per-reset table. The datasheet was added to sources. |
| 15 | `pwr.conv.buck-lab` (η and band) | confirmed | Recomputed | 12.00 × 0.912 = 10.944 W. 4.98 × 2.00 = 9.96 W. 9.96/10.944 = 0.9101. RSS √4 × 0.5 % = 1.0 % of 91 % = ±0.91 points. The flag was a false positive: "uncertainty" matches `UNCERTAIN`. It now reads "error band", the arithmetic is written out, and ±0.5 % is labelled an assumed meter accuracy. |
| 16 | `pwr.bldc.motor-basics` (Kv convention) | corrected | Physics (energy balance). The claim was narrowed to what a label shows | Now says Kt = 9.55/Kv holds only when both constants use the same convention, that a bare "920KV" label does not state one, and that you should measure Kv. The hedge is gone. |
| 17 | `pwr.bldc.thrust-measurement` (1520 datasheet) | corrected | Tyto Series 1520 datasheet SFT528 v2.1 (read in full); Tyto, "Recommended propeller setup for static thrust tests" | The datasheet does **not** contain the wires and obstruction warning attributed to Tyto. The source is replaced by Tyto's setup guide, which says a downstream obstacle matters more than an upstream one and that reversing thrust direction can shift results by 3 to 20 percent. The cable-bridging point is now stated as physics, not attributed to Tyto. |
| 18 | `pwr.bldc.prop-matching-intro` (UIUC vol. 4) | confirmed | UIUC Propeller Data Site, volume 4 page | Confirms coefficients use the "propeller true diameter", which can differ from the listed size, and that each run is for one rpm. Text sharpened, "(snippet)" removed. |
| 19 | `pwr.bldc.motor-model` (maxon) | open | support.maxongroup.com returned 403. The maxon PDF tried was a motor datasheet with garbled columns | No change. |
| 20 | `pwr.bldc.current-sensing-foc` (ADC bits) | corrected | RP2350 datasheet, 12.4.1 ("12-bit with 9.2 ENOB") and Table 1438 (ENOB min 9, typ 9.5) | Plan on about 9 effective bits. The worked example adds 3.3/512 = 6.45 mV, which is 6.45/50 mV/A = 0.129 A. The datasheet's two ENOB figures disagree, and the text says so. Board noise must still be measured. |
| 21 | `pwr.bldc.torque-measurement` (pass rule) | convention | None | The old rule ("motor efficiency holds across props") was physically weak, because motor efficiency moves with torque and speed. Now: compare at a matched torque and rpm point, and pass within 3 points `[project convention]`. The reason: an RSS of four 1 % errors is 2 %, so 1.7 points at 86 %, and √2 × 1.7 = 2.4 for a difference, rounded up to 3. |
| 22 | `elec.pcb.kicad-schematic-erc` (ERC chapter) | confirmed | docs.kicad.org/9.0 eeschema, "Inspecting a schematic > Electrical rules checking", "Power pins and power flags", "ERC Configuration" | Read: "ERC is imperfect and cannot detect all errors". Wrong symbols give inaccurate reports. Pin Conflicts Map cells cycle between allowed, warning and error. PWR_FLAG and no-connect behave as written. The hedge is replaced, and the source now points to `#erc`. |
| 23 | `elec.pcb.copper-weight` (IPC-2221 equation) | open | Jouppi (below) does not print the equation; IPC-2221 is paid | "From memory" was removed. The text says the formula is a curve fit to IPC-2221 charts, which trace to the 1955 NBS tests. The UNCERTAIN marker is kept for the exponents and validity range. |
| 24 | `elec.pcb.copper-weight` (IPC-2152 status) | open | ANSI webstore returned 403. GlobalSpec and standards.ie listings (search only) show the 2009 edition as current | "(2009)" was added, and the flag is kept until IPC's own catalogue is read. |
| 25 | `elec.pcb.copper-weight` (E7&S22 paper) | confirmed | M. R. Jouppi, "The Value of IPC-2152", IPC APEX 2010 (read) | The paper calls the IPC-2152 baseline (no planes, still air) conservative, and traces the IPC-2221 charts to 1955 NBS work. The source is labelled and the text adds the "conservative baseline" point. |

## 3. Founder items

| Item | Decision or finding | Reasoning and source | Edit |
|---|---|---|---|
| 1. BMS-free packs vs doc 10 S9 | **Already resolved at contract level. No out-of-scope edit needed.** | Doc 10 S9(c) now ends "except where 00a H6 allows hobby packs under the L6 brief". 00a H6 allows commercial hobby packs from L6 only under the L6 brief, keeps S10, and bans parallel boards. So the skill and brief are consistent with the contract. Best practice (conservative): first spin on a current-limited bench supply, packs only for loaded runs, and all S10 charging rules. | `pwr.batt.high-discharge-packs` and the L6 brief now cite H6 and S10. Added to the brief: "charger specified for the pack" and "no mixed-age packs" (S10). |
| 2. Rotating-part hazards | Done in the L6 brief. | The brief already had a "Rotating parts" section. Added: no hand-held or wire-hung motors; stand to the side of the propeller plane; power cut reachable without crossing it and tested each session; prop off for debugging, because a debug halt can freeze the CPU while PWM keeps running (item 9); prop inspection and replacement. New check question 5. | Brief edited. |
| 3. Fire response | Done in the L6 brief. | Uses the `pwr.batt.damage-disposal` wording: do not fight it, get out, close the door if safe, call 112 from outside, toxic smoke, do not go back in, reignition hours later, fire service decides when the room is safe. New check question 6. | Brief edited. |
| 4. Fire-bag wording | Done in the L6 brief. | The bag is now "damage reduction, not containment". Check the bag's stated energy limit against the pack's Wh. Charge in a room with a working smoke alarm and a clear exit that does not pass the charging spot. The reviewer's "30 Wh" example was not repeated, because I did not open its source. | Brief edited. `brief_version` bumped to `2026-11-03-1` (doc 10 section 5.3: a new version invalidates old acknowledgements; L6 is not yet in `project-ladder.yaml`, so none exist). The `high-discharge-packs` unaided check now says "six" questions and "6 of 6". |
| 6. `pwr.bldc.esc` hard task | **Already fixed.** | `spine-module-plan.yaml` and the generated `pillar-T1-power-motion.md` both say "before the first loaded run". An optional parity edit is below. | Optional, see below. |
| 7. DC-link method | **Teach charge balance. Keep TI's k as a caution.** | Derivation: during D·T the battery gives D·I and the leg draws I, so the capacitor gives I(1 − D) and ΔV = I·D(1 − D)·T/C. Worst at D = 0.5, giving C ≥ I·T/(4ΔV). Recheck: 40 × 41.7e-6/(4 × 0.5) = 834 µF. TI's rule: 3 × 40 × 41.7e-6/0.5 = 10,008 µF, which is 12 times the floor (3/0.25). New ESR point: 40 A × 10 mΩ = 0.4 V, most of the 0.5 V budget. | `pwr.conv.dc-link` core idea and worked example rewritten. |
| 8. Project limits | **Kept, conservative, marked as conventions.** | 80 °C: rows 11 and 21 above; now applies to the case *or* the winding average. 0.05 V: row 3. | T1.yaml. |
| 9. PWM under debug halt | **Confirmed.** | RP2350 datasheet: WATCHDOG CTRL has PAUSE_DBG0/1 (12.9), and TIMER has DBGPAUSE and MTIME_CTRL DBGPAUSE_CORE0/1 (12.8, SIO). The PWM register list (12.5.3) has no debug-pause control, so the PWM keeps its last output while the cores are halted. The 240 MPa part is T3's. | `sw.rel.watchdog-supervisor` now cites this. Datasheet added to sources. |
| 10. `pwr.bldc.foc-lab` reaction torque | **Locked-rotor test with stated limits.** | The rotor is held by an arm pressing on a calibrated load cell, which gives torque = F·arm. No prop, motor clamped, supply current-limited. `[project convention]`: iq at most half the rated continuous current, 5 s per hold, cool the case below 40 °C between points. Reason: a locked rotor has no airflow and turns all input power into heat. | Unaided check rewritten. |
| 11. XT60 document (XT60 part) | **Settled from the maker's catalogue.** | Row 8. Use 35 A as a ceiling and verify by temperature. | T1.yaml. |

### Proposed edits outside my scope

1. **Optional, for parity with T1.yaml:** `content/syllabi/spine-module-plan.yaml`, module `pwr.bldc.esc`, `hard_task`.
   - Old: `hard_task: "Given an unlabelled motor, measure R, Kv and I0, then predict current and RPM on a stated prop within 10% before the first loaded run."`
   - New: `hard_task: "Given an unlabelled motor, measure R, Kv and I0, then predict current and RPM on a stated prop within 10% before the first loaded run; the no-prop, current-limited spins that give Kv and I0 come first."`
   - Then run `py -3 -B reference/generate_pillar_syllabi.py` and `py -3 -B reference/validate_spine_coherence.py`.
2. Regenerate `OPEN-CHECKS.md` with `py -3 -B reference/build_open_checks.py` (founder item 5, the orchestrator's). The expected T1 count is 6.

## 4. Still open

| Item | What closes it |
|---|---|
| `pwr.emc.motor-noise` ferrite figures (2 rows) | Open AN-1368 or the Analog Dialogue 50-1 PDF in a normal browser. Check the "up to 90% at 50% of rated current" sentence and the two bead part numbers. Then remove the hedge and "(snippet)". This takes 5 minutes for a person, because automated fetches time out. |
| `phys.thermal.transients` AN11261 | Open Nexperia AN11261 (rev 5.0, March 2021) in a browser. Confirm "Foster ... no physical meaning" and the advice not to join a Foster network to a heat-sink network, and record the section number. |
| `elec.pcb.copper-weight` IPC-2221 equation | Buy or borrow IPC-2221B and read the conductor-sizing section (equation form, k values, exponents, validity range). |
| `elec.pcb.copper-weight` IPC-2152 status | Read IPC's own store entry (shop.electronics.org) for IPC-2152 and record whether 2009 is still the current edition. |
| Founder sign-off | Read the three new conventions (0.05 V spread, 80 °C on case or winding, foc-lab hold limits) and the L6 brief changes before L6 is promoted. The brief status stays "draft, needs founder review". |

## Notes

- **Surprising:** the 1520 datasheet does not contain the warning attributed to Tyto. Amass rates the XT60 *above* the common 30 A listing (35 A at 12 AWG). The old torque-measurement pass rule could not be met in principle.
- The `build_open_checks.py` pattern matches "uncertainty", which caused false flags (buck-lab). A future fix could use `\bUNCERTAIN\b`.


## Follow-up, 3 Nov 2026 (orchestrator)

- `pwr.bldc.motor-model` maxon source: **confirmed**. The maxon support article opened in a browser and its formula image shows kn·kM = 30,000/π (min⁻¹/V · mNm/A) and kn·kM = 1 in SI units. The source line no longer says "(snippet)".
- ADI ferrite article and Nexperia AN11261: still open. analog.com returned Access Denied, and both PDFs only download. A person can close them in a normal browser.- `elec.pcb.copper-weight` IPC-2152 status: **confirmed**. IPC's store entry lists only the original version, released August 2009, as the current revision. Source added.
