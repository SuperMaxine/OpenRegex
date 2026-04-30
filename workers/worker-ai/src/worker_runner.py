import os
import redis
from worker_ai.ai import LLMConfig, LLMClient
from worker_ai.processor import listen_and_process


def main():
    redis_url = os.environ.get("REDIS_URL", "redis://redis:6379")
    redis_client = redis.Redis.from_url(redis_url, decode_responses=True)

    ssl_verify_env = os.environ.get("LLM_SSL_VERIFY", "true").lower()
    verify_ssl = ssl_verify_env == "true" or ssl_verify_env == "1"

    config = LLMConfig(
        model_name=os.environ.get("LLM_MODEL", ""),
        api_key=os.environ.get("LLM_API_KEY", ""),
        api_base=os.environ.get("LLM_ENDPOINT", ""),
        verify_ssl=verify_ssl
    )

    version = os.environ.get("WORKER_VERSION", "Unknown")
    release_date = os.environ.get("WORKER_RELEASE_DATE", "Unreleased")

    llm_client = LLMClient(config)
    listen_and_process(redis_client, llm_client, version, release_date)

if __name__ == "__main__":
    main()