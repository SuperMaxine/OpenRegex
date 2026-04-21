import json
import uuid
import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from openregex_libs.models import LLMOptimizeRequest, LLMGenerateRequest
from backend.core.redis import redis_client
from backend.core.config import API_AI_ENDPOINT_ENABLE, MAX_AI_QUEUE

router = APIRouter(tags=["AI"], include_in_schema=API_AI_ENDPOINT_ENABLE)

@router.get("/llm/status")
async def get_llm_status():
    """Check if the LLM worker is currently online via Redis heartbeat."""
    llm_active_data = await redis_client.get("openregex:llm_active")
    if not llm_active_data:
        return {"available": False}
    try:
        data = json.loads(llm_active_data)
        return {
            "available": True,
            "version": data.get("version"),
            "release_date": data.get("release_date")
        }
    except json.JSONDecodeError:
        return {"available": True}

async def _dispatch_llm_stream(queue_name: str, payload_dict: dict, timeout: float = 60.0):
    q_len = await redis_client.llen(queue_name)
    if q_len >= MAX_AI_QUEUE:
        async def overload_generator():
            yield f"data: {json.dumps({'type': 'error', 'message': 'Server overloaded. Too many active users. Please try again shortly.'})}\n\n"
        return StreamingResponse(overload_generator(), media_type="text/event-stream")

    task_id = str(uuid.uuid4())
    payload_dict["task_id"] = task_id

    pubsub = redis_client.pubsub()
    channel_name = f"result:llm:{task_id}"
    await pubsub.subscribe(channel_name)

    await redis_client.lpush(queue_name, json.dumps(payload_dict))

    async def event_generator():
        try:
            async with asyncio.timeout(timeout):
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        data = message["data"]
                        if data == "ready":
                            final_data = await redis_client.get(f"result:llm:{task_id}")
                            if final_data:
                                yield f"data: {final_data}\n\n"
                                break
                        else:
                            yield f"data: {data}\n\n"
                            try:
                                parsed = json.loads(data)
                                if parsed.get("type") in ["result", "error"]:
                                    break
                            except json.JSONDecodeError:
                                pass
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI Request Timeout.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            await pubsub.unsubscribe(channel_name)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/llm/optimize")
async def llm_optimize(request: LLMOptimizeRequest):
    return await _dispatch_llm_stream("queue:llm:optimize", request.model_dump(), timeout=600.0)

@router.post("/llm/generate")
async def llm_generate(request: LLMGenerateRequest):
    return await _dispatch_llm_stream("queue:llm:generate", request.model_dump(), timeout=600.0)