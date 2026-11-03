# Pillar Governance (T6)

Status: v1.0, 1 Nov 2026. **Spine planning only** — ships after first-walk L1 + go/no-go (doc 15, `00d` §8). Not loaded by v1 `content:sync`. Module plan: `content/syllabi/spine-module-plan.yaml`.

**Track key:** `governance` · **Order:** 6 · **Prerequisites:** foundation (parallel_ok with other tracks)

## Competence artifact

Checkpoint sets: export scenario MC + UAS ops ack + device threat model + CRA and CE checklist.

## Primary ladder project(s)

Module checkpoints (no single L6–L13 gate)

## Pillar purpose

- Export control literacy (EU Annex I awareness, workflow with counsel).
- Device threat modelling, zones/conduits, supply-chain/SBOM narrative.
- Dual-use product decomposition; defense integrator documentation habits.
- BOM costing and programme economics basics.
- EU product compliance: Cyber Resilience Act, CE marking, radio rules, product liability.

## Pillar totals [P]

| Node | Skills | Core hours (sum est_minutes) | Modules |
|------|--------|------------------------------|---------|
| `def` | 5 | 3.0 h | 1 |
| `econ` | 5 | 2.4 h | 1 |
| `prof` | 17 | 8.6 h | 4 |
| `sec` | 10 | 5.6 h | 2 |
| **Track total** | **37** | **19.6 h** | **8** |

**Table note:** Core hours sum `est_minutes` from this syllabus plan (minimum contact-time sketch). The planning band above includes projects, rework, and review overlap [P].

Planning band (projects/review overlap): **30–60 core hours [P]**

## Promote from MVP stubs

- `prof.law.export-control-literacy`
- `sec.hw.threat-modelling`
- `econ.cost.bom-costing`

## New module keys (authoring) [P]

- `def.export.scenarios`
- `sec.ot.zones`
- `prof.integrator.docs`
- `prof.eu`

## Graders & evidence [P]

MC/short-answer scenario items; rubric_llm with human sign-off; no legal advice.

## Boundaries

Literacy only; no weapons/EW enablement (NG-06, PRD). No evasion: design choices go to counsel, and structuring to sidestep a control is excluded.

## Discipline overview

### `def`

5 skills across modules: `def.export`.

### `econ`

5 skills across modules: `econ.cost`.

### `prof`

17 skills across modules: `prof.law`, `prof.integrator`, `prof.eu`, `prof.data`.

### `sec`

10 skills across modules: `sec.hw`, `sec.ot`.

## Module syllabi

### `prof.law` — Export-control literacy

**Order:** 1 · **Node:** `prof` · **Skills:** 6 · **Core:** ~3.0 h [P]

**Outcomes (after this module):**
- Recognise when a design file or technology may trigger export review.
- Describe workflow with counsel — no legal outcomes taught.

**Evidence path:** Scenario MC; governance-only tag (AC-SP-4)
**Projects (ladder touch):** none (parallel track)
**Checkpoints / assessment:** Scenario checkpoint set with ack
**Hard task (unaided):** Within 30 minutes of a red-flag scenario, write the hold decision and note to counsel, with facts, unknowns and what stays frozen.
**Confusable set:** dual-use-vs-munitions-list
**Template plan [P]:** ~10 scenario templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `prof.law.classification-workflow` | Classification workflow with counsel (process) | L0 | 30 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.law.compliance-programme` | One-person internal compliance programme | L0 | 30 | no | multiple_choice, human_review… | needs_human_review |  |
| `prof.law.de-eu-awareness` | DE/EU export awareness for integrators | L0 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.law.export-control-literacy` | Export-control literacy | L0 | 30 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.law.german-layer` | Ausfuhrverantwortlicher, Nullbescheid and BAFA practice | L0 | 35 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.law.stop-escalate-drill` | Stop, hold and escalate drill | L0 | 30 | no | multiple_choice, rubric_llm… | needs_human_review |  |

### `def.export` — Export control scenarios

**Order:** 2 · **Node:** `def` · **Skills:** 5 · **Core:** ~3.0 h [P]

**Outcomes (after this module):**
- Work through Annex I category literacy scenarios [P].
- Decompose products into controlled vs non-controlled elements.

