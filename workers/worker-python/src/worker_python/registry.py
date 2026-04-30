import redis
import json
from worker_python.engines import WORKER_INFO

def register_engines(redis_client: redis.Redis):
    """Registers Python worker and its engines to the Backend via Redis."""
    redis_client.hset(
        "openregex:workers",
        WORKER_INFO.worker_name,
        WORKER_INFO.model_dump_json()
    )
    print(f"[Worker] Registered '{WORKER_INFO.worker_name}' with {len(WORKER_INFO.engines)} engines.", flush=True)