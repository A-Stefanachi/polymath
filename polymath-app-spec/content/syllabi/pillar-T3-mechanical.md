# Pillar Mechanical design (T3)

Status: v1.0, 1 Nov 2026. **Spine planning only** — ships after first-walk L1 + go/no-go (doc 15, `00d` §8). Not loaded by v1 `content:sync`. Module plan: `content/syllabi/spine-module-plan.yaml`.

**Track key:** `mechanical` · **Order:** 3 · **Prerequisites:** foundation; T3 modules come before T4, and the L9 build comes after L8

## Competence artifact

Accepted L9: drawing + CAD assembly + fabricated parts + fit + predicted vs measured deflection and first mode, compared with a flight FFT.

## Primary ladder project(s)

L9 — prj.L9.custom-frame-cad

## Pillar purpose

- Parametric CAD, tolerances, assemblies.
- Print/CNC trade-offs and DFM.
- Hand structural analysis, fatigue, bolted joints and vibration modes.
- Mass/CG budgeting for UAV integration.

## Pillar totals [P]

| Node | Skills | Core hours (sum est_minutes) | Modules |
|------|--------|------------------------------|---------|
| `matl` | 7 | 3.7 h | 2 |
| `mech` | 24 | 14.8 h | 5 |
| **Track total** | **31** | **18.5 h** | **7** |

**Table note:** Core hours sum `est_minutes` from this syllabus plan (minimum contact-time sketch). The planning band above includes projects, rework, and review overlap [P].

Planning band (projects/review overlap): **50–90 core hours + L9 project [P]**

## Promote from MVP stubs

- `mech.cad.parametric-sketch`
- `matl.mfg.pcb-fabrication`

## New module keys (authoring) [P]

- `mech.cad.assemblies`
- `mech.tol.fit`
- `matl.print.settings`

## Graders & evidence [P]

CAD manifest checklist + human_review; FEA not auto-graded in first ship.

## Boundaries

No certified structural sign-off.

## Discipline overview

### `matl`

7 skills across modules: `matl.select`, `matl.mfg`.

### `mech`

24 skills across modules: `mech.cad`, `mech.cad.assemblies`, `mech.draw`, `mech.struct`, `mech.tol`.

## Module syllabi

### `mech.cad` — Parametric CAD workflow

**Order:** 1 · **Node:** `mech` · **Skills:** 3 · **Core:** ~1.6 h [P]

**Outcomes (after this module):**
- Build constrained sketches and parametric features for a frame arm or bracket.
- Export STEP/STL with named parameters documented.

**Evidence path:** CAD manifest checklist + human_review (capability-tracks grading_note)
**Projects (ladder touch):** prj.L9.custom-frame-cad
**Checkpoints / assessment:** Checklist before L9 credit
**Hard task (unaided):** From a drawing, model a part in 60 minutes, then change three driving parameters with no rebuild failures.
**Confusable set:** parametric-vs-direct-edit
**Template plan [P]:** ~10 templates + manifest grader [P]

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `mech.cad.constraints-dof` | Sketch constraints and DOF | L0 | 25 | yes | multiple_choice, exact_numeric… | needs_human_review |  |
| `mech.cad.extrude-patterns` | Extrude, mirror and pattern features | L1 | 30 | no | exact_numeric, human_review | needs_human_review |  |
| `mech.cad.parametric-sketch` | Parametric CAD sketching | L0 | 40 | no | multiple_choice, exact_numeric… | needs_human_review |  |

### `mech.cad.assemblies` — Assemblies and integration

**Order:** 2 · **Node:** `mech` · **Skills:** 3 · **Core:** ~1.3 h [P]

**Outcomes (after this module):**
- Mate motors, standoffs and FC stack in an assembly with collision checks.
- Document mass properties export for CG budgeting [P].

**Evidence path:** L9 photo + assembly manifest
**Projects (ladder touch):** prj.L9.custom-frame-cad; fits on prj.L8.kit-quad-maiden stack
**Checkpoints / assessment:** human_review rubric on fit and clearance
**Hard task (unaided):** Predict mass within 5% and CG within 3 mm, then measure both on the real vehicle.
**Confusable set:** none
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `mech.cad.assemblies` | Assembly mates and BOM from CAD | L1 | 35 | no | exact_numeric, human_review | needs_human_review |  |
| `mech.cad.export-step-stl` | Export STEP/STL for fab handoff | L1 | 20 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `mech.cad.mass-cg-export` | Mass and CG from CAD model | L1 | 25 | no | exact_numeric, human_review | needs_human_review |  |

