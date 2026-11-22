from __future__ import annotations

from fastapi import APIRouter

from backend.api.v1 import auth, notifications, orders, profile

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(orders.router)
api_router.include_router(notifications.router)
