# Human-review research pass, T4 (robotics and UAV), 3 November 2026

This is research done for the founder, not legal advice. No `status` was changed and nothing is `verified`. Edits: `content/syllabi/skill-specs/T4.yaml` and a new appended section, "T4 update, 3 Nov 2026", at the end of `legal-source-check.md`.

Checks after editing: `T4.yaml` loads; `py -3 -B reference/validate_skill_specs.py` gives 247 specs checked, 0 errors; `py -3 -B reference/lint_claims.py` gives 0 violations. Keys, `est_minutes`, `task_kinds`, `grader_types` and `phone_suitable` are unchanged.

## 1. Summary counts

26 OPEN-CHECKS rows for T4.

| Outcome | Rows |
|---|---|
| confirmed | 8 |
| corrected | 6 |
| convention | 11 |
| open | 1 |

When `build_open_checks.py` is re-run on the edited file, T4 drops from 26 rows to 5. One is the real open item (kit line). The other 4 are false positives of the regex in `reference/build_open_checks.py` (see proposed edit E1):

- `UNCERTAIN` matches the word "uncertainty" (3 rows in `sens.meas.calibration-uncertainty`).
- `not read` matches "Not Ready" (1 row in `robo.uav.preflight`, which quotes the PX4 status label).

The Remote ID point in `robo.uav.ops-eu` and `ops-legal-route` is open too (it needs the LBA), but its text carries no flag word, so it does not show in OPEN-CHECKS. It is tracked in section 4 below.

## 2. Every OPEN-CHECKS row

