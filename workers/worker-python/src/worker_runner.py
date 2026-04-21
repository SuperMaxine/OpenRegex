import os
import redis
import multiprocessing
from worker_python.registry import register_engines
from worker_python.processor import listen_and_process


def main():
    redis_url = os.environ.get("REDIS_URL", "redis://redis:6379")

    num_cores = multiprocessing.cpu_count()
    pool_size = max(2, num_cores * 2) + 10

    connection_pool = redis.ConnectionPool.from_url(
        redis_url,
        decode_responses=True,
        max_connections=pool_size
    )
    redis_client = redis.Redis(connection_pool=connection_pool)

    register_engines(redis_client)
    listen_and_process(redis_client)


if __name__ == "__main__":
    main()