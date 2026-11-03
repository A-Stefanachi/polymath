# Human-review research pass, T6 (governance), 3 November 2026

This is research done for the founder, not legal advice. The T6 skills teach literacy; legal conclusions stay with counsel. No `status` was changed and nothing is `verified`.

Edits: `content/syllabi/skill-specs/T6.yaml`, and a new section "T6 update, 3 Nov 2026" appended at the end of `legal-source-check.md` (no existing line changed).

Checks after editing: `T6.yaml` loads (37 specs); `py -3 -B reference/validate_skill_specs.py` gives 247 specs checked, 0 errors; `py -3 -B reference/lint_claims.py` gives 0 violations. Keys, `est_minutes`, `task_kinds`, `grader_types` and `phone_suitable` are unchanged.

## 1. Summary counts

27 OPEN-CHECKS rows for T6.

| Outcome | Rows |
|---|---|
| confirmed | 7 |
| corrected | 10 |
| convention | 6 |
| open | 0 |
| false positive | 4 |

Running the current `MARK` regex over the edited file leaves exactly 4 hits, all false positives. Proposed edit E2 clears them.

| False positive | Skill and field | Pattern hit | Why it is not a hedge |
|---|---|---|---|
| "From memory, draw the layer stack" | `prof.law.de-eu-awareness`, unaided_check | `from memory` | It is the closed-book instruction of the check |
| "A model built from memory misses..." | `sec.hw.own-device-model`, core_ideas | `from memory` | It teaches that a threat model needs real artefacts |
| "(4) items where crypto supports a secondary function" | `def.export.general-notes`, core_ideas | `secondary` | It paraphrases 5A002.a.4 of Annex I |
| "each uncertain point routed to counsel" | `prof.eu.cra-obligations`, unaided_check | `UNCERTAIN` (case-insensitive) | It is a pass condition, not an unconfirmed fact |

## 2. Every OPEN-CHECKS row

