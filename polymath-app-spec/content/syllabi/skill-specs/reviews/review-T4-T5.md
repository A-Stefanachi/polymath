# Review of T4 and T5 skill specs

Reviewed 2 November 2026. **This is an AI review. It does not replace human G3 sign-off, and no skill is verified by it.** No `status` was set. Legal content is literacy, not legal advice.

## Result

- **Pass count:** 56 of 76 skills needed no edit (23 of 34 in T4, 33 of 42 in T5). 20 skills were edited, 11 in T4 and 9 in T5.
- **"Pass" is limited.** It means the numbers recomputed and nothing wrong was found in what was checked. It does not mean every core idea was read against its source. See "What could not be checked".
- **Numbers:** every worked example and unaided check was recomputed in Python, about 150 values. All the arithmetic is right. The one numeric fault is a parameter that contradicts the skill's own rule (`sys.twin.residual-alert`).
- **Worst error:** the A3 rule was misstated in five skills. The text said "150 m from uninvolved people and urban areas". The regulation says something different, and for people it is stricter.
- **Remote ID:** T4 contradicted `legal-source-check.md` section 4, and told the learner to plan for a module. Section 4 holds up against the regulation text, and T4 now follows it.
- **Prohibited content:** none found. No armed, target-tracking, jamming, spoofing or bypass content. GNSS faults are SITL or stack-level only, and `gps wrong` is excluded from the checks. Security content is defensive.
- **Checks run:** `T4.yaml` and `T5.yaml` load, and key, est_minutes, task_kinds, grader_types and phone_suitable are unchanged (scripted comparison with the originals). `py -3 -B reference/validate_skill_specs.py` gives 247 specs checked, 0 errors. `lint_claims.py` gives 0 violations.

## Remote ID against section 4

I read Regulation (EU) 2019/947, consolidated 1 May 2025, directly. Section 4 is accurate.

- UAS.OPEN.040(4)(a) sets no Remote ID condition for a privately built A3 drone. Points (c) and (d) do for C2 and C3, and UAS.OPEN.020(5)(d) does for C1.
- UAS.OPEN.060(1)(d) has the pilot check Remote ID "if applicable". Article 15(1)(d) lets a State require it in a zone.
- UAS.SPEC.050(1)(l)(ii) requires it on every aircraft in Specific, so that T4 sentence was right.
- Section 4 left German zones unchecked. LuftVO section 21h(3), as read online, has no Remote ID condition in any listed zone. Section 21h(4) allows further zones, so the dipul map still matters.

The T4 text said the regulation "could not be opened" and "plan for a module". Both are gone from `ops-eu`, and `ops-legal-route` is aligned. The conclusion is still a reading of the text. No LBA or dipul page states it, so the LBA question stays open (item 1 below).

## Fixes

Safety and legal first. "Settled" means an UNCERTAIN mark or flag was resolved.

