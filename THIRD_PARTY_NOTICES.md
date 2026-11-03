# Third-party notices

Direct dependencies and their licences (CLAUDE.md section 5). Transitive dependencies are listed in `pnpm-lock.yaml`. Checked with `npm view <name>@<version> license` on 2026-11-03.

| Package | Version | Licence |
|---|---|---|
| `@eslint/js` | 9.39.5 | MIT |
| `@tailwindcss/postcss` | 4.3.4 | MIT |
| `@types/node` | 24.19.2 | MIT |
| `@types/react` | 19.3.0 | MIT |
| `@types/react-dom` | 19.3.0 | MIT |
| `ajv` | 8.20.0 | MIT |
| `ajv-formats` | 3.0.1 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `dependency-cruiser` | 18.6.0 | MIT |
| `clsx` | 2.1.1 | MIT |
| `eslint` | 9.39.5 | MIT |
| `eslint-config-next` | 16.4.4 | MIT |
| `lucide-react` | 1.67.0 | ISC |
| `next` | 16.4.4 | MIT |
| `openapi-typescript` | 7.13.0 | MIT |
| `react` | 19.3.1 | MIT |
| `react-dom` | 19.3.1 | MIT |
| `supabase` (CLI) | 2.121.0 | MIT |
| `tailwind-merge` | 3.7.0 | MIT |
| `tailwindcss` | 4.3.4 | MIT |
| `tw-animate-css` | 1.4.0 | MIT |
| `typescript` | 6.0.3 | Apache-2.0 |
| `typescript-eslint` | 8.72.1 | MIT |
| `vitest` | 5.1.0 | MIT |
| `yaml` | 2.9.1 | ISC |

## Worker (Python, `services/worker/uv.lock`)

Direct dependencies of `services/worker` (BL-0014). Licences read from the package metadata on PyPI on 2026-11-03; transitive dependencies are in `uv.lock`.

| Package | Version | Licence |
|---|---|---|
| `fastapi` | 0.136.0 | MIT |
| `mpmath` | 1.3.0 | BSD-3-Clause |
| `numpy` | 2.5.3 | BSD-3-Clause |
| `pint` | 0.26.2 | BSD-3-Clause |
| `pg8000` (BL-0016) | 1.31.5 | BSD-3-Clause |
| `pyyaml` | 6.0.3 | MIT |
| `structlog` | 26.1.0 | MIT OR Apache-2.0 |
| `sympy` | 1.14.0 | BSD-3-Clause |
| `uvicorn` | 0.54.0 | BSD-3-Clause |
| `httpx` (dev) | 0.28.1 | BSD-3-Clause |
| `pytest` (dev) | 9.2.0 | MIT |

The worker image also installs the Debian `ngspice` package (BSD-3-Clause for the simulator core, with some modules under other permissive licences) and copies the `uv` binary (MIT OR Apache-2.0).

Transitive dependencies added by `pg8000` (BL-0016), pinned below the newest release through `constraint-dependencies` so each is at least two weeks old:

| Package | Version | Licence |
|---|---|---|
| `scramp` | 1.4.17 | MIT-0 |
| `asn1crypto` | 1.5.1 | MIT |
| `python-dateutil` | 2.9.0.post0 | Apache-2.0 OR BSD-3-Clause |
| `six` | 1.17.0 | MIT |

## Optional native dependency to confirm

`next` pulls in `sharp` 0.35.5 (Apache-2.0) as an optional dependency for image optimisation, and `sharp` ships prebuilt `libvips` binaries under LGPL-3.0-or-later. They are linked dynamically and not modified. LGPL is not a plain permissive licence, so CLAUDE.md section 12 item 5 applies: the founder confirms or excludes it before the app serves optimised images.
