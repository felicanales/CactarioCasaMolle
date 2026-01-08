from fastapi import APIRouter, Request, HTTPException
from fastapi.routing import APIRoute
from app.core.supabase_auth import get_public, get_service
import os
import sys
import platform
from datetime import datetime

router = APIRouter()

# Habilita endpoints de debug solo si se setea explícitamente
DEBUG_ROUTES_ENABLED = os.getenv("ENABLE_DEBUG_ROUTES", "").lower() == "true" or os.getenv("DEBUG", "").lower() == "true"


def _require_debug_enabled():
    if not DEBUG_ROUTES_ENABLED:
        raise HTTPException(status_code=404, detail="Not found")


@router.get("/", summary="Ping Debug")
def ping():
    _require_debug_enabled()
    return {"ok": True, "message": "Debug endpoint working"}


@router.get("/routes", summary="List routes")
def list_routes(request: Request):
    """List all available routes"""
    _require_debug_enabled()
    routes = []
    for route in request.app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append(
                {
                    "path": route.path,
                    "name": getattr(route, "name", ""),
                    "methods": list(route.methods) if route.methods else [],
                }
            )
    return routes


@router.get("/auth-status", summary="Check auth status")
def auth_status(request: Request):
    """Check authentication status and available tokens"""
    _require_debug_enabled()
    token = request.cookies.get("sb-access-token")
    refresh_token = request.cookies.get("sb-refresh-token")
    csrf_token = request.cookies.get("csrf-token")

    return {
        "has_access_token": bool(token),
        "has_refresh_token": bool(refresh_token),
        "has_csrf_token": bool(csrf_token),
        "cookies": list(request.cookies.keys()),
    }


@router.get("/supabase-status", summary="Check Supabase connection")
def supabase_status():
    """Check Supabase connection status"""
    _require_debug_enabled()
    try:
        sb_public = get_public()
        sb_service = get_service()
        return {
            "public_client": "connected",
            "service_client": "connected",
            "status": "ok",
        }
    except Exception as e:
        return {
            "error": str(e),
            "status": "error",
        }


@router.get("/cors-status", summary="Check CORS configuration")
def cors_status(request: Request):
    """Check CORS configuration and origins"""
    _require_debug_enabled()
    origin = request.headers.get("origin")
    user_agent = request.headers.get("user-agent")

    cors_middleware = None
    for middleware in request.app.user_middleware:
        if hasattr(middleware, "cls") and "CORSMiddleware" in str(middleware.cls):
            cors_middleware = middleware
            break

    return {
        "origin": origin,
        "user_agent": user_agent,
        "cors_middleware_configured": cors_middleware is not None,
        "allowed_origins": getattr(cors_middleware, "allowed_origins", []) if cors_middleware else [],
        "headers": dict(request.headers),
    }