**Evidence path:** Scenario MC only; no evasion content
**Projects (ladder touch):** none
**Checkpoints / assessment:** Module checkpoint before integrator docs module
**Hard task (unaided):** From a fictional spec, identify candidate entries, the parameters needing data, and what cannot be concluded without counsel.
**Confusable set:** none
**Template plan [P]:** ~12 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `def.export.classification-memo` | Classification memo on your own design | L1 | 60 | no | multiple_choice, human_review | needs_human_review |  |
| `def.export.general-notes` | General Notes and encryption tests | L1 | 40 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `def.export.product-decomposition` | Product decomposition for control lists | L0 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `def.export.scenarios` | Dual-use scenario decision exercises | L0 | 30 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `def.export.tech-data-sharing` | Technical data sharing red flags | L0 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |

### `sec.hw` — Embedded threat modelling

**Order:** 3 · **Node:** `sec` · **Skills:** 7 · **Core:** ~4.2 h [P]

**Outcomes (after this module):**
- Model assets, attackers and trust boundaries for your own device.
- Link threats to mitigations at literacy depth.

**Evidence path:** Threat model rubric on template device
**Projects (ladder touch):** optional cross-link L11 secure uplink
**Checkpoints / assessment:** human_review on threat model diagram
**Hard task (unaided):** Threat model L4 or L11, map it to EMB3D, and run a verification test for each top risk; an independent reviewer looks for the biggest miss.
**Confusable set:** threat-vs-vulnerability
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sec.hw.applied-crypto` | Applied crypto: AEAD, nonces and key hierarchy | L1 | 45 | no | multiple_choice, code_tests… | needs_human_review |  |
| `sec.hw.iot-baselines` | EN 303 645 and EN 18031 baselines | L0 | 30 | no | multiple_choice, human_review | needs_human_review |  |
| `sec.hw.key-lifecycle` | Key lifecycle from provisioning to end of life | L1 | 35 | no | multiple_choice, human_review | needs_human_review |  |
| `sec.hw.own-device-model` | Threat model your own L4 or L11 device | L1 | 45 | no | multiple_choice, human_review | needs_human_review |  |
| `sec.hw.sbom-basics` | SBOM and supply-chain narrative | L0 | 25 | no | multiple_choice, human_review | needs_human_review |  |
| `sec.hw.secure-boot-literacy` | Secure boot and signing literacy | L0 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `sec.hw.threat-modelling` | Threat modelling for devices | L0 | 45 | no | rubric_llm, human_review… | needs_human_review |  |

### `sec.ot` — OT zones and cloud backhaul

**Order:** 4 · **Node:** `sec` · **Skills:** 3 · **Core:** ~1.4 h [P]

**Outcomes (after this module):**
- Place device, edge and cloud into zones/conduits narrative [P].
- Relate to ISAGCA-style OT thinking without certifying.

**Evidence path:** Zone diagram checklist
**Projects (ladder touch):** prj.L11.telemetry-lakehouse (architecture slice)
**Checkpoints / assessment:** MC + checklist
**Hard task (unaided):** Draw zones and conduits for L11 with risk rationale, and defend one remote-maintenance path against a compromise scenario.
**Confusable set:** it-vs-ot-boundary
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `sec.ot.iec62443-product` | IEC 62443-4-1 and 4-2 for product builders | L0 | 30 | no | multiple_choice, human_review | needs_human_review |  |
| `sec.ot.remote-access` | Remote access and jump host patterns | L0 | 25 | yes | multiple_choice, rubric_llm | needs_human_review |  |
| `sec.ot.zones` | Purdue/zones and conduits for CPS | L0 | 30 | yes | multiple_choice, human_review | needs_human_review |  |

### `prof.integrator` — Defense integrator documentation

**Order:** 5 · **Node:** `prof` · **Skills:** 2 · **Core:** ~1.0 h [P]

**Outcomes (after this module):**
- Produce integrator-facing architecture and test evidence summaries.
- Maintain golden configuration discipline [P].

**Evidence path:** Rubric on documentation pack template
**Projects (ladder touch):** prj.L13.field-test-campaign
**Checkpoints / assessment:** rubric_llm + human sign-off
**Hard task (unaided):** A sceptical reviewer picks any claim, and you reproduce its evidence from the exact configuration within an hour.
**Confusable set:** none
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `prof.integrator.docs` | Integrator architecture and evidence pack | L1 | 35 | no | multiple_choice, rubric_llm… | needs_human_review |  |
| `prof.integrator.golden-config` | Golden vehicle/build configuration log | L1 | 25 | no | multiple_choice, human_review… | needs_human_review |  |

### `econ.cost` — Programme economics

**Order:** 6 · **Node:** `econ` · **Skills:** 5 · **Core:** ~2.4 h [P]

**Outcomes (after this module):**
- Build BOM cost with volume and assembly assumptions.
- Relate cost drivers to design choices on PDB and avionics [P].

**Evidence path:** Numeric BOM spreadsheet template
**Projects (ladder touch):** cross-link L10/L11 BOM notes
**Checkpoints / assessment:** Numeric BOM items
**Hard task (unaided):** From supplied quotes, model 100, 1k and 10k units with price, margin, peak cash need, and where a printed part should become moulded.
**Confusable set:** unit-cost-vs-nre
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `econ.cost.bom-costing` | Bill-of-materials costing | L1 | 30 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `econ.cost.evt-dvt-pvt` | EVT, DVT and PVT gates | L1 | 25 | no | multiple_choice, human_review | needs_human_review |  |
| `econ.cost.programme-nre` | NRE vs recurring cost literacy | L1 | 20 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `econ.cost.unit-economics` | Unit P&L, landed cost and cash model | L1 | 45 | no | exact_numeric, human_review | needs_human_review |  |
| `econ.cost.volume-scaling` | Volume scaling and MOQ effects | L1 | 25 | yes | exact_numeric, multiple_choice | needs_human_review |  |

### `prof.eu` — EU product compliance

**Order:** 7 · **Node:** `prof` · **Skills:** 6 · **Core:** ~3.1 h [P]

**Outcomes (after this module):**
- Recognise when the Cyber Resilience Act applies and what it requires.
- Plan vulnerability handling, an SBOM and a support period for a connected product.
- Map CE marking and radio rules to a wireless product, with counsel.

**Evidence path:** Scenario set plus a compliance checklist for the founder's own L11 device; not legal advice
**Projects (ladder touch):** prj.L11.telemetry-lakehouse (architecture slice)
**Checkpoints / assessment:** Scenario checkpoint with human sign-off
**Hard task (unaided):** Map which laws apply to your device with dates and evidence, then run a 72-hour reporting drill. Every date must cite an Official Journal source.
**Confusable set:** cra-vs-nis2, ce-marking-vs-certification
**Template plan [P]:** ~10 scenario templates; verify every date and scope against the Official Journal when authoring

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `prof.eu.applicability-map` | Applicability map for your own device | L1 | 45 | no | multiple_choice, human_review | needs_human_review |  |
| `prof.eu.ce-radio` | CE marking and radio equipment rules | L0 | 25 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.eu.cra-obligations` | Cyber Resilience Act scope and obligations | L0 | 30 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.eu.product-liability` | Product liability for hardware and software | L0 | 25 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.eu.reporting-drill` | Timed CRA 24 h, 72 h and 14 day drill | L1 | 35 | no | human_review, exact_numeric | needs_human_review |  |
| `prof.eu.vulnerability-handling` | Vulnerability handling and reporting duties | L0 | 25 | no | multiple_choice, human_review | needs_human_review |  |