| # | Skill | Flag (short) | Outcome | Source used | What changed |
|---|---|---|---|---|---|
| 1 | `prof.law.de-eu-awareness` | "From memory, draw..." | false positive | n/a | None |
| 2 | `prof.law.classification-workflow` | Sonstige Auskunft, IHK Oldenburg snippet | corrected | BAFA Merkblatt Exportkontrolle, 10th ed., section 12: https://www.bafa.de/SharedDocs/Downloads/DE/Aussenwirtschaft/afk_merkblatt_exportkontrolle_bafa.pdf?__blob=publicationFile&v=3; VwVfG §§ 35, 38 | Snippet source removed. Now: the Merkblatt calls only the Nullbescheid "rechtsverbindlich" and says nothing on the Auskunft's force, so treat it as information and use a Nullbescheid for certainty. Matches the unaided check ("not stated there"). See founder item 4 |
| 3 | `prof.law.compliance-programme` | Counsel reviews a sample yearly [P] | convention | n/a | "[project convention: nobody can audit their own work, and yearly is the least this course accepts; the Recommendation sets no frequency]". Recommendation 2019/1318 element 5 (performance review and audits) has no frequency, confirmed in `legal-source-check.md` section 1 |
| 4 | `prof.law.compliance-programme` | "One-founder drone-parts firm [P]" | corrected | n/a | The tag was wrong: this is a fictional example, not a project value. Now "Fictional one-founder drone-parts firm" |
| 5 | `def.export.general-notes` | "secondary function" | false positive | n/a | None |
| 6 | `sec.hw.sbom-basics` | CycloneDX and SPDX, snippet | corrected | ECMA-424 page: https://ecma-international.org/publications-and-standards/standards/ecma-424/ (2nd edition Dec 2025, CycloneDX 1.7); SPDX overview: https://spdx.dev/about/overview/ (ISO/IEC 5962:2021) | "Two main formats" (a market judgement) replaced by a checkable fact: both are published standards, and the CRA names no format. Sources added. CISA's 2026 page names no format |
| 7 | `sec.hw.own-device-model` | "built from memory" | false positive | n/a | None |
| 8 | `sec.hw.iot-baselines` | Standards not read (paywall) | confirmed | ETSI EN 303 645 V3.1.3 (2024-09), free PDF: https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf (provision 5.1-1; groups 5.1 to 5.13; clause 6). ETSI's delivery folder shows 3.1.3 is the latest. EN 18031 clause facts: Decision 2025/138 (OJ) | EN 303 645 claims confirmed word for word (5.1-1: unique per device or user-defined, outside factory default). Hedge replaced: EN 18031 clause numbers come from the OJ decision; buy the part before relying on its detail |
| 9 | `sec.ot.zones` | Vendor paper, standard not read | corrected | ISA Global Cybersecurity Alliance, "Quick Start Guide: An Overview of ISA/IEC 62443 Standards", section Zones and Conduits and Table 3: https://isagca.org/hubfs/2023%20ISA%20Website%20Redesigns/ISAGCA/PDFs/ISAGCA%20Quick%20Start%20Guide%20FINAL.pdf | Zone definition was imprecise: ISA groups assets "by risk or other criteria" (criticality, function, location, access, owner). "Every asset belongs to one" dropped from the definition (it stays as a project check in the unaided check). Conduit now "connects two or more zones". SL3/SL4 wording aligned to ISA Table 3 ("extended", IACS-specific skills). Cisco source replaced by ISA |
| 10 | `sec.ot.remote-access` | SANS report not opened | confirmed | SANS blog by SANS instructor, 5 Jan 2026: https://sans.org/blog/why-vpn-mfa-is-not-enough-ot-evidence-sans-state-icsot-security-report | All figures checked: 22%, half via external connectivity or remote access, 23%, 13%, 8%, 31%. The publisher's own summary; the report PDF needs a sign-up form, which this pass did not fill in. Text now says that plainly |
| 11 | `sec.ot.iec62443-product` | 4-1 applies to developer and maintainer (snippet) | corrected | ISA Quick Start Guide, section Component Requirements | ISA says the principal audience of 4-1 and 4-2 is suppliers of control systems and component products, and 3-2 is for asset owners and integrators. Text now states that |
| 12 | `sec.ot.iec62443-product` | Standards paywalled | confirmed | ISA Quick Start Guide, sections Foundational Requirements, Security Levels, Maturity Model | Seven FRs, four component types and 4-1 maturity levels confirmed. Text says summaries follow ISA's guide and a claim needs the purchased standard |
| 13 | `sec.ot.iec62443-product` | UNCERTAIN: 62443 and CRA presumption | corrected | CRA Art 27(1) (OJ L, 2024/2847); SPARQL title search on 3 Nov 2026 | Settled for today: Art 27(1) presumption needs a harmonised standard referenced in the OJ, and no implementing decision citing standards under 2024/2847 exists (index to 30 Oct 2026). So no 62443 part gives a CRA presumption now. Re-check before publishing |
| 14 | `prof.integrator.docs` | Include what the test does not show [P] | convention | n/a | "[project convention: a stated limit stops a reader from stretching a result past its conditions]" |
| 15 | `prof.integrator.docs` | Known-issues list and TRL justification [P] | convention | n/a | "[project convention: a reviewer can test evidence but not an adjective]" |
| 16 | `prof.integrator.docs` | NASA SE Handbook 2.4, snippet | confirmed | NASA SP-2016-6105 Rev2, section 2.4 (PDF page 21): https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf | Body read. Verification shows compliance with each "shall"; validation shows the product does its intended purpose in its intended environment. Paraphrase added, hedge removed |
| 17 | `prof.integrator.docs` | NASA URL (snippet) | confirmed | Same | Old URL redirects to the wp-content path; source line updated with section |
| 18 | `prof.integrator.golden-config` | NASA SE Handbook 6.5, snippet | confirmed | Same, section 6.5 (PDF page 153) and 2.4 | CM is a discipline over the life cycle giving visibility into and control of changes; 2.4 says approved configuration documentation sets the baseline. Hedge removed |
| 19 | `prof.integrator.golden-config` | Changed parameter gives new ID [P] | convention | n/a | "[project convention: small untracked changes are the usual cause of results that cannot be repeated]" |
| 20 | `prof.integrator.golden-config` | NASA URL (snippet) | confirmed | Same | Source line updated |
| 21 | `prof.eu.cra-obligations` | UNCERTAIN: open-class drones | corrected | CRA Art 2(3) and recital 27 (OJ L, 2024/2847) | Art 2(3) excludes only products "certified in accordance with" 2018/1139, and recital 27 ties this to that certification process. An open-category drone is class-marked under Delegated Regulation 2019/945, not certified, so on the text it is in scope. Text now says so, with "confirm a specific product with counsel". Delegated Regulation 2025/1535 (the only Art 2(5) exclusion) concerns 168/2013 vehicles, not drones |
| 22 | `prof.eu.cra-obligations` | "each uncertain point" | false positive | n/a | None |
| 23 | `prof.eu.ce-radio` | UNCERTAIN on module rules | corrected | Commission "Guide to the Radio Equipment Directive 2014/53/EU", current edition replacing those of 2017 and 2018, sections 1.7.4.1 and 1.7.4.11: https://ec.europa.eu/docsroom/documents/33162?locale=en | RF modules are radio equipment; the module maker assesses risks visible before integration and gives instructions, "without prejudice to" new duties on integration. A module fixed permanently in an electrical product makes one product under the RED (section 1.7.4.1; the guide notes this mainly covers household-type products, not big industrial machinery). Misconception rewritten with section numbers. The guide is non-binding |
| 24 | `prof.eu.ce-radio` | "not read here" | corrected | Same | Same sentence; source added |
| 25 | `prof.eu.reporting-drill` | 1182/71 on an unofficial mirror | corrected | Regulation 1182/71, OJ L 124, 8.6.1971: http://publications.europa.eu/resource/cellar/062fba91-9703-427a-8b77-f7fe0bcbd8b4.0008.01/DOC_1 | Official text read. Confirmed Art 3(1) and 3(3). Added Art 3(4) (day periods ending on a non-working day run to the next working day). Added that Art 1 names acts of the Council or Commission, while the CRA is a Parliament and Council act, so counting stays a counsel check. Arithmetic below |
| 26 | `prof.data.data-act` | Design exports raw data anyway [P] | convention | n/a | "[project convention: Art 3 design is hard to retrofit and the exclusion ends with growth or a large partner]" |
| 27 | `prof.data.gdpr-telemetry` | Retention 90 days [P] | convention | n/a | "[project convention: a teaching value; Art 5(1)(e) sets no number, so the learner justifies their own period]" |

