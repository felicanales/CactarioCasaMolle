# app/services/species_service.py
from typing import List, Optional, Dict, Any
from app.core.supabase_auth import get_public
from app.services import photos_service

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
    
    # Convertir strings vacíos a None para campos ENUM y opcionales
    # Los campos ENUM no aceptan strings vacíos, solo valores válidos o NULL
    enum_fields = ["morfología_cactus", "tipo_morfología", "tipo_planta"]  # Agregar otros campos ENUM si existen
    for field in enum_fields:
        if field in payload and payload[field] == "":
            logger.info(f"[create_staff] Convirtiendo string vacío a None para campo ENUM: {field}")
            payload[field] = None
    
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
    
    # IMPORTANTE: NO incluir morfología_cactus en el UPDATE
    # El frontend solo debe usar tipo_morfología, no morfología_cactus
    # Si morfología_cactus viene en el payload, removerlo completamente
    # NO establecerlo a NULL porque puede causar errores de validación de enum
    # Al no incluirlo en el UPDATE, Supabase mantendrá el valor existente (o NULL si no existe)
    # pero no intentará validarlo contra el enum
    if "morfología_cactus" in payload:
        logger.warning(f"[update_staff] Removiendo 'morfología_cactus' del payload (valor: '{payload.get('morfología_cactus')}'). El frontend debe usar 'tipo_morfología'")
        del payload["morfología_cactus"]
    
    # Convertir strings vacíos a None para campos ENUM y opcionales
    # Los campos ENUM no aceptan strings vacíos, solo valores válidos o NULL
    enum_fields = ["tipo_morfología", "tipo_planta"]  # Removido morfología_cactus de la lista
    for field in enum_fields:
        if field in payload:
            # Si el valor es string vacío, convertir a None
            if payload[field] == "":
                logger.info(f"[update_staff] Convirtiendo string vacío a None para campo ENUM: {field}")
                payload[field] = None
    
    # Convertir strings vacíos a None para campos de texto opcionales
    optional_text_fields = ["nombre_común", "nombres_comunes", "habitat", "distribución", 
                           "estado_conservación", "categoría_de_conservación", "expectativa_vida",
                           "floración", "cuidado", "usos", "historia_nombre", "historia_y_leyendas"]
    for field in optional_text_fields:
        if field in payload and payload[field] == "":
            payload[field] = None
    
    logger.info(f"[update_staff] Payload limpio para actualizar: {list(payload.keys())}")
    logger.info(f"[update_staff] Payload completo (valores): {payload}")
    
    # Verificación final: asegurar que morfología_cactus NO esté en el payload del frontend
    if "morfología_cactus" in payload:
        logger.warning(f"[update_staff] morfología_cactus viene del frontend, removiéndolo: '{payload.get('morfología_cactus')}'")
        del payload["morfología_cactus"]
    
    # IMPORTANTE: Sincronizar tipo_morfología con morfología_cactus (enum)
    # El frontend usa tipo_morfología (texto), pero la base de datos tiene morfología_cactus (enum)
    # Mapear tipo_morfología a los valores válidos del enum: "columnar", "redondo", "agave", "tallo plano", "otro"
    if "tipo_morfología" in payload and payload["tipo_morfología"]:
        tipo_morfologia_value = payload["tipo_morfología"].strip()
        # Mapear valores del frontend a valores del enum (en minúsculas)
        enum_mapping = {
            "columnar": "columnar",
            "redondo": "redondo",
            "agave": "agave",
            "tallo plano": "tallo plano",
            "otro": "otro"
        }
        # Buscar coincidencia case-insensitive
        morfologia_cactus_value = None
        for key, enum_value in enum_mapping.items():
            if key.lower() == tipo_morfologia_value.lower():
                morfologia_cactus_value = enum_value
                break
        
        if morfologia_cactus_value:
            payload["morfología_cactus"] = morfologia_cactus_value
            logger.info(f"[update_staff] Sincronizando tipo_morfología '{tipo_morfologia_value}' → morfología_cactus '{morfologia_cactus_value}'")
        else:
            # Si no hay coincidencia, establecer a NULL para evitar errores de enum
            payload["morfología_cactus"] = None
            logger.warning(f"[update_staff] tipo_morfología '{tipo_morfologia_value}' no coincide con valores del enum, estableciendo morfología_cactus = NULL")
    else:
        # Si tipo_morfología es None o vacío, establecer morfología_cactus = NULL
        payload["morfología_cactus"] = None
        logger.info(f"[update_staff] tipo_morfología está vacío, estableciendo morfología_cactus = NULL")
    
    try:
        logger.info(f"[update_staff] Enviando UPDATE a Supabase con payload final: {list(payload.keys())}")
        logger.info(f"[update_staff] Valor de morfología_cactus en payload: {payload.get('morfología_cactus')}")
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
