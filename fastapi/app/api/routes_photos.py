# app/api/routes_photos.py
from fastapi import APIRouter, HTTPException, Path, File, UploadFile, Form
from typing import List, Optional
from app.services import photos_service as svc

router = APIRouter()

@router.post("/{entity_type}/{entity_id}")
async def upload_photos(
    entity_type: str = Path(..., description="Tipo de entidad: especie, sector, ejemplar, etc."),
    entity_id: int = Path(..., ge=1),
    files: List[UploadFile] = File(...),
    is_cover_photo_id: Optional[int] = Form(None, description="ID de foto específica que será portada")
):
    """
    Sube fotos para cualquier entidad.
    Acceso público (sin autenticación).
    """
    try:
        uploaded = await svc.upload_photos(entity_type, entity_id, files, is_cover_photo_id)
        return {
            "photos": uploaded, 
            "message": f"{len(uploaded)} fotos subidas exitosamente",
            "count": len(uploaded)
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al subir fotos: {str(e)}")

@router.get("/{entity_type}/{entity_id}")
def list_photos(
    entity_type: str = Path(..., description="Tipo de entidad"),
    entity_id: int = Path(..., ge=1, description="ID de la entidad")
):
    """
    Lista todas las fotos de una entidad.
    Acceso público.
    """
    try:
        photos = svc.list_photos(entity_type, entity_id)
        return {"photos": photos, "count": len(photos)}
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/{entity_type}/{entity_id}/cover")
def get_cover_photo(
    entity_type: str = Path(..., description="Tipo de entidad"),
    entity_id: int = Path(..., ge=1, description="ID de la entidad")
):
    """
    Obtiene la foto de portada de una entidad.
    Acceso público.
    """
    try:
        cover = svc.get_cover_photo(entity_type, entity_id)
        if not cover:
            raise HTTPException(404, "No hay foto de portada disponible")
        return cover
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.put("/{photo_id}")
def update_photo(
    photo_id: int = Path(..., ge=1),
    is_cover: Optional[bool] = Form(None, description="Marcar como foto de portada"),
    order_index: Optional[int] = Form(None, description="Cambiar orden de la foto"),
    caption: Optional[str] = Form(None, description="Descripción de la foto")
):
    """
    Actualiza una foto (marcar como portada, cambiar orden, agregar descripción).
    Acceso público (sin autenticación).
    """
    try:
        updated = svc.update_photo(photo_id, is_cover, order_index, caption)
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/{photo_id}", status_code=204)
def delete_photo(
    photo_id: int = Path(..., ge=1)
):
    """
    Elimina una foto (del storage y de la base de datos).
    Acceso público (sin autenticación).
    """
    try:
        svc.delete_photo(photo_id)
        return
    except LookupError as e:
        raise HTTPException(404, str(e))

