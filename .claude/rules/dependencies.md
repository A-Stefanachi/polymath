---
paths:
  - "package.json"
  - "**/package.json"
  - "pnpm-lock.yaml"
  - "pyproject.toml"
  - "**/pyproject.toml"
  - "requirements*.txt"
  - "go.mod"
  - "Cargo.toml"
  - "pom.xml"
  - "build.gradle*"
  - "Gemfile"
---

# Dependencies

- Add a dependency only when the design calls for it and the standard library or an existing dependency can't do the job reasonably.
- Use the package manager (`npm install`, `uv add`, `go get`, `cargo add`...); never hand-edit lockfiles.
- Check before adding: actively maintained, permissive licence compatible with this project, no known vulnerabilities, reasonable size and transitive tree.
- Pin dev tools (formatters, linters, type checkers, test runners) so agents, humans and CI run the same versions.
- Record a significant new dependency in an ADR.
