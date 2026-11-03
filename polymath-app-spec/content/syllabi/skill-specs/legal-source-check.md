# Legal source check, T6 and T4 gaps

Checked 2 November 2026. This is research, not legal advice. A person still has to review each point before any skill is marked `verified`.

## Status summary

Status labels: **confirmed official** means read in the primary or official source. **Confirmed unofficial** means seen only in a secondary source. **Not found** means no source was located.

| # | Item | Status |
|---|---|---|
| 1 | Recommendation 2019/1318, seven core elements and Annex 2 red flags | Confirmed official, full text read |
| 2a | Annex I update adopted 14 Sep 2026, reference C(2026)6323 | Confirmed official |
| 2b | Number of that Delegated Regulation | Not found. None visible in the Publications Office data on 2 Nov 2026 |
| 2c | In force? | Confirmed official: not in force on the pages read. Publication in the OJ not found |
| 2d | Changes to 9A012, 9A112, 5A002 | Confirmed official, from the Commission's change note only. The act's own text was not read |
| 3a | CRA dates | Confirmed official |
| 3b | Digital Omnibus on AI, Regulation (EU) 2026/1744 | Confirmed official |
| 3c | German product liability act | Confirmed official |
| 3d | RED Delegated Regulation 2026/339 | Confirmed official |
| 4a | EU operating rule for privately built UAS in A3 | Confirmed official |
| 4b | German statement on Remote ID for privately built A3 drones | Not found from LBA or dipul. One unofficial forum report only, and that page could not be opened |

## How the sources were reached

EUR-Lex answered automated requests with HTTP 202 and an empty body, for both the PDF and HTML routes. Three other official routes worked:

- `https://publications.europa.eu/resource/celex/<CELEX>.ENG` returns the PDF for older acts.
- For newer acts, the object notice at the same address gives a Cellar id. The PDF is then at `http://publications.europa.eu/resource/cellar/<id>.0006.01/DOC_1`.
- The Publications Office SPARQL endpoint, `https://publications.europa.eu/webapi/rdf/sparql`, lists acts and consolidated versions.

The Cellar PDFs are the Official Journal files. Consolidated texts are documentation tools with no legal effect.

## 1. Recommendation (EU) 2019/1318

**Status: confirmed official.** The whole English PDF was extracted and the sections below were read line by line. The German PDF was checked for structure only.

- **English PDF:** https://publications.europa.eu/resource/celex/32019H1318.ENG, which redirects to http://publications.europa.eu/resource/cellar/7ba1446d-b74a-11e9-9d01-01aa75ed71a1.0006.01/DOC_1
- **German PDF:** https://publications.europa.eu/resource/celex/32019H1318.DEU, which redirects to http://publications.europa.eu/resource/cellar/7ba1446d-b74a-11e9-9d01-01aa75ed71a1.0004.01/DOC_1
- **Reference:** OJ L 205, 5.8.2019, p. 15. The act is dated 30 July 2019.
- **ELI (not reachable by script):** http://data.europa.eu/eli/reco/2019/1318/oj

**Structure.** The guidance is the Annex to the Recommendation. That Annex has its own Annex 1 (ICP questions), Annex 2 (red flags) and Annex 3 (competent authorities). Annex 2 is headed "'Red flags' relating to suspicious enquiries". In the German text it is "Warnsignale für verdächtige Anfragen".

**Status of the text.** Recital 7 and the Annex disclaimer say it is non-binding. It cites Regulation (EC) No 428/2009, so its references to Article 4 and Article 22(10) are to the old regulation. Do not carry those article numbers across to 2021/821 unchecked.

**Risk assessment comes first.** The guidance recommends starting with a risk assessment of products, customers and business activity. The ICP is then fitted to that profile. The guidance says the order of the elements is not a ranking, and the list is not exhaustive.

### The seven core elements

These are the headings as listed in the Annex, with a one-line gloss in original wording.

