"""Violation: sandbox-no-worker-import (the sandbox runner importing worker code)."""

from polymath_worker.queue import claim

CLAIM = claim
