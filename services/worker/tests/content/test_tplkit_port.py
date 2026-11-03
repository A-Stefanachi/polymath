"""BL-0015: determinism across processes and the give-up path of rejection sampling (doc 07 section 4.2)."""

import copy
import json
import subprocess
import sys
from pathlib import Path

import pytest

from polymath_worker.content import tplkit

WORKER_ROOT = Path(tplkit.__file__).parents[2]
KEY = "tpl.elec.voltage-divider-vout"
CODE = (
    "import json;from polymath_worker.content import tplkit;"
    f"t=tplkit.load_all()['{KEY}'];print(json.dumps(tplkit.generate_item(t,12345)['params']))"
)


def _params_in_new_process(hash_seed: str) -> dict:
    out = subprocess.run(
        [sys.executable, "-c", CODE],
        cwd=WORKER_ROOT,
        capture_output=True,
        text=True,
        check=True,
        env={"PYTHONHASHSEED": hash_seed, "PATH": "/usr/bin:/bin", "PYTHONPATH": str(WORKER_ROOT)},
    )
    return json.loads(out.stdout)


def test_same_seed_gives_identical_params_in_two_processes():
    assert _params_in_new_process("1") == _params_in_new_process("2")


def test_rejection_sampling_gives_up_with_clear_error_on_degenerate_template():
    tpl = copy.deepcopy(tplkit.load_all()[KEY])
    tpl["constraints"] = [{"expr": "r1 < 0"}]  # no draw can satisfy this
    with pytest.raises(
        RuntimeError,
        match=r"no valid parameter draw after 7 tries for tpl\.elec\.voltage-divider-vout seed 3",
    ):
        tplkit.sample_params(tpl, 3, max_tries=7)
