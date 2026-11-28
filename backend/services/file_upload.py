"""Image validation and persistence for Supabase Storage or local development."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path
from urllib.parse import quote

from fastapi import HTTPException, UploadFile, status
import httpx

from backend.core.settings import settings

logger = logging.getLogger(__name__)
_BACKEND_DIR = Path(__file__).resolve().parents[1]
_STATIC_UPLOAD_ROOT = (_BACKEND_DIR / "uploads").resolve()
_SUPABASE_REF_PREFIX = "supabase://"
_LOCAL_UPLOAD_PREFIX = "uploads/"


class FileUploadService:
    """Validates image content and stores it in Supabase when configured.

    Local disk storage remains available for development. Supabase object paths
    are stored in the database; the bucket comes from application configuration.
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
        configured_dir = Path(upload_dir)
        self.upload_dir = (
            configured_dir if configured_dir.is_absolute() else _BACKEND_DIR / configured_dir
        ).resolve()
        try:
            self.upload_dir.relative_to(_STATIC_UPLOAD_ROOT)
        except ValueError as exc:
            raise ValueError("UPLOAD_DIR must be inside backend/uploads so files are publicly served") from exc
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max_bytes

    # ----- public API -----------------------------------------------------

    async def save_image(
        self,
        uploaded: UploadFile,
        filename_prefix: str = "",
        folder: str = "uploads",
    ) -> str:
        """Validate, persist and return a stable image reference."""
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
        mime_type, file_ext = detected

        unique = (
            f"{filename_prefix}_{uuid.uuid4().hex[:8]}{file_ext}"
            if filename_prefix
            else f"{uuid.uuid4().hex[:8]}{file_ext}"
        )
        supabase_config = self._get_supabase_config()
        if folder not in {"orders", "profiles", "uploads"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid upload folder.",
            )
        object_path = f"{folder}/{unique}"
        await self._upload_to_supabase(
            supabase_config,
            object_path,
            contents,
            mime_type,
        )
        return object_path

    async def resolve_image_url(self, image_ref: str | None) -> str | None:
        """Turn a stored Supabase object path into a time-limited download URL."""
        return (await self.resolve_image_urls([image_ref]))[0]

    async def resolve_image_urls(self, image_refs: list[str | None]) -> list[str | None]:
        """Sign all private Supabase images in a response with one request per bucket."""
        resolved = list(image_refs)
        grouped: dict[str, list[tuple[int, str]]] = {}
        for index, image_ref in enumerate(image_refs):
            if not image_ref:
                continue
            location = self._supabase_location(image_ref)
            if location is None:
                continue
            bucket, object_path = location
            grouped.setdefault(bucket, []).append((index, object_path))

        if not grouped:
            return resolved

        config = self._get_supabase_config()
        base_url, service_key = config
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                for bucket, indexed_paths in grouped.items():
                    endpoint = self._bucket_sign_endpoint(base_url, bucket)
                    response = await client.post(
                        endpoint,
                        headers=self._storage_headers(service_key, "application/json"),
                        json={
                            "expiresIn": settings.supabase_signed_url_expiry_seconds,
                            "paths": [path for _, path in indexed_paths],
                        },
                    )
                    response.raise_for_status()
                    results = response.json()
                    if not isinstance(results, list) or len(results) != len(indexed_paths):
                        raise ValueError("Supabase returned an invalid signed URL list")
                    for (index, _), result in zip(indexed_paths, results):
                        signed_url = result.get("signedURL") or result.get("signedUrl")
                        if not isinstance(signed_url, str) or not signed_url:
                            raise ValueError("Supabase returned an invalid signed image URL")
                        resolved[index] = self._absolute_signed_url(base_url, signed_url)
        except (httpx.HTTPError, ValueError):
            logger.exception("Could not sign Supabase image URLs")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Image storage is temporarily unavailable.",
            ) from None
        return resolved

    async def delete_image(self, image_ref: str | None) -> None:
        """Best-effort deletion of a local image or Supabase object."""
        if not image_ref:
            return
        location = self._supabase_location(image_ref)
        if location is None:
            if not image_ref.startswith(("https://", "http://")):
                self.delete_safely(image_ref)
            return
        bucket, object_path = location
        try:
            config = self._get_supabase_config()
            base_url, service_key = config
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.delete(
                    self._object_endpoint(base_url, bucket, object_path),
                    headers=self._storage_headers(service_key),
                )
                response.raise_for_status()
            logger.info("Deleted Supabase image object from bucket %s", bucket)
        except (HTTPException, httpx.HTTPError):
            logger.warning("Could not delete Supabase image object", exc_info=True)

    async def _upload_to_supabase(
        self,
        config: tuple[str, str],
        object_path: str,
        contents: bytes,
        mime_type: str,
    ) -> None:
        base_url, service_key = config
        endpoint = self._object_endpoint(base_url, settings.supabase_storage_bucket, object_path)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    endpoint,
                    headers={
                        **self._storage_headers(service_key, mime_type),
                        "x-upsert": "false",
                        "cache-control": "3600",
                    },
                    content=contents,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            # Supabase returns a useful JSON error (for example, a bucket MIME
            # restriction or an object size limit). HTTPStatusError's default
            # message omits that response body, which otherwise hides the cause.
            response_body = exc.response.text[:1000]
            logger.error(
                "Supabase image upload rejected: status=%s response=%s",
                exc.response.status_code,
                response_body,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Image storage rejected the upload. Check the backend logs for the Supabase error.",
            ) from None
        except httpx.HTTPError:
            logger.exception("Supabase image upload failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Image storage is temporarily unavailable.",
            ) from None

    def _get_supabase_config(self) -> tuple[str, str]:
        base_url = settings.supabase_url.strip().rstrip("/")
        service_key = (
            settings.supabase_secret_key.get_secret_value().strip()
            or settings.supabase_service_role_key.get_secret_value().strip()
        )
        if base_url and service_key:
            return base_url, service_key
        logger.error(
            "Supabase Storage requires SUPABASE_URL and either SUPABASE_SECRET_KEY "
            "or SUPABASE_SERVICE_ROLE_KEY"
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage is not configured.",
        )

    @staticmethod
    def _object_endpoint(base_url: str, bucket: str, object_path: str) -> str:
        encoded_bucket = quote(bucket, safe="")
        encoded_path = quote(object_path, safe="/")
        return f"{base_url}/storage/v1/object/{encoded_bucket}/{encoded_path}"

    @staticmethod
    def _bucket_sign_endpoint(base_url: str, bucket: str) -> str:
        return f"{base_url}/storage/v1/object/sign/{quote(bucket, safe='')}"

    @staticmethod
    def _absolute_signed_url(base_url: str, signed_url: str) -> str:
        if signed_url.startswith(("https://", "http://")):
            return signed_url
        if signed_url.startswith("/storage/v1/"):
            return f"{base_url}{signed_url}"
        return f"{base_url}/storage/v1/{signed_url.lstrip('/')}"

    @staticmethod
    def _storage_headers(service_key: str, content_type: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def delete_safely(self, public_path: str | None) -> None:
        """Best-effort deletion of a previously stored image."""
        if not public_path:
            return
        try:
            path = Path(public_path)
            if not path.is_absolute():
                path = _BACKEND_DIR / path
            path.resolve().relative_to(self.upload_dir)
            path.unlink()
            logger.info("Deleted file: %s", public_path)
        except FileNotFoundError:
            pass
        except Exception as exc:  # noqa: BLE001 — best-effort cleanup
            logger.warning("Could not delete file %s: %s", public_path, exc)

    # ----- internals ------------------------------------------------------

    @staticmethod
    def _supabase_location(image_ref: str) -> tuple[str, str] | None:
        """Resolve both new object paths and legacy bucket-qualified references."""
        if image_ref.startswith(("https://", "http://", _LOCAL_UPLOAD_PREFIX)):
            return None
        if image_ref.startswith(_SUPABASE_REF_PREFIX):
            bucket_and_path = image_ref[len(_SUPABASE_REF_PREFIX):]
            bucket, separator, object_path = bucket_and_path.partition("/")
            if not separator or not bucket or not object_path:
                logger.error("Invalid Supabase image reference")
                raise HTTPException(status_code=500, detail="Stored image reference is invalid.")
            return bucket, object_path
        if not image_ref or image_ref.startswith("/"):
            logger.error("Invalid Supabase object path")
            raise HTTPException(status_code=500, detail="Stored image reference is invalid.")
        return settings.supabase_storage_bucket, image_ref

    def _detect_mime(self, data: bytes) -> tuple[str, str] | None:
        for mime_type, ext, offset, sig in self._SIGNATURES:
            end = offset + len(sig)
            if len(data) >= end and data[offset:end] == sig:
                return mime_type, ext
        return None
