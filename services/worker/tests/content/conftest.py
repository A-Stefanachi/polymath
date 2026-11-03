"""The ported voltage-divider test also uses the reference verifier and demo modules (BL-0015 ports
only safe_expr and tplkit), so the reference verifiers folder goes on sys.path."""

import sys
from pathlib import Path

REFERENCE = Path(__file__).resolve().parents[4] / "polymath-app-spec" / "reference" / "verifiers"
sys.path.insert(0, str(REFERENCE))
