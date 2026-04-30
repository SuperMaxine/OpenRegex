from fastapi import APIRouter
from backend.api import system, discovery, execution, ai

router = APIRouter()

router.include_router(system.router)
router.include_router(discovery.router)
router.include_router(execution.router)
router.include_router(ai.router)