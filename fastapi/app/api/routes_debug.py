from fastapi import APIRouter, Request
from fastapi.routing import APIRoute
from app.core.supabase_auth import get_public, get_service

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
