# app/services/species_service.py
from typing import List, Optional, Dict, Any
from app.core.supabase_auth import get_public
from app.services import photos_service
import logging

logger = logging.getLogger(__name__)

# Valores válidos de los enums en minúsculas (como están en Supabase)
ENUM_TIPO_MORFOLOGIA_VALUES = ["columnar", "redondo", "agave", "tallo plano", "otro"]
ENUM_TIPO_PLANTA_VALUES = []  # Si hay valores específicos, agregarlos aquí
ENUM_CATEGORIA_CONSERVACION_VALUES = ["no amenazado", "preocupación menor", "protegido", "en peligro de extinción"]

def normalize_enum_value(value: Optional[str], enum_name: str) -> Optional[str]:
    """
    Normaliza un valor de enum a minúsculas.
    Si el valor no es None y no está vacío, lo convierte a minúsculas.
    """
    if value is None or value == "":
        return None
    normalized = value.strip().lower()
    logger.debug(f"[normalize_enum_value] Normalizando {enum_name}: '{value}' → '{normalized}'")
    return normalized

PUBLIC_SPECIES_FIELDS = [
    "id", "slug", "nombre_común", "scientific_name",
    "habitat", "estado_conservación", "tipo_planta", "distribución", "floración", "cuidado", "usos",
    "nombres_comunes", "historia_y_leyendas", "historia_nombre", 
    "Endémica", "expectativa_vida", "tipo_morfología", "categoría_de_conservación"
]
STAFF_EXTRA_FIELDS = [
    "nombres_comunes", "image_url", "historia_y_leyendas", "historia_nombre", 
    "Endémica", "expectativa_vida", "tipo_morfología", "created_at", "updated_at"
]

def _cover_photo_map(species_ids: List[int]) -> Dict[int, Optional[str]]:
    """
    Obtiene las fotos de portada para múltiples especies.
    Ahora usa el servicio genérico de fotos.
    """
    if not species_ids:
        return {}
    return photos_service.get_cover_photos_map("especie", species_ids)

# ----------------- PÚBLICO -----------------

