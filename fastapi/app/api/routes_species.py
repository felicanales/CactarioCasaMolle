# app/api/routes_species.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import Optional, Dict, Any
from app.utils.security_utils import get_current_user
from app.services import species_service as svc

router = APIRouter()

# ===========================
#          PÚBLICO
# ===========================

@router.get("/public")
def list_species_public(q: Optional[str] = Query(None, description="Filtro por nombre (opcional)"),
                        limit: int = 50, offset: int = 0):
    return svc.list_public(q, limit, offset)

@router.get("/public/{slug}")
def get_species_public(slug: str = Path(..., description="Slug de la especie")):
    row = svc.get_public_by_slug(slug)
    if not row:
        raise HTTPException(404, "Especie no encontrada")
    return row

# ===========================
#        STAFF (privado)
# ===========================

@router.get("/staff", dependencies=[Depends(get_current_user)])
def list_species_staff(q: Optional[str] = Query(None, description="Filtro por nombre (opcional)"),
                       limit: int = 100, offset: int = 0):
    return svc.list_staff(q, limit, offset)

@router.get("/staff/{species_id}", dependencies=[Depends(get_current_user)])
def get_species_staff(species_id: int = Path(..., ge=1)):
    row = svc.get_staff(species_id)
    if not row:
        raise HTTPException(404, "Especie no encontrada")
    return row

@router.post("/staff", dependencies=[Depends(get_current_user)])
def create_species_staff(payload: Dict[str, Any]):
    try:
        created = svc.create_staff(payload)
        return created
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.put("/staff/{species_id}", dependencies=[Depends(get_current_user)])
def update_species_staff(species_id: int, payload: Dict[str, Any]):
    try:
        updated = svc.update_staff(species_id, payload)
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/staff/{species_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_species_admin(species_id: int):
    svc.delete_admin(species_id)
    return
