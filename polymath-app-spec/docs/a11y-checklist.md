# Accessibility checklist (BL-0064, doc 09 section 7, WCAG 2.2 AA)

Two layers. The automated layer runs in CI (`pnpm e2e:a11y`, also part of `pnpm e2e:auth` and `bash tools/ci/local-ci.sh`): `apps/web/tests/e2e/a11y.spec.ts`. The manual layer is the screen-reader pass doc 09 section 7.13 asks for before beta; the founder fills it in.

## 1. Automated result per screen

Per screen the gate runs axe (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa; zero critical or serious) in light and dark at 360 and 1280 px, checks that every pointer target is at least 24 x 24 CSS px (SC 2.5.8, inline text links exempt), and checks that there is no horizontal scroll at 640 px (200 percent zoom of 1280) and 320 px (SC 1.4.10).

| Screen | Route | Date | Tester | Result |
|---|---|---|---|---|
| S01 Welcome | /welcome | 2026-11-04 | agent (Playwright) | pass |
| S02 Consent | /consent | 2026-11-04 | agent (Playwright) | pass |
| S03 Onboarding | /onboarding | 2026-11-04 | agent (Playwright) | pass |
| S06 Today | / | 2026-11-04 | agent (Playwright) | pass |
| S07 Session preview | / (sheet) | 2026-11-04 | agent (Playwright) | pass |
| S08 Runner | /session/[id] | 2026-11-04 | agent (Playwright) | pass |
| S09 Summary | /session/[id]/summary | 2026-11-04 | agent (Playwright) | pass |
| S14 Skill map (trail, list) | /map | 2026-11-04 | agent (Playwright) | pass |
| S15 Progress | /progress | 2026-11-04 | agent (Playwright) | pass |
| S17 Review inbox | /review | 2026-11-04 | agent (Playwright) | pass |
| Component gallery | /dev/gallery | 2026-11-04 | agent (Playwright) | pass |
| Demo item (math) | /demo-item | 2026-11-04 | agent (Playwright) | pass |
| Admin console | /admin/content | 2026-11-04 | agent (Playwright, review-console.spec.ts) | pass |

Also automated: skip link is the first Tab stop and moves focus to `main`; every focused control shows the 3 px `--focus` outline; `prefers-reduced-motion` turns the rise and press motion off; the math statement has MathML output and a spoken `aria-label`; `lang` is set. Contrast of the token pairs: `apps/web/src/styles/contrast.test.ts`.

## 2. Manual screen-reader pass (founder, before beta)

Devices: VoiceOver on iPhone (Safari), TalkBack on Android (Chrome), NVDA on Windows (Firefox or Chrome). Mark each cell pass, fail (with a note) or n/a. Date and tester go in every row you fill.

Steps for every screen, with the reader on and the screen off if you can:
1. Landmarks: the reader finds navigation, main and the page heading (h1) first.
2. Move through the page by swipe or Tab only; the order matches the visual order; nothing is skipped or read twice.
3. Every button, link and field is announced with a name and its role; toggles say pressed or not pressed.
4. State is spoken, not only coloured: skill states, mastery, grading result ("Correct", "Not quite").
5. Math: the statement reads as the spoken form (alt text), not as raw symbols.
6. Feedback after Check or Next is announced once (polite live region); no per-second announcements.
7. Dialogs (session preview, shortcut help): focus enters, Escape or Close returns focus to the opener.
8. Zoom the browser to 200 percent: nothing is cut off, no sideways scrolling.

| Screen | VoiceOver iOS | TalkBack Android | NVDA | Date | Tester | Notes |
|---|---|---|---|---|---|---|
| S01 Welcome and sign-in | pending | pending | pending | | | |
| S02 Consent, S03 Onboarding | pending | pending | pending | | | |
| S06 Today, S07 preview sheet | pending | pending | pending | | | |
| S08 Runner (numeric, choice, symbolic, worked example) | pending | pending | pending | | | |
| S09 Summary | pending | pending | pending | | | |
| S14 Skill map (trail and list view) | pending | pending | pending | | | |
| S15 Progress | pending | pending | pending | | | |
| S17 Review inbox | pending | pending | pending | | | |
