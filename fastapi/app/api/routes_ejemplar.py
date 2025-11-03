# app/api/routes_ejemplar.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import Optional, Dict, Any
from app.middleware.auth_middleware import get_current_user
from app.services import ejemplar_service as svc

router = APIRouter()

@router.get("/staff", dependencies=[Depends(get_current_user)])
def list_ejemplares_staff(
    q: Optional[str] = Query(None, description="Búsqueda general"),
    species_id: Optional[int] = Query(None, description="Filtrar por especie"),
    sector_id: Optional[int] = Query(None, description="Filtrar por sector"),
    size_min: Optional[int] = Query(None, description="Tamaño mínimo en cm"),
    size_max: Optional[int] = Query(None, description="Tamaño máximo en cm"),
    morfologia: Optional[str] = Query(None, description="Filtrar por morfología"),
    nombre_comun: Optional[str] = Query(None, description="Filtrar por nombre común"),
    sort_by: str = Query("scientific_name", description="Campo por el cual ordenar"),
    sort_order: str = Query("asc", description="Orden: 'asc' o 'desc'")
):
    """
    Lista ejemplares con filtros y ordenamiento.
    """
    try:
        return svc.list_staff(
            q=q,
            species_id=species_id,
            sector_id=sector_id,
            size_min=size_min,
            size_max=size_max,
            morfologia=morfologia,
            nombre_comun=nombre_comun,
            sort_by=sort_by,
            sort_order=sort_order
        )
    except Exception as e:
        raise HTTPException(500, f"Error al listar ejemplares: {str(e)}")

@router.get("/staff/{ejemplar_id}", dependencies=[Depends(get_current_user)])
def get_ejemplar_staff(ejemplar_id: int = Path(..., ge=1)):
    """
    Obtiene un ejemplar por su ID.
    """
    ejemplar = svc.get_staff(ejemplar_id)
    if not ejemplar:
        raise HTTPException(404, "Ejemplar no encontrado")
    return ejemplar

@router.post("/staff", dependencies=[Depends(get_current_user)])
def create_ejemplar_staff(payload: Dict[str, Any]):
    """
    Crea un nuevo ejemplar.
    """
    try:
        created = svc.create_staff(payload)
        return created
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al crear ejemplar: {str(e)}")

@router.put("/staff/{ejemplar_id}", dependencies=[Depends(get_current_user)])
def update_ejemplar_staff(ejemplar_id: int, payload: Dict[str, Any]):
    """
    Actualiza un ejemplar existente.
    """
    try:
        updated = svc.update_staff(ejemplar_id, payload)
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al actualizar ejemplar: {str(e)}")

@router.delete("/staff/{ejemplar_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_ejemplar_staff(ejemplar_id: int):
    """
    Elimina un ejemplar.
    """
    svc.delete_staff(ejemplar_id)
    return

