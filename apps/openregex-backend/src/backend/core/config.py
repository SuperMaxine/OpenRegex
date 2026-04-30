import os

def get_env_int(key: str, default: int) -> int:
    val = os.getenv(key)
    if val is None or val.strip() == "":
        return default
    try:
        return int(val)
    except ValueError:
        return default

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
RATE_LIMIT_REQUESTS = get_env_int("RATE_LIMIT_REQUESTS", 60)
RATE_LIMIT_WINDOW = get_env_int("RATE_LIMIT_WINDOW", 60)
PAYLOAD_THRESHOLD = 1024

API_REGEX_ENDPOINT_ENABLE = os.getenv("API_REGEX_ENDPOINT_ENABLE", "true").lower() == "true"
API_AI_ENDPOINT_ENABLE = os.getenv("API_AI_ENDPOINT_ENABLE", "false").lower() == "true"
MAX_AI_QUEUE = get_env_int("MAX_AI_QUEUE", 10)
APP_RELEASE_DATE = os.environ.get("APP_RELEASE_DATE", "Unreleased")