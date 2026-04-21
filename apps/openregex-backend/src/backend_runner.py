import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import router as api_router

APP_VERSION = os.environ.get("APP_VERSION", "Unknown")
APP_RELEASE = os.environ.get("APP_RELEASE_DATE", "Unreleased")

app = FastAPI(
    title="OpenRegex",
    version=APP_VERSION,
    docs_url="/api",
    openapi_url="/api/openapi.json",
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")