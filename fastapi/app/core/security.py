"""
Security utilities for Supabase JWT validation and cookie management
"""
import os
import json
import requests
from typing import Optional, Dict, Any
from fastapi import Response, Request, HTTPException
from supabase import create_client, Client
from app.core.supabase_auth import get_public, get_service

# Cookie names for Supabase session
SB_ACCESS_TOKEN = "sb-access-token"
SB_REFRESH_TOKEN = "sb-refresh-token"

# Determine if we're in production (use secure cookies only in production)
# En desarrollo local, estas variables NO existirán
IS_PRODUCTION = (
    os.getenv("RAILWAY_ENVIRONMENT") is not None or 
    os.getenv("RAILWAY_ENVIRONMENT_NAME") is not None or
    os.getenv("PRODUCTION", "").lower() == "true"
)

# Log environment for debugging
import logging
logger = logging.getLogger(__name__)
logger.info(f"Security module loaded - IS_PRODUCTION: {IS_PRODUCTION}, secure cookies: {IS_PRODUCTION}")

def set_supabase_session_cookies(response: Response, session) -> None:
    """
    Set Supabase session cookies with secure settings
    In development (localhost), secure=False to allow HTTP
    In production (Railway), secure=True to require HTTPS
    For cross-domain cookies (frontend and backend on different domains), use samesite="none"
    """
    at = session.access_token
    rt = session.refresh_token
    
    # En desarrollo, usar lax para que funcione entre puertos en localhost
    # En producción, usar none para permitir cookies cross-domain (frontend y backend en dominios diferentes)
    samesite_value = "lax" if not IS_PRODUCTION else "none"
    
    common = dict(
        httponly=True, 
        secure=IS_PRODUCTION,  # Only secure in production (required for samesite=none)
        samesite=samesite_value,  # lax en dev, none en prod para cross-domain
        path="/"
    )
    
    logger.info(f"[Security] Configurando cookies con: secure={IS_PRODUCTION}, samesite={samesite_value}, httponly=True")
    
    # Access token: 1 hour
    response.set_cookie(
        SB_ACCESS_TOKEN, 
        at, 
        max_age=3600, 
        **common
    )
    logger.info(f"[Security] Cookie {SB_ACCESS_TOKEN} configurada (expires en 1h)")
    
    # Refresh token: 30 days
    response.set_cookie(
        SB_REFRESH_TOKEN, 
        rt, 
        max_age=60*60*24*30, 
        **common
    )
    logger.info(f"[Security] Cookie {SB_REFRESH_TOKEN} configurada (expires en 30d)")

def clear_supabase_session_cookies(response: Response) -> None:
    """
    Clear Supabase session cookies
    """
    # En producción, usar samesite="none" para cookies cross-domain
    samesite_value = "lax" if not IS_PRODUCTION else "none"
    response.delete_cookie(SB_ACCESS_TOKEN, path="/", samesite=samesite_value, secure=IS_PRODUCTION)
    response.delete_cookie(SB_REFRESH_TOKEN, path="/", samesite=samesite_value, secure=IS_PRODUCTION)

def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract JWT token from Authorization header or cookie
    """
    # Check Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]  # Remove "Bearer " prefix
    
    # Fallback to cookie
    return request.cookies.get(SB_ACCESS_TOKEN)

def get_refresh_token_from_request(request: Request) -> Optional[str]:
    """
    Extract refresh token from cookie
    """
    return request.cookies.get(SB_REFRESH_TOKEN)

def validate_supabase_jwt(token: str) -> Optional[Dict[str, Any]]:
    """
    Validate Supabase JWT token and return decoded claims
    """
    try:
        sb = get_public()
        user_response = sb.auth.get_user(token)
        
        if user_response.user:
            return {
                "id": str(user_response.user.id),
                "email": user_response.user.email,
                "role": user_response.user.role,
                # Note: exp, iat, aud are in the JWT token itself, not in the User object
                # We only return what's available in the User object from Supabase
            }
        return None
    except Exception as e:
        print(f"JWT validation error: {e}")
        return None

def validate_user_active(user_id: str) -> bool:
    """
    Validate that user is active in the usuarios table using service role
    """
    try:
        sb_admin = get_service()
        result = sb_admin.table("usuarios").select("active").eq("supabase_uid", user_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0].get("active", False)
        return False
    except Exception as e:
        print(f"Error validating user active status: {e}")
        return False

def sync_user_supabase_uid(email: str, supabase_uid: str) -> None:
    """
    Sync supabase_uid in usuarios table using service role
    """
    try:
        sb_admin = get_service()
        sb_admin.table("usuarios").update({"supabase_uid": supabase_uid}).eq("email", email).execute()
        print(f"Synced supabase_uid for user: {email}")
    except Exception as e:
        print(f"Error syncing supabase_uid: {e}")

def validate_csrf_token(request: Request) -> bool:
    """
    Validate CSRF token using double-submit cookie pattern
    """
    csrf_token_header = request.headers.get("X-CSRF-Token")
    csrf_token_cookie = request.cookies.get("csrf-token")
    
    # Logging para debugging (solo si DEBUG está activado o si falla)
    import os
    if os.getenv("DEBUG", "").lower() == "true" or not csrf_token_header or not csrf_token_cookie:
        logger.info(f"[CSRF] Header: {bool(csrf_token_header)}, Cookie: {bool(csrf_token_cookie)}")
        if csrf_token_header and csrf_token_cookie:
            logger.info(f"[CSRF] Tokens match: {csrf_token_header == csrf_token_cookie}")
    
    if not csrf_token_header or not csrf_token_cookie:
        logger.warning(f"[CSRF] Missing token - Header: {bool(csrf_token_header)}, Cookie: {bool(csrf_token_cookie)}")
        return False
    
    tokens_match = csrf_token_header == csrf_token_cookie
    if not tokens_match:
        logger.warning(f"[CSRF] Tokens do not match - Header: {csrf_token_header[:10]}..., Cookie: {csrf_token_cookie[:10]}...")
    
    return tokens_match

def generate_csrf_token() -> str:
    """
    Generate a random CSRF token
    """
    import secrets
    return secrets.token_urlsafe(32)
