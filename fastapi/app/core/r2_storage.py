from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Optional
import os

import boto3
from botocore.client import Config


@dataclass(frozen=True)
class R2Config:
    account_id: str
    access_key_id: str
    secret_access_key: str
    bucket: str
    public_base_url: Optional[str]
    signed_url_ttl: int


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Falta la variable de entorno requerida: {name}")
    return value


def _normalize_public_base_url(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().rstrip("/")
    if not normalized.startswith("http://") and not normalized.startswith("https://"):
        normalized = f"https://{normalized}"
    return normalized


@lru_cache(maxsize=1)
def get_config() -> R2Config:
    return R2Config(
        account_id=_require_env("R2_ACCOUNT_ID"),
        access_key_id=_require_env("R2_ACCESS_KEY_ID"),
        secret_access_key=_require_env("R2_SECRET_ACCESS_KEY"),
        bucket=_require_env("R2_BUCKET"),
        public_base_url=_normalize_public_base_url(os.getenv("R2_PUBLIC_BASE_URL")),
        signed_url_ttl=int(os.getenv("R2_SIGNED_URL_TTL", "3600")),
    )


@lru_cache(maxsize=1)
def get_client():
    config = get_config()
    endpoint = f"https://{config.account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=config.access_key_id,
        aws_secret_access_key=config.secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_object(key: str, data: bytes, content_type: Optional[str] = None) -> None:
    config = get_config()
    client = get_client()
    extra_args = {"ContentType": content_type} if content_type else {}
    client.put_object(Bucket=config.bucket, Key=key, Body=data, **extra_args)


def delete_object(key: str) -> None:
    config = get_config()
    client = get_client()
    client.delete_object(Bucket=config.bucket, Key=key)


def get_public_url(key: str) -> str:
    config = get_config()
    base_url = config.public_base_url or f"https://{config.account_id}.r2.cloudflarestorage.com/{config.bucket}"
    normalized_key = key.lstrip("/")
    return f"{base_url}/{normalized_key}"


def get_signed_url(key: str, ttl: Optional[int] = None) -> str:
    config = get_config()
    client = get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": config.bucket, "Key": key},
        ExpiresIn=ttl or config.signed_url_ttl,
    )


def should_use_signed_urls() -> bool:
    config = get_config()
    return not bool(config.public_base_url)
