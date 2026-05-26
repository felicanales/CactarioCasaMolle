#!/usr/bin/env python3
"""
Script para migrar objetos desde Supabase Storage a Cloudflare R2.

Funcionalidades:
- Lista objetos en el bucket de Supabase.
- Copia cada objeto a R2 manteniendo la estructura.
- Verifica integridad (size/etag) tras la copia.
- Opcional: normaliza storage_path/public_url si se guardaron URLs completas.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlparse

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.supabase_auth import get_service
from app.core import r2_storage

logger = logging.getLogger(__name__)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrar objetos de Supabase Storage a R2")
    parser.add_argument("--bucket", default=None, help="Bucket de Supabase (default: SUPABASE_STORAGE_BUCKET o photos)")
    parser.add_argument("--prefix", default="", help="Prefijo opcional para limitar la migración")
    parser.add_argument("--dry-run", action="store_true", help="Solo listar acciones sin subir archivos")
    parser.add_argument("--normalize-db-urls", action="store_true", help="Normalizar storage_path/public_url si contienen URL completa")
    parser.add_argument("--batch-size", type=int, default=500, help="Batch size para normalización de DB")
    return parser.parse_args()


def _get_bucket_name(explicit: Optional[str]) -> str:
    if explicit:
        return explicit
    return os.getenv("SUPABASE_STORAGE_BUCKET", "photos")


def _list_objects(sb, bucket: str, prefix: str = "") -> Iterable[Tuple[str, Dict]]:
    queue: List[str] = [prefix] if prefix else [""]
    visited = set(queue)

    while queue:
        current = queue.pop(0)
        offset = 0
        while True:
            items = sb.storage.from_(bucket).list(current, {"limit": 1000, "offset": offset})
            if not items:
                break
            for item in items:
                name = item.get("name")
                if not name:
                    continue
                metadata = item.get("metadata")
                if item.get("id") or metadata:
                    key = f"{current}/{name}" if current else name
                    yield key, metadata or {}
                else:
                    folder_path = f"{current}/{name}" if current else name
                    if folder_path not in visited:
                        visited.add(folder_path)
                        queue.append(folder_path)
            offset += len(items)
            if len(items) < 1000:
                break


def _normalize_etag(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value.strip("\"")


def _migrate_object(
    sb,
    bucket: str,
    key: str,
    metadata: Dict,
    dry_run: bool,
    r2_client,
    r2_bucket: str,
) -> Tuple[bool, bool]:
    if dry_run:
        logger.info("[dry-run] Migrar %s", key)
        return True, True

    data = sb.storage.from_(bucket).download(key)
    content_type = metadata.get("mimetype") or metadata.get("contentType") or metadata.get("content-type")
    cache_control = metadata.get("cacheControl")

    r2_storage.upload_object(
        key=key,
        data=data,
        content_type=content_type,
        cache_control=cache_control,
    )

    head = r2_client.head_object(Bucket=r2_bucket, Key=key)
    expected_size = metadata.get("size") or len(data)
    expected_etag = _normalize_etag(metadata.get("eTag") or metadata.get("etag"))
    actual_size = head.get("ContentLength")
    actual_etag = _normalize_etag(head.get("ETag"))

    size_ok = actual_size == expected_size
    etag_ok = True if expected_etag is None else expected_etag == actual_etag

    if not size_ok:
        logger.warning("[integridad] Size mismatch %s (supabase=%s, r2=%s)", key, expected_size, actual_size)
    if not etag_ok:
        logger.warning("[integridad] ETag mismatch %s (supabase=%s, r2=%s)", key, expected_etag, actual_etag)

    return size_ok, etag_ok


def _extract_key_from_url(value: str, bucket: str, r2_public_base_url: Optional[str]) -> Optional[str]:
    if not value.startswith("http://") and not value.startswith("https://"):
        return None
    parsed = urlparse(value)
    path = parsed.path.lstrip("/")

    if r2_public_base_url:
        r2_parsed = urlparse(r2_public_base_url)
        if parsed.netloc == r2_parsed.netloc:
            base_path = r2_parsed.path.lstrip("/")
            if base_path and path.startswith(base_path):
                trimmed = path[len(base_path):].lstrip("/")
                return trimmed or None
            if not base_path:
                return path or None

    supabase_prefix = f"storage/v1/object/public/{bucket}/"
    if path.startswith(supabase_prefix):
        return path[len(supabase_prefix):]
    return None


def _normalize_db_urls(sb, bucket: str, batch_size: int) -> None:
    r2_public_base_url = None
    try:
        r2_public_base_url = r2_storage.get_config().public_base_url
    except Exception:
        r2_public_base_url = None

    columns = ["id", "storage_path", "variants"]
    include_public_url = False
    try:
        sb.table("fotos").select("id, public_url").limit(1).execute()
        include_public_url = True
        columns.append("public_url")
    except Exception:
        include_public_url = False

    offset = 0
    updated = 0

    while True:
        response = sb.table("fotos").select(", ".join(columns)).range(offset, offset + batch_size - 1).execute()
        rows = response.data or []
        if not rows:
            break

        for row in rows:
            update_data: Dict[str, object] = {}
            storage_path = row.get("storage_path")
            if isinstance(storage_path, str):
                new_path = _extract_key_from_url(storage_path, bucket, r2_public_base_url)
                if new_path:
                    update_data["storage_path"] = new_path

            variants = row.get("variants")
            if isinstance(variants, dict):
                new_variants = {}
                changed = False
                for key, value in variants.items():
                    if isinstance(value, str):
                        extracted = _extract_key_from_url(value, bucket, r2_public_base_url)
                        if extracted:
                            new_variants[key] = extracted
                            changed = True
                        else:
                            new_variants[key] = value
                    else:
                        new_variants[key] = value
                if changed:
                    update_data["variants"] = new_variants

            if include_public_url:
                public_url = row.get("public_url")
                if isinstance(public_url, str):
                    extracted = _extract_key_from_url(public_url, bucket, r2_public_base_url)
                    if extracted:
                        update_data["public_url"] = r2_storage.get_public_url(extracted)

            if update_data:
                sb.table("fotos").update(update_data).eq("id", row["id"]).execute()
                updated += 1

        offset += len(rows)

    logger.info("Normalización completada. Filas actualizadas: %s", updated)


def main() -> None:
    args = _parse_args()
    logging.basicConfig(level=logging.INFO)

    bucket = _get_bucket_name(args.bucket)
    sb = get_service()
    r2_client = r2_storage.get_client()
    r2_config = r2_storage.get_config()

    logger.info("Bucket Supabase: %s", bucket)
    logger.info("Bucket R2: %s", r2_config.bucket)
    if args.prefix:
        logger.info("Prefijo: %s", args.prefix)

    total = 0
    size_ok_count = 0
    etag_ok_count = 0

    for key, metadata in _list_objects(sb, bucket, args.prefix):
        total += 1
        try:
            size_ok, etag_ok = _migrate_object(
                sb,
                bucket,
                key,
                metadata,
                args.dry_run,
                r2_client,
                r2_config.bucket,
            )
            if size_ok:
                size_ok_count += 1
            if etag_ok:
                etag_ok_count += 1
        except Exception as exc:
            logger.error("Error migrando %s: %s", key, exc)

    logger.info("Migración completada. Total: %s", total)
    logger.info("Integridad size OK: %s", size_ok_count)
    logger.info("Integridad etag OK: %s", etag_ok_count)

    if args.normalize_db_urls:
        _normalize_db_urls(sb, bucket, args.batch_size)


if __name__ == "__main__":
    main()
