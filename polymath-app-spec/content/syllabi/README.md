# Capability pillar syllabi

Status: v1.0, 1 Nov 2026. **Curriculum planning** — complements `docs/05-skill-graph-and-curriculum-spec.md` and `content/capability-tracks.yaml`.

| Pillar | File | Track |
|--------|------|-------|
| T0 Foundation | [pillar-T0-foundation.md](pillar-T0-foundation.md) | `foundation` — full first walk (17 modules, 142 skills) |
| T1 Power & motion | [pillar-T1-power-motion.md](pillar-T1-power-motion.md) | `power-motion` — module syllabi from spine plan |
| T2 Control | [pillar-T2-control.md](pillar-T2-control.md) | `control` |
| T3 Mechanical | [pillar-T3-mechanical.md](pillar-T3-mechanical.md) | `mechanical` |
| T4 UAV / robo | [pillar-T4-robo.md](pillar-T4-robo.md) | `robo` |
| T5 Cloud twin | [pillar-T5-cloud-twin.md](pillar-T5-cloud-twin.md) | `cloud-twin` |
| T6 Governance | [pillar-T6-governance.md](pillar-T6-governance.md) | `governance` |

Spine module source (T1–T6): [spine-module-plan.yaml](spine-module-plan.yaml). Foundation (T0): [foundation-module-plan.yaml](foundation-module-plan.yaml). Planned spine keys not in the graph: [spine-planned-skills.yaml](spine-planned-skills.yaml).

Regenerate pillar markdown after graph or spine plan edits:

```bash
python3 reference/generate_pillar_syllabi.py
```

Lean slice cross-ref: `content/lean-skill-slice.yaml`.

Docs site (offline): `docs-site/assets/syllabi-data.js` is regenerated with the markdown bundle for `syllabi.html`.