### `prof.data` — Data and AI law

**Order:** 8 · **Node:** `prof` · **Skills:** 3 · **Core:** ~1.5 h [P]

**Outcomes (after this module):**
- Scope the Data Act for a connected product.
- Map personal data in telemetry under GDPR.
- Scope the AI Act, including where defence exclusions do not apply.

**Evidence path:** Annotated L11 data inventory; not legal advice
**Projects (ladder touch):** prj.L11.telemetry-lakehouse
**Checkpoints / assessment:** Scenario set with human sign-off
**Hard task (unaided):** Annotate L11's data inventory for owner, personal data, user access route, retention and export-controlled content.
**Confusable set:** exclusive-defence-vs-dual-use
**Template plan [P]:** ~8 scenario templates; check every date against the Official Journal

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `prof.data.ai-act` | AI Act literacy and AI risk management | L0 | 30 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.data.data-act` | Data Act scoping for connected products | L0 | 30 | no | multiple_choice, rubric_llm | needs_human_review |  |
| `prof.data.gdpr-telemetry` | GDPR for telemetry and location logs | L0 | 30 | no | multiple_choice, human_review | needs_human_review |  |

## Ladder skill map [P]

| Checkpoint bundle | Modules |
|-------------------|---------|
| Export + device security | `prof.eu.cra-obligations`, `prof.law.export-control-literacy`, `def.export.scenarios`, `sec.hw.threat-modelling`, `sec.ot.zones` |
| Integrator habits | `prof.integrator.docs`, `econ.cost.bom-costing` |

## Sequencing notes

- Same pedagogy as foundation: verified templates, strict-unaided checkpoints, project credit caps (contract §7).
- Hardware phases: `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.
- Sketch projects: `content/extended-project-ladder-sketch.yaml`.
- Regenerate this file after editing `spine-module-plan.yaml` or promoting stubs in `mvp-skill-graph.yaml`.
