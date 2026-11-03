# Lean build gate (factory and agents)

Status: v1.0, 1 Nov 2026. **Planning rule, not a contract change.** Binds automated build (dark factory) until the go/no-go task **BL-0181** completes with a recorded decision in `docs/CHANGELOG.md`.

## Rule

1. **Only `lean: true` tasks** in `backlog/backlog.yaml` may be implemented or merged until BL-0181 is closed with **Go**, **Continue lean**, or an explicit **scope-down** entry in `CHANGELOG.md`.
2. **Optional lean tasks** (`backlog.yaml` → `meta.lean_slice.optional_tasks`: BL-0117, BL-0118, BL-0178, BL-0179, BL-0180) run only when their trigger applies (project log need, pool empty / G7, etc.), not by default.
3. **Deferred groups D1–D9** (`lean: false`, `lean_phase: D*`) start only after BL-0181 **Go: extend**, and **one group at a time**, chosen by largest logged pain (`docs/00d-lean-slice-plan.md` section 8), never “what is fun to build.”
4. **Doc 15–17 / capability spine** content does not add backlog tasks or contract enums until first-walk L1 is evidenced and the go/no-go passes (PRD section 1.5).

## Exceptions

- Fixing spec validators, security, or **SM-06** (unverified serve) bugs in already-merged code—minimal diff, no new FR surface.
- **Phase -1** (BL-0182) and blink prep (BL-0183) run in parallel with early M0; they are not app code.

## Release checklist (BL-0181)

When four weeks of micro-runner use are complete, run the scorecard in `00d` section 8, log results in `CHANGELOG.md`, then either finish optional lean work, pick **one** D-group, or stop per the table in `00d`.

## References

- Lean task list: `python3 -c "import yaml; ..."` or `docs/factory-wave-manifest.md`
- Factory workflow: `docs/content-authoring-runbook.md`, `CLAUDE.md` section 7–8
