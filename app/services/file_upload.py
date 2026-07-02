"""Reusable image upload helper with magic-byte validation and safe path resolution."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class FileUploadService:
    """Validates an uploaded image and persists it under a configured directory.

    Subclass or pass a different ``upload_dir`` / ``max_bytes`` to support
    other file types. The default recognises JPEG, PNG, GIF and WebP.
    """

    _SIGNATURES: list[tuple[str, str, int, bytes]] = [
        ("image/jpeg", ".jpg", 0, b"\xff\xd8\xff"),
        ("image/png", ".png", 0, b"\x89PNG\r\n\x1a\n"),
        ("image/gif", ".gif", 0, b"GIF87a"),
        ("image/gif", ".gif", 0, b"GIF89a"),
        ("image/webp", ".webp", 8, b"WEBP"),
    ]

    def __init__(
        self,
        upload_dir: str | Path = settings.upload_dir,
        max_bytes: int = settings.max_upload_bytes,
    ) -> None:
        self.upload_dir = Path(upload_dir).resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max_bytes

    # ----- public API -----------------------------------------------------

    async def save_image(self, uploaded: UploadFile, filename_prefix: str = "") -> str:
        """Validate, persist and return a stable public path for the image."""
        contents = await uploaded.read(self.max_bytes + 1)
        if len(contents) > self.max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {self.max_bytes} bytes.",
            )

        detected = self._detect_mime(contents)
        if detected is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only JPEG, PNG, GIF and WebP images are accepted.",
            )
        _mime_type, file_ext = detected

        unique = (
            f"{filename_prefix}_{uuid.uuid4().hex[:8]}{file_ext}"
            if filename_prefix
            else f"{uuid.uuid4().hex[:8]}{file_ext}"
        )
        dest_path = self.upload_dir / unique

        # Path-traversal guard: resolved target must remain inside upload_dir.
        try:
            dest_path.resolve().relative_to(self.upload_dir)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path detected.",
            ) from exc

        dest_path.write_bytes(contents)
        return str(Path(settings.upload_dir) / unique)

    def delete_safely(self, public_path: str | None) -> None:
        """Best-effort deletion of a previously stored image."""
        if not public_path:
            return
        try:
            Path(public_path).unlink()
            logger.info("Deleted file: %s", public_path)
        except FileNotFoundError:
            pass
        except Exception as exc:  # noqa: BLE001 — best-effort cleanup
            logger.warning("Could not delete file %s: %s", public_path, exc)

    # ----- internals ------------------------------------------------------

    def _detect_mime(self, data: bytes) -> tuple[str, str] | None:
        for mime_type, ext, offset, sig in self._SIGNATURES:
            end = offset + len(sig)
            if len(data) >= end and data[offset:end] == sig:
                return mime_type, ext
        return None