### `mech.draw` — Engineering drawings and tolerancing

**Order:** 3 · **Node:** `mech` · **Skills:** 3 · **Core:** ~2.0 h [P]

**Outcomes (after this module):**
- Write a drawing that an outside shop could inspect.
- Choose datums from function.
- Use ISO GPS by default and recognise ASME differences.

**Evidence path:** Drawing of the L9 motor mount reviewed by an outside reader
**Projects (ladder touch):** prj.L9.custom-frame-cad
**Checkpoints / assessment:** Drawing checklist plus numeric fit items
**Hard task (unaided):** Write a drawing for a motor mount that an outside shop could inspect, with datums tied to function.
**Confusable set:** iso-gps-vs-asme-y14-5
**Template plan [P]:** ~10 templates; standards are paid, so write from the purchased text

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `mech.draw.drawings-datums` | Drawings, views and datums | L1 | 45 | no | exact_numeric, human_review | needs_human_review |  |
| `mech.draw.fits-iso286` | ISO fits and limits | L1 | 35 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `mech.draw.iso-gps` | ISO GPS basics and ASME differences | L1 | 40 | no | multiple_choice, exact_numeric… | needs_human_review |  |

### `matl.select` — Materials selection

**Order:** 4 · **Node:** `matl` · **Skills:** 3 · **Core:** ~1.9 h [P]

**Outcomes (after this module):**
- Derive a material index from function, objective and constraints.
- Treat CFRP as anisotropic plate.
- Design for printed polymer anisotropy, heat and creep.

**Evidence path:** Written selection for the L9 arm with derived index
**Projects (ladder touch):** prj.L9.custom-frame-cad
**Checkpoints / assessment:** Numeric index items
**Hard task (unaided):** Derive the index for a stiffness-limited, mass-minimum arm, pick a material, and defend it against a process limit.
**Confusable set:** strength-vs-specific-stiffness
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `matl.select.ashby-indices` | Ashby material indices | L1 | 45 | no | symbolic_equivalence, exact_numeric… | needs_human_review |  |
| `matl.select.cfrp-plate` | CFRP plate behaviour and handling | L1 | 35 | no | multiple_choice, exact_numeric… | needs_human_review |  |
| `matl.select.printed-polymers` | Printed polymers: anisotropy, heat and creep | L1 | 35 | no | multiple_choice, exact_numeric | needs_human_review |  |

### `mech.struct` — Structures and vibration

**Order:** 5 · **Node:** `mech` · **Skills:** 11 · **Core:** ~7.9 h [P]

**Outcomes (after this module):**
- Find loads, stresses and deflections by hand for arms and brackets.
- Separate stiffness failures from strength failures.
- Predict a frame's first vibration mode and check it with a tap test.

**Evidence path:** Hand calculation compared with measured deflection and tap-test frequency on the L9 frame
**Projects (ladder touch):** prj.L9.custom-frame-cad
**Checkpoints / assessment:** Unaided numeric set before L9 credit
**Hard task (unaided):** Size an arm unaided for stiffness, strength and first mode, measure clamp compliance on a reference bar, then predict deflection within 15% and frequency within 10%.
**Confusable set:** stiffness-vs-strength, static-vs-fatigue-failure
**Template plan [P]:** ~16 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `mech.struct.beam-bending` | Beam bending and section stiffness | L1 | 60 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `mech.struct.bolted-joint-design` | Numeric bolted joint design | L1 | 60 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `mech.struct.bolted-joints` | Bolted joints, preload and loosening | L1 | 40 | no | multiple_choice, exact_numeric… | needs_human_review |  |
| `mech.struct.fatigue-concentration` | Stress concentration and fatigue | L1 | 45 | no | multiple_choice, human_review | needs_human_review |  |
| `mech.struct.fatigue-design` | Fatigue design with Goodman and Marin factors | L1 | 60 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `mech.struct.flight-fft-compare` | Compare frame modes with a flight FFT | L1 | 40 | no | measurement_check, exact_numeric | needs_human_review |  |
| `mech.struct.safety-factors` | Load cases, crash and safety factors | L1 | 35 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `mech.struct.statics-loads` | Free-body diagrams and load paths | L1 | 30 | no | exact_numeric, multiple_choice | needs_human_review |  |
| `mech.struct.stress-strain` | Stress, strain and material properties | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `mech.struct.torsion-sections` | Torsion and open versus closed sections | L1 | 35 | no | exact_numeric, multiple_choice… | needs_human_review |  |
| `mech.struct.vibration-modes` | Natural frequency, resonance and rotor excitation | L1 | 40 | no | exact_numeric, measurement_check | needs_human_review |  |