| # | Skill | Flag (short) | Outcome | Source used | What changed |
|---|---|---|---|---|---|
| 1 | `robo.uav.ops-airspace` | NOTAM field layout from general knowledge | confirmed | FAA Order JO 7930.2U (basic with changes 1 and 2, dated 30 Sep 2026), para 8-1-2.b (items Q, A to G) and 3-3-2.b (times in UTC, 10 digits YYMMDDHHMM): https://www.faa.gov/documentLibrary/media/Order/7930.2U_Basic_w_Chg_1_and_Chg_2_dtd_9_30_26_Final.pdf | Hedge removed. Layout now listed item by item with the paragraph cited. ICAO PANS-AIM is sold, so it was not used. EUROCONTROL OPADD and FAA HTML pages blocked automated requests (HTTP 403) |
| 2 | `robo.uav.ops-airspace` | ICAO text was not opened | confirmed | Same | Same sentence; source added |
| 3 | `robo.uav.ops-airspace` | Any example is invented | convention | n/a | Now: "made up and not a real notice [project convention: a practice notice must never be mistaken for a real one]" |
| 4 | `robo.uav.ops-airspace` | Invented practice NOTAM | convention | n/a | Now "Practice NOTAM, made up for this exercise". Recomputed: 120 + 120 = 240 m; 240 / 0.3048 = 787.4 ft < 1500 ft. Unaided check: 200 / 0.3048 = 656.2 ft; 700 - 656.2 = 43.8, so "44 ft" holds. 10:00 to 14:00 UTC is 11:00 to 15:00 at UTC+1; 10:00 to 14:00 UTC on 14 July is 12:00 to 16:00 at UTC+2 |
| 5 | `robo.uav.ops-privacy` | DSK guidance only seen as snippets | confirmed | DSK, Orientierungshilfe Videoüberwachung durch nicht-öffentliche Stellen, Stand 17 Jul 2020, section 5.7 (p. 34 to 35): https://datenschutzkonferenz-online.de/media/oh/20200903_oh_v%C3%BC_dsk.pdf; GDPR Art. 4(1), OJ text via https://publications.europa.eu/resource/celex/32016R0679.ENG | Hedge removed. The DSK passage is about camera drones in public space (usually inside the GDPR; notice duties hardly possible). It says nothing about telemetry, so the telemetry point is now tied to GDPR Art. 4(1), which names location data as an identifier. Note: the DSK text cites the old LuftVO section 21b; the rule is now section 21h |
| 6 | `robo.uav.ops-legal-route` | Parts list copied from one vendor's bundle | **open** | EASA GM1 Article 2(16) (ED Decision 2022/002/R), Easy Access Rules June 2026: https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-unmanned-aircraft-systems?erules-id=ERULES-1963177438-19497 | GM1 read: case (b) "assembly of the UAS from parts or sub-assemblies sold separately" is privately built; a ready-to-assemble kit is not. Nothing on single-seller lists. UNCERTAIN kept. Interim project rule added (see founder item 2) |
| 7 | `robo.uav.ops-germany` | "Answer: not ready..." (regex hit on "not ready") | corrected | LuftVO section 21h(3) no. 1 and no. 2, read 3 Nov 2026: https://www.gesetze-im-internet.de/luftvo_2015/__21h.html | Consent bodies now match no. 1: Luftaufsichtsstelle, Flugleitung or aerodrome operator, distance from the boundary. Added that no. 2 (airports) has no consent route in Open. Answer reworded |
| 8 | `robo.uav.ops-specific-sora` | EU Amendment 3 annex not read | confirmed | Annex to ED Decision 2025/018/R, Table 14, page 44 of 204: https://www.easa.europa.eu/en/downloads/142514/en; corrigendum of 12 Dec 2025: https://www.easa.europa.eu/en/downloads/142969/en | 17 OSOs: #01 to #09, #13, #16 to #20, #23, #24 (9 + 1 + 5 + 2 = 17), same as JARUS 2.5. Also corrected: the corrigendum renames the 2019/947 part "Issue 1, Amendment 4" (Part-UAS part stays Amendment 3) |
| 9 | `robo.uav.propulsion-match` | Margin 1.2 [P] | convention | n/a | "[project convention: 20% headroom over measured peak current leaves room for heat, gusts and part spread; no standard fixes it]". Recomputed: 920 x 14.8 = 13,616 rpm = 226.9 rev/s; pi x 0.254 x 226.9 = 181.1 m/s, Mach 0.53; 30 / 22 = 1.36; 125 / 88 = 1.42 |
| 10 | `robo.uav.propulsion-match` | ESC 1.15 below 1.2 [P] | convention | n/a | Now "below the 1.2 project margin". Recomputed: 3.0 x 30 = 90 A; 4 x 26 = 104 A; 90 / 104 = 0.87; 30 / 26 = 1.15 |
| 11 | `robo.uav.rotor-limits` | Paired-rotor VRS study, snippet only | corrected | Veismann, M. (2022), Axial Descent of Multirotor Configurations, Caltech PhD thesis, ch. 4 (PDF p. 49: thrust loss mainly between 0.5 and 1.7 v_h, peak 1.2 to 1.4) and ch. 5 conclusions (largest fluctuations at 1.2 to 1.3; single rotor matched dual rotor): https://thesis.caltech.edu/14485/ | Hedge removed. Now says loss starts near 0.5 v_h and peaks near 1.2 to 1.3 v_h, so half v_h is the start of the danger band. This supports the skill's existing "about half v_h" limit. Recomputed: v_h = sqrt(4.905 / (2 x 1.225 x 0.05067)) = 6.29 m/s; unaided v_h = 9.78 m/s, 4 / 9.78 = 0.41 |
| 12 | `robo.uav.rotor-limits` | Cheeseman and Bennett only in secondary sources | corrected | Sanchez-Cuevas, Heredia, Ollero (2017), Int. J. Aerospace Eng., article 1823056, sections 2.1 and 2.2; ref. [11] is Cheeseman and Bennett, ARC R&M 3021 (1955): https://orbilu.uni.lu/bitstream/10993/47153/1/1823056.pdf | Old text said the form fits multirotors "poorly". The paper shows it fits single small rotors on a bench, and the full multirotor gains more than predicted. Now: "treat it as a low estimate for the whole vehicle". Recomputed: z = R gives 1 / (1 - 1/16) = 1.067; z = 2R gives 1 / (1 - 1/64) = 1.016 |
| 13 | `robo.uav.test-cards` | Trigger above 30% [P] | convention | n/a | "[project convention: about three times the 9.3% the return needs, leaving a landing reserve]". Recomputed: 20/3 + 400/5 + 60/1 = 146.7 s; 11.4 x 146.7 / 3600 = 0.464 Ah = 9.3% of 5.0 Ah; 3 x 9.3 = 27.9 |
| 14 | `robo.uav.hazard-analysis` | Scales are project choices [P] | convention | n/a | "[project convention: no rule fixes a scale for Open-category test flights, so one fixed written scale keeps ratings comparable]". Recomputed: sqrt(2 x 9.81 x 30) = 24.26 m/s; 0.5 x 2 x 24.26^2 = 588.6 J; 0.5 x 2 x 15^2 = 225 J |
| 15 | `robo.uav.manual-recovery` | Hours and tolerances [P] | convention | PX4 first-flight and Altitude mode pages (already cited) | "[project convention: no rule sets these for Open A3, so they are chosen strict for a first maiden]" |
| 16 | `robo.uav.manual-recovery` | Answer: pass on both [P] limits | convention | n/a | Now "both gate limits" |
| 17 | `robo.uav.preflight` | Both limits [P] | convention | n/a | "[project convention: 4.15 V is a nearly full LiPo cell (full is 4.20 V), and a 0.03 V spread flags a weak cell early]". Recomputed: 4 x 4.15 = 16.6 V; 16.62 >= 16.6 and 0.02 < 0.03, so go |
| 18 | `robo.uav.preflight` | Arming Check Report sentence (regex hit on "Not Ready") | corrected | PX4 docs, Preflight Sensor/Estimator Checks: https://docs.px4.io/main/en/flying/pre_flight_checks.html | "Not Ready" on amber is confirmed. The error wording was wrong: PX4 says "PREFLIGHT FAIL: COMPASS SENSORS INCONSISTENT - CHECK CALIBRATION", not "mag sensors inconsistent". Fixed here and in `robo.uav.sensor-orientation`. The row will stay in OPEN-CHECKS until E1 is applied |
| 19 | `robo.uav.sitl-first` | "SITL could not show" (regex hit) | confirmed | n/a, no fact claimed | Reworded to "cannot show" so the false positive clears |
| 20 | `sens.meas.calibration-uncertainty` | GUM sentence | confirmed | JCGM 100:2008, sections 5.1.2, 6.3.3: https://www.bipm.org/documents/20126/2071204/JCGM_100_2008_E.pdf | Section numbers added to the text. Row stays until E1 (word "uncertainty") |
| 21 | `sens.meas.calibration-uncertainty` | Uncertainty of a correction | confirmed | GUM 3.2.3 note, 4.3.7, 4.2.7 | Section numbers added. Recomputed worked example: u = 0.0577, 0.1155, 0.0577, 0.0375 A; u_c = sqrt(0.021406) = 0.1463 A; U = 0.293 A = 1.46% of 20 A. Unaided: 0.0144, 0.1155, 0.0577, 0.01875; u_c = sqrt(0.017226) = 0.1313 A; U = 0.2625 A |
| 22 | `sens.meas.calibration-uncertainty` | Linear sum is worst case | confirmed | GUM 5.1.2 (root-sum-square for uncorrelated inputs) and 6.3.1 note (uncertainty is not a safety limit) | No change |
| 23 | `sens.meas.gps-error-literacy` | EPH equals one sigma per axis? | convention | Rayleigh arithmetic | "[project convention: against radial RMS (95% radius 1.73 EPH) or a 50% circle (2.08 EPH), sigma per axis gives the largest 95% radius, 2.45 EPH, so it is the safe choice]". Arithmetic: R95 = sqrt(-2 ln 0.05) sigma = 2.448 sigma; radial RMS = sqrt(2) sigma, so R95 = 2.448 / 1.414 = 1.731 EPH; CEP50 = 1.1774 sigma, so R95 = 2.448 / 1.1774 = 2.079 EPH |
| 24 | `rf.basics.link-budget` | P.525 PDF not opened | corrected | ITU-R P.525-5 (11/2024), equations (5) and (6): https://www.itu.int/dms_pubrec/itu-r/rec/p/R-REC-P.525-5-202411-I!!PDF-E.pdf | The ITU constant is 32.4, not 32.45 (32.44 with c = 3e8). Text fixed. Recomputed: 20 log10(4 pi x 1000 / 0.34502) = 91.23 dB; received 29.15 - 91.23 + 2.15 - 1 = -60.93 dBm; margin 49.07 dB. 433.5 MHz: 85.18 + 6.02 = 91.20 dB, received -77.90 dBm, margin 39.10 dB (text says 91.21, -77.91, 39.09; inside the 0.1 dB tolerance) |
| 25 | `net.proto.companion-bridge` | 5% and 0.1% [P] | convention | n/a | "[project convention: a wired serial or Ethernet link should lose almost nothing, so these limits catch a real fault]". Recomputed: 921600 / 10 = 92,160 B/s; half 46,080; 4,000 + 3,000 = 7,000; 7,000 / 46,080 = 15.2% |
| 26 | `rf.basics.eu-bands` | 2006/771/EC and EN 300 220 not opened; cellular unresolved | corrected | 2006/771/EC consolidated 23 Jan 2025 (rows 44b, 54, 57a, 57c): http://publications.europa.eu/resource/cellar/8aba10b8-f90f-11ef-b7db-01aa75ed71a1.0008.03/DOC_1; Vfg. 91/2025 (Nov 2025); CEPT FM(23)034 Annex 32: https://efis.cept.org/documents/79124; ECC/DEC/(22)07: https://docdb.cept.org/document/28575 | Hedge removed. 2006/771/EC rows match. ETSI EN 300 220-2 is a test standard (latest V3.3.1, 2025-03, seen in catalogues only); the learner relies on the CE declaration, so the text now says that. Cellular: ECC/DEC/(22)07 governs aerial UE; no German implementation found, so "[project convention: no cellular telemetry in this course]" |