def list_public(q: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    sb = get_public()
    query = sb.table("especies").select(",".join(PUBLIC_SPECIES_FIELDS))
    if q:
        # Busca por nombre común o científico
        query = query.or_(f"nombre_común.ilike.%{q}%,scientific_name.ilike.%{q}%")
    res = query.order("nombre_común", desc=False).range(offset, offset + limit - 1).execute()
    rows = res.data or []
    cover = _cover_photo_map([r["id"] for r in rows])
    out = []
    for r in rows:
        out.append({**r, "cover_photo": cover.get(r["id"])})
    return out

def get_public_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    sb = get_public()
    res = sb.table("especies").select(",".join(PUBLIC_SPECIES_FIELDS)).eq("slug", slug).limit(1).execute()
    if not res.data:
        return None
    species = res.data[0]
    # Obtener foto de portada
    cover = photos_service.get_cover_photo("especie", species["id"])
    species["cover_photo"] = cover["public_url"] if cover else None
    # Todas las fotos usando el servicio genérico
    species["photos"] = photos_service.list_photos("especie", species["id"])
    return species

# ----------------- STAFF (privado) -----------------

def list_staff(q: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    sb = get_public()
    # Seleccionar campos explícitamente, excluyendo morfología_cactus que puede tener valores inválidos
    # El frontend solo usa tipo_morfología
    fields = [
        "id", "slug", "nombre_común", "scientific_name", "nombres_comunes",
        "habitat", "estado_conservación", "tipo_planta", "tipo_morfología",
        "distribución", "floración", "cuidado", "usos", "historia_nombre",
        "historia_y_leyendas", "Endémica", "expectativa_vida",
        "categoría_de_conservación", "created_at", "updated_at"
    ]
    query = sb.table("especies").select(",".join(fields))
    if q:
        query = query.or_(f"nombre_común.ilike.%{q}%,scientific_name.ilike.%{q}%")
    res = query.order("updated_at", desc=True).range(offset, offset + limit - 1).execute()
    rows = res.data or []
    # Agregar fotos de portada
    cover = _cover_photo_map([r["id"] for r in rows])
    out = []
    for r in rows:
        out.append({**r, "cover_photo": cover.get(r["id"])})
    return out

def get_staff(species_id: int) -> Optional[Dict[str, Any]]:
    sb = get_public()
    # Seleccionar campos explícitamente, excluyendo morfología_cactus que puede tener valores inválidos
    # El frontend solo usa tipo_morfología
    fields = [
        "id", "slug", "nombre_común", "scientific_name", "nombres_comunes",
        "habitat", "estado_conservación", "tipo_planta", "tipo_morfología",
        "distribución", "floración", "cuidado", "usos", "historia_nombre",
        "historia_y_leyendas", "Endémica", "expectativa_vida",
        "categoría_de_conservación", "created_at", "updated_at"
    ]
    res = sb.table("especies").select(",".join(fields)).eq("id", species_id).limit(1).execute()
    if not res.data:
        return None
    species = res.data[0]
    # Agregar foto de portada y todas las fotos
    cover = photos_service.get_cover_photo("especie", species_id)
    species["cover_photo"] = cover["public_url"] if cover else None
    species["photos"] = photos_service.list_photos("especie", species_id)
    return species

def create_staff(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea una nueva especie en la base de datos.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Validar slug único
    if not payload.get("slug"):
        raise ValueError("slug es obligatorio")
    
    # Asegurar que no se esté enviando el ID (debe ser auto-generado)
    if "id" in payload:
        logger.warning(f"[create_staff] Se intentó enviar 'id' en el payload, removiéndolo: {payload.get('id')}")
        del payload["id"]
    
    # Remover campos de timestamp que deben ser generados automáticamente
    for auto_field in ["created_at", "updated_at"]:
        if auto_field in payload:
            logger.warning(f"[create_staff] Se intentó enviar '{auto_field}' en el payload, removiéndolo")
            del payload[auto_field]
    
    # Remover image_url si existe (no existe en la tabla)
    if "image_url" in payload:
        logger.warning("[create_staff] Se intentó enviar 'image_url' en el payload, removiéndolo")
        del payload["image_url"]
    
    # Normalizar valores de enum a minúsculas (como están en Supabase)
    if "tipo_morfología" in payload:
        payload["tipo_morfología"] = normalize_enum_value(payload["tipo_morfología"], "tipo_morfología")
    if "tipo_planta" in payload:
        payload["tipo_planta"] = normalize_enum_value(payload["tipo_planta"], "tipo_planta")
    if "categoría_de_conservación" in payload:
        payload["categoría_de_conservación"] = normalize_enum_value(payload["categoría_de_conservación"], "categoría_de_conservación")
    
    # Convertir strings vacíos a None para campos de texto opcionales
    optional_text_fields = ["nombre_común", "nombres_comunes", "habitat", "distribución", 
                           "estado_conservación", "categoría_de_conservación", "expectativa_vida",
                           "floración", "cuidado", "usos", "historia_nombre", "historia_y_leyendas"]
    for field in optional_text_fields:
        if field in payload and payload[field] == "":
            payload[field] = None
    
    # Validar slug único
    exists = sb.table("especies").select("id").eq("slug", payload["slug"]).limit(1).execute()
    if exists.data:
        raise ValueError("slug ya existe")
    
    logger.info(f"[create_staff] Payload limpio para insertar: {list(payload.keys())}")
    
    try:
        res = sb.table("especies").insert(payload).execute()
        if not res.data:
            raise ValueError("No se pudo crear la especie")
        logger.info(f"[create_staff] Especie creada exitosamente: {res.data[0].get('id')}")
        return res.data[0]
    except Exception as e:
        logger.error(f"[create_staff] Error al crear especie: {str(e)}")
        raise

def update_staff(species_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Actualiza una especie existente en la base de datos.
    Limpia el payload antes de actualizar para evitar errores con campos enum y campos no válidos.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Validar slug único si se está actualizando
    if "slug" in payload and payload["slug"]:
        exists = sb.table("especies").select("id").eq("slug", payload["slug"]).neq("id", species_id).limit(1).execute()
        if exists.data:
            raise ValueError("slug ya existe en otra especie")
    
    # Remover campos que no deben actualizarse o no existen en la tabla
    if "id" in payload:
        logger.warning(f"[update_staff] Se intentó actualizar 'id', removiéndolo del payload")
        del payload["id"]
    
    # Remover campos de timestamp que deben ser generados automáticamente
    for auto_field in ["created_at", "updated_at"]:
        if auto_field in payload:
            logger.warning(f"[update_staff] Se intentó actualizar '{auto_field}', removiéndolo del payload")
            del payload[auto_field]
    
    # Remover image_url si existe (no existe en la tabla)
    if "image_url" in payload:
        logger.warning("[update_staff] Se intentó actualizar 'image_url', removiéndolo del payload")
        del payload["image_url"]
    
    # Remover cover_photo si existe (es un campo calculado, no existe en la tabla)
    if "cover_photo" in payload:
        logger.warning("[update_staff] Se intentó actualizar 'cover_photo', removiéndolo del payload")
        del payload["cover_photo"]
    
    # Remover photos si existe (es un campo calculado, no existe en la tabla)
    if "photos" in payload:
        logger.warning("[update_staff] Se intentó actualizar 'photos', removiéndolo del payload")
        del payload["photos"]
    
    # IMPORTANTE: Remover morfología_cactus si viene en el payload (no existe en la base de datos)
    # La tabla especies solo tiene tipo_morfología, NO tiene morfología_cactus
    if "morfología_cactus" in payload:
        logger.warning(f"[update_staff] Removiendo 'morfología_cactus' del payload (no existe en la tabla). Usar 'tipo_morfología'")
        del payload["morfología_cactus"]
    
    # Normalizar valores de enum a minúsculas (como están en Supabase)
    if "tipo_morfología" in payload:
        payload["tipo_morfología"] = normalize_enum_value(payload["tipo_morfología"], "tipo_morfología")
    if "tipo_planta" in payload:
        payload["tipo_planta"] = normalize_enum_value(payload["tipo_planta"], "tipo_planta")
    if "categoría_de_conservación" in payload:
        payload["categoría_de_conservación"] = normalize_enum_value(payload["categoría_de_conservación"], "categoría_de_conservación")
    
    # Convertir strings vacíos a None para campos de texto opcionales
    optional_text_fields = ["nombre_común", "nombres_comunes", "habitat", "distribución", 
                           "estado_conservación", "categoría_de_conservación", "expectativa_vida",
                           "floración", "cuidado", "usos", "historia_nombre", "historia_y_leyendas"]
    for field in optional_text_fields:
        if field in payload and payload[field] == "":
            payload[field] = None
    
    logger.info(f"[update_staff] Payload limpio para actualizar: {list(payload.keys())}")
    logger.info(f"[update_staff] Payload completo (valores): {payload}")
    
    try:
        logger.info(f"[update_staff] Enviando UPDATE a Supabase con payload final: {list(payload.keys())}")
        res = sb.table("especies").update(payload).eq("id", species_id).execute()
        if not res.data:
            raise LookupError("Especie no encontrada")
        logger.info(f"[update_staff] Especie actualizada exitosamente: {species_id}")
        return res.data[0]
    except Exception as e:
        logger.error(f"[update_staff] Error al actualizar especie: {str(e)}")
        # Si el error es relacionado con enum, dar un mensaje más claro
        if "enum" in str(e).lower() or "22P02" in str(e):
            raise ValueError(f"Valor inválido para un campo enum: {str(e)}")
        raise

def delete_admin(species_id: int) -> None:
    sb = get_public()
    # (Opcional: validar dependencias: ejemplar, fotos_especies, purchase_items, etc.)
    sb.table("especies").delete().eq("id", species_id).execute()
