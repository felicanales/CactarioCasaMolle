# app/api/routes_sectors.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import Optional, List, Any, Dict
from app.utils.security_utils import get_current_user
from app.services import sectors_service as svc

router = APIRouter()

# ===========================
#         PÚBLICO (QR)
# ===========================

@router.get("/public")
def list_sectors_public(q: Optional[str] = Query(None, description="Filtro por nombre (opcional)")):
    return svc.list_public(q)

@router.get("/public/{qr_code}")
def get_sector_public(qr_code: str = Path(..., description="QR code del sector")):
    row = svc.get_public_by_qr(qr_code)
    if not row:
        raise HTTPException(404, "Sector no encontrado")
    return row

@router.get("/public/{qr_code}/species")
def list_species_by_sector_public(qr_code: str):
    out = svc.list_species_public_by_sector_qr(qr_code)
    # Si el QR no existe, la función retorna [], no None; validamos explícitamente si el sector existe
    if out == []:
        # Podría significar sector sin especies, o QR inexistente; ajusta si prefieres distinguir
        return out
    return out

# ===========================
#       STAFF (privado)
# ===========================

@router.get("/staff", dependencies=[Depends(get_current_user)])
def list_sectors_staff(q: Optional[str] = Query(None, description="Filtro por nombre (opcional)")):
    return svc.list_staff(q)

@router.get("/staff/{sector_id}", dependencies=[Depends(get_current_user)])
def get_sector_staff(sector_id: int = Path(..., ge=1)):
    row = svc.get_staff(sector_id)
    if not row:
        raise HTTPException(404, "Sector no encontrado")
    return row

@router.post("/staff", dependencies=[Depends(get_current_user)])
def create_sector_staff(payload: Dict[str, Any]):
    try:
        created = svc.create_staff(payload)
        return created
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.put("/staff/{sector_id}", dependencies=[Depends(get_current_user)])
def update_sector_staff(sector_id: int, payload: Dict[str, Any]):
    try:
        updated = svc.update_staff(sector_id, payload)
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/staff/{sector_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_sector_admin(sector_id: int):
    svc.delete_admin(sector_id)
    return
