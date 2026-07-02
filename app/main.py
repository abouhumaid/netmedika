"""FastAPI application entry point."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure ``from app.X import Y`` works no matter how this file is invoked
# (uvicorn ``main:app`` from the app dir, ``python main.py``, or pytest).
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

load_dotenv()

from app.api.v1 import api_router  # noqa: E402  (sys.path adjusted above)
from app.core.config import settings  # noqa: E402

app = FastAPI()

# Static uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
