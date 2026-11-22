"""Versioned API routers. Mount under ``/api/v1`` in ``main.py``."""

from backend.api.v1.router import api_router

__all__ = ["api_router"]
