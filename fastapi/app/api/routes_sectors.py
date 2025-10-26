# app/api/routes_sectors.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from typing import Optional, Any, Dict
from app.middleware.auth_middleware import get_current_user
from app.services import sectors_service as svc

router = APIRouter()

# ===========================
#         PÚBLICO (QR)
# ===========================

@router.get("/public")
def list_sectors_public(q: Optional[str] = Query(None, description="Filtro por nombre (opcional)")):
    """
    Lista pública de sectores (sin auth).
    """
    return svc.list_public(q)

@router.get("/public/{qr_code}")
def get_sector_public(qr_code: str = Path(..., description="QR code del sector")):
    """
    Ficha pública de un sector por su QR (sin auth).
    """
    row = svc.get_public_by_qr(qr_code)
    if not row:
        raise HTTPException(404, "Sector no encontrado")
    return row

@router.get("/public/{qr_code}/species")
def list_species_by_sector_public(qr_code: str):
    """
    Lista pública de especies para un sector identificado por QR (sin auth).
    """
    out = svc.list_species_public_by_sector_qr(qr_code)
    # Si el QR no existe, el servicio retorna []; podrías distinguir entre "sin especies" y "no existe"
    return out

# ===========================
#       STAFF (privado) - Auth DESACTIVADA temporalmente
# ===========================

# @router.get("/staff", dependencies=[Depends(get_current_user)])
@router.get("/staff")  # Auth desactivada para desarrollo
def list_sectors_staff(q: Optional[str] = Query(None, description="Filtro por nombre (opcional)")):
    """
    Lista privada de sectores (requiere usuario autenticado).
    """
    return svc.list_staff(q)

# @router.get("/staff/{sector_id}", dependencies=[Depends(get_current_user)])
@router.get("/staff/{sector_id}")  # Auth desactivada para desarrollo
def get_sector_staff(sector_id: int = Path(..., ge=1)):
    """
    Detalle privado de sector (requiere usuario autenticado).
    """
    row = svc.get_staff(sector_id)
    if not row:
        raise HTTPException(404, "Sector no encontrado")
    return row

# @router.post("/staff", dependencies=[Depends(get_current_user)])
@router.post("/staff")  # Auth desactivada para desarrollo
def create_sector_staff(payload: Dict[str, Any]):
    """
    Crea un sector (requiere usuario autenticado).
    """
    try:
        created = svc.create_staff(payload)
        return created
    except ValueError as e:
        raise HTTPException(400, str(e))

# @router.put("/staff/{sector_id}", dependencies=[Depends(get_current_user)])
@router.put("/staff/{sector_id}")  # Auth desactivada para desarrollo
def update_sector_staff(sector_id: int, payload: Dict[str, Any]):
    """
    Actualiza un sector (requiere usuario autenticado).
    """
    try:
        updated = svc.update_staff(sector_id, payload)
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

# @router.delete("/staff/{sector_id}", status_code=204, dependencies=[Depends(get_current_user)])
@router.delete("/staff/{sector_id}", status_code=204)  # Auth desactivada para desarrollo
def delete_sector_admin(sector_id: int):
    """
    Elimina un sector (requiere usuario autenticado).
    """
    svc.delete_admin(sector_id)
    return
