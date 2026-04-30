from fastapi import APIRouter, HTTPException
from backend.core.redis import redis_client
from backend.core.config import API_REGEX_ENDPOINT_ENABLE
from openregex_libs.models import WorkerInfo, EngineInfo

router = APIRouter(tags=["Discovery"], include_in_schema=API_REGEX_ENDPOINT_ENABLE)

@router.get("/engines", response_model=list[WorkerInfo])
async def get_engines():
    workers_data = await redis_client.hgetall("openregex:workers")
    workers = []
    for worker_json in workers_data.values():
        workers.append(WorkerInfo.model_validate_json(worker_json))
    return workers

@router.get("/engines/{engine_id}", response_model=EngineInfo)
async def get_single_engine(engine_id: str):
    workers_data = await redis_client.hgetall("openregex:workers")
    for worker_json in workers_data.values():
        worker = WorkerInfo.model_validate_json(worker_json)
        for engine in worker.engines:
            if engine.engine_id == engine_id:
                return engine
    raise HTTPException(status_code=404, detail=f"Engine '{engine_id}' not found.")