| # | Heading | Gloss |
|---|---|---|
| 1 | Top-level management commitment to compliance | Leadership makes the commitment visible and backs it |
| 2 | Organisation structure, responsibilities and resources | Named people, clear duties, enough means to do the work |
| 3 | Training and awareness raising | Staff know the rules that touch their job |
| 4 | Transaction screening process and procedures | The working core, see below |
| 5 | Performance review, audits, reporting and corrective actions | The company tests its own programme and fixes what fails |
| 6 | Recordkeeping and documentation | Decisions and transactions can be traced later |
| 7 | Physical and information security | Controlled items and technology are protected from unauthorised access |

Glosses for elements 1, 2, 3, 5, 6 and 7 are summaries and were not checked sentence by sentence against those sections. Only the element 4 section and the headings were read closely.

Element 4 is called the most critical element of an ICP. It has four parts:

- item classification
- transaction risk assessment, which covers embargo and sanctions checks, stated end-use and involved-party screening, diversion risk screening, and catch-all controls
- licence determination and application
- post-licensing controls

If screening raises doubt or suspicion, the company is told to consult the competent authority in its own Member State.

### Annex 2 red-flag categories

The list is non-exhaustive and draws on Wassenaar advisory questions, a 2010 UK code of practice and Member State approaches. Companies may extend it from their own experience. One flag or more is enough for vigilance. The wording below is a summary, so go to the PDF for the exact text.

**Your product(s)**

- The product is still in development or has few domestic customers.
- It outperforms established competitors technically.
- The customer wants unusual customisation, or changes that raise concern about how the customised product could be used.
- It has known dual-use, military or sensitive uses.

**End use and End user**

- The customer is new, and what is known about them is thin, inconsistent or hard to find in open sources.
- The stated end user is a trader, a distributor or sits in a free trade zone, so the final destination may be hidden.
- The end user has ties to the military, the defence industry or a government research body, but claims a civilian use.
- The customer seems unfamiliar with the product and how it performs.
- The product looks too capable for the stated application.
- Contact details point to a different country from the stated company, or have moved there over time.
- The company name is foreign in a way that is unexpected for its headquarters country.
- The company website is thin compared with what a real company normally publishes.
- The customer resists giving end-use information, an end-user statement, or clear answers to routine commercial or technical questions.
- The reason given for needing the items is weak, given the customer's normal business or the sophistication of the items.

**Shipment**

- Shipping, packaging or labelling requests are unusual.
- Usual incoterms, sealing of containers or trucks, or receipt confirmation by the consignee or end user are refused.

**Finance and contract conditions**

- Payment terms are unusually favourable: an unreasonably high price, full payment in advance, or immediate full cash payment.
- Payment comes from someone other than the customer or stated intermediaries, and takes a different route from the goods.
- Routine installation, training or maintenance is declined.
- The installation site is under strict security control or has severely restricted access.
- The site is unusual for the exporter's line of business or for the equipment involved.
- Confidentiality demands about destinations, customers or specifications are excessive.
- The customer wants excessive spare parts, or shows no interest in spare parts.

**After a flag.** Annex 2 strongly recommends sharing such information with the competent authority, and says this can be mandatory in some cases. It also says sharing within the supply chain and with other exporters may help, because proliferators may split requests across suppliers. In case of doubt, consult the authority.

## 2. Delegated Regulation updating Annex I, adopted 14 September 2026

**Adoption: confirmed official.** The Commission's news item says the act was adopted on 14 September 2026. Its link gives the reference C(2026)6323.

- https://policy.trade.ec.europa.eu/news/2026-update-eu-control-list-dual-use-items-2026-09-14_en
- https://ec.europa.eu/transparency/documents-register/detail?ref=C(2026)6323&lang=en (the page responded but its content was not read)

**Number: not found.** C(2026)6323 is a Commission document reference, not an act number. A SPARQL query on 2 November 2026 for works dated from 15 August 2026 with "dual-use" in the title returned only the consolidated text 02021R0821-20260921. The index may lag publication, so this is not proof that nothing has been published.