### `mech.tol` — Tolerances and fit

**Order:** 6 · **Node:** `mech` · **Skills:** 4 · **Core:** ~2.0 h [P]

**Outcomes (after this module):**
- Specify print/CNC tolerances for arms and motor mounts.
- Plan shim/spacer strategies for stack height alignment.

**Evidence path:** Tolerance table on L9 submission
**Projects (ladder touch):** prj.L9.custom-frame-cad
**Checkpoints / assessment:** Numeric tolerance stack item
**Hard task (unaided):** Predict a stack distribution, then measure ten printed parts and explain the difference.
**Confusable set:** clearance-vs-interference
**Template plan [P]:** ~8 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `mech.tol.fastener-stack` | Standoff stack-up and vibration awareness | L1 | 25 | yes | human_review, multiple_choice… | needs_human_review |  |
| `mech.tol.fit` | Clearance and interference fits for prints | L1 | 30 | yes | exact_numeric, multiple_choice | needs_human_review |  |
| `mech.tol.print-shrink` | FDM shrink and hole tolerance practice | L1 | 25 | no | measurement_check, exact_numeric… | needs_human_review |  |
| `mech.tol.stack-analysis` | Worst-case and RSS stacks with measured data | L1 | 40 | no | exact_numeric, measurement_check | needs_human_review |  |

### `matl.mfg` — Fabrication processes

**Order:** 7 · **Node:** `matl` · **Skills:** 4 · **Core:** ~1.8 h [P]

**Outcomes (after this module):**
- Choose print vs CNC vs ordered PCB for a part class.
- Apply DFM rules from a fab house checklist.

**Evidence path:** L9 material/process note; L10 fab quote checklist [P]
**Projects (ladder touch):** prj.L9.custom-frame-cad; prj.L10.pdb-4layer
**Checkpoints / assessment:** MC on DFM rules
**Hard task (unaided):** Predict failure location and load for three print orientations, then break the coupons.
**Confusable set:** none
**Template plan [P]:** ~10 templates

**Skills:**

| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |
|-----------|-------|------|-----|-------|---------|-------|------|
| `matl.mfg.cnc-basics` | CNC vs print trade-offs for brackets | L1 | 25 | yes | multiple_choice, exact_numeric… | needs_human_review |  |
| `matl.mfg.pcb-fabrication` | PCB fabrication and DFM | L1 | 30 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `matl.print.orientation-strength` | Layer orientation vs strength | L1 | 20 | yes | multiple_choice, exact_numeric | needs_human_review |  |
| `matl.print.settings` | Slicer settings for functional prints | L1 | 30 | yes | multiple_choice, exact_numeric… | needs_human_review |  |

## Ladder skill map [P]

| Ladder | Terminal skills / modules |
|--------|---------------------------|
| L9 CAD frame | `mech.cad.parametric-sketch`, `mech.cad.assemblies`, `mech.tol.fit`, `mech.struct.vibration-modes` |
| L10 PDB | `matl.mfg.pcb-fabrication`, `elec.pcb.kicad-schematic-erc` |

## Sequencing notes

- Same pedagogy as foundation: verified templates, strict-unaided checkpoints, project credit caps (contract §7).
- Hardware phases: `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.
- Sketch projects: `content/extended-project-ladder-sketch.yaml`.
- Regenerate this file after editing `spine-module-plan.yaml` or promoting stubs in `mvp-skill-graph.yaml`.