## 3. Founder items

### Item 1. LBA, Remote ID (open; letter drafted)

**What is settled from public sources:**

- 2019/947, consolidated 1 May 2025, is still the latest. A Publications Office SPARQL query on 3 Nov 2026 lists no amending act after 2024/1110 for 2019/947 (2025/1130 amends 2019/945).
- In that text, UAS.OPEN.040(4)(a) sets no Remote ID condition for privately built A3; (c) and (d) do for C2 and C3 (read on 2 Nov, `legal-source-check.md` section 4).
- LuftVO section 21h, read again on 3 Nov, has no Remote ID wording. Section 21h(4) lets the ministry, or a federal authority it names, set more zones.
- EASA FAQ (open category): the number goes into the Remote ID system "if the drone has" one; privately built drones must display the number. EASA's 2024 "applicable requirements" page says C1 to C3 and Specific need Remote ID, and only *recommends* it for legacy drones over 250 g. Neither is law.
- EASA GM1 Article 2(16) says nothing on Remote ID.

**Decision until the LBA answers:** keep the T4 text as is (reading of the text, LBA confirmation required). Safety-first add-on for the project: the L8 operator displays the e-ID on the airframe in all cases, and checks the dipul map for zone conditions before every flight. If the LBA says a module is needed, fit one before the maiden.

