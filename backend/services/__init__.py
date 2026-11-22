"""Business-logic services.

Services are class-based so they can be instantiated per-request with their
SQLAlchemy session (kept simple: route handlers instantiate them directly).
They inherit common CRUD from :class:`BaseService`.
"""

from backend.services.base import BaseService
from backend.services.file_upload import FileUploadService
from backend.services.order import OrderService
from backend.services.user import UserService

__all__ = [
    "BaseService",
    "FileUploadService",
    "OrderService",
    "UserService",
]
