"""
Authentication middleware for JWT validation and user context
"""
import os
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.core.security import (
    get_token_from_request,
    validate_supabase_jwt,
    validate_user_active,
)

# BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
# Por defecto está DESACTIVADO (requiere autenticación)
# Para activar el bypass en desarrollo: setear BYPASS_AUTH=true en la variable de entorno
BYPASS_AUTH = os.getenv("BYPASS_AUTH", "false").lower() == "true"

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        """
        Authentication middleware that validates JWT tokens and sets user context
        """
        # BYPASS AUTH EN DESARROLLO LOCAL
        if BYPASS_AUTH:
            # Mock user para desarrollo local
            request.state.user = {
                "id": "dev-user-123",
                "email": "dev@cactario.local",
                "role": "authenticated"
            }
            return await call_next(request)
        
        # Skip auth for certain endpoints
        skip_auth_paths = [
            "/auth/request-otp",
            "/auth/verify-otp", 
            "/auth/refresh",
            "/auth/logout",
            "/auth/me",  # Allow /auth/me to be accessed without auth for user verification
            "/docs",
            "/openapi.json",
            "/health",
            "/debug"
            # "/photos" removed - ahora requiere autenticación
        ]
        
        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Skip exact root path
        if request.url.path == "/":
            return await call_next(request)
        
        # Check if path should skip auth (exact match or starts with)
        if any(request.url.path.startswith(path) for path in skip_auth_paths):
            return await call_next(request)
        
        # Skip auth for public endpoints (any path containing /public)
        # This covers /sectors/public, /species/public, and their sub-paths
        if "/public" in request.url.path:
            return await call_next(request)

        # Allow public photo GET endpoints without requiring auth
        if request.method == "GET" and request.url.path.startswith("/photos"):
            return await call_next(request)
        
        # Get token from request
        token = get_token_from_request(request)
        
        # Logging solo en desarrollo o si es necesario debuggear
        import logging
        import os
        logger = logging.getLogger(__name__)
        
        # Solo log detallado si DEBUG está activado
        if os.getenv("DEBUG", "").lower() == "true":
            logger.info(f"[AuthMiddleware] Path: {request.url.path}, Token: {bool(token)}")
        elif not token:
            # Solo logar si falta token (error común)
            logger.warning(f"[AuthMiddleware] No token for path: {request.url.path}")

        
        if not token:
            response = JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token de autenticación no encontrado"}
            )
            # Add CORS headers to error response
            origin = request.headers.get("origin")
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
        
        # Validate JWT token
        user_claims = validate_supabase_jwt(token)
        
        if not user_claims:
            response = JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token inválido o expirado"}
            )
            # Add CORS headers to error response
            origin = request.headers.get("origin")
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
        
        # Validate user is active in database
        if not validate_user_active(user_claims["id"]):
            response = JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Cuenta de usuario inactiva"}
            )
            # Add CORS headers to error response
            origin = request.headers.get("origin")
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
        
        # Set user context in request state
        request.state.user = user_claims
        
        return await call_next(request)

# Create middleware instance
auth_middleware = AuthMiddleware

def get_current_user(request: Request) -> dict:
    """
    Dependency to get current authenticated user
    """
    # BYPASS AUTH EN DESARROLLO LOCAL
    if BYPASS_AUTH:
        return {
            "id": "dev-user-123",
            "email": "dev@cactario.local",
            "role": "authenticated"
        }
    
    if not hasattr(request.state, 'user'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado"
        )
    return request.state.user