**In force: no, on the sources read.** The Commission page says the act takes effect on publication in the Official Journal, after the usual two-month scrutiny period for the Parliament and Council. No OJ publication was found. A November 2026 publication is expected by one secondary source only (confirmed unofficial): https://www.ashurstperkinscoie.com/en/insights/the-european-commission-updates-the-eu-dual-use-export-control-list/

**Current list on the day of checking.** The latest consolidated text is dated 21 September 2026. Its amendment list ends with Delegated Regulation (EU) 2025/2003 and Delegated Regulation (EU) 2026/1405 of 26 June 2026. The second act corrects certain language versions. Its text was not read, so whether it touches the English version is unknown. The 14 September act is not in that list.

- 02021R0821-20260921, http://publications.europa.eu/resource/cellar/14ce2965-b119-11f1-b9e5-01aa75ed71a1.0002.03/DOC_1

**Entries.** These come from the Commission's Change Note Summary, which says it has no force in law. The PDF's table columns extract out of line, so rows were matched by their position on the page. Check the table visually before relying on it, and compare against the act once published.

- **Source:** https://circabc.europa.eu/rest/download/109c4290-bcf5-4fc1-aee4-f33946722dfb (the Commission page links the same document through its CIRCABC details URL)

| Entry | Change listed | Meaning for T6 |
|---|---|---|
| 9A012 | Only 9A012.a. Tech. Notes 2: editorial change (abbreviation formatting) | No parameter change listed |
| 9A112 | Not listed | No change listed |
| 5A002 N.B. | Cross-references to software and technology in 7D005 and 7E001 deleted | Cross-reference change |
| 5A002.a. Note 2 g. and Note 2 i.2.a. | Editorial change (abbreviation formatting) | No substantive change listed |

Related rows: 5D002.c.1. N.B. gains a cross-reference to 7D005, and 5E002.a. N.B. gains one to 7E001. The note lists Wassenaar, Australia Group and NSG as sources, and does not name the MTCR.

**Text of the entries in the 21 September 2026 consolidated version (read).**

- 9A012.a. needs design for controlled flight out of the direct natural vision of the operator, plus one of two limbs. One limb is endurance of at least 30 minutes and under 1 hour, with design for take-off and stable controlled flight in gusts at or above 46,3 km/h (25 knots). The other is endurance of 1 hour or more. Endurance is calculated for ISA conditions (ISO 2533:1975) at sea level in zero wind.
- 9A112.a. reads "capable of a range of 300 km". 9A112.b. needs autonomous flight control and navigation, or controlled flight out of direct vision by a human operator, combined with an aerosol dispensing system over 20 litres, incorporated or designed for.

## 3. Dates

### Cyber Resilience Act, Regulation (EU) 2024/2847

**Status: confirmed official.** Article 71(2) says the Regulation applies from 11 December 2027, Article 14 from 11 September 2026, and Chapter IV (Articles 35 to 51) from 11 June 2026. Article 69(3) applies Article 14 to products placed on the market before 11 December 2027.

- http://publications.europa.eu/resource/cellar/21b7d4eb-a6e2-11ef-85f0-01aa75ed71a1.0006.01/DOC_1 (OJ L, 2024/2847, 20.11.2024)
- ELI: http://data.europa.eu/eli/reg/2024/2847/oj

Limits of this check: two corrigenda exist, 32024R2847R(02) and R(04), and neither could be fetched. A title search and the consolidated-version list showed no act changing these dates, but that is not exhaustive.

### Digital Omnibus on AI, Regulation (EU) 2026/1744

**Status: confirmed official.** Regulation (EU) 2026/1744 of 8 July 2026 was published in OJ L on 24.7.2026 and amends Regulations 2024/1689, 2018/1139 and 2023/1230. It enters into force on the third day after publication, which is 27 July 2026.

- http://publications.europa.eu/resource/cellar/b459c07f-86fb-11f1-bf5e-01aa75ed71a1.0006.01/DOC_1
- ELI: http://data.europa.eu/eli/reg/2026/1744/oj (as given on a secondary page, following the OJ pattern)

