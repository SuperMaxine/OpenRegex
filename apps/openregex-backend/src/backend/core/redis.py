import time
import uuid
from redis.asyncio import Redis
from backend.core.config import REDIS_URL, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW

redis_client = Redis.from_url(REDIS_URL, decode_responses=True)

async def check_rate_limit(client_ip: str, engine_id: str) -> bool:
    """Sliding window rate limiter using Redis."""
    current_time = int(time.time())
    key = f"ratelimit:{client_ip}:{engine_id}"

    async with redis_client.pipeline(transaction=True) as pipe:
        pipe.zremrangebyscore(key, 0, current_time - RATE_LIMIT_WINDOW)
        pipe.zcard(key)
        pipe.zadd(key, {str(uuid.uuid4()): current_time})
        pipe.expire(key, RATE_LIMIT_WINDOW)
        results = await pipe.execute()

    request_count = results[1]
    if request_count >= RATE_LIMIT_REQUESTS:
        return False
    return True