**Arithmetic, reporting drill (row 25).** Awareness Mon 16 Nov 2026, 14:30 (3 Nov 2026 is a Tuesday, so 16 Nov is a Monday). Under Art 3(1) the hour 14:00 to 15:00 is not counted, so a 24-hour period runs from 15:00 Monday to 15:00 Tuesday, and a 72-hour period to 15:00 Thursday 19 Nov. The skill's deadlines of 14:30 are 30 minutes earlier, which is the safe side, as the text says. Final report: patch available Wed 25 Nov; the day of the event is not counted; 14 days from 26 Nov ends at the end of Wed 9 Dec 2026 (25 + 14 = 39; 39 - 30 days of November = 9 December), a working day, so Art 3(4) does not move it. The worked example's "by 9 Dec 2026" is correct.

## 3. Founder items

| # | Item | Decision or finding | Reasoning and source |
|---|---|---|---|
| 1 | Graph text for `prof.eu.product-liability` | **Change it** (proposed edit E1). The graph now says "after 9 Dec 2026", not "after 8 Dec" as the review said; both should become "from 9 Dec 2026" | See item 2. T6.yaml description is changed to the same wording |
| 2 | Is a product placed on exactly 9 Dec 2026 under the new German act? | **Yes, on the text. No counsel needed for the course.** | Directive Art 2(1): applies to products placed "after 9 December 2026". But Art 21: Directive 85/374 is repealed "with effect from 9 December 2026" and continues only for products placed "before that date"; recital 63 says the new Directive does not apply to products placed "before 9 December 2026". So Art 2(1) leaves a one-day drafting gap that Art 21 and recital 63 close. Germany: BGBl. 2026 I Nr. 321 (act of 22 Oct 2026), Art 1 § 23 keeps the 1989 act for products placed "bis einschließlich 8. Dezember 2026", and Art 17(1) puts the act into force on 9 Dec 2026. A product placed on 9 Dec is therefore under the new ProdHaftG. Sources: OJ L, 2024/2853, Arts 2, 21, recital 63; https://www.recht.bund.de/bgbl/1/2026/321/regelungstext.pdf. Optional counsel question if a real product launches that day: "For a product first placed on the German market on 9 Dec 2026, is there any argument that the 1989 ProdHaftG applies because Directive 2024/2853 Art 2(1) says 'after 9 December 2026'?" |
| 3 | C(2026)6323 in the OJ? | **Not published on 3 Nov 2026.** No YAML entry changed; the date of the check moved from 2 to 3 Nov in four places | SPARQL (Publications Office) on 3 Nov 2026: no work dated from 1 Sep 2026 with "dual-use" or "2021/821" in its title except consolidated 02021R0821-20260921; no 32026R act dated 14 Sep 2026 on dual-use (index holds works up to 30 Oct 2026). BAFA Güterlisten page still says "Voraussichtlich ... ab November 2026". Secondary reports (Baker McKenzie, KPMG, 16 Oct 2026 item) agree it is unpublished. Action stays: when it appears, compare 9A012, 9A112, 5A002 and update every "21 Sep 2026" reference |
| 4 | Does a Sonstige Auskunft bind? | **Best reading: no. Taught that way; not `open`.** | BAFA Merkblatt section 12 offers two routes for doubt, a Nullbescheid or a "Sonstige Auskunft", and says only the Nullbescheid "stellt ... rechtsverbindlich fest". German administrative law: a binding act regulates a single case with external legal effect (VwVfG § 35), and even a promise of a future act binds only in writing (§ 38(1)). An information answer is neither. The course text is the conservative one: rely on a Nullbescheid, not an Auskunft. If the founder ever wants certainty, the question to BAFA (written, via ELAN-K2 or the export-control contact) is: "Hat eine Sonstige Auskunft zum Außenwirtschaftsverkehr Bindungswirkung für das BAFA oder für den Zoll, oder ist sie eine unverbindliche Information?" |
| 5 | Who acts as `human_review` and independent reviewer for a solo founder? | **Decision: outside review for the legal and threat-model skills, pre-registered checks for everything else.** Proposed 00a text in E3 | Best practice: nobody can independently review their own work (also H11's logic for hazards). Legal content needs a qualified person; threat models need someone who did not build the device. Free advice (IHK foreign-trade advisers, BAFA information events and Merkblätter) answers questions but is not a review, and BAFA says each exporter must do its own check. A paid one-off review in one batch keeps the cost bounded for an 8-hour week |
| 6 | Research module rules for `prof.eu.ce-radio`, or drop the clause? | **Researched; clause kept and sourced** | Row 23. The debug check ("Module certified, so no test") stays valid: the final product is assessed as a whole |
| 7 | Expected answer for "safety cut-off in a radio-equipped machine" | **Expected answer fixed below; core idea extended** | Regulation 2026/1744 point (41) deletes machinery from Section A and adds Regulation 2023/1230 as Section B point 21. New Art 2(2): for Section B products only Art 6(1), 60a and 102 to 112 apply; recital 42 says the AI duties reach machinery through Machinery Regulation Annex III delegated acts applying by 2 Aug 2028. New Art 3(14): a component fulfils a safety function where its intended purpose is to prevent or mitigate risks to health and safety. Expected answer: (a) AI system, yes (infers outputs). (b) It is a safety component. (c) Machinery route: Section B, so the AI Act applies only through Art 2(2) and the Machinery Regulation, from 2 Aug 2028. (d) Radio route: radio equipment is Section A, but whether the RED makes the whole machine radio equipment (RED Guide 1.7.4.1 says its single-product view does not capture big industrial machinery) and whether the RED then requires third-party assessment (Art 6(1)(b); RED Art 17(3), (4)) is a question for counsel. (e) NIST function: MAP or MANAGE. Pass if (c) is right and (d) is routed to counsel, not answered either way |
| 8 | Scope of § 9 AWV | **Corrected.** Read on gesetze-im-internet.de (text including the 23rd amendment of 14 Oct 2026, marked "textlich nachgewiesen") | § 9 is not a general catch-all. § 9(1): licence for unlisted goods if BAFA informs the exporter that they are or may be for a nuclear facility (Category 0 sense) and the destination is Algeria, Iraq, Iran, Israel, Jordan, Libya, North Korea, Pakistan or Syria. § 9(2): duty to tell BAFA if the exporter knows; no export until BAFA decides. § 9(3): not within the scope of Arts 4 and 10 of 2021/821; not for orders up to EUR 5,000, except software and technology. § 9(4): Art 5(2) sentences 1 and 2 apply when the exporter knows from facts gained outside due diligence. The old misconception ("Art 4 and § 9 AWV can bind unlisted items when ... a critical use") overstated § 9; rewritten in `export-control-literacy`, and a core idea added to `de-eu-awareness` |
| 9 | GDPR Art 30(5) amendment | **Not adopted, not in the OJ.** Text in force taught; note added | The change is in COM(2025) 501, Omnibus IV (procedure 2025/0130(COD)), not the November 2025 Digital Omnibus (COM(2025) 837). OEIL on 3 Nov 2026: "Awaiting Parliament's position in 1st reading"; committee approved the agreed text on 2 Jul 2026; indicative plenary 23 Nov 2026; no Council adoption, signature or OJ entry. SPARQL: no adopting act and no new consolidated 2016/679. Re-check after 23 Nov 2026 |
| 11 | Annex 2 cues in `core_ideas` or own field? | **Keep them in `core_ideas`.** | A new field is a schema change (00a H18 requires a 00a decision for that), and the cues are teaching content, not data the engine uses. No benefit justifies the change |

## 4. Proposed edits outside my scope

**E1.** File `content/mvp-skill-graph.yaml`, skill `prof.eu.product-liability` (lines 8202 to 8203).
Old:
```
  description: Explain how Directive 2024/2853 makes software a product, what damage
    and defects count, and who is liable for products placed after 9 Dec 2026.
```
New:
```
  description: Explain how Directive 2024/2853 makes software a product, what damage
    and defects count, and who is liable for products placed on the market from 9 Dec 2026.
```

**E2.** File `reference/build_open_checks.py`, lines 12 and 13 (builds on the T4 edit already applied).
Old line 12: `MARK = re.compile(r"UNCERTAIN\b|\[uncertain|\[P\b|\(snippet\)|unofficial mirror|from memory|not opened|not read\b|secondary|unconfirmed|invented|snippet only|could not", re.I)`
New line 12: `MARK = re.compile(r"(?-i:UNCERTAIN)\b|\[uncertain|\[P\b|\(snippet\)|unofficial mirror|(?<!built )from memory(?!, draw)|not opened|not read\b|secondary source|unconfirmed|invented|snippet only|could not", re.I)`
Old line 13: `KIND = [("Invented or project value", r"\[P\b|invented"), ("Weak source", r"snippet|unofficial mirror|secondary|not opened|not read\b"), ("Unconfirmed fact", r".")]`
New line 13: `KIND = [("Invented or project value", r"\[P\b|invented"), ("Weak source", r"snippet|unofficial mirror|secondary source|not opened|not read\b"), ("Unconfirmed fact", r".")]`
Effect, tested sentence by sentence over all pillar YAMLs: T6 drops from 4 hits to 0; T1, T3, T4 and T5 keep the same count. Hedges must then write UNCERTAIN in capitals, as the file headers already say.

**E3.** File `docs/00a-change-decisions.md`, section H, add a row (number to be assigned by the orchestrator; H19 is the next free one):

| H19 | **Review for a solo founder (T6 legal and threat-model skills).** The founder cannot be the independent reviewer of their own legal or security work. (a) Before any T6 template in `prof.law`, `def.export`, `prof.eu` or `prof.data` is `verified`, a lawyer admitted in Germany with export-control and EU product-law practice checks its expected answers in one paid batch, against a written question list; the founder still runs G3, and the REVIEW-LOG row names the reviewer, date and scope. (b) A `human_review` grade on the founder's own submission (classification memo, hold note, compliance programme, applicability map, reporting drill) comes from that lawyer, or from the rubric written and hashed before the attempt (pre-registered, as in H11) with the lawyer sampling at least one submission per module; the founder never grades their own attempt, and an ungraded attempt does not count. (c) For `sec.hw.threat-modelling`, `sec.hw.own-device-model` and `prof.integrator.*`, the reviewer is a security or test engineer who did not build the device, paid or peer, once per device revision; their biggest finding and its disposition are recorded. (d) IHK advice, BAFA Merkblätter and BAFA events answer questions; they are recorded as information, not as a review or a pass. No mastery rule changes. |

## 5. Still open

No OPEN-CHECKS row stays open. These follow-ups remain, each with its closing action:

| Item | Who | Action that closes it |
|---|---|---|
| C(2026)6323 publication | Founder or next agent | When an act amending 2021/821 Annex I appears in the OJ (SPARQL title search, or BAFA Güterlisten page), read 9A012, 9A112 and 5A002 in it and update every "21 Sep 2026" reference in T6.yaml |
| GDPR Art 30(5) | Founder or next agent | After the plenary (indicative 23 Nov 2026), check OEIL 2025/0130(COD) and the OJ; if adopted, rewrite the `gdpr-telemetry` sentence to the new text and its application date |
| CRA harmonised standards | Next agent, before publishing | Re-run the SPARQL search for implementing decisions citing standards under 2024/2847; if any appear, update `sec.ot.iec62443-product` |
| Sonstige Auskunft (optional) | Founder | Send the German question in item 4 to BAFA in writing. The course text is already conservative, so this is not blocking |
| 1182/71 counting for the CRA | Counsel, only when a real report is due | Ask: "Do the Art 14 CRA deadlines count under Regulation 1182/71, and does ENISA's platform apply the same rule?" The drill already plans to the earlier time |
| AI Act radio-equipped machine | Counsel, only for a real product | Ask whether the product is radio equipment as a whole under the RED and whether the RED requires third-party assessment, for Art 6(1)(b) |
| EN 18031 and 62443 texts | Founder, only if claiming conformance | Buy the part claimed (DIN Media in Germany; ISA or IEC for 62443) |
| Reviewer engagement (E3) | Founder | Approve E3, then get one quote for a batch review by an export-control lawyer |

Not checked in this pass: the SANS report PDF (sign-up form), the Commission's CRA guidance C(2026) 5252 for drones (the text reading above does not depend on it), and the German-language version of Directive 2024/2853 Art 2(1).
