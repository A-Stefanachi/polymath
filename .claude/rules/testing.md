---
paths:
  - "tests/**"
  - "test/**"
  - "**/__tests__/**"
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*_test.*"
  - "**/test_*.py"
---

# Tests

- A test names the behaviour it proves and references the acceptance criterion it covers (`AC-3`) when there is one.
- Assert observable outcomes through public interfaces. Don't assert on private helpers or call counts unless the call is the behaviour.
- Mock only external boundaries (network, clock, randomness, third-party services). Prefer the project's fakes. Never mock the code under test.
- Deterministic: no sleeps, no real network, fixed seeds and clocks, no dependence on test order.
- Never delete, skip, or weaken an assertion to make a test pass. A wrong test gets fixed to match the spec, with the reason in the commit message.
- A test that can't run on one platform (symlinks without Windows privileges, a POSIX-only signal) is skipped there with the condition and a reason on the marker, e.g. `@pytest.mark.skipif(sys.platform == "win32", reason="symlinks need a privilege")`. Don't work around the platform inside the test; the integrity check accepts this form.
- One test per distinct behaviour or boundary. A parametrised matrix whose rows take the same code path adds run time to every gate run, not evidence.
- Keep the suite fast: reuse the shared fixtures (`patterns.md` lists them) instead of building state per test; share an app or client across tests that only check rejections; copy a migrated template database rather than migrating per test; start a real process only when the behaviour needs one (exit codes, startup).
- A test or check that needs a server records the PID it started (`$!`, a pid file) and stops that PID. Never stop processes by name (`pkill`, `killall`, `taskkill /IM`): other builds and test servers may run on the same machine.
- New bug fixes come with a regression test that failed before the fix.
- Assert the success of every setup step (each setup request's 2xx status). A setup request that fails silently makes a "nothing changed" test pass without checking anything.
- A test that passes before its change is a guard: show once that it can fail (break the guarded code by hand, watch it fail, restore).
- Rows that only read or only get rejected share a module-scoped app and database instead of building their own.
- Compare suite times per test (seconds divided by test count) or as the median of 2-3 runs, never one wall time, and never while another agent is running tests.
