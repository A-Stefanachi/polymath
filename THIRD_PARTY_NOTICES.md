# Third-party notices

Direct dependencies and their licences (CLAUDE.md section 5). Transitive dependencies are listed in `pnpm-lock.yaml`. Checked with `npm view <name>@<version> license` on 2026-11-03.

| Package | Version | Licence |
|---|---|---|
| `@eslint/js` | 9.39.5 | MIT |
| `@tailwindcss/postcss` | 4.3.4 | MIT |
| `@types/node` | 24.19.2 | MIT |
| `@types/react` | 19.3.0 | MIT |
| `@types/react-dom` | 19.3.0 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `clsx` | 2.1.1 | MIT |
| `eslint` | 9.39.5 | MIT |
| `eslint-config-next` | 16.4.4 | MIT |
| `lucide-react` | 1.67.0 | ISC |
| `next` | 16.4.4 | MIT |
| `react` | 19.3.1 | MIT |
| `react-dom` | 19.3.1 | MIT |
| `tailwind-merge` | 3.7.0 | MIT |
| `tailwindcss` | 4.3.4 | MIT |
| `tw-animate-css` | 1.4.0 | MIT |
| `typescript` | 6.0.3 | Apache-2.0 |
| `typescript-eslint` | 8.72.1 | MIT |
| `vitest` | 5.1.0 | MIT |

## Optional native dependency to confirm

`next` pulls in `sharp` 0.35.5 (Apache-2.0) as an optional dependency for image optimisation, and `sharp` ships prebuilt `libvips` binaries under LGPL-3.0-or-later. They are linked dynamically and not modified. LGPL is not a plain permissive licence, so CLAUDE.md section 12 item 5 applies: the founder confirms or excludes it before the app serves optimised images.
