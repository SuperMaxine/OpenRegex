import os
import redis
from worker_c_cpp.registry import register_engines
from worker_c_cpp.processor import listen_and_process


def main():
    redis_url = os.environ.get("REDIS_URL", "redis://redis:6379")
    redis_client = redis.Redis.from_url(redis_url, decode_responses=True)

    register_engines(redis_client)
    listen_and_process(redis_client)


if __name__ == "__main__":
    main()