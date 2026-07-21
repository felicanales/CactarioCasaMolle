"""Authentication middleware for JWT validation and user context."""

import logging
import os

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.security import (
    IS_PRODUCTION,
    get_token_from_request,
    validate_supabase_jwt,
    validate_user_active,
)

logger = logging.getLogger(__name__)

# El bypass es una ayuda local. Railway/producción lo ignora aunque la variable
# quede configurada accidentalmente.
def _is_bypass_enabled() -> bool:
    return (
        not IS_PRODUCTION
        and os.getenv("BYPASS_AUTH", "false").strip().lower() == "true"
    )


BYPASS_AUTH = _is_bypass_enabled()

PUBLIC_AUTH_PATHS = {
    "/auth/request-otp",
    "/auth/verify-otp",
    "/auth/master-key-login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/me",
    "/openapi.json",
    "/health",
}

PUBLIC_API_PREFIXES = (
    "/species/public",
    "/sectors/public",
    "/home-content/public",
)


def _is_public_path(path: str, method: str) -> bool:
    """Match only intentional public routes, avoiding broad substring matches."""
    if path in PUBLIC_AUTH_PATHS or path == "/":
        return True
    if path == "/docs" or path.startswith("/docs/"):
        return True
    if any(path == prefix or path.startswith(f"{prefix}/") for prefix in PUBLIC_API_PREFIXES):
        return True
    return method == "GET" and (path == "/photos" or path.startswith("/photos/"))


def _auth_error(request: Request, status_code: int, detail: str) -> JSONResponse:
    response = JSONResponse(status_code=status_code, content={"detail": detail})
    # AuthMiddleware envuelve actualmente a CORSMiddleware, por lo que sus
    # respuestas tempranas deben conservar las cabeceras para requests web.
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        if BYPASS_AUTH:
            request.state.user = {
                "id": "dev-user-123",
                "email": "dev@cactario.local",
                "role": "authenticated",
            }
            return await call_next(request)

        if request.method == "OPTIONS" or _is_public_path(request.url.path, request.method):
            return await call_next(request)

        token = get_token_from_request(request)
        if os.getenv("DEBUG", "").lower() == "true":
            logger.info(
                "[AuthMiddleware] Path: %s, token present: %s",
                request.url.path,
                bool(token),
            )
        elif not token:
            logger.warning("[AuthMiddleware] Missing token for path: %s", request.url.path)

        if not token:
            return _auth_error(
                request,
                status.HTTP_401_UNAUTHORIZED,
                "Token de autenticación no encontrado",
            )

        user_claims = validate_supabase_jwt(token)
        if not user_claims:
            return _auth_error(
                request,
                status.HTTP_401_UNAUTHORIZED,
                "Token inválido o expirado",
            )

        if not validate_user_active(user_claims["id"]):
            return _auth_error(
                request,
                status.HTTP_403_FORBIDDEN,
                "Cuenta de usuario inactiva",
            )

        request.state.user = user_claims
        return await call_next(request)


auth_middleware = AuthMiddleware


def get_current_user(request: Request) -> dict:
    if BYPASS_AUTH:
        return {
            "id": "dev-user-123",
            "email": "dev@cactario.local",
            "role": "authenticated",
        }

    if not hasattr(request.state, "user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado",
        )
    return request.state.user
