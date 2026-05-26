from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Optional


@dataclass(frozen=True)
class SupabaseStorageConfig:
    url: str
    bucket: str
    public_base_url: str


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Falta la variable de entorno requerida: {name}")
    return value


def get_config() -> SupabaseStorageConfig:
    supabase_url = _require_env("SUPABASE_URL").rstrip("/")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "photos")
    public_base_url = f"{supabase_url}/storage/v1/object/public/{bucket}"
    return SupabaseStorageConfig(
        url=supabase_url,
        bucket=bucket,
        public_base_url=public_base_url,
    )


def get_client():
    from app.core.supabase_auth import get_service

    return get_service()


def upload_object(
    key: str,
    data: bytes,
    content_type: Optional[str] = None,
    cache_control: Optional[str] = None,
) -> None:
    config = get_config()
    client = get_client()
    file_options = {"upsert": "true"}
    if content_type:
        file_options["content-type"] = content_type
    if cache_control:
        file_options["cache-control"] = cache_control
    client.storage.from_(config.bucket).upload(key, data, file_options=file_options)


def delete_object(key: str) -> None:
    config = get_config()
    client = get_client()
    client.storage.from_(config.bucket).remove([key])


def get_public_url(key: str) -> str:
    config = get_config()
    normalized_key = key.lstrip("/")
    return f"{config.public_base_url}/{normalized_key}"
