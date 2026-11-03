# Review of T6 (37 skills) and T0 (142 skills)

Reviewed 2 November 2026 by an AI reviewer that did not write this content.

**This is an AI review. It does not replace human G3 sign-off.** It is research, not legal advice. No skill was marked `verified`, and no `status` was set. Classification and legal conclusions stay with counsel.

## Result

- **Pass count, T6:** 16 of 37 skills needed no text change. 21 had text changed: 13 for an error or a stale claim, and 8 only to settle a flag or add a cue. 27 skills had a source line moved to an official route, overlapping those groups.
- **Most serious T6 errors:** `prof.eu.product-liability` named the wrong exemption in Art 11(2) and the wrong date in Art 2(1). `def.export` said the General Software Note does not apply to Category 5 Part 2, but only entries a and c are barred. `sec.hw.sbom-basics` cited a CISA draft replaced on 29 July 2026.
- **Arithmetic:** every worked number in T6 was recomputed and all were correct. That covers the nonce limits, BOM, crossover, breakeven, landed cost and the CRA deadlines.
- **Open flags:** T6 flags fall from 57 to 27. Four of the 27 are false positives from the flag script (see open item 10).
- **T0:** the module order holds up, with one documented exception that is real. The weakness is in the hard edges, the hard tasks and how the H8 skills are wired, not the order itself. T0 and the graph were not edited.
- **Checks run after edits:** T6.yaml loads with 37 specs. Keys, `est_minutes`, `task_kinds`, `grader_types` and `phone_suitable` are unchanged against a saved copy. `py -3 -B reference/validate_skill_specs.py`: 247 specs checked, 0 errors. `reference/lint_claims.py`: 0 violations. `reference/validate_graph.py`: PASS.

## Fixes to T6.yaml

"OJ" means the Official Journal PDF from the Publications Office. "Consolidated" means text 02021R0821-20260921, a documentation tool.

### Errors and stale claims

| Skill | What was wrong | Source |
|---|---|---|
| `prof.eu.product-liability` | Art 11(2) was taught as removing the state-of-knowledge exemption. It derogates from Art 11(1)(c), the later-defect defence, not point (e). Fixed in the core idea and the worked example | Directive 2024/2853 Art 11, OJ |
| `prof.eu.product-liability`, `prof.eu.applicability-map` | Scope date given as after 8 Dec 2026. Art 2(1) says after 9 Dec 2026. The German § 23 keeps the old act up to and including 8 Dec. Both now stated, and the description changed | Directive Art 2(1), OJ; BGBl. 2026 I Nr. 321 |
| `prof.eu.product-liability` | "Missing updates" and "modifications" were too broad: the text says updates necessary to maintain safety, and substantial modification | Directive Art 11(2), OJ |
| `def.export.general-notes`, `def.export.classification-memo` | "General Software Note does not apply to Category 5 Part 2". Only entries a and c are barred. Entry b, public domain, is not | Annex I GSN, consolidated |
| `sec.hw.sbom-basics` | Cited CISA's 2025 draft as current. CISA and partners published the 2026 Minimum Elements on 29 July 2026, including transitive dependencies with no minimum depth. Source URL replaced | CISA 2026 PDF |
| `def.export.scenarios` | 9A112 sentence was garbled ("with capable of"). It also said "other UAVs" without the link to 9A012 | Annex I 9A112, consolidated |
| `prof.law.compliance-programme` | Check still required the red-flag section to be "pending the annex text", though the annex has been read. Paywalled table-of-contents source replaced | Recommendation 2019/1318, OJ |
| `prof.law.german-layer` | Named BMWK as KrWaffKontrG authority. The Merkblatt of Nov 2024 says so, but the ministry is now BMWE | BAFA Merkblatt; press and law-firm items on BMWE, the ministry page was blocked |
| `prof.law.classification-workflow` | Check required every cell correct against Merkblatt sections 2.5 and 12, but the Merkblatt does not state whether a Sonstige Auskunft binds. Also, BAFA calls the Umschlüsselungsverzeichnis an aid, not "non-binding" in those words. AzG's one-year life and lapse rule were missing | BAFA Merkblatt 2.5, 12; BAFA Güterlisten page |
| `prof.law.export-control-literacy` | Check asked for the Art 2 limb of "a customer in an embargoed state", which is not a transfer and has no limb. Changed to a support email to that customer | Art 2(2), consolidated |
| `def.export.tech-data-sharing` | Art 8 stated without its Annex I limit | Art 8, consolidated |
| `sec.hw.key-lifecycle` | Worked example kept a private signing key "for verification". The public key verifies; the private key is destroyed | SP 800-57 Pt 1 Rev 5, key states; logic of the example |
| `prof.data.data-act` | Example said a 12-person firm is small without turnover, though the test has a financial ceiling. Turnover added | Recommendation 2003/361 Art 2 |