| Date | What applies, as amended |
|---|---|
| 27 July 2026 | Articles 102 to 110 of the AI Act |
| 2 December 2026 | Article 5(1) points (ba), (bb), and Article 5(1a) and (1b). Also the Article 111(4) deadline for Article 50(2), for systems placed on the market before 2 August 2026 |
| 2 December 2027 | Chapter III, Sections 1 to 3, except Article 6(5), for Article 6(2) and Annex III systems |
| 2 August 2028 | The same sections for Article 6(1) and Annex I systems |
| 2 August 2030 | Article 111(2), high-risk systems intended for use by public authorities |

### German product liability act

**Status: confirmed official.** The Gesetz zur Modernisierung des Produkthaftungsrechts und zur Änderung weiterer Vorschriften is dated 22 October 2026 and was published on 27 October 2026 as BGBl. 2026 I Nr. 321.

- https://www.recht.bund.de/bgbl/1/2026/321/VO.html
- https://www.recht.bund.de/bgbl/1/2026/321/regelungstext.pdf?__blob=publicationFile&v=1
- https://www.recht.bund.de/eli/bund/bgbl-1/2026/321

Article 17 sets the dates. The act enters into force on 9 December 2026, except Articles 2 and 5 to 16, which enter into force on the day after promulgation. That is 28 October 2026 by calculation.

The new § 23 keeps the 1989 act for products placed on the market or put into operation up to and including 8 December 2026. The new act is in Article 1. Article 2 changes the 1989 act and contains the text that it expires on 9 December 2026.

The BMJV FAQ page still describes a draft and is out of date on status. Do not cite it for that: https://www.bmjv.de/SharedDocs/FAQ/DE/FAQ_Database/Produkthaftung/FAQ-Produkfthaftung-Liste.html

### RED Delegated Regulation (EU) 2026/339

**Status: confirmed official.** The act is dated 16 February 2026 and was published in OJ L on 29.4.2026. Article 1 repeals Delegated Regulation (EU) 2022/30 with effect from 11 December 2027. Article 2 sets entry into force on the twentieth day after publication, which is 19 May 2026 by calculation.

Recital 5 keeps market surveillance for equipment placed on the market from 1 August 2025 to 10 December 2027.

- http://publications.europa.eu/resource/cellar/d8611ecc-4364-11f1-8095-01aa75ed71a1.0006.01/DOC_1
- ELI: http://data.europa.eu/eli/reg_del/2026/339/oj

## 4. Remote ID on a privately built A3 drone in Germany

**Short answer:** the EU operating text sets no Remote ID condition on a privately built drone in A3, unless a geographical zone requires one. That is this check's own reading of the text. No LBA or dipul page was found that says so directly, so put the question to the LBA.

**EU text: confirmed official.** Source: Regulation (EU) 2019/947, consolidated 1 May 2025, the latest version listed by the SPARQL query.

- http://publications.europa.eu/resource/cellar/709b3112-2aa3-11f0-8a44-01aa75ed71a1.0006.03/DOC_1

What the text says:

- **Definition, Article 2(16):** a privately built UAS is assembled or manufactured for the builder's own use. UAS assembled from parts placed on the market as a single ready-to-assemble kit are excluded.
- **A3, UAS.OPEN.040(4):** point (a) allows a privately built UAS with MTOM including payload under 25 kg and states no Remote ID condition. Points (c) and (d) do require active and updated direct remote identification for class C2 and C3.
- **Pre-flight check, UAS.OPEN.060:** the remote pilot checks direct remote identification "if applicable".
- **Zones, Article 15(1)(d):** Member States may limit a geographical zone to UAS with certain technical features, in particular remote identification or geo-awareness.
- **Marking, Article 14(5) and (8):** the operator registers, and displays the registration number on the aircraft where paragraph 5 applies. For the open category that covers aircraft of 250 g or more, or with a personal-data sensor unless compliant with Directive 2009/48/EC.

