from __future__ import annotations

from dataclasses import dataclass
import logging
import os
from typing import Optional

from app.core import r2_storage
from app.core import supabase_storage

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StorageConfig:
    read_source: str
    dual_write_supabase: bool
    fallback_to_supabase: bool
    r2_write_retries: int


def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _record_metric(metric: str, **fields: object) -> None:
    payload = " ".join(f"{key}={value}" for key, value in fields.items())
    logger.info("storage_metric=%s %s", metric, payload)


def get_config() -> StorageConfig:
    read_source = os.getenv("STORAGE_READ_SOURCE", "r2").strip().lower()
    if read_source not in {"r2", "supabase"}:
        raise ValueError("STORAGE_READ_SOURCE debe ser 'r2' o 'supabase'.")
    return StorageConfig(
        read_source=read_source,
        dual_write_supabase=_parse_bool(os.getenv("STORAGE_DUAL_WRITE_SUPABASE"), False),
        fallback_to_supabase=_parse_bool(os.getenv("STORAGE_FALLBACK_SUPABASE"), True),
        r2_write_retries=int(os.getenv("STORAGE_R2_WRITE_RETRIES", "1")),
    )


def upload_object(
    key: str,
    data: bytes,
    content_type: Optional[str] = None,
    cache_control: Optional[str] = None,
) -> None:
    config = get_config()
    r2_error: Optional[Exception] = None

    for attempt in range(config.r2_write_retries + 1):
        try:
            r2_storage.upload_object(
                key=key,
                data=data,
                content_type=content_type,
                cache_control=cache_control,
            )
            _record_metric("r2_upload_success", key=key, attempt=attempt + 1)
            r2_error = None
            break
        except Exception as exc:
            r2_error = exc
            _record_metric("r2_upload_error", key=key, attempt=attempt + 1, error=str(exc))

    if r2_error is not None:
        if config.fallback_to_supabase:
            supabase_storage.upload_object(
                key=key,
                data=data,
                content_type=content_type,
                cache_control=cache_control,
            )
            _record_metric("supabase_upload_fallback", key=key)
            return
        raise r2_error

    if config.dual_write_supabase:
        try:
            supabase_storage.upload_object(
                key=key,
                data=data,
                content_type=content_type,
                cache_control=cache_control,
            )
            _record_metric("supabase_upload_success", key=key)
        except Exception as exc:
            logger.warning("Falló dual-write a Supabase para %s: %s", key, exc)
            _record_metric("supabase_upload_error", key=key, error=str(exc))


def delete_object(key: str) -> None:
    config = get_config()
    try:
        r2_storage.delete_object(key)
        _record_metric("r2_delete_success", key=key)
    except Exception as exc:
        _record_metric("r2_delete_error", key=key, error=str(exc))
        if not config.fallback_to_supabase:
            raise

    if config.dual_write_supabase:
        try:
            supabase_storage.delete_object(key)
            _record_metric("supabase_delete_success", key=key)
        except Exception as exc:
            logger.warning("Falló borrado en Supabase para %s: %s", key, exc)
            _record_metric("supabase_delete_error", key=key, error=str(exc))


def get_public_url(key: str) -> str:
    config = get_config()
    if config.read_source == "supabase":
        return supabase_storage.get_public_url(key)

    try:
        return r2_storage.get_public_url(key)
    except Exception as exc:
        if config.fallback_to_supabase:
            _record_metric("r2_public_url_fallback", key=key, error=str(exc))
            return supabase_storage.get_public_url(key)
        raise