### Settled flags and updates

| Skill | What changed | Source |
|---|---|---|
| `prof.law.stop-escalate-drill` | Added drill cues for all four Annex 2 categories, in original wording, as a sixth core idea. See open item 11. Art 27 clock added | Recommendation 2019/1318 Annex 2, OJ, read directly |
| `prof.law.de-eu-awareness`, `def.export.classification-memo` | Annex I status updated: 2026/1405 does not concern English, and C(2026)6323 was not in the OJ on 2 Nov 2026 | 2026/1405, OJ; SPARQL query 2 Nov 2026 |
| `def.export.scenarios` | UNCERTAIN closed for now: the change note lists one editorial change at 9A012.a and nothing at 9A112. Compare when the act is published | Commission change note, per legal-source-check.md |
| `def.export.general-notes` | Note 2 now read line by line: points h and j named. Note to the Cryptography Note added | Annex I, consolidated |
| `sec.hw.sbom-basics` | No Art 13(24) implementing act found in a title search | SPARQL query 2 Nov 2026 |
| `sec.hw.iot-baselines` | Vendor summary replaced by Decision 2025/138 and 2026/339. Restrictions stated exactly | OJ |
| `sec.ot.remote-access` | Report year settled as 2025. Figures match the SANS blog | SANS blog |
| `prof.eu.cra-obligations` | Corrigendum of 2 July 2025 noted: Art 64(10) now reads "paragraphs 2 to 9". 2025/2392 moved from snippet to read | OJ |
| `prof.eu.ce-radio` | 2026/339 moved from snippet to read | OJ |
| `prof.eu.product-liability` | German act settled: BGBl. 2026 I Nr. 321, no cap in the enacted text | recht.bund.de PDF |
| `prof.eu.reporting-drill` | Time rule settled: hour periods run through weekends, and the hour of the event is not counted. The example's clock times are the safe, earlier reading, so they stay | Regulation 1182/71 Art 3, read on the unofficial mirror only |
| `prof.eu.applicability-map` | C(2026) 5252 identified as the non-binding CRA guidance of 27 July 2026 | Commission page and annex PDF |
| `prof.data.data-act` | Size thresholds settled | Recommendation 2003/361 |
| `prof.data.ai-act` | 2026/1744 read. Annex I sections confirmed, including machinery moving to Section B | OJ |

### Source lines

All `lawplayer.com` lines now point to Publications Office PDFs (27 skills). The `resource/celex/<CELEX>.ENG` route returned a PDF for 2019/1318, 2021/821 and 2022/30 only, and HTTP 404 for the other acts. Those were reached by Cellar id from the SPARQL endpoint. The file header lines were updated to match.

## Confirmed without change

- Art 2(2)(d), 2(3), 3, 4, 5, 8, 9, 10, 11 and 12(4) and Art 27 of 2021/821; 9A012.a; the 5A002.a tests and thresholds.
- Merkblatt 8.1, 11.3, knowledge, the hold until BAFA decides, and the four questions.
- CRA Art 2, 3, 4, 7, 13, 14, 32, 64, 69, Annexes I to IV, including the eight Part II points.
- RED Art 1(3), 10(4), 17, 19(2). Directive Art 6, 15, 16, 17. Data Act Art 3, 7, 50. GDPR Art 30(5).
- AI Act Art 2(8), 3(1), 99(6), 113 as amended.
- EMB3D v2.0.2, its categories and maturity tiers. SP 800-38D limits. SP 800-57 states. RFC 5116 nonce text. SP 800-82 Rev 4 draft comment date, 30 Nov 2026. Instrumental's EVT, DVT and PVT figures and XVT.
- Boundary: no weapons, EW, evasion or structuring content found. Classification stays with counsel throughout.

