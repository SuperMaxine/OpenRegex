import os
from pathlib import Path

# --- 1. Path Definitions ---
# Resolves the absolute path to the directory containing this file (.dev/py)
PY_DIR = Path(__file__).resolve().parent

# Resolves to the .dev directory
DEV_DIR = PY_DIR.parent

# Resolves the root of the monorepo (one level up from .dev)
ROOT_DIR = DEV_DIR.parent

# Standardized paths
ENV_FILE = ROOT_DIR / ".env"
CHANGELOG_FILE = ROOT_DIR / "CHANGELOG.md"


def _load_env():
    """
    Manually parses the .env file so the dev tools remain zero-dependency.
    Injects variables directly into os.environ.
    """
    if not ENV_FILE.exists():
        return

    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            # Ignore empty lines and comments
            if not line or line.startswith("#"):
                continue

            # Safely split on the first equals sign
            if "=" in line:
                key, val = line.split("=", 1)
                # Strip whitespace and any surrounding quotes
                val = val.strip().strip("\"'")
                os.environ[key.strip()] = val


# Automatically load the environment variables whenever config.py is imported
_load_env()

# --- 2. Expose Configuration Variables ---

# LLM Settings (Extracted from .env, with safe fallbacks)
DEV_LLM_ENDPOINT = os.environ.get("DEV_LLM_ENDPOINT", "https://api.openai.com/v1")
DEV_LLM_MODEL = os.environ.get("DEV_LLM_MODEL", "gpt-4o")
DEV_LLM_API_KEY = os.environ.get("DEV_LLM_API_KEY", "")
DEV_LLM_SSL_VERIFY = os.environ.get("DEV_LLM_SSL_VERIFY", "true").lower() in ("true", "1", "yes")

# You can add other monorepo-wide configs here later (e.g., Docker usernames, registry URLs)
DOCKER_USERNAME = os.environ.get("DOCKER_USERNAME", "sunnev")