**Ready-to-send inquiry (German).** Fill the brackets. Send through the contact route on the LBA drone pages (lba.de, section Drohnen). Nothing has been sent.

> **Betreff:** Anfrage: Fernidentifizierung, Kennzeichnung und Abgrenzung „privat gebaut“ / Bausatz für ein selbstgebautes UAS in der offenen Kategorie A3
>
> Sehr geehrte Damen und Herren,
>
> ich bin beim LBA als UAS-Betreiber registriert (Registrierungsnummer: [e-ID]) und plane, für meinen eigenen Gebrauch einen Multicopter ohne Klassenkennzeichnung zu bauen (Startmasse ca. [1,8] kg) und ihn in der offenen Kategorie, Unterkategorie A3, zu betreiben. Ich bitte um eine kurze schriftliche Auskunft zu folgenden Punkten.
>
> **A. Fernidentifizierung und Kennzeichnung**
>
> 1. Nach meinem Verständnis sieht UAS.OPEN.040 Nr. 4 Buchst. a der Durchführungsverordnung (EU) 2019/947 für privat gebaute UAS unter 25 kg keine Pflicht zur aktiven direkten Fernidentifizierung vor, anders als Buchst. c und d für die Klassen C2 und C3. Trifft es zu, dass ein solches UAS in Deutschland in A3 ohne direkte Fernidentifizierung betrieben werden darf?
> 2. Gibt es in Deutschland geografische Gebiete nach Art. 15 Abs. 1 Buchst. d der Verordnung (EU) 2019/947 oder nach § 21h Abs. 4 LuftVO, in denen für die offene Kategorie eine Fernidentifizierung vorgeschrieben ist? Wenn ja, wo werden diese Bedingungen veröffentlicht (z. B. in der dipul-Karte)?
> 3. Genügt es, die Registrierungsnummer des Betreibers nach Art. 14 Abs. 8 der Verordnung (EU) 2019/947 gut lesbar am Luftfahrzeug anzubringen, und gibt es dazu Vorgaben (Ort, Größe, Dauerhaftigkeit)?
> 4. Falls ich freiwillig ein Modul zur direkten Fernidentifizierung einbaue: Muss es dann während jedes Flugs aktiv sein und meine Registrierungsnummer senden?
>
> **B. Abgrenzung „privat gebaut“ gegenüber einem Bausatz (Art. 2 Nr. 16 der Verordnung (EU) 2019/947, GM1 Article 2(16))**
>
> Ich will Rahmen, Motoren, Regler, Flugsteuerung, Empfänger und Akku als einzeln angebotene Artikel nach meiner eigenen schriftlichen Spezifikation kaufen.
>
> 5. Bleibt das UAS „privat gebaut“, wenn ich alle oder die meisten dieser einzeln angebotenen Teile beim selben Händler kaufe?
> 6. Ändert sich die Bewertung, wenn meine Teileliste einer Zusammenstellung entspricht, die ein Händler auch als Set, Combo oder Bundle anbietet, ich die Teile aber einzeln bestelle?
> 7. Gilt ein vom Händler als ein Artikel angebotenes Teilpaket (z. B. Motoren mit passenden Reglern oder ein Rahmen mit Verteilerplatine) bereits als „Bausatz“ im Sinne von Art. 2 Nr. 16?
> 8. Erwartet das LBA eine bestimmte Dokumentation des Eigenbaus (z. B. Teileliste mit Kaufbelegen, Bauprotokoll)?
>
> Ihre Antwort möchte ich zu meinen Betriebsunterlagen nehmen. Eine Antwort per E-Mail genügt.
>
> Mit freundlichen Grüßen
> [Name, Anschrift, E-Mail]