| Skill | What was wrong | Source |
|---|---|---|
| `robo.uav.ops-eu`, `ops-legal-route`, `ops-germany`, `ops-specific-sora`, `hazard-analysis` | A3 stated as "150 m from uninvolved people and urban areas". The rule is no uninvolved person endangered within the range flown, and 150 m from residential, commercial, industrial or recreational areas | 2019/947 UAS.OPEN.040(1), (2) |
| `robo.uav.ops-eu`, `ops-legal-route` | Remote ID: said unconfirmed, plan for a module, ask LBA in the worked example. Settled to the text, LBA confirmation kept | 2019/947 UAS.OPEN.020, .040, .060; Art. 15(1)(d) |
| `robo.uav.ops-eu` | A1 and A3 lists omitted pre-2024 unlabelled drones, and A3 omitted C2. A2 omitted no overflight | 2019/947 Art. 20, UAS.OPEN.020 to .040 |
| `robo.uav.ops-eu` | Registration "exemption" missed the 80 J limb and misdescribed the toy limb | 2019/947 Art. 14(5) |
| `robo.uav.ops-eu` | Competence said all privately built and pre-2024 drones need the exam. Under-250 g A1 cases need only the manual | UAS.OPEN.020(4), .060(1)(a) |
| `robo.uav.ops-germany` | "over 249 g" and "section 66a(3)". The law says 250 g or more, section 66a(1) and (3), with a toy exception | LuftVG section 66a |
| `robo.uav.ops-germany` | Settled: section 49b unit is the IMF SDR, converted at payment. Added the 600,000 euro per-person limit | LuftVG sections 37, 49b |
| `robo.uav.ops-airspace` | Said temporary area times are published by NOTAM. They are in the NfL, permanent ones in the AIP, and changes go by NOTAM | DFS FAQ |
| `robo.uav.ops-specific-sora` | Worked example said an STS is "unlikely" for privately built. It needs a C5 or C6 mark, so it does not qualify. Settled C5 and C6 | 2019/947 Appendix 1 text for STS-01, STS-02 |
| `robo.uav.ops-specific-sora` | Said apply to the LBA. Applications generally go to the state authority, or the LBA where transferred | dipul, Applications in the specific category |
| `robo.uav.ops-specific-sora` | Settled OSO count: 17 in JARUS 2.5, EASA page still says 24. Settled German transition | JARUS SORA 2.5 Table 14; LBA Erstantrag page (search extract) |
| `robo.uav.ops-specific-sora` | Publication date now attributed, consistent with entry into force 30 September 2025 | Norwegian CAA circular, Swiss FOCA (both search extracts); ED Decision 2025/018/R Art. 2 |
| `rf.basics.eu-bands` | Cited the 2021 edition as if current. 70-03 was amended 9 October 2026, and the rows are unchanged. Settled the German text and the one-hour duty period. Added the on-board-aircraft note | ERC/REC 70-03 current PDF, Appendix 5; BNetzA Vfg. 91/2025 rows 44b, 54, 57a, 57c |
| `robo.uav.fault-injection` | Worked example predicted Descend directly. PX4 tries Return, then Land, then Descend | PX4 docs, Position Loss Failsafe Action |
| `robo.uav.sitl-first` | Worked example expected Return then Land, but `COM_LOW_BAT_ACT` 0 only warns | PX4 docs, config/safety |
| `robo.uav.rotor-limits` | "Multirotor studies" for 1.2 to 1.3 v_h. The source is a paired-rotor tunnel study | Search extract, still flagged as snippet |
| `robo.uav.fc-config` | "match" changed to "roughly match": the formula gives 7.5 ms, PX4 says 8 ms | Recomputed |
| `sys.twin.residual-alert` | k = 0.2 contradicts the k = half the shift rule stated in the same skill (shift 0.8 K). Now k = 0.4, alarm at sample 7, delay 3 | NIST handbook rule as cited; recomputed |
| `sys.telemetry.schema-version` | **Unaided check was wrong.** It required a removed field to fail reading old payloads, yet a new reader ignores it, as the skill's own core idea says. Rewritten | Confluent compatibility table |
| `sys.telemetry.schema-version` | Rename explained as a removal. It breaks like adding a required field | Same |
| `sys.telemetry.secure-uplink` | 1 s setup per sample at 1 Hz called "impossible". Reworded | Reasoning |
| `sys.telemetry.mqtt-semantics` | Settled: v5 has the same rule, [MQTT-4.4.0-1] | MQTT 5.0 OS section 4.4 |
| `sys.telemetry.data-slos` | Settled: the Workbook does list pipeline coverage | SRE Workbook, Implementing SLOs |
| `sw.cloud.ci-firmware` | Settled: moved to SLSA v1.2. The secret is the provenance-signing one | slsa.dev v1.2 build track |
| `sw.cloud.incident-response` | Settled the lifecycle mapping | NIST SP 800-61r3 Table 1 |
| `sys.twin.vvuq` | Narrowed flags. V&V 20 form matches published summaries, standard still unread. The 7009 factor list is the 2008 one | Search extracts |
| `ml.pred.physics-residuals` | Two statements of method benefit as fact, softened to measure-it wording | NG-07 rule |

## Open items for the founder

1. **LBA, Remote ID.** Ask in writing: does a privately built A3 drone need Remote ID in Germany, and does any zone require it? Also confirm operator number marking.
2. **LBA, L8 route.** H9 still needs confirming before buying. Include the case of a parts list copied from one vendor's bundle. The key `prj.L8.kit-quad-maiden` reads as the route H9 rules out, so make sure the project text does not teach it.
3. **Regenerate OPEN-CHECKS.** Decide when to run `reference/build_open_checks.py`. I was not allowed to edit it, so T4 and T5 rows now quote old text, including `k = 0.2` and the module wording. Some rows are also mistyped: a plain sentence containing "uncertainty" is listed as "Unconfirmed fact".
4. **`legal-source-check.md`.** Decide whether to add the two updates: the German section 21h reading on Remote ID, and that T4 now follows section 4. Its last line says T4 was not checked.
5. **SORA in the EU annex.** Open Amendment 3 once and confirm its OSO count against JARUS.
6. **Radio on the airframe.** CEPT says to consult the aviation authority before using SRD on board aircraft. I found no aircraft exclusion in Vfg. 91/2025. A human should confirm that, and read the CEPT UAS explanatory document.
7. **Time estimates.** Decide whether to change them in the graph (see weakness 2). I may not edit `est_minutes`.
8. **Insurance.** Confirm the legal basis for "certificate at hand" and the administrative offence. Only the dipul page says so, and LuftVG section 43 itself does not.

