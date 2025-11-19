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
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[get_sector_public] Recibido qr_code: {qr_code}")
    row = svc.get_public_by_qr(qr_code)
    
    if not row:
        logger.warning(f"[get_sector_public] Sector no encontrado para qr_code: {qr_code}")
        raise HTTPException(status_code=404, detail=f"Sector no encontrado con QR: {qr_code}")
    
    logger.info(f"[get_sector_public] Sector encontrado: {row.get('id')} - {row.get('name')}")
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
#       STAFF (privado)
# ===========================

@router.get("/staff", dependencies=[Depends(get_current_user)])
def list_sectors_staff(q: Optional[str] = Query(None, description="Filtro por nombre (opcional)")):
    """
    Lista privada de sectores (requiere usuario autenticado).
    """
    return svc.list_staff(q)

@router.post("/staff", dependencies=[Depends(get_current_user)])
def create_sector_staff(payload: Dict[str, Any]):
    """
    Crea un sector (requiere usuario autenticado).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[create_sector_staff] Recibido payload: {payload}")
    
    try:
        created = svc.create_staff(payload)
        logger.info(f"[create_sector_staff] Sector creado exitosamente: {created}")
        return created
    except ValueError as e:
        logger.error(f"[create_sector_staff] Error de validación: {str(e)}")
        raise HTTPException(400, str(e))
    except Exception as e:
        # Capturar cualquier otro error y proporcionar un mensaje útil
        error_msg = str(e)
        logger.error(f"[create_sector_staff] Error inesperado: {error_msg}", exc_info=True)
        raise HTTPException(500, f"Error inesperado al crear sector: {error_msg}")

# IMPORTANTE: Las rutas más específicas ({sector_id}/species) deben ir ANTES que las generales ({sector_id})
# para evitar conflictos de enrutamiento en FastAPI
@router.get("/staff/{sector_id}/species", dependencies=[Depends(get_current_user)])
def get_sector_species_staff(sector_id: int = Path(..., ge=1)):
    """
    Obtiene las especies asociadas a un sector desde sectores_especies.
    """
    return svc.get_sector_species_staff(sector_id)

@router.put("/staff/{sector_id}/species", dependencies=[Depends(get_current_user)])
def update_sector_species_staff(sector_id: int, payload: Dict[str, Any]):
    """
    Actualiza las especies asociadas a un sector.
    Espera un payload con: {"especie_ids": [1, 2, 3, ...]}
    """
    if "especie_ids" not in payload:
        raise HTTPException(400, "El payload debe contener 'especie_ids' como lista")
    especie_ids = payload["especie_ids"]
    if not isinstance(especie_ids, list):
        raise HTTPException(400, "'especie_ids' debe ser una lista")
    
    try:
        updated = svc.update_sector_species_staff(sector_id, especie_ids)
        return updated
    except Exception as e:
        raise HTTPException(500, f"Error al actualizar especies del sector: {str(e)}")

@router.get("/staff/{sector_id}", dependencies=[Depends(get_current_user)])
def get_sector_staff(sector_id: int = Path(..., ge=1)):
    """
    Detalle privado de sector (requiere usuario autenticado).
    """
    row = svc.get_staff(sector_id)
    if not row:
        raise HTTPException(404, "Sector no encontrado")
    return row

@router.put("/staff/{sector_id}", dependencies=[Depends(get_current_user)])
def update_sector_staff(sector_id: int, payload: Dict[str, Any], request: Request, current_user: dict = Depends(get_current_user)):
    """
    Actualiza un sector (requiere usuario autenticado).
    """
    try:
        user_id = current_user.get('id')
        user_email = current_user.get('email')
        user_name = current_user.get('full_name') or current_user.get('username')
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        
        updated = svc.update_staff(sector_id, payload, user_id=user_id, user_email=user_email, user_name=user_name, ip_address=ip_address, user_agent=user_agent)
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/staff/{sector_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_sector_admin(sector_id: int):
    """
    Elimina un sector (requiere usuario autenticado).
    """
    svc.delete_admin(sector_id)
    return