# app/api/routes_home_content.py
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any
from app.middleware.auth_middleware import get_current_user
from app.services import home_content_service as svc

router = APIRouter()

# ===========================
#          PÚBLICO
# ===========================

@router.get("/public")
def get_home_content_public():
    """
    Obtiene el contenido público del home (sin autenticación).
    """
    content = svc.get_public()
    if not content:
        # Retornar contenido por defecto
        return {
            "welcome_text": "Bienvenido al Cactario CasaMolle",
            "carousel_images": [],
            "sections": []
        }
    return content

# ===========================
#        STAFF (privado)
# ===========================

@router.get("/staff", dependencies=[Depends(get_current_user)])
def get_home_content_staff():
    """
    Obtiene el contenido del home para staff (requiere usuario autenticado).
    """
    content = svc.get_staff()
    if not content:
        return {
            "welcome_text": "Bienvenido al Cactario CasaMolle",
            "carousel_images": [],
            "sections": []
        }
    return content

@router.post("/staff", dependencies=[Depends(get_current_user)])
def create_or_update_home_content_staff(
    payload: Dict[str, Any],
    request: Request
):
    """
    Crea o actualiza el contenido del home (requiere usuario autenticado).
    """
    try:
        user = request.state.user if hasattr(request.state, 'user') else None
        user_id = user.get("id") if user else None
        
        result = svc.create_or_update_staff(payload, user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/staff", dependencies=[Depends(get_current_user)])
def update_home_content_staff(
    payload: Dict[str, Any],
    request: Request
):
    """
    Actualiza el contenido del home (requiere usuario autenticado).
    Alias para POST (mismo comportamiento).
    """
    try:
        user = request.state.user if hasattr(request.state, 'user') else None
        user_id = user.get("id") if user else None
        
        result = svc.create_or_update_staff(payload, user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

