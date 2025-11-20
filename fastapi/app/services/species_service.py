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

def create_staff(payload: Dict[str, Any], user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
    """
    Crea una nueva especie en la base de datos.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Validar slug único
    if not payload.get("slug"):
        raise ValueError("slug es obligatorio")
    
    # Remover campos que no deben enviarse
    for field in ["id", "created_at", "updated_at", "image_url", "cover_photo", "photos"]:
        if field in payload:
            del payload[field]
    
    # Convertir strings vacíos a None para campos ENUM
    enum_fields = ["tipo_morfología", "tipo_planta"]
    for field in enum_fields:
        if field in payload and payload[field] == "":
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
    
    try:
        res = sb.table("especies").insert(payload).execute()
        if not res.data:
            raise ValueError("No se pudo crear la especie")
        
        created_species = res.data[0]
        species_id = created_species.get('id')
        logger.info(f"[create_staff] Especie creada exitosamente: {species_id}")
        
        # Registrar en auditoría
        logger.info(f"[create_staff] Intentando registrar auditoría - user_id: {user_id}, user_email: {user_email}, species_id: {species_id}")
        if user_id or user_email:
            try:
                from app.services.audit_service import log_change
                logger.info(f"[create_staff] Llamando a log_change para especie {species_id}")
                log_change(
                    table_name='especies',
                    record_id=species_id,
                    action='CREATE',
                    user_id=user_id,
                    user_email=user_email,
                    user_name=user_name,
                    old_values=None,
                    new_values=created_species,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                logger.info(f"[create_staff] ✅ log_change ejecutado sin excepciones")
            except Exception as audit_error:
                logger.error(f"[create_staff] ❌ Error al registrar auditoría: {str(audit_error)}", exc_info=True)
        else:
            logger.warning(f"[create_staff] ⚠️ No se registra auditoría: user_id y user_email son None")
        
        return created_species
    except Exception as e:
        logger.error(f"[create_staff] Error al crear especie: {str(e)}")
        raise

def update_staff(species_id: int, payload: Dict[str, Any], user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
    """
    Actualiza una especie existente en la base de datos.
    Limpia el payload antes de actualizar para evitar errores con campos enum y campos no válidos.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Obtener valores anteriores para auditoría
    old_values = None
    if user_id or user_email:
        try:
            old_res = sb.table("especies").select("*").eq("id", species_id).limit(1).execute()
            if old_res.data:
                old_values = old_res.data[0]
        except Exception as e:
            logger.warning(f"[update_staff] No se pudieron obtener valores anteriores para auditoría: {str(e)}")
    
    # Validar slug único si se está actualizando
    if "slug" in payload and payload["slug"]:
        exists = sb.table("especies").select("id").eq("slug", payload["slug"]).neq("id", species_id).limit(1).execute()
        if exists.data:
            raise ValueError("slug ya existe en otra especie")
    
    # Remover campos que no deben actualizarse
    if "id" in payload:
        del payload["id"]
    
    # Remover campos de timestamp que deben ser generados automáticamente
    for auto_field in ["created_at", "updated_at"]:
        if auto_field in payload:
            del payload[auto_field]
    
    # Remover campos calculados que no existen en la tabla
    for calculated_field in ["photos", "cover_photo", "image_url"]:
        if calculated_field in payload:
            del payload[calculated_field]
    
    # Remover morfología_cactus si viene (no existe en la tabla)
    if "morfología_cactus" in payload:
        del payload["morfología_cactus"]
    
    # Convertir strings vacíos a None para campos ENUM
    enum_fields = ["tipo_morfología", "tipo_planta"]
    for field in enum_fields:
        if field in payload and payload[field] == "":
            payload[field] = None
    
    # Convertir strings vacíos a None para campos de texto opcionales
    optional_text_fields = ["nombre_común", "nombres_comunes", "habitat", "distribución", 
                           "estado_conservación", "categoría_de_conservación", "expectativa_vida",
                           "floración", "cuidado", "usos", "historia_nombre", "historia_y_leyendas"]
    for field in optional_text_fields:
        if field in payload and payload[field] == "":
            payload[field] = None
    
    try:
        res = sb.table("especies").update(payload).eq("id", species_id).execute()
        if not res.data:
            raise LookupError("Especie no encontrada")
        
        updated_species = res.data[0]
        
        # Registrar en auditoría
        logger.info(f"[update_staff] Intentando registrar auditoría - user_id: {user_id}, user_email: {user_email}, species_id: {species_id}")
        if user_id or user_email:
            try:
                from app.services.audit_service import log_change
                logger.info(f"[update_staff] Llamando a log_change para especie {species_id}")
                log_change(
                    table_name='especies',
                    record_id=species_id,
                    action='UPDATE',
                    user_id=user_id,
                    user_email=user_email,
                    user_name=user_name,
                    old_values=old_values,
                    new_values=updated_species,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                logger.info(f"[update_staff] ✅ log_change ejecutado sin excepciones")
            except Exception as audit_error:
                logger.error(f"[update_staff] ❌ Error al registrar auditoría: {str(audit_error)}", exc_info=True)
        else:
            logger.warning(f"[update_staff] ⚠️ No se registra auditoría: user_id y user_email son None")
        
        return updated_species
    except Exception as e:
        logger.error(f"[update_staff] Error al actualizar especie: {str(e)}")
        raise

def delete_admin(species_id: int, user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> None:
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Obtener la especie antes de eliminarla para auditoría
    old_species_res = sb.table("especies").select("*").eq("id", species_id).limit(1).execute()
    old_values = old_species_res.data[0] if old_species_res.data else None
    
    # (Opcional: validar dependencias: ejemplar, fotos_especies, purchase_items, etc.)
    sb.table("especies").delete().eq("id", species_id).execute()
    
    # Registrar en auditoría
    if (user_id or user_email) and old_values:
        try:
            from app.services.audit_service import log_change
            log_change(
                table_name='especies',
                record_id=species_id,
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
            logger.warning(f"[delete_admin] Error al registrar auditoría: {str(audit_error)}")

    
    # Obtener la especie antes de eliminarla para auditoría
    old_species_res = sb.table("especies").select("*").eq("id", species_id).limit(1).execute()
    old_values = old_species_res.data[0] if old_species_res.data else None
    
    # (Opcional: validar dependencias: ejemplar, fotos_especies, purchase_items, etc.)
    sb.table("especies").delete().eq("id", species_id).execute()
    
    # Registrar en auditoría
    if (user_id or user_email) and old_values:
        try:
            from app.services.audit_service import log_change
            log_change(
                table_name='especies',
                record_id=species_id,
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
            logger.warning(f"[delete_admin] Error al registrar auditoría: {str(audit_error)}")
