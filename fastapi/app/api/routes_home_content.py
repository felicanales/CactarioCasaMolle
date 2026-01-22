# app/api/routes_home_content.py
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile
from typing import Dict, Any, List
from app.middleware.auth_middleware import get_current_user
from app.services import home_content_service as svc
from app.services import photos_service
from app.core import storage_router

router = APIRouter()

# ===========================
#          PÚBLICO
# ===========================

@router.get("/public")
def get_home_content_public(lang: str = "es"):
    """
    Obtiene el contenido público del home (sin autenticación).
    
    Args:
        lang: Idioma del contenido ('es' para español, 'en' para inglés). Default: 'es'
    """
    # Validar idioma
    if lang not in ["es", "en"]:
        lang = "es"
    
    content = svc.get_public(lang=lang)
    if not content:
        # Retornar contenido por defecto
        default_welcome = "Bienvenido al Cactario CasaMolle" if lang == "es" else "Welcome to Cactario CasaMolle"
        return {
            "welcome_text": default_welcome,
            "carousel_images": [],
            "sections": []
        }
    return content

# ===========================
#        STAFF (privado)
# ===========================

@router.get("/staff", dependencies=[Depends(get_current_user)])
def get_home_content_staff(request: Request):
    """
    Obtiene el contenido del home para staff (requiere usuario autenticado).
    """
    try:
        # Obtener el token del header Authorization
        auth_header = request.headers.get("Authorization", "")
        access_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
        
        content = svc.get_staff(access_token)
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
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        MAX_IMAGE_SIZE = 2048
        
        # Leer y procesar la imagen
        file_content = await file.read()
        file_extension = Path(file.filename).suffix if file.filename else '.jpg'
        unique_filename = f"home/carousel/{uuid.uuid4()}{file_extension}"
        
        # Determinar content type inicial
        content_type = file.content_type or 'image/jpeg'
        
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
            content_type = 'image/jpeg'  # Después de redimensionar, siempre será JPEG
            unique_filename = f"home/carousel/{uuid.uuid4()}.jpg"  # Cambiar extensión a .jpg
        
        storage_router.upload_object(
            key=unique_filename,
            data=file_content,
            content_type=content_type,
        )

        return {
            "url": storage_router.get_public_url(unique_filename),
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
    import logging
    logger = logging.getLogger("cactario-backend")
    
    try:
        # Obtener el token del header Authorization o de las cookies
        from app.core.security import get_token_from_request
        access_token = get_token_from_request(request)
        
        logger.info(f"[create_or_update_home_content_staff] Token obtenido: {bool(access_token)}, length: {len(access_token) if access_token else 0}")
        
        if not access_token:
            logger.error("[create_or_update_home_content_staff] No se encontró token de autenticación")
            raise HTTPException(status_code=401, detail="Token de autenticación no encontrado")
        
        user = request.state.user if hasattr(request.state, 'user') else None
        user_id = user.get("id") if user else None
        user_email = user.get("email") if user else None
        
        logger.info(f"[create_or_update_home_content_staff] Usuario ID: {user_id}, Email: {user.get('email') if user else None}")
        
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        result = svc.create_or_update_staff(payload, user_id, user_email, access_token, ip_address, user_agent)
        logger.info("[create_or_update_home_content_staff] Contenido guardado exitosamente")
        return result
    except ValueError as e:
        logger.error(f"[create_or_update_home_content_staff] ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[create_or_update_home_content_staff] Error: {str(e)}")
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
        # Obtener el token del header Authorization
        auth_header = request.headers.get("Authorization", "")
        access_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
        
        if not access_token:
            raise HTTPException(status_code=401, detail="Token de autenticación no encontrado")
        
        user = request.state.user if hasattr(request.state, 'user') else None
        user_id = user.get("id") if user else None
        user_email = user.get("email") if user else None
        
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        result = svc.create_or_update_staff(payload, user_id, user_email, access_token, ip_address, user_agent)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import logging
        logger = logging.getLogger("cactario-backend")
        logger.error(f"Error en update_home_content_staff: {str(e)}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))
