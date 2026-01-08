# app/services/photos_service.py
from typing import List, Optional, Dict, Any
from fastapi import UploadFile
from pathlib import Path
from io import BytesIO
from PIL import Image
import uuid
import logging
from app.core.supabase_auth import get_public, get_service
from app.core import r2_storage

logger = logging.getLogger(__name__)

# Configuración
MAX_IMAGE_SIZE = 2048
VARIANT_WIDTHS = [400, 800]
CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable"


def _normalize_image(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode == "P":
            image = image.convert("RGBA")
        background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
        return background
    return image


def _image_to_jpeg_bytes(image: Image.Image, quality: int = 85) -> bytes:
    output = BytesIO()
    image.save(output, format="JPEG", quality=quality)
    return output.getvalue()


def _resize_to_width(image: Image.Image, target_width: int) -> Image.Image:
    if image.width <= target_width:
        return image.copy()
    ratio = target_width / image.width
    target_height = max(1, int(image.height * ratio))
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


def _build_variant_urls(variants: Optional[Dict[str, str]]) -> Dict[str, str]:
    if not variants:
        return {}
    urls = {}
    for key, path in variants.items():
        if path:
            urls[key] = r2_storage.get_public_url(path)
    return urls

# Mapeo de tipos de entidad a columnas y tablas
ENTITY_CONFIG = {
    'especie': {
        'column': 'especie_id',
        'table': 'especies',
        'path_prefix': 'especies',
        'require_entity_check': True
    },
    'sector': {
        'column': 'sector_id',
        'table': 'sectores',
        'path_prefix': 'sectores',
        'require_entity_check': True
    },
    'ejemplar': {
        'column': 'ejemplar_id',
        'table': 'ejemplar',
        'path_prefix': 'ejemplares',
        'require_entity_check': True
    },
    'home': {
        'column': None,  # No hay tabla específica para home
        'table': None,
        'path_prefix': 'home',
        'require_entity_check': False  # No requiere verificar existencia de entidad
    }
}


async def upload_photos(
    entity_type: str,
    entity_id: int,
    files: List[UploadFile],
    is_cover_photo_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Sube múltiples fotos para cualquier entidad.
    
    Args:
        entity_type: 'especie', 'sector', 'ejemplar', etc.
        entity_id: ID de la entidad
        files: Lista de archivos a subir
        is_cover_photo_id: ID de foto específica que será portada (opcional)
    """
    if entity_type not in ENTITY_CONFIG:
        raise ValueError(f"Tipo de entidad no válido: {entity_type}. Opciones: {list(ENTITY_CONFIG.keys())}")
    
    config = ENTITY_CONFIG[entity_type]
    sb = get_service()
    
    # Verificar que la entidad existe usando foreign key (solo si requiere verificación)
    if config.get('require_entity_check', True) and config['table']:
        entity = sb.table(config['table']).select("id").eq("id", entity_id).limit(1).execute()
        if not entity.data:
            raise ValueError(f"{entity_type} con id {entity_id} no encontrada")
    
    uploaded_photos = []
    
    for idx, file in enumerate(files):
        try:
            if not file.content_type or not file.content_type.startswith('image/'):
                logger.warning(f"Archivo {file.filename} no es una imagen, saltando...")
                continue
            
            file_content = await file.read()
            file_extension = (Path(file.filename).suffix if file.filename else '.jpg').lower()
            # Para home, usar un path diferente sin entity_id
            if entity_type == 'home':
                base_dir = f"{config['path_prefix']}/carousel"
            else:
                base_dir = f"{config['path_prefix']}/{entity_id}"
            base_filename = str(uuid.uuid4())
            unique_filename = f"original/{base_dir}/{base_filename}{file_extension}"
            
            # Redimensionar si es necesario
            image = Image.open(BytesIO(file_content))
            original_content = file_content
            original_content_type = file.content_type or "image/jpeg"
            image_for_variants = image
            if image.width > MAX_IMAGE_SIZE or image.height > MAX_IMAGE_SIZE:
                image.thumbnail((MAX_IMAGE_SIZE, MAX_IMAGE_SIZE), Image.Resampling.LANCZOS)
                image_for_variants = _normalize_image(image)
                original_content = _image_to_jpeg_bytes(image_for_variants)
                original_content_type = "image/jpeg"
                unique_filename = f"original/{base_dir}/{base_filename}.jpg"
            else:
                image_for_variants = _normalize_image(image)
            
            r2_storage.upload_object(
                unique_filename,
                original_content,
                original_content_type,
                CACHE_CONTROL_IMMUTABLE,
            )

            variants = {}
            for width in VARIANT_WIDTHS:
                resized = _resize_to_width(image_for_variants, width)
                variant_content = _image_to_jpeg_bytes(resized)
                variant_path = f"w={width}/{base_dir}/{base_filename}.jpg"
                r2_storage.upload_object(
                    variant_path,
                    variant_content,
                    "image/jpeg",
                    CACHE_CONTROL_IMMUTABLE,
                )
                variants[f"w={width}"] = variant_path
            
            # Obtener máximo order_index actual
            existing_photos = list_photos(entity_type, entity_id)
            max_order = max([p.get("order_index", 0) for p in existing_photos], default=0)
            
            # Determinar si es portada
            is_cover = False
            if is_cover_photo_id is None and idx == 0 and not any(p.get("is_cover") for p in existing_photos):
                is_cover = True
            elif is_cover_photo_id is not None:
                if idx == 0:
                    # Desmarcar otras portadas de la misma entidad
                    sb.table("fotos").update({"is_cover": False})\
                      .eq(config['column'], entity_id)\
                      .execute()
            
            # Insertar en BD con foreign key correcta
            photo_data = {
                config['column']: entity_id,
                "storage_path": unique_filename,
                "variants": variants or None,
                "is_cover": is_cover,
                "order_index": max_order + idx + 1
            }
            
            result = sb.table("fotos").insert(photo_data).execute()
            
            if result.data:
                photo_record = result.data[0]
                photo_id = photo_record["id"]
                public_url = r2_storage.get_public_url(unique_filename)
                uploaded_photos.append({
                    "id": photo_id,
                    "storage_path": unique_filename,
                    "public_url": public_url,
                    "variants": photo_record.get("variants") or variants,
                    "variant_urls": _build_variant_urls(photo_record.get("variants") or variants),
                    "is_cover": is_cover,
                    "order_index": photo_data["order_index"]
                })
                
                # Registrar en auditoría
                if user_id or user_email:
                    try:
                        from app.services.audit_service import log_change
                        log_change(
                            table_name='fotos',
                            record_id=photo_id,
                            action='CREATE',
                            user_id=user_id,
                            user_email=user_email,
                            user_name=user_name,
                            old_values=None,
                            new_values=photo_record,
                            ip_address=ip_address,
                            user_agent=user_agent
                        )
                    except Exception as audit_error:
                        logger.warning(f"[upload_photos] Error al registrar auditoría para foto {photo_id}: {str(audit_error)}")
        
        except Exception as e:
            logger.error(f"Error al subir foto {file.filename}: {str(e)}")
            continue
    
    return uploaded_photos


def list_photos(entity_type: str, entity_id: int) -> List[Dict[str, Any]]:
    """
    Lista todas las fotos de una entidad usando foreign key.
    """
    if entity_type not in ENTITY_CONFIG:
        raise ValueError(f"Tipo de entidad no válido: {entity_type}")
    
    config = ENTITY_CONFIG[entity_type]
    sb = get_public()
    
    photos = sb.table("fotos")\
        .select("id, storage_path, variants, is_cover, order_index, caption")\
        .eq(config['column'], entity_id)\
        .order("order_index")\
        .execute()
    
    result = []
    for photo in (photos.data or []):
        public_url = r2_storage.get_public_url(photo["storage_path"])
        result.append({
            **photo,
            "public_url": public_url,
            "variant_urls": _build_variant_urls(photo.get("variants")),
        })
    
    return result


def get_cover_photo(entity_type: str, entity_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene la foto de portada usando foreign key.
    """
    if entity_type not in ENTITY_CONFIG:
        return None
    
    config = ENTITY_CONFIG[entity_type]
    sb = get_public()
    
    # Buscar foto marcada como portada
    cover = sb.table("fotos")\
        .select("id, storage_path, variants, is_cover, order_index")\
        .eq(config['column'], entity_id)\
        .eq("is_cover", True)\
        .limit(1)\
        .execute()
    
    if cover.data:
        photo = cover.data[0]
        public_url = r2_storage.get_public_url(photo["storage_path"])
        return {
            **photo,
            "public_url": public_url,
            "variant_urls": _build_variant_urls(photo.get("variants")),
        }
    
    # Si no hay portada, buscar la primera por order_index
    first = sb.table("fotos")\
        .select("id, storage_path, variants, is_cover, order_index")\
        .eq(config['column'], entity_id)\
        .order("order_index")\
        .limit(1)\
        .execute()
    
    if first.data:
        photo = first.data[0]
        public_url = r2_storage.get_public_url(photo["storage_path"])
        return {
            **photo,
            "public_url": public_url,
            "variant_urls": _build_variant_urls(photo.get("variants")),
        }
    
    return None


def get_cover_photos_map(entity_type: str, entity_ids: List[int]) -> Dict[int, Optional[str]]:
    """
    Obtiene las fotos de portada para múltiples entidades (útil para listados).
    Retorna un diccionario {entity_id: public_url}
    """
    if not entity_ids or entity_type not in ENTITY_CONFIG:
        return {}
    
    config = ENTITY_CONFIG[entity_type]
    sb = get_public()
    
    # Obtener portadas explícitas
    covers = sb.table("fotos")\
        .select(f"{config['column']}, storage_path, is_cover, order_index")\
        .in_(config['column'], entity_ids)\
        .eq("is_cover", True)\
        .execute()
    
    cover_map = {}
    covered_ids = set()
    
    for photo in (covers.data or []):
        eid = photo[config['column']]
        if eid not in cover_map and photo.get("storage_path"):
            public_url = r2_storage.get_public_url(photo["storage_path"])
            cover_map[eid] = public_url
            covered_ids.add(eid)
    
    # Para las que no tienen portada, buscar la primera foto
    missing_ids = [eid for eid in entity_ids if eid not in covered_ids]
    if missing_ids:
        all_photos = sb.table("fotos")\
            .select(f"{config['column']}, storage_path, order_index")\
            .in_(config['column'], missing_ids)\
            .order(f"{config['column']}, order_index")\
            .execute()
        
        by_entity = {}
        for photo in (all_photos.data or []):
            eid = photo[config['column']]
            if eid not in by_entity and photo.get("storage_path"):
                by_entity[eid] = photo["storage_path"]
        
        for eid, storage_path in by_entity.items():
            if storage_path:
                public_url = r2_storage.get_public_url(storage_path)
                cover_map[eid] = public_url
    
    return cover_map


def update_photo(
    photo_id: int,
    is_cover: Optional[bool] = None,
    order_index: Optional[int] = None,
    caption: Optional[str] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """
    Actualiza una foto.
    """
    sb = get_public()
    
    # Obtener la foto completa antes de actualizar para auditoría
    photo = sb.table("fotos").select("*").eq("id", photo_id).limit(1).execute()
    if not photo.data:
        raise LookupError("Foto no encontrada")
    
    old_values = photo.data[0]
    photo_data = old_values.copy()
    update_data = {}
    
    # Determinar qué columna usar según qué foreign key tiene valor
    entity_column = None
    entity_id = None
    for entity_type, config in ENTITY_CONFIG.items():
        col = config['column']
        if photo_data.get(col):
            entity_column = col
            entity_id = photo_data[col]
            break
    
    if not entity_column:
        raise ValueError("Foto sin entidad asociada")
    
    # Si se marca como portada, desmarcar las demás
    if is_cover is True:
        sb.table("fotos")\
            .update({"is_cover": False})\
            .eq(entity_column, entity_id)\
            .neq("id", photo_id)\
            .execute()
        update_data["is_cover"] = True
    elif is_cover is False:
        update_data["is_cover"] = False
    
    if order_index is not None:
        update_data["order_index"] = order_index
    
    if caption is not None:
        update_data["caption"] = caption
    
    if update_data:
        result = sb.table("fotos").update(update_data).eq("id", photo_id).execute()
        if not result.data:
            raise LookupError("No se pudo actualizar la foto")
        
        updated_photo = result.data[0]
        
        # Registrar en auditoría
        if user_id or user_email:
            try:
                from app.services.audit_service import log_change
                log_change(
                    table_name='fotos',
                    record_id=photo_id,
                    action='UPDATE',
                    user_id=user_id,
                    user_email=user_email,
                    user_name=user_name,
                    old_values=old_values,
                    new_values=updated_photo,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            except Exception as audit_error:
                logger.warning(f"[update_photo] Error al registrar auditoría: {str(audit_error)}")
        
        return updated_photo
    
    return photo_data


def delete_photo(photo_id: int, user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> None:
    """
    Elimina una foto (del storage y de la BD).
    """
    sb = get_service()
    
    # Obtener la foto antes de eliminarla para auditoría
    photo = sb.table("fotos").select("*").eq("id", photo_id).limit(1).execute()
    if not photo.data:
        raise LookupError("Foto no encontrada")
    
    old_values = photo.data[0]
    storage_path = old_values["storage_path"]
    variants = old_values.get("variants") or {}
    
    try:
        r2_storage.delete_object(storage_path)
        for variant_path in variants.values():
            if variant_path:
                r2_storage.delete_object(variant_path)
    except Exception as e:
        logger.warning(f"No se pudo eliminar del storage: {str(e)}")
    
    sb.table("fotos").delete().eq("id", photo_id).execute()
    
    # Registrar en auditoría
    if user_id or user_email:
        try:
            from app.services.audit_service import log_change
            log_change(
                table_name='fotos',
                record_id=photo_id,
                action='DELETE',
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
                old_values=old_values,
                new_values=None,
                ip_address=ip_address,
                user_agent=user_agent
            )
        except Exception as audit_error:
            logger.warning(f"[delete_photo] Error al registrar auditoría: {str(audit_error)}")
