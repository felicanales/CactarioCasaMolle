from fastapi import APIRouter, HTTPException, Path, File, UploadFile, Form, Depends, Request
from typing import List, Optional
from app.services import photos_service as svc
from app.middleware.auth_middleware import get_current_user
router = APIRouter()


@router.post("/{entity_type}/{entity_id}", dependencies=[Depends(get_current_user)])
async def upload_photos(
    request: Request,
    entity_type: str = Path(..., description="Tipo de entidad: especie, sector, ejemplar, etc."),
    entity_id: int = Path(..., ge=1),
    files: List[UploadFile] = File(...),
    is_cover_photo_id: Optional[int] = Form(None, description="ID de foto especifica que sera portada"),
    current_user: dict = Depends(get_current_user),
):
    """
    Sube fotos para cualquier entidad. Requiere autenticacion.
    """
    try:
        user_id = current_user.get("id")
        user_email = current_user.get("email")
        user_name = current_user.get("full_name") or current_user.get("username")
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        uploaded = await svc.upload_photos(
            entity_type,
            entity_id,
            files,
            is_cover_photo_id,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return {
            "photos": uploaded,
            "message": f"{len(uploaded)} fotos subidas exitosamente",
            "count": len(uploaded),
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al subir fotos: {str(e)}")


@router.get("/{entity_type}/{entity_id}")
def list_photos(
    entity_type: str = Path(..., description="Tipo de entidad"),
    entity_id: int = Path(..., ge=1, description="ID de la entidad"),
):
    """
    Lista todas las fotos de una entidad (publico).
    """
    try:
        photos = svc.list_photos(entity_type, entity_id)
        return {"photos": photos, "count": len(photos)}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))


@router.get("/{entity_type}/{entity_id}/cover")
def get_cover_photo(
    entity_type: str = Path(..., description="Tipo de entidad"),
    entity_id: int = Path(..., ge=1, description="ID de la entidad"),
):
    """
    Obtiene la foto de portada de una entidad (publico).
    """
    try:
        cover = svc.get_cover_photo(entity_type, entity_id)
        if not cover:
            raise HTTPException(404, "No hay foto de portada disponible")
        return cover
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))


@router.put("/{photo_id}", dependencies=[Depends(get_current_user)])
def update_photo(
    request: Request,
    photo_id: int = Path(..., ge=1),
    is_cover: Optional[bool] = Form(None, description="Marcar como foto de portada"),
    order_index: Optional[int] = Form(None, description="Cambiar orden de la foto"),
    caption: Optional[str] = Form(None, description="Descripcion de la foto"),
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza una foto (marcar como portada, cambiar orden, agregar descripcion).
    Requiere autenticacion.
    """
    try:
        user_id = current_user.get("id")
        user_email = current_user.get("email")
        user_name = current_user.get("full_name") or current_user.get("username")
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        updated = svc.update_photo(
            photo_id,
            is_cover,
            order_index,
            caption,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return updated
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{photo_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_photo(
    request: Request,
    photo_id: int = Path(..., ge=1),
    current_user: dict = Depends(get_current_user),
):
    """
    Elimina una foto (del storage y de la base de datos). Requiere autenticacion.
    """
    try:
        user_id = current_user.get("id")
        user_email = current_user.get("email")
        user_name = current_user.get("full_name") or current_user.get("username")
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        svc.delete_photo(
            photo_id,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return
    except LookupError as e:
        raise HTTPException(404, str(e))
