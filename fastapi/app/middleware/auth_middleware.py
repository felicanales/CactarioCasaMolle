"""
Authentication middleware for JWT validation and user context
"""
from typing import Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.core.security import (
    get_token_from_request, 
    validate_supabase_jwt, 
    validate_user_active,
    validate_csrf_token
)

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        """
        Authentication middleware that validates JWT tokens and sets user context
        """
        # Skip auth for certain endpoints
        skip_auth_paths = [
            "/auth/request-otp",
            "/auth/verify-otp", 
            "/auth/refresh",
            "/auth/logout",
            "/docs",
            "/openapi.json",
            "/health",
            "/debug",
            "/"
        ]
        
        # Check if path should skip auth
        if any(request.url.path.startswith(path) for path in skip_auth_paths):
            return await call_next(request)
        
        # Get token from request
        token = get_token_from_request(request)
        
        if not token:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing authentication token"}
            )
        
        # Validate JWT token
        user_claims = validate_supabase_jwt(token)
        
        if not user_claims:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid or expired token"}
            )
        
        # Validate user is active in database
        if not validate_user_active(user_claims["id"]):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "User account is inactive"}
            )
        
        # Set user context in request state
        request.state.user = user_claims
        
        # Validate CSRF token for state-changing operations
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            if not validate_csrf_token(request):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Invalid CSRF token"}
                )
        
        return await call_next(request)

# Create middleware instance
auth_middleware = AuthMiddleware

def get_current_user(request: Request) -> dict:
    """
    Dependency to get current authenticated user
    """
    if not hasattr(request.state, 'user'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated"
        )
    return request.state.user