## Are the unaided checks real tests?

Most are. Those below are the weak ones.

| Skill | Judgement |
|---|---|
| `def.export.product-decomposition` | Weak. The objective is a decomposition table, but the check is sorting eight statements plus a rewrite of the note. It tests recognition. The statement pool must also be reviewed so it cannot read as a how-to |
| `sec.ot.iec62443-product` | Weak. "All seven FRs covered" is a checklist, and the standards were not read, so nobody can mark depth |
| `prof.eu.ce-radio` | Partly invalid. It requires "module certified, so no test" to be named as an error with Art 17 and Art 10(4). Neither covers modules, and the spec marks module rules UNCERTAIN |
| `sec.hw.own-device-model`, `def.export.classification-memo` | Real, but 45 and 60 minutes will not cover running tests or writing the memo. Human-review checks also need a reviewer who is not the learner |
| `sec.ot.zones`, `sec.hw.secure-boot-literacy` | Real, but both are marked phone-suitable and ask for a drawing |
| `prof.integrator.golden-config` | Real, but it can only run two weeks after the log starts |

## Open items for the founder

1. **Graph text:** `prof.eu.product-liability` in `mvp-skill-graph.yaml` still says "after 8 Dec 2026". Approve changing it to match T6.yaml.
2. **Counsel check:** is a product placed on exactly 9 Dec 2026 under the new German act (§ 23) while outside Directive Art 2(1)?
3. **Check on publication:** when C(2026)6323 reaches the OJ, compare 9A012, 9A112 and the 5A002 entries, and update every "21 Sep 2026" version reference.
4. **Counsel or BAFA check:** does a Sonstige Auskunft bind? The only source is an IHK Oldenburg snippet.
5. **Decision:** who acts as `human_review` and independent reviewer for a solo founder on legal and threat-model skills?
6. **Decision:** research module rules for `prof.eu.ce-radio`, or drop that clause from the check?
7. **Check before publishing:** the expected answer for the AI Act item "safety cut-off in a radio-equipped machine", since machinery is now in Section B and radio equipment in Section A.
8. **Counsel check:** the scope of § 9 AWV. The AWV text was not opened, and the Merkblatt only groups it with Arts 4 and 5.
9. **Check before publishing:** Art 30(5) GDPR. A May 2025 proposal would raise 250 to 750, and one May 2026 item reads as if settled. A title search found no amending act in the OJ on 2 Nov 2026.
10. **Run:** `py -3 -B reference/build_open_checks.py`. OPEN-CHECKS.md was outside this review's edit scope and is stale. Decide whether to exclude the false positives: "from memory" (twice), "uncertain point", and "secondary function".
11. **Decision:** keep the Annex 2 cues as a core idea, or give them a field of their own? They were placed in `core_ideas` to avoid a schema change.
12. **Update:** `legal-source-check.md` is now behind in four places. Both CRA corrigenda were read and neither changes a date; 2026/1405 does not concern English; its table of T6 line numbers has shifted; and it calls the product liability date consistent without noting the Art 2(1) wording.

## Curriculum weaknesses that remain, ranked

Figures are hard-edge closures computed from the graph.

