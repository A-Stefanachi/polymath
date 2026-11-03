"""Allowed: the sandbox runner imports only its own code and the standard library."""

import json

from runner import limits

CONFIG = json.dumps({"limits": limits.__name__})
