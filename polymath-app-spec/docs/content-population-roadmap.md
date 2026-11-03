# Content population roadmap (0 → MVP pool)

Status: v1.0, 1 Nov 2026. Planning only. Counts from doc 13 PA-7 and backlog founder-template tasks.

## What “zero” means

| Already in git | Not in DB / not served yet |
|----------------|----------------------------|
| `content/mvp-skill-graph.yaml` (389 authored skills + 4 stubs; spine keys wired) | Foundation mostly `draft`; spine stubs never served until promoted |
| `content/project-ladder.yaml` (L0–L5, `status: draft`) | Evidence automation later (D7) |
| `content/sample-problem-templates/` (7 examples) | Production dir `content/templates/` (create in app repo) |
| Prompts in `content/prompts/` | Verified `item_templates` / runtime `items` |

## Milestone targets

| Stage | Verified templates | Active skills | Projects |
|-------|-------------------|---------------|----------|
| M0 exit | **1** | any one with numeric/MC/symbolic grader | synced, not required for demo |
| Lean / M1 | **30** (40 with BL-0180) | **15–20** reviewed (BL-0067) | manual log + guided blink (BL-0179, BL-0183) |
| M2 | **~50** (+ BL-0105: code, SPICE, assessment) | expands with sandbox | — |
| M3 | + BL-0138 drills/debug/transfer start | module promotions | L0 golden + accepted evidence |
| M4 stretch | + ~25 (BL-0158, cut tier 3) | transfer set | L3–L4 support |
| Full MVP slice [P] | **~70–95** total | first walk, not all 142 nodes | L0–L5 calibrated |

Rule: **two verified templates** per gated skill when possible (mastery, diagnostic)—doc 07 section 2.2. Lean slice uses ~2 templates × 15 skills ≈ 30.

## BL-0067 lean skill slice (19 keys, locked)

Machine-readable list: **`content/lean-skill-slice.yaml`**. All keys exist in `mvp-skill-graph.yaml`; graph validator passes; hard prerequisites for these skills are covered by earlier keys in the slice or by graph roots (`lab-safety-esd`, `schematic-reading`, `order-of-operations`).

| Group | Skill keys |
|-------|------------|
| Phase -1 subset (8) | `math.alg.order-of-operations`, `math.alg.units-and-prefixes`, `math.alg.solve-linear`, `math.alg.rearrange-formulas`, `elec.dc.ohms-law`, `elec.dc.power-energy`, `elec.dc.series-parallel`, `elec.dc.voltage-divider` |
| Math extension (5) | `math.alg.ratios-proportions`, `math.alg.linear-functions`, `math.alg.systems-2x2`, `math.alg.exponents-roots`, `math.alg.quadratics` |
| Measurement (2) | `elec.meas.lab-safety-esd`, `elec.meas.schematic-reading` |
| Elec DC extension (4) | `elec.dc.charge-current-voltage`, `elec.dc.kirchhoff-laws`, `elec.dc.nodal-analysis`, `elec.dc.thevenin-norton` |

Target **~2 verified templates per skill** where mastery/diagnostic rules apply → **30 templates** (BL-0065 + BL-0066) covers the highest-traffic skills first; not every key needs two templates before BL-0060 if the pool serves the active frontier (watch go/no-go **G7**).

## Template backlog mapping

| Backlog | Count | When |
|---------|-------|------|
| BL-0031 / first template | 1 | M0 demo |
| BL-0065 | 15 math | Before / parallel BL-0060 first daily use |
| BL-0066 | 15 elec DC | After BL-0065 |
| BL-0180 (optional) | +10 | After go/no-go if G7 pool pressure |
| BL-0105 | +20 | D3 + M2 (not during lean gate) |
| BL-0138 | project-related | D7 / M3 |
| BL-0158 | ~25 | M4 stretch |

## Population sequence (factory)

1. Ship **content pipeline** (sync, lint, fuzz, serve gate)—see `factory-wave-manifest.md` waves 2–4.
2. **M0:** one verified template (clone from `tpl.elec.voltage-divider-vout`).
3. **BL-0067:** freeze skill list; mark slice skills in PR description.
4. **BL-0065 + BL-0066:** 30 templates; log in `content/REVIEW-LOG.md`.
5. **Dogfood** → **BL-0181** scorecard.
6. Post-go: one D-group; then M2+ template waves per roadmap table above.
7. **Graph/modules:** promote skills to `verified` module-by-module (doc 05 section 10), not all 142 at once.
8. **Projects:** golden builds update YAML; spine tracks (doc 15) stay out of sync until post-first-walk L1.

## Empty pool / repeats

If go/no-go **G7** fails: add templates (BL-0180 or targeted tpl.*) before new app features—not new skills at random.
