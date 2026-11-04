# Factory wave manifest (lean slice only)

Status: v1.1, 4 Nov 2026 (v1.0 of 1 Nov had 83; BL-0196 and BL-0197 added by 00a J2 and J3). **85 tasks** with `lean: true` until **BL-0181**. Gate: `docs/lean-build-gate.md`. Do not start `lean: false` / D1–D9 while the gate is closed.

Commands assume the **app monorepo** exists (post BL-0002). Until then, use **spec validators** listed under each wave.

---

## Wave 0 — Habit and bench prep (parallel with Wave 1)

| Tasks | Purpose |
|-------|---------|
| BL-0182 | Phase -1 no-build pre-experiment |
| BL-0183 | Guided week-1 blink kit + safety brief prep |

**Evidence:** spreadsheet log (`00d` section 4); kit ordered.

---

## Wave 1 — Repo, CI, spec hygiene (M0 foundation)

| Tasks |
|-------|
| BL-0001, BL-0002, BL-0003, BL-0004, BL-0005, BL-0006, BL-0194, BL-0195 |

**Green when:** `pnpm -w lint`, `pnpm -w typecheck`, `pnpm claims:lint`, `python3 reference/check_package.py`, `python3 reference/validate_backlog.py` (spec repo).

---

## Wave 2 — Data model and content pipeline (M0)

| Tasks |
|-------|
| BL-0007, BL-0008, BL-0009, BL-0010, BL-0011, BL-0012, BL-0013, BL-0014, BL-0015, BL-0016, BL-0017, BL-0018 |

**Green when:** `supabase db reset`; `pnpm content:validate`; `pnpm content:lint`; `cd reference/verifiers && python3 -m pytest tests -q`; **one** template synced with fuzz pass.

**Content:** first `content/templates/…` file → **verified** (M0 exit).

---

## Wave 3 — Auth, API, serve gate, first graded item (M0)

| Tasks |
|-------|
| BL-0021, BL-0022, BL-0023, BL-0024, BL-0019, BL-0025, BL-0026, BL-0027, BL-0028, BL-0029, BL-0031, BL-0032 |

**Green when:** staging demo from phone; one verified item × 3 seeds; RLS suite; SM-06 audit = 0 unverified serves.

---

## Wave 4 — Scheduler and learning loop (M1; vectors before UI polish)

| Tasks |
|-------|
| BL-0033, BL-0034, BL-0035, BL-0036, BL-0037, BL-0038, BL-0039, BL-0040, BL-0041, BL-0042, BL-0043, BL-0044, BL-0045, BL-0046, BL-0047, BL-0048, BL-0049, BL-0184, BL-0185, BL-0186, BL-0187, BL-0191 |

**Green when:** `python3 reference/scheduler_reference.py check reference/scheduler_test_vectors.json`; package scheduler tests = reference `count`.

---

## Wave 5 — Symbolic grading, fuzz, review console (M1)

| Tasks |
|-------|
| BL-0050, BL-0051, BL-0052, BL-0054, BL-0055, BL-0056, BL-0057 |

**Green when:** symbolic endpoint + report-a-problem path; quarantine on bad report.

**Parallel content (important):** **BL-0065** (15 math templates) should start as soon as **BL-0052** (fuzz in CI) merges—not after **BL-0060**. The micro runner (**BL-0060**) has no backlog dependency on BL-0065; without early templates, first daily use hits an empty or repeating pool and go/no-go **G7** fails.

**Spec repo (pre–BL-0002):** The lean pool (**30** files under `content/templates/`, manifest, G2 fuzz, dry-run `tools/content_sync.py`) can be maintained here; sync-to-Postgres waits on the app monorepo.

---

## Wave 6 — Content batch + learner UI (M1; first daily use)

| Tasks | Notes |
|-------|--------|
| BL-0065 | 15 math templates (**start in Wave 5**, parallel to Wave 6 UI) |
| BL-0066 | 15 elec templates (after 0065) |
| BL-0067 | Sign off `content/lean-skill-slice.yaml` (`content-population-roadmap.md`) |
| BL-0196, BL-0197 | Symbolic grading in the queue-only worker, and disputed attempts out of FSRS (00a J2, J3); both before BL-0060 |
| BL-0058, BL-0059, **BL-0060**, BL-0061, BL-0063, BL-0064, BL-0190, BL-0193 | UI + PWA; **BL-0060 = first daily use** (needs template pool from BL-0065/0066 in flight) |
| **Wave 6b, teaching layer (00a K)** | Before the dogfood gate, so it judges an app that teaches |
| BL-0198, BL-0199 | Worked steps on the wire, then the stepper and faded cards. **Start here:** the largest teaching gain per hour |
| BL-0200, BL-0201, BL-0202 | Lessons: content type, migration and sync; console review tab; primer in the runner |
| BL-0203 | 19 lean primers (founder review; the agent writes `content/prompts/lesson_assist_v1.md` first) |
| BL-0204, BL-0205 | Step labels; relabel and expand the five multi-step electronics templates |
| BL-0069, BL-0070 | Two-week dogfood gate (BL-0069 depends on BL-0199 and BL-0202) |

**Green when:** 30 verified templates; 19 verified lessons; worked examples show their steps; `pnpm e2e:m1` (when task exists); two weeks real sessions.

**Optional:** BL-0180 (+10 templates) if pool thin before BL-0181.

---

## Wave 7 — Ops, project log, go/no-go (lean finish)

| Tasks | Notes |
|-------|--------|
| BL-0103 | Backup/restore drill |
| BL-0117, BL-0118, BL-0179 | Project sync + **manual** log (optional lean) |
| BL-0178 | Lean session builder variant (if in deps) |
| **BL-0181** | Go/no-go scorecard → `docs/CHANGELOG.md` |

**Green when:** `00d` section 8 scorecard recorded; decision written before any D1–D9 task.

---

## After the gate opens

Pick **one** deferred group (D1–D9) per `00d` section 7–8. Next template wave is typically **BL-0105** (D3/M2), not parallel epics.

---

## Full lean task list (dependency order = backlog deps, not this list)

```
BL-0001 … BL-0205 (lean: true only — 93 ids)
```

Generate sorted list:

```bash
python3 -c "import yaml; t=yaml.safe_load(open('backlog/backlog.yaml'))['tasks']; print('\n'.join(x['id'] for x in t if x.get('lean')))"
```

**Factory PR rule:** each PR names one BL-id; dependencies merged; paste acceptance test output (`CLAUDE.md` section 7).