## Curriculum weaknesses that remain

Most serious first.

1. **Legal skills lean on rubric_llm.** `ops-eu`, `ops-privacy` and `ops-specific-sora` have only multiple choice and rubric graders. A rubric is not mastery-eligible until calibrated, and these skills gate flight. Add human review for the legal route.
2. **Time is not plausible for hands-on skills.** `manual-recovery` is 60 min against 10 logged simulator hours. `fc-config` (40 min) covers a full PX4 rebuild and tuning. `ml.edge.deploy` (40), `ota-rollback` (35, with 20 power cuts) and `sitl-first` (40, with toolchain setup) are short too. The table note calls these contact-time sketches, so the learner plan will underestimate badly. The other estimates look fair for reading and problems.
3. **German zone coverage is partial.** `ops-germany` omits section 21h(3) no. 6 (nature reserves), no. 8 (bathing sites) and no. 11 (accident sites). It does not say that airports have no consent route in Open under no. 2. Nature reserves are a likely trap for a rural A3 site. These are gaps, not errors, so I left them.
4. **The VLOS duty is thin.** It appears only in passing, and the `test-cards` example flies 400 m out. No skill makes the learner estimate VLOS for a small quad. UAS.OPEN.050(7), informing involved persons, is also absent.
5. **Remote ID has no practical skill.** There is no task on fitting or checking a module if the route moves to Specific, and none on `COM_ARM_ODID`.
6. **Many unaided checks need things that do not exist yet:** seeded logs, task sheets, an outside reviewer. Their quality depends on those assets. A solo founder will struggle to get outside review for H11 items.
7. **`phone_suitable` conflicts with some graders.** `net.proto.telemetry-contract` and `sys.req.icd-basics` are the clearest. The graph wins on these, so check there.
8. **`sys.twin.closed-decision` fallback.** At 30 A the example predicts 84 °C against an 80 °C limit, yet timeout "keeps 30 A" if firmware protects the part. It is hedged, but a learner could copy it. The default on timeout should be the reduced value.
9. **T4 Legal text will age quickly.** PX4 parameter names and the `main` branch change, and section 21h has no as-of date online.

## What could not be checked

- **Not read:** PANS-AIM or Annex 15 (NOTAM layout matches FAA and ICAO training material only, so that flag stays), ASME V&V 20, NASA-STD-7009 itself, Decision 2006/771/EC, ETSI EN 300 220, Cheeseman and Bennett, the Welch and Bishop report (404), Piché's paper body, Huyen's chapter, a primary source for PSI levels or Little's law.
- **Search extract only, not read in full:** the LBA SORA pages, the Norwegian and Swiss SORA dates, the VRS study. The DSK guidance was not opened.
- **Not re-read for this review:** GDPR, the Ryneš case, the EDPB guidelines, the AESA page, the EASA FAQ pages, QGC behaviour, ArduPilot pages, and most T5 sources not named above (RFC 8446, RFC 5280, AWS, NIST SP 1800-36, NIST handbook, FPP3, scikit-learn, Google rules of ML, TFDV, Kim et al., Wu and Keogh, Saxena et al., OWASP, NCSC, OpenAI and Anthropic evals pages). For these I judged content from knowledge and internal consistency. Spot checks that did match: RFC 9019, MCUboot, TFLM overhead figures, Anthropic structured outputs.
- **PX4:** read from the `main` docs on GitHub, not a release. Parameter behaviour was not tested in SITL.
- **PDF text:** extracted by script with some broken spacing. The regulation quotes above should be eyeballed by a person.
- **Consolidated law:** the 2019/947 text has no legal effect by its own notice. The German statute pages show no as-of date. Amendments after those versions were not searched.
- **Not reviewed:** prerequisites and edges, and the pillar narrative beyond the skill tables. The tables match the YAML on keys and minutes, apart from two T5 rows (`ml.core.neural-network-basics`, `sys.telemetry.tls-basics`) whose specs live in `T2-bridge.yaml`.

Sources opened: EU 2019/947 consolidated via publications.europa.eu; EU 2019/945; gesetze-im-internet.de (LuftVO 21h, 21i; LuftVG 37, 43, 49b, 66a); dfs.de; dipul; JARUS SORA 2.5 main body; ED Decision 2025/018/R; docdb.cept.org; bundesnetzagentur.de; PX4 docs; docs.oasis-open.org; sre.google; docs.confluent.io; slsa.dev; nvlpubs.nist.gov; docs.mcuboot.com; rfc-editor.org; arxiv.org/html/2010.08678; platform.claude.com.