**EASA: confirmed official, but dated or general.**

- A December 2020 livestream Q&A says privately built drones need an e-ID when operating where the EASA State mandates it. This fits the reading above but is old and is not a legal text: https://www.easa.europa.eu/en/downloads/123576/en
- A current page says all open-category drones, "with limited exceptions", need a remote identification system. It does not list the exceptions. Its table has privately built rows, and the extract read showed no Remote ID item in them: https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones
- The EASA FAQ says the registration number goes into the Remote ID system "If the drone has this function": https://www.easa.europa.eu/en/the-agency/faqs/open-category

These pages conflict in tone. The regulation text governs.

**Germany: LBA and dipul do not address the point on the pages read.**

- dipul says Remote ID is mandatory in the specific category, and in the open category for classes C1, C2, C3, C5 and C6. It does not mention privately built drones on that page: https://www.dipul.de/homepage/en/aktuelle-meldungen/existing-drones-standard-scenarios-market-surveillance-new-in-2024/
- LBA says privately built UAS need no C class and may fly only in A1 (under 250 g) or A3. That page does not mention Remote ID: https://www.lba.de/DE/Drohnen/Marktueberwachung/Bestands_UAS/Bestands_UAS.html
- The LBA FAQ page gives the mass limits and has no Remote ID text: https://www.lba.de/DE/Drohnen/FAQ/01_FAQ_Allgemein/FAQ_node.html
- The dipul open category page shows "C2, C3, C4 or privately built" in A3 and has no Remote ID text: https://www.dipul.de/homepage/en/information/categorizing-drone-operations/open-category/

**Unofficial lead: confirmed unofficial, weak.** A search summary described a forum post quoting the LBA as saying a homebuilt drone need not broadcast the operator number but must display it. The forum page returned HTTP 403, so the quote was not seen: https://www.drohnen-forum.de/index.php/Thread/65056-Remote-ID-Sammelthread/?pageNo=2

**Not checked:** whether any German geographical zone or national rule requires Remote ID under Article 15(1)(d).

## What this changes in T6.yaml

These are notes for the reviewer. T6.yaml was not edited.

| T6.yaml line | Note |
|---|---|
| 117, 284 | The source gap is closed. Scenario cues can come from Annex 2 above. Author cues against the PDF wording, and keep them original |
| 181 | The seven elements match the official headings |
| 215 | 9A012.a matches the 21 Sep 2026 consolidated text |
| 219 | T6 says "range of 300 km or more". The text says "capable of a range of 300 km" |
| 322 | The example header says "Annex I as of 2025/2003". The consolidated list now also shows 2026/1405. Keep the state-your-version habit, and expect the 14 Sep act to change it |
| 509, 972 | 2026/339 can move from snippet to read in the OJ |
| 907 | CRA dates confirmed against Articles 69 and 71 |
| 1067 | The product liability date is consistent with § 23. The AI Act dates are confirmed |
| 1162 | 2026/1744 can move from snippet to read in the OJ |
| 1164 | The Article 111(4) deadline of 2 Dec 2026 is confirmed |

The UAS skill sits in T4 (`robo.uav.ops-eu`). T4.yaml was not checked in this pass.

## Updates after the AI review, 2 November 2026

- T4 now follows section 4 on Remote ID. LuftVO section 21h(3) has no Remote ID condition. This remains a reading of the text, so the LBA question stays open.
- Both CRA corrigenda were read and neither changes a date.
- 2026/1405 does not concern the English text.
- The T6 line numbers in the table above are out of date, because T6.yaml was edited after this check.

## T4 update, 3 Nov 2026

Added by the T4 human-review research pass. Rows above are unchanged. This is research, not legal advice.

