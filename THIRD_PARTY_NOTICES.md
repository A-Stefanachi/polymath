# Third-party notices

Direct dependencies and their licences (CLAUDE.md section 5). Transitive dependencies are listed in `pnpm-lock.yaml`. Checked with `npm view <name>@<version> license` on 2026-11-03.

| Package | Version | Licence |
|---|---|---|
| `@eslint/js` | 9.39.5 | MIT |
| `@playwright/test` (BL-0021, dev) | 1.63.0 | Apache-2.0 |
| `@supabase/ssr` (BL-0021) | 0.12.7 | MIT |
| `@supabase/supabase-js` (BL-0021) | 2.118.0 | MIT |
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
| `fast-check` (dev, grading-core and scheduler) | 4.10.2 | MIT |
| `ts-fsrs` (BL-0041, packages/scheduler; published 2026-10-28, under two weeks old at adoption: accepted by the orchestrator because 00a G11 requires 6.x; details below) | 6.0.0 | MIT |
| `@axe-core/playwright` (BL-0027, dev; wraps `axe-core`, MPL-2.0: file-level copyleft, used unmodified as a dev dependency only, never shipped) | 4.14.0 | MPL-2.0 |
| `katex` (BL-0027, apps/web) | 0.19.0 | MIT |
| `lucide-react` | 1.67.0 | ISC |
| `next` | 16.4.4 | MIT |
| `openapi-typescript` | 7.13.0 | MIT |
| `postgres` | 3.4.9 | Unlicense |
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
| `zod` (BL-0022, apps/web; 4.6.7 released 2026-10-12) | 4.6.7 | MIT |

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

## ts-fsrs 6.0.0 (BL-0040, dependency of packages/scheduler since BL-0041)

`ts-fsrs` 6.0.0 (FSRS scheduling library, used only behind `packages/scheduler/src/fsrs-adapter.ts`), licence MIT, checked with `npm view ts-fsrs@6.0.0 license` and the `LICENSE` file inside the published tarball on 2026-11-04. Its one runtime dependency, `@open-spaced-repetition/srs-kit` 1.0.0, is BSD-3-Clause. Licence texts as published:

```text
MIT License

Copyright (c) 2026 Open Spaced Repetition

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

```text
BSD 3-Clause License

Copyright (c) 2026, Open Spaced Repetition contributors

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Optional native dependency to confirm

`next` pulls in `sharp` 0.35.5 (Apache-2.0) as an optional dependency for image optimisation, and `sharp` ships prebuilt `libvips` binaries under LGPL-3.0-or-later. They are linked dynamically and not modified. LGPL is not a plain permissive licence, so CLAUDE.md section 12 item 5 applies: the founder confirms or excludes it before the app serves optimised images.
