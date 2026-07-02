"""Aggregator for v1 routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, orders, profile

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(orders.router)