@router.get("/environment", summary="Environment and system information")
def environment_info():
    """
    Devuelve información completa del entorno para debugging.
    Incluye variables de Railway, configuración del sistema, y estado de dependencias.
    """
    _require_debug_enabled()

    railway_vars = {
        "PORT": os.getenv("PORT", "No definido"),
        "RAILWAY_ENVIRONMENT_NAME": os.getenv("RAILWAY_ENVIRONMENT_NAME", "No definido"),
        "RAILWAY_ENVIRONMENT": os.getenv("RAILWAY_ENVIRONMENT", "No definido"),
        "RAILWAY_PROJECT_NAME": os.getenv("RAILWAY_PROJECT_NAME", "No definido"),
        "RAILWAY_PROJECT_ID": os.getenv("RAILWAY_PROJECT_ID", "No definido"),
        "RAILWAY_SERVICE_NAME": os.getenv("RAILWAY_SERVICE_NAME", "No definido"),
        "RAILWAY_SERVICE_ID": os.getenv("RAILWAY_SERVICE_ID", "No definido"),
        "RAILWAY_DEPLOYMENT_ID": os.getenv("RAILWAY_DEPLOYMENT_ID", "No definido"),
        "RAILWAY_REGION": os.getenv("RAILWAY_REGION", "No definido"),
        "RAILWAY_PUBLIC_DOMAIN": os.getenv("RAILWAY_PUBLIC_DOMAIN", "No definido"),
        "RAILWAY_PRIVATE_DOMAIN": os.getenv("RAILWAY_PRIVATE_DOMAIN", "No definido"),
    }

    supabase_vars = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL", "No definido"),
        "SUPABASE_ANON_KEY_SET": "Sí" if os.getenv("SUPABASE_ANON_KEY") else "No",
        "SUPABASE_SERVICE_ROLE_KEY_SET": "Sí" if os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "No",
    }

    r2_vars = {
        "R2_ACCOUNT_ID_SET": "Sí" if os.getenv("R2_ACCOUNT_ID") else "No",
        "R2_ACCESS_KEY_ID_SET": "Sí" if os.getenv("R2_ACCESS_KEY_ID") else "No",
        "R2_SECRET_ACCESS_KEY_SET": "Sí" if os.getenv("R2_SECRET_ACCESS_KEY") else "No",
        "R2_BUCKET_SET": "Sí" if os.getenv("R2_BUCKET") else "No",
        "R2_PUBLIC_BASE_URL": os.getenv("R2_PUBLIC_BASE_URL", "No definido"),
    }

    other_vars = {
        "ENV": os.getenv("ENV", "No definido"),
        "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "No definido"),
        "NODE_ENV": os.getenv("NODE_ENV", "No definido"),
    }

    system_info = {
        "python_version": sys.version,
        "python_executable": sys.executable,
        "platform": platform.platform(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "hostname": platform.node(),
        "working_directory": os.getcwd(),
        "pid": os.getpid(),
    }

    try:
        import fastapi

        fastapi_version = fastapi.__version__
    except Exception:
        fastapi_version = "No disponible"

    try:
        import uvicorn

        uvicorn_version = uvicorn.__version__
    except Exception:
        uvicorn_version = "No disponible"

    try:
        import supabase

        supabase_version = supabase.__version__
    except Exception:
        supabase_version = "No disponible"

    try:
        import boto3

        boto3_version = boto3.__version__
    except Exception:
        boto3_version = "No disponible"

    dependencies = {
        "fastapi": fastapi_version,
        "uvicorn": uvicorn_version,
        "supabase": supabase_version,
        "boto3": boto3_version,
    }

    config_status = {
        "port_configured": os.getenv("PORT") is not None,
        "supabase_url_configured": os.getenv("SUPABASE_URL") is not None,
        "supabase_anon_key_configured": os.getenv("SUPABASE_ANON_KEY") is not None,
        "supabase_service_role_key_configured": os.getenv("SUPABASE_SERVICE_ROLE_KEY") is not None,
        "r2_configured": all(
            [
                os.getenv("R2_ACCOUNT_ID"),
                os.getenv("R2_ACCESS_KEY_ID"),
                os.getenv("R2_SECRET_ACCESS_KEY"),
                os.getenv("R2_BUCKET"),
            ]
        ),
        "all_critical_vars_set": all(
            [
                os.getenv("PORT"),
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_ANON_KEY"),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
            ]
        ),
    }

    timestamp_info = {
        "server_time": datetime.now().isoformat(),
        "timezone": str(datetime.now().astimezone().tzinfo),
    }

    return {
        "status": "ok",
        "message": "Environment information retrieved successfully",
        "timestamp": timestamp_info,
        "railway": railway_vars,
        "supabase": supabase_vars,
        "r2": r2_vars,
        "environment": other_vars,
        "system": system_info,
        "dependencies": dependencies,
        "config_status": config_status,
    }


@router.get("/cookies", summary="Debug cookies y headers")
def debug_cookies(request: Request):
    """
    Endpoint de debug para ver todas las cookies y headers de la request.
    Útil para diagnosticar problemas de autenticación.
    """
    _require_debug_enabled()
    cookie_header = request.headers.get("cookie", "")

    return {
        "status": "ok",
        "cookies_found": len(request.cookies),
        "cookies": dict(request.cookies),
        "headers": {
            "origin": request.headers.get("origin"),
            "authorization": request.headers.get("authorization", "Not present")[:50] + "..."
            if request.headers.get("authorization") and len(request.headers.get("authorization")) > 50
            else request.headers.get("authorization", "Not present"),
            "user-agent": request.headers.get("user-agent"),
            "referer": request.headers.get("referer"),
            "cookie_header": cookie_header[:200] + "..."
            if len(cookie_header) > 200
            else cookie_header
            if cookie_header
            else "Not present",
            "host": request.headers.get("host"),
            "content-type": request.headers.get("content-type", "Not present"),
        },
        "request_info": {
            "url": str(request.url),
            "method": request.method,
            "client": str(request.client) if request.client else "Unknown",
            "path": request.url.path,
        },
    }