| # | Item | Status |
|---|---|---|
| 4c | German statute text on Remote ID: LuftVO section 21h, read again on 3 Nov 2026, has no Remote ID condition in any listed zone. Section 21h(4) lets the ministry or a federal authority it names set further zones | Confirmed official. The page shows no as-of date |
| 4d | EASA guidance on privately built: GM1 Article 2(16) (ED Decision 2022/002/R) counts assembly from parts or sub-assemblies sold separately as privately built, and a ready-to-assemble kit as not. It says nothing on Remote ID or on parts bought from one seller | Confirmed official (EASA Easy Access Rules, June 2026 revision) |
| 4e | EASA open-category FAQ: operator number goes into the Remote ID system only if the drone has one; privately built drones must display the number | Confirmed official, but FAQ, not law |
| 4f | Amendments to 2019/947 after the 1 May 2025 consolidation | None found. A SPARQL query on 3 Nov 2026 lists amending acts up to 2024/1110 and 2025/1130 (the latter for 2019/945); the latest consolidated 2019/947 is still 20250501 |
| 4g | Insurance proof: LuftVZO section 106(2) requires the insurer's confirmation to be carried; section 108(1) no. 5(e) with LuftVG section 58(1) no. 10 makes not carrying it an offence, up to 50,000 euro (section 58(3)). Drones are aircraft under LuftVG section 1(2) | Confirmed official |
| 4h | SORA in the EU AMC: Table 14 of the annex to ED Decision 2025/018/R lists 17 OSOs, the same as JARUS SORA 2.5. A corrigendum of 12 Dec 2025 renames the 2019/947 part "Issue 1, Amendment 4" | Confirmed official |
| 4i | SRD on board a drone: Decision 2006/771/EC (consolidated 23 Jan 2025) and BNetzA Vfg. 91/2025 contain no aircraft exclusion. ERC/REC 70-03 (Oct 2026) applies on board aircraft unless excluded elsewhere, and points to CEPT FM(23)034 Annex 32, which lists 433 MHz and 863 to 870 MHz as usable for non-professional UAS | Confirmed official |
| 4b | German statement on Remote ID for privately built A3 drones | Still not found. Needs the LBA's written answer (draft inquiry in `reviews/human-review-T4-2026-11-03.md`) |

Sources:

- LuftVO section 21h: https://www.gesetze-im-internet.de/luftvo_2015/__21h.html
- GM1 Article 2(16): https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-unmanned-aircraft-systems?erules-id=ERULES-1963177438-19497
- EASA FAQ, open category: https://www.easa.europa.eu/en/the-agency/faqs/open-category
- LuftVZO sections 106 and 108, LuftVG sections 1, 43 and 58: https://www.gesetze-im-internet.de/luftvzo/__106.html, https://www.gesetze-im-internet.de/luftvzo/__108.html, https://www.gesetze-im-internet.de/luftvg/__58.html
- Annex to ED Decision 2025/018/R, page 44: https://www.easa.europa.eu/en/downloads/142514/en; corrigendum: https://www.easa.europa.eu/en/downloads/142969/en
- 2006/771/EC consolidated 23.01.2025: http://publications.europa.eu/resource/cellar/8aba10b8-f90f-11ef-b7db-01aa75ed71a1.0008.03/DOC_1
- Vfg. 91/2025: https://www.bundesnetzagentur.de/DE/Fachthemen/Telekommunikation/Frequenzen/Allgemeinzuteilungen/_DL/vfg91_2025.pdf
- FM(23)034 Annex 32: https://efis.cept.org/documents/79124

T4.yaml was checked against section 4 in this pass. `ops-eu` and `ops-legal-route` follow it, and `ops-legal-route` now also cites GM1 Article 2(16). The last line of "What this changes in T6.yaml" ("T4.yaml was not checked in this pass") refers to the 2 Nov check only.

## T6 update, 3 Nov 2026

Added by the T6 human-review research pass. Rows above are unchanged. This is research, not legal advice. Details and reasoning are in `reviews/human-review-T6-2026-11-03.md`.