### Item 2. LBA, L8 route and the kit line (open; interim rule decided)

- **Finding:** GM1 Article 2(16) case (b) treats assembly "from parts or sub-assemblies sold separately" as privately built. A ready-to-assemble kit is not. No source covers a single-seller list or a copied bundle. Questions 5 to 8 of the letter above cover it.
- **Decision (conservative, until the LBA answers):** every part is bought as a separately listed article, to the learner's own written specification, with no article sold as a kit, combo, set or bundle. Prefer more than one seller where practical. Keep receipts and the spec as the build record. This is now in `ops-legal-route` as a project convention.
- **Project key:** `prj.L8.kit-quad-maiden` cannot be renamed (contract rule). Its summary in `content/extended-project-ladder-sketch.yaml` already says "not a kit by default". To stop the key name teaching the wrong route, see proposed edit E2.

### Item 4. `legal-source-check.md` (done)

Appended "T4 update, 3 Nov 2026" at the end (rows 4c to 4i, sources, and a note that T4 was checked against section 4). No existing line was changed.

### Item 5. SORA OSO count in the EU annex (done)

Table 14 of the annex lists 17 OSOs: #01 to #09, #13, #16 to #20, #23, #24 (page 44 of 204). Same as JARUS 2.5. The 12 Dec 2025 corrigendum renames the 2019/947 AMC as "Issue 1, Amendment 4". The EASA SORA web page still says 24 (version 2.0). `ops-specific-sora` updated.

