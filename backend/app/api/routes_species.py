# app/api/routes_species.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from typing import Optional, Dict, Any
from app.middleware.auth_middleware import get_current_user
from app.services import species_service as svc

router = APIRouter()

# ===========================
#          PÚBLICO
# ===========================

@router.get("/public")
def list_species_public(
    q: Optional[str] = Query(None, description="Filtro por nombre (opcional)"),
    limit: int = 50,
    offset: int = 0
):
    """
    Lista pública de especies (sin auth).
    """
    try:
        return svc.list_public(q, limit, offset)
    except RuntimeError as e:
        raise HTTPException(500, str(e))

@router.get("/public/{slug}")
def get_species_public(slug: str = Path(..., description="Slug de la especie")):
    """
    Ficha pública de especie por slug (sin auth).
    """
    try:
        row = svc.get_public_by_slug(slug)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    if not row:
        raise HTTPException(404, "Especie no encontrada")
    return row

# ===========================
#        STAFF (privado)
# ===========================

@router.get("/staff", dependencies=[Depends(get_current_user)])
def list_species_staff(
    q: Optional[str] = Query(None, description="Filtro por nombre (opcional)"),
    limit: int = 100,
    offset: int = 0
):
    """
    Lista privada de especies (requiere usuario autenticado).
    """
    return svc.list_staff(q, limit, offset)

@router.get("/staff/{species_id}", dependencies=[Depends(get_current_user)])
def get_species_staff(species_id: int = Path(..., ge=1)):
    """
    Detalle privado de especie (requiere usuario autenticado).
    """
    row = svc.get_staff(species_id)
    if not row:
        raise HTTPException(404, "Especie no encontrada")
    return row

@router.post("/staff", dependencies=[Depends(get_current_user)])
def create_species_staff(payload: Dict[str, Any], request: Request, current_user: dict = Depends(get_current_user)):
    """
    Crea especie (requiere usuario autenticado).
    """
    try:
        user_id = current_user.get('id')
        user_email = current_user.get('email')
        user_name = current_user.get('full_name') or current_user.get('username')
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        
        created = svc.create_staff(payload, user_id=user_id, user_email=user_email, user_name=user_name, ip_address=ip_address, user_agent=user_agent)
        return created
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.put("/staff/{species_id}", dependencies=[Depends(get_current_user)])
def update_species_staff(species_id: int, payload: Dict[str, Any], request: Request, current_user: dict = Depends(get_current_user)):
    """
    Actualiza especie (requiere usuario autenticado).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        user_id = current_user.get('id')
        user_email = current_user.get('email')
        user_name = current_user.get('full_name') or current_user.get('username')
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        
        logger.info(f"[update_species_staff] Usuario: id={user_id}, email={user_email}, name={user_name}")
        logger.info(f"[update_species_staff] Request info: ip={ip_address}, user_agent={user_agent}")
        
        updated = svc.update_staff(species_id, payload, user_id=user_id, user_email=user_email, user_name=user_name, ip_address=ip_address, user_agent=user_agent)
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/staff/{species_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_species_admin(species_id: int, request: Request, current_user: dict = Depends(get_current_user)):
    """
    Elimina especie (requiere usuario autenticado).
    """
    user_id = current_user.get('id')
    user_email = current_user.get('email')
    user_name = current_user.get('full_name') or current_user.get('username')
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get('user-agent')
    
    svc.delete_admin(species_id, user_id=user_id, user_email=user_email, user_name=user_name, ip_address=ip_address, user_agent=user_agent)
    return