1. **Calculus and phasors gate early hardware.** `elec.rc.rc-lowpass` needs 10.5 h of closure, 7.6 h of it math, including Euler and phasors. So project L1 needs 16.2 h (9.3 h math), more than L2 at 11.5 h (0.9 h math): the ladder is inverted. `sw.fw.i2c-protocol` hard-requires `elec.rc.rc-time-constant`, which pulls in 6.4 h of math, down to the unit circle, to read a bus. Softening those two edges would fix most of this.
2. **Six hard tasks need later modules.** `sw.tools` (C build, module 7), `elec.dc` (multimeter, module 5), `math.prob` (own readings, module 5), `math.cplx` (RC capture, module 12), `math.calc` (RC and firmware filter, modules 12 and 16), `sw.mem` (GDB, module 16). Either move them to a later checkpoint or rewrite them for the module.
3. **The six H8 skills are leaves in T0.** None has a T0 dependent and none appears in `project-ladder.yaml`, so the frontier can leave them last and no project gives evidence for them.
   - `sw.mem.machine-model` should sit before `sw.mem.pointers` and `sw.fw.isr-basics`.
   - `sw.fw.gdb-swd` has no target prerequisite, and no debug probe appears in `docs/17` or `hardware-phases.yaml`.
   - `sw.fw.pwm` promises RC averaging with no RC prerequisite, while L1 and L2 use PWM without claiming the skill.
   - `sw.fw.sampling-rate` has no timer prerequisite, though the `sw.fw` hard task needs fixed-rate logging.
   - `elec.rc.decoupling-return` has no reactance prerequisite, and L2's capacitor step does not claim it.
   - `math.vec.least-squares` comes after `sw.fw.sensor-calibration` and has no variance prerequisite. Its hard task needs "hand-derived normal equations", but T0 has no partial derivatives.
4. **H8 removed things other text still relies on.** `sw.tools.git-basics` must teach merge and bisect in 30 minutes with branching stubbed. `math.prob` still promises normal-distribution intuition. `math.vec` still promises cross-product intuition, which moved to T2.
5. **Hard tasks exceed the skills.** `elec.dig` asks for maximum clock, but no skill covers setup or propagation delay. `sw.fw` asks for recovery from an unplugged bus, with only "handle a failed transfer" behind it. `elec.opamp` asks for a build and error budget in a module with no bench skill and an E2 exemption. `math.trig` asks for a CSV fit with no data tool taught.
6. **`sw.fw` is too large and too late.** It has 18 skills and 10.4 h, and module order puts 53.8 h before it, while L0 closes in 2.8 h. Module order and the frontier disagree, so splitting it into I/O, timing, buses and filters would make the plan honest.
7. **Odd edges.** `sw.fw.adc-scaling` hard-requires `sw.fw.gpio-input`. `sw.fw.isr-shared-data` hard-requires `sw.fw.debounce`, and has no dependents although L4 uses it. There is no skill for flashing a board, though `sw.tools` promises it.
8. **Phone flags.** 11 skills with `code_tests` are marked phone-suitable, including `sw.mem.pointers`. Check this is intended.
9. **Pillar document drift.** Orders 18 to 23 list empty `pwr`, `phys` and `sw.rel` modules that are not T0. `math.alg` says 8 lean skills, but the table shows 9. The module hours and the 142 and 67.2 h totals do reconcile.

**What holds up:** algebra first, tools early, DC before measurement, digital logic before C, and FSM after both. The documented `sw.tools.build-make` exception is a real need. The `math.alg` hard task is good. T6 hour totals in the pillar table reconcile with the specs at 19.6 h.

## What could not be checked

- IEC 62443, EN 18031, EN 303 645 and the current ETSI version: paywalled or not found. The 62443 presumption question stays UNCERTAIN.
- `prof.eu.cra-obligations`, drones: a keyword search of C(2026) 5252 found no mention. The guidance was searched, not read in full.
- Regulation 1182/71 was read on the unofficial mirror only, and the bundesanzeiger Grundsätze were not read.
- BMWE as KrWaffKontrG authority: the ministry page blocked automated access, and gesetze-im-internet was not read.
- The BAFA claims on sole traders and "no model ICP" were not found in the text searched. IHK Aachen and IHK Oldenburg were not opened.
- SANS figures come from its blog, not the report. NASA handbook sections remain snippet only. `prof.integrator` and `econ.cost` opinions rest on arithmetic and the named sources.
- CRA delegated regulations 2025/1535 and 2026/881 were seen by title only. Neither looks relevant to a drone or sensor maker, but that is from the title.
- SPARQL title searches can lag publication, so "not found" means not found on 2 Nov 2026.
- Change-note table rows for 9A012 and 5A002 were taken from legal-source-check.md and not re-read.
- T0 was reviewed from the pillar document, graph and ladder. No T0 template or item was reviewed, and no draft skill was sampled for depth of content.