### Item 6. Radio on the airframe (done)

- Vfg. 91/2025 (BNetzA, November 2025, valid to 31.12.2035): no aircraft or on-board exclusion. Searched for Luftfahrzeug, Bord, Flug and Luft. The only hits are the model-control definition and the transport-telematics row. Hinweis 4 says other public-law duties stay unaffected.
- 2006/771/EC, consolidated 23 Jan 2025: same rows, no aircraft or airborne restriction.
- ERC/REC 70-03 (edition October 2026, introduction): conditions also apply on board aircraft unless excluded elsewhere; CEPT does not cover aviation safety; consult the aviation authority. It points to FM(23)034 Annex 32.
- FM(23)034 Annex 32, the CEPT explanatory paper on non-professional UAS (read from the DOCX): it lists 433.05 to 434.79 MHz (10 mW e.r.p.) and 863 to 870 MHz (25 mW, some frequencies 500 mW e.r.p.) as OK under 70-03 Annex 1, and 2.4 GHz under Annex 1 and Annex 3. It excludes 5150 to 5170 MHz and the DFS bands above 5250 MHz.
- **Conclusion:** no radio rule excludes these SRD bands on a drone. The aviation-authority advice is a general caveat. No German aviation rule restricting SRD on an Open-category drone was found. The T4 text keeps "ask the aviation authority too" as the conservative line.

### Item 7. Time estimates (recommendation; not applied)

Basis: contract section 7 defines `est_minutes` as learner time from first exposure to first mastery. Long practice (simulator hours, the real build) belongs in project steps and lab sessions, not in `est_minutes`. These are estimates [inf], to be replaced by logged times.

| Skill | Now | Proposed | Reason |
|---|---|---|---|
| `robo.uav.manual-recovery` | 60 | 120 | Mode study, drill set-up and three timed SITL recovery runs. The 10 simulator hours move to L8 lab project steps |
| `robo.uav.fc-config` | 40 | 90 | Clean-state workflow plus a seeded three-fault audit. Real tuning stays in L8 steps |
| `robo.uav.sitl-first` | 40 | 90 | First-time toolchain set-up alone often takes 30 to 60 min, plus three failsafe runs and logs |
| `robo.uav.fault-injection` | 35 | 60 | Five planned faults, each predicted, run and compared in the log |
| `robo.uav.mission-geofence` | 40 | 60 | Margin budget, SITL mission and log check |
| `robo.uav.ground-test-props-off` | 25 | 45 | Bench set-up, four-motor table and seeded-record diagnosis |
| `net.proto.companion-bridge` | 35 | 60 | Wiring and configuration, plus a 10-minute log and its analysis |

Net change: +250 minutes across 7 skills. All other T4 estimates look fair for reading and problem work. Two T5 items in the review (`ml.edge.deploy` and the `ota-rollback` skill) are for the T5 pass. Also apply 00a G8: re-time the planning figures after the change. Proposed edit E3.

### Item 8. Insurance legal basis (done)

- LuftVG section 43(2): the keeper must hold liability insurance.
- LuftVG section 1(2): model aircraft (no. 9) and unmanned aircraft count as aircraft.
- LuftVZO section 106(2): the insurer's confirmation must be carried when operating.
- LuftVZO section 108(1) no. 5(e), with LuftVG section 58(1) no. 10: not carrying it is an administrative offence.
- LuftVG section 58(3): fine up to 50,000 euro.

So dipul was right, but the duty is in the LuftVZO, not section 43. `ops-germany` now cites all of them. Applying section 108 ("Führer eines Luftfahrzeugs") to a remote pilot is the plain reading; no court or LBA text on it was checked.

### Proposed edits outside my scope (for the orchestrator)

