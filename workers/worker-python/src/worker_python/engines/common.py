import os
import platform
import regex as py_regex

WORKER_VERSION = os.environ.get("WORKER_VERSION", "Unknown")
WORKER_RELEASE_DATE = os.environ.get("WORKER_RELEASE_DATE", "Unreleased")

_py_ver = platform.python_version_tuple()
PYTHON_MAJOR_MINOR = f"{_py_ver[0]}.{_py_ver[1]}"
REGEX_VERSION = py_regex.__version__

CAT_CLASSES = "Character Classes & Escapes"
CAT_ANCHORS = "Anchors & Boundaries"
CAT_QUANTIFIERS = "Quantifiers"
CAT_GROUPS = "Grouping & Backreferences"
CAT_ADVANCED = "Lookarounds & Advanced"