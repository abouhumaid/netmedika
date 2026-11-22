from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.core.settings import settings

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

from backend.api.v1 import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application")

    yield

    logger.info("Stopping application")


app = FastAPI(lifespan=lifespan)

# Static uploads
app.mount(
    "/uploads",
    StaticFiles(directory=str(Path(__file__).resolve().parent / "uploads")),
    name="uploads",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Versioned API
app.include_router(api_router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