**E1.** File `reference/build_open_checks.py`, in `MARK`.
Old: `UNCERTAIN|\[uncertain|\[P\b|\(snippet\)|unofficial mirror|from memory|not opened|not read|secondary|unconfirmed|invented|snippet only|could not`
New: `UNCERTAIN\b|\[uncertain|\[P\b|\(snippet\)|unofficial mirror|from memory|not opened|not read\b|secondary|unconfirmed|invented|snippet only|could not`
In `KIND`, the "Weak source" pattern: old `snippet|unofficial mirror|secondary|not opened|not read`, new `snippet|unofficial mirror|secondary|not opened|not read\b`.
Effect: stops "uncertainty" and "Not Ready" being flagged. Check the other pillars after re-running, since rows may disappear there too.

**E2.** File `content/extended-project-ladder-sketch.yaml`, `prj.L8.kit-quad-maiden` summary.
Old: `summary: "Legal route first (00a H9): privately built or class-marked quad; PX4 on H7; maiden under a test card, not a kit by default."`
New: `summary: "Legal route first (00a H9): privately built or class-marked quad; PX4 on H7; maiden under a test card. The key name is historical: the vehicle is never a single ready-to-assemble kit (2019/947 Art. 2(16), GM1 Article 2(16)), and parts are bought as separately listed articles until the LBA answers."`

**E3.** File `content/mvp-skill-graph.yaml`, `est_minutes` of the seven skills in the item 7 table: 60 to 120, 40 to 90, 40 to 90, 35 to 60, 40 to 60, 25 to 45, 35 to 60. Then mirror them in `T4.yaml` and in the `pillar-T4-robo.md` table. The validator checks that the graph and the spec agree.

**E4.** Re-run `py -3 -B reference/build_open_checks.py` after E1 to regenerate `OPEN-CHECKS.md`.

## 4. Still open

| Item | What closes it | Who |
|---|---|---|
| Remote ID for privately built A3 in Germany (`ops-eu`, `ops-legal-route`; not in OPEN-CHECKS) | LBA's written answer to questions 1 to 4 | Founder sends the letter in item 1 |
| Kit line for a single-seller or copied bundle parts list (`ops-legal-route`, OPEN-CHECKS row) | LBA's written answer to questions 5 to 8 | Founder, same letter |
| Modelling-club route (Article 16) for Germany (`ops-legal-route`, no flag word) | Not needed for L8 under the current route. If wanted: read the LBA page on Article 16 authorisations and one club's authorisation terms | Founder, optional |
| Cellular telemetry rules in Germany | BNetzA or network-operator text implementing ECC/DEC/(22)07 for aerial UE. Not needed while the project convention excludes cellular | Later, if the course adds cellular |
| ETSI EN 300 220-2 V3.3.1 text | Free download from etsi.org if a reader wants the test methods. Not needed for the skill | Optional |
| Remote pilot as "Führer" under LuftVZO section 108 | Any LBA or court statement. Low risk: the conservative behaviour (always carry proof) is already taught | Optional |

Sources opened in this pass: gesetze-im-internet.de (LuftVO 21h; LuftVZO 106, 108; LuftVG 1, 43, 58); EASA eRules (GM1 Article 2(16)); EASA open-category FAQ; EASA 2024 requirements page; annex and corrigendum to ED Decision 2025/018/R; Publications Office SPARQL and Cellar (2006/771/EC, GDPR, amendment list of 2019/947 and 2019/945); BNetzA Vfg. 91/2025; ERC/REC 70-03 (Oct 2026); CEPT FM(23)034 Annex 32; docdb.cept.org (ECC/DEC/(22)07 page); FAA JO 7930.2U; DSK Orientierungshilfe Videoüberwachung; Veismann 2022 thesis; Sanchez-Cuevas et al. 2017; JCGM 100:2008; ITU-R P.525-5; PX4 pre-flight checks page. Blocked (HTTP 403): EUROCONTROL OPADD, FAA NOTAM HTML pages, Cambridge and DOAJ pages for the Flow paper.