| # | Item | Status |
|---|---|---|
| 2e | C(2026)6323 in the OJ? | Still not found. SPARQL on 3 Nov 2026: no work from 1 Sep 2026 with "dual-use" or "2021/821" in its English title except the consolidated text 02021R0821-20260921, and no 32026R act dated 14 Sep 2026 on dual-use. The index holds works dated up to 30 Oct 2026. BAFA's Güterlisten page still says the act is expected to take effect from November 2026 |
| 3e | Product liability start date | Confirmed official. Directive 2024/2853 Art 2(1) says "after 9 December 2026", but Art 21 repeals Directive 85/374 "with effect from 9 December 2026" and keeps it only for products placed "before that date" (also recital 63). The German act (BGBl. 2026 I Nr. 321) keeps the 1989 act for products placed up to and including 8 Dec 2026 (§ 23) and enters into force on 9 Dec 2026 (Art. 17(1) of the act, "Inkrafttreten"). Reading: 9 Dec 2026 is the first day of the new rules; there is no gap in German law |
| 3f | GDPR Art 30(5) amendment | Not adopted. COM(2025) 501 (procedure 2025/0130(COD), Omnibus IV) is "awaiting Parliament's position in 1st reading" on OEIL; the committee approved the agreed text on 2 Jul 2026, indicative plenary 23 Nov 2026. No amending act and no new consolidated 2016/679 in the SPARQL index. Art 30(5) still reads "fewer than 250 persons" |
| 3g | CRA harmonised standards | None cited in the OJ. SPARQL found no implementing decision with "2024/2847" in its title since Dec 2024 (only corrigenda, 2025/1535, 2025/2392, 2026/881). So Art 27(1) gives no presumption from any standard today |
| 5a | § 9 AWV scope | Confirmed official (gesetze-im-internet.de, text shown with the amendment of 14 Oct 2026). Unlisted goods for a nuclear facility (Category 0 sense) in Algeria, Iraq, Iran, Israel, Jordan, Libya, North Korea, Pakistan or Syria: licence if BAFA informs, duty to tell BAFA if the exporter knows. Not within the scope of Arts 4 and 10 of 2021/821; not for orders up to EUR 5,000 except software and technology (§ 9(3)). § 9(4) extends Art 5(2) sentences 1 and 2 to knowledge gained outside due diligence |
| 5b | Sonstige Auskunft | BAFA Merkblatt section 12 offers a Nullbescheid or a "Sonstige Auskunft" for doubts, and calls only the Nullbescheid "rechtsverbindlich". It says nothing on the Auskunft's force. Under VwVfG § 35 a binding act must regulate a single case with external legal effect, and § 38 requires writing for a promise of a future act. Best reading: an Auskunft is information, not a decision. Not confirmed by BAFA in writing |
| 5c | Regulation 1182/71 | Confirmed official (OJ L 124, 8.6.1971): Art 3(1) hour of event not counted; Art 3(2)(a) hour periods; Art 3(3) weekends and holidays included; Art 3(4) day periods ending on a non-working day run to the next working day. Art 1 names acts of the Council or Commission |

Sources:

- § 9 AWV: https://www.gesetze-im-internet.de/awv_2013/__9.html
- BGBl. 2026 I Nr. 321: https://www.recht.bund.de/bgbl/1/2026/321/regelungstext.pdf?__blob=publicationFile&v=1
- Directive 2024/2853: http://publications.europa.eu/resource/cellar/10bdc8d8-a54e-11ef-85f0-01aa75ed71a1.0006.01/DOC_1
- OEIL 2025/0130(COD): https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0130(COD)
- Regulation 1182/71: http://publications.europa.eu/resource/cellar/062fba91-9703-427a-8b77-f7fe0bcbd8b4.0008.01/DOC_1
- VwVfG §§ 35 and 38: https://www.gesetze-im-internet.de/vwvfg/__35.html, https://www.gesetze-im-internet.de/vwvfg/__38.html
- BAFA Merkblatt, section 12: https://www.bafa.de/SharedDocs/Downloads/DE/Aussenwirtschaft/afk_merkblatt_exportkontrolle_bafa.pdf?__blob=publicationFile&v=3
- SPARQL endpoint: https://publications.europa.eu/webapi/rdf/sparql
