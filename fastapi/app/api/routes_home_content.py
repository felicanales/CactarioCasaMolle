# app/api/routes_home_content.py
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile
from typing import Dict, Any, List
from app.middleware.auth_middleware import get_current_user
from app.services import home_content_service as svc
from app.services import photos_service

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
    try:
        content = svc.get_staff()
        if not content:
            return {
                "welcome_text": "Bienvenido al Cactario CasaMolle",
                "carousel_images": [],
                "sections": []
            }
        return content
    except Exception as e:
        # Log del error para debugging
        import logging
        logger = logging.getLogger("cactario-backend")
        logger.error(f"Error en get_home_content_staff: {str(e)}")
        logger.exception(e)
        
        # Si es un error de tabla no existente, retornar contenido por defecto
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "relation" in error_msg or "table" in error_msg:
            return {
                "welcome_text": "Bienvenido al Cactario CasaMolle",
                "carousel_images": [],
                "sections": []
            }
        # Otro tipo de error, lanzar HTTPException
        raise HTTPException(status_code=500, detail=f"Error al obtener contenido del home: {str(e)}")

@router.post("/staff/upload-image", dependencies=[Depends(get_current_user)])
async def upload_carousel_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Sube una imagen para el carrusel del home.
    Retorna la URL pública de la imagen subida.
    """
    try:
        from pathlib import Path
        from io import BytesIO
        from PIL import Image
        import uuid
        from app.core.supabase_auth import get_service
        
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
        sb = get_service()
        BUCKET_NAME = "photos"
        MAX_IMAGE_SIZE = 2048
        
        # Leer y procesar la imagen
        file_content = await file.read()
        file_extension = Path(file.filename).suffix if file.filename else '.jpg'
        unique_filename = f"home/carousel/{uuid.uuid4()}{file_extension}"
        
        # Redimensionar si es necesario
        image = Image.open(BytesIO(file_content))
        if image.width > MAX_IMAGE_SIZE or image.height > MAX_IMAGE_SIZE:
            image.thumbnail((MAX_IMAGE_SIZE, MAX_IMAGE_SIZE), Image.Resampling.LANCZOS)
            output = BytesIO()
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            image.save(output, format='JPEG', quality=85)
            file_content = output.getvalue()
            file.content_type = 'image/jpeg'
        
        # Subir a Supabase Storage
        sb.storage.from_(BUCKET_NAME).upload(
            unique_filename,
            file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Obtener URL pública
        public_url = sb.storage.from_(BUCKET_NAME).get_public_url(unique_filename)
        
        return {
            "url": public_url,
            "alt": file.filename or "Imagen del carrusel"
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger("cactario-backend")
        logger.error(f"Error al subir imagen del carrusel: {str(e)}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")

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
        import logging
        logger = logging.getLogger("cactario-backend")
        logger.error(f"Error en create_or_update_home_content_staff: {str(e)}")
        logger.exception(e)
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
        import logging
        logger = logging.getLogger("cactario-backend")
        logger.error(f"Error en update_home_content_staff: {str(e)}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))
