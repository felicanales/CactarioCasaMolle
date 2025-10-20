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

def set_supabase_session_cookies(response: Response, session) -> None:
    """
    Set Supabase session cookies with secure settings
    """
    at = session.access_token
    rt = session.refresh_token
    
    common = dict(
        httponly=True, 
        secure=True, 
        samesite="strict", 
        path="/"
    )
    
    # Access token: 1 hour
    response.set_cookie(
        SB_ACCESS_TOKEN, 
        at, 
        max_age=3600, 
        **common
    )
    
    # Refresh token: 30 days
    response.set_cookie(
        SB_REFRESH_TOKEN, 
        rt, 
        max_age=60*60*24*30, 
        **common
    )

def clear_supabase_session_cookies(response: Response) -> None:
    """
    Clear Supabase session cookies
    """
    response.delete_cookie(SB_ACCESS_TOKEN, path="/", samesite="strict", secure=True)
    response.delete_cookie(SB_REFRESH_TOKEN, path="/", samesite="strict", secure=True)

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
                "id": user_response.user.id,
                "email": user_response.user.email,
                "aud": user_response.user.aud,
                "role": user_response.user.role,
                "exp": user_response.user.exp,
                "iat": user_response.user.iat,
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
    
    if not csrf_token_header or not csrf_token_cookie:
        return False
    
    return csrf_token_header == csrf_token_cookie

def generate_csrf_token() -> str:
    """
    Generate a random CSRF token
    """
    import secrets
    return secrets.token_urlsafe(32)
