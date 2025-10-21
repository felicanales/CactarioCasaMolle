from fastapi import APIRouter, Request
from fastapi.routing import APIRoute
from app.core.supabase_auth import get_public, get_service
import os
import sys
import platform
from datetime import datetime

router = APIRouter()

@router.get("/", summary="Ping Debug")
def ping():
    return {"ok": True, "message": "Debug endpoint working"}

@router.get("/routes", summary="List routes")
def list_routes(request: Request):
    """List all available routes"""
    routes = []
    for route in request.app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "name": getattr(route, 'name', ''),
                "methods": list(route.methods) if route.methods else []
            })
    return routes

@router.get("/auth-status", summary="Check auth status")
def auth_status(request: Request):
    """Check authentication status and available tokens"""
    token = request.cookies.get("sb-access-token")
    refresh_token = request.cookies.get("sb-refresh-token")
    csrf_token = request.cookies.get("csrf-token")
    
    return {
        "has_access_token": bool(token),
        "has_refresh_token": bool(refresh_token),
        "has_csrf_token": bool(csrf_token),
        "cookies": list(request.cookies.keys())
    }

@router.get("/supabase-status", summary="Check Supabase connection")
def supabase_status():
    """Check Supabase connection status"""
    try:
        sb_public = get_public()
        sb_service = get_service()
        return {
            "public_client": "connected",
            "service_client": "connected",
            "status": "ok"
        }
    except Exception as e:
        return {
            "error": str(e),
            "status": "error"
        }

@router.get("/cors-status", summary="Check CORS configuration")
def cors_status(request: Request):
    """Check CORS configuration and origins"""
    origin = request.headers.get("origin")
    user_agent = request.headers.get("user-agent")
    
    # Get CORS middleware info
    cors_middleware = None
    for middleware in request.app.user_middleware:
        if hasattr(middleware, 'cls') and 'CORSMiddleware' in str(middleware.cls):
            cors_middleware = middleware
            break
    
    return {
        "origin": origin,
        "user_agent": user_agent,
        "cors_middleware_configured": cors_middleware is not None,
        "allowed_origins": getattr(cors_middleware, 'allowed_origins', []) if cors_middleware else [],
        "headers": dict(request.headers)
    }

@router.get("/environment", summary="Environment and system information")
def environment_info():
    """
    Devuelve información completa del entorno para debugging.
    Incluye variables de Railway, configuración del sistema, y estado de dependencias.
    """
    
    # Variables de Railway
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
    
    # Variables de Supabase (sin exponer secretos)
    supabase_vars = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL", "No definido"),
        "SUPABASE_ANON_KEY_SET": "Sí" if os.getenv("SUPABASE_ANON_KEY") else "No",
        "SUPABASE_SERVICE_ROLE_KEY_SET": "Sí" if os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "No",
    }
    
    # Otras variables de entorno relevantes
    other_vars = {
        "ENV": os.getenv("ENV", "No definido"),
        "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "No definido"),
        "NODE_ENV": os.getenv("NODE_ENV", "No definido"),
    }
    
    # Información del sistema
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
    
    # Información de dependencias críticas
    try:
        import fastapi
        fastapi_version = fastapi.__version__
    except:
        fastapi_version = "No disponible"
    
    try:
        import uvicorn
        uvicorn_version = uvicorn.__version__
    except:
        uvicorn_version = "No disponible"
    
    try:
        import supabase
        supabase_version = supabase.__version__
    except:
        supabase_version = "No disponible"
    
    dependencies = {
        "fastapi": fastapi_version,
        "uvicorn": uvicorn_version,
        "supabase": supabase_version,
    }
    
    # Validación de configuración
    config_status = {
        "port_configured": os.getenv("PORT") is not None,
        "supabase_url_configured": os.getenv("SUPABASE_URL") is not None,
        "supabase_anon_key_configured": os.getenv("SUPABASE_ANON_KEY") is not None,
        "supabase_service_role_key_configured": os.getenv("SUPABASE_SERVICE_ROLE_KEY") is not None,
        "all_critical_vars_set": all([
            os.getenv("PORT"),
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_ANON_KEY"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        ])
    }
    
    # Timestamp
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
        "environment": other_vars,
        "system": system_info,
        "dependencies": dependencies,
        "config_status": config_status,
    }
