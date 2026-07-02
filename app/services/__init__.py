"""Business-logic services.

Services are class-based so they can be instantiated per-request with their
SQLAlchemy session (kept simple: route handlers instantiate them directly).
They inherit common CRUD from :class:`BaseService`.
"""

from app.services.base import BaseService
from app.services.file_upload import FileUploadService
from app.services.order_service import OrderService
from app.services.user_service import UserService

__all__ = [
    "BaseService",
    "FileUploadService",
    "OrderService",
    "UserService",
]
