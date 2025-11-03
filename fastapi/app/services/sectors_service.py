# app/services/sectors_service.py
from typing import List, Optional, Dict, Any, Set
from app.core.supabase_auth import get_public

PUBLIC_SECTOR_FIELDS = ["id", "name", "description", "location", "qr_code"]
STAFF_SECTOR_FIELDS = PUBLIC_SECTOR_FIELDS + ["created_at", "updated_at"]

def list_public(q: Optional[str] = None) -> List[Dict[str, Any]]:
    sb = get_public()
    query = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS))
    if q:
        query = query.ilike("name", f"%{q}%")
    res = query.order("name").execute()
    return res.data or []

def get_public_by_qr(qr_code: str) -> Optional[Dict[str, Any]]:
    sb = get_public()
    res = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS)).eq("qr_code", qr_code).limit(1).execute()
    return res.data[0] if res.data else None

def _get_sector_id_by_qr(qr_code: str) -> Optional[int]:
    sb = get_public()
    r = sb.table("sectores").select("id").eq("qr_code", qr_code).limit(1).execute()
    return r.data[0]["id"] if r.data else None

def list_species_public_by_sector_qr(qr_code: str) -> List[Dict[str, Any]]:
    """
    Devuelve especies (campos públicos) presentes en el sector identificado por 'qr_code'.
    Campos: id, slug, scientific_name, nombre_común + cover_photo (si existe).
    """
    sb = get_public()
    sector_id = _get_sector_id_by_qr(qr_code)
    if not sector_id:
        return []

    # 1) Traer species_id desde ejemplar por sector
    ej = sb.table("ejemplar").select("species_id").eq("sector_id", sector_id).execute()
    species_ids: Set[int] = set([row["species_id"] for row in (ej.data or []) if row.get("species_id")])

    if not species_ids:
        return []

    # 2) Traer especies públicas por IDs
    #    NOTA: nombres en tu schema: scientific_name, nombre_común, slug
    sp = sb.table("especies").select("id, slug, scientific_name, nombre_común").in_("id", list(species_ids)).execute()
    species = sp.data or []

    # 3) Traer foto de portada por especie (is_cover true o menor order_index)
    cover_map: Dict[int, Optional[str]] = {}
    if species:
        ids = [s["id"] for s in species]
        photos = sb.table("fotos_especies").select("especie_id, storage_path, is_cover, order_index").in_("especie_id", ids).execute()
        # Elegir portada: primero is_cover=True; si no hay, la de menor order_index
        by_species: Dict[int, List[Dict[str, Any]]] = {}
        for p in (photos.data or []):
            by_species.setdefault(p["especie_id"], []).append(p)
        for sid, plist in by_species.items():
            chosen = None
            # 1) portada explícita
            for p in plist:
                if p.get("is_cover"):
                    chosen = p["storage_path"]; break
            # 2) si no, menor orden
            if chosen is None:
                plist_sorted = sorted(plist, key=lambda x: (x.get("order_index") or 0))
                if plist_sorted:
                    chosen = plist_sorted[0]["storage_path"]
            cover_map[sid] = chosen

    # 4) Adjuntar cover_photo
    out = []
    for s in species:
        out.append({
            "id": s["id"],
            "slug": s["slug"],
            "scientific_name": s["scientific_name"],
            "nombre_común": s.get("nombre_común"),
            "cover_photo": cover_map.get(s["id"]),
        })
    # ordenar por nombre común o científico
    out.sort(key=lambda x: (x["nombre_común"] or x["scientific_name"]).lower())
    return out

# ----------------- STAFF (privado) -----------------

def list_staff(q: Optional[str] = None) -> List[Dict[str, Any]]:
    sb = get_public()
    query = sb.table("sectores").select("*")
    if q:
        query = query.ilike("name", f"%{q}%")
    res = query.order("name").execute()
    return res.data or []

def get_staff(sector_id: int) -> Optional[Dict[str, Any]]:
    sb = get_public()
    res = sb.table("sectores").select("*").eq("id", sector_id).limit(1).execute()
    return res.data[0] if res.data else None

def create_staff(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un nuevo sector en la base de datos.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Log del payload recibido
    logger.info(f"[create_staff] Payload recibido: {payload}")
    
    # Validar que el campo 'name' esté presente (requerido)
    if not payload.get("name") or payload.get("name", "").strip() == "":
        logger.error("[create_staff] Error: campo 'name' faltante o vacío")
        raise ValueError("El campo 'name' es obligatorio")
    
    # Convertir string vacío a None para qr_code
    if "qr_code" in payload and payload["qr_code"] == "":
        payload["qr_code"] = None
    
    # Validar unicidad de qr_code si viene definido
    if payload.get("qr_code"):
        exists = sb.table("sectores").select("id").eq("qr_code", payload["qr_code"]).limit(1).execute()
        if exists.data:
            logger.error(f"[create_staff] Error: qr_code '{payload['qr_code']}' ya existe")
            raise ValueError("qr_code ya existe")
    
    # Limpiar payload: solo enviar campos válidos
    valid_fields = ["name", "description", "location", "qr_code"]
    clean_payload = {k: v for k, v in payload.items() if k in valid_fields}
    
    # Convertir strings vacíos a None para campos opcionales
    for field in ["description", "location"]:
        if field in clean_payload and clean_payload[field] == "":
            clean_payload[field] = None
    
    logger.info(f"[create_staff] Payload limpio para insertar: {clean_payload}")
    
    try:
        res = sb.table("sectores").insert(clean_payload).execute()
        logger.info(f"[create_staff] Respuesta de Supabase: {res}")
        if not res.data:
            logger.error("[create_staff] Error: Supabase no devolvió datos")
            raise ValueError("No se pudo crear el sector")
        logger.info(f"[create_staff] Sector creado exitosamente: {res.data[0]}")
        return res.data[0]
    except Exception as e:
        # Capturar errores de Supabase y proporcionar mensaje más claro
        error_msg = str(e)
        
        # Intentar extraer el mensaje de error de Supabase si está disponible
        if hasattr(e, 'message'):
            error_msg = str(e.message)
        elif hasattr(e, 'args') and len(e.args) > 0:
            error_msg = str(e.args[0])
        
        # Si el error contiene información de Supabase, intentar extraerla
        if hasattr(e, 'code') or hasattr(e, 'details') or hasattr(e, 'hint'):
            details_parts = []
            if hasattr(e, 'details') and e.details:
                details_parts.append(f"Detalles: {e.details}")
            if hasattr(e, 'hint') and e.hint:
                details_parts.append(f"Hint: {e.hint}")
            if hasattr(e, 'code') and e.code:
                details_parts.append(f"Código: {e.code}")
            if details_parts:
                error_msg = f"{error_msg}. {' '.join(details_parts)}"
        
        # Verificar si es un error de validación o constraint
        error_lower = error_msg.lower()
        if "null value" in error_lower or "not null" in error_lower:
            raise ValueError("Faltan campos obligatorios para crear el sector")
        elif "duplicate" in error_lower or "unique" in error_lower:
            raise ValueError("Ya existe un sector con estos datos")
        elif "400" in error_msg or "bad request" in error_lower:
            raise ValueError(f"Error de validación: {error_msg}")
        else:
            raise ValueError(f"Error al crear sector: {error_msg}")

def update_staff(sector_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_public()
    # Convertir string vacío a None para qr_code
    if "qr_code" in payload and payload["qr_code"] == "":
        payload["qr_code"] = None
    # Validar unicidad solo si qr_code tiene un valor
    if "qr_code" in payload and payload["qr_code"]:
        exists = sb.table("sectores").select("id").eq("qr_code", payload["qr_code"]).neq("id", sector_id).limit(1).execute()
        if exists.data:
            raise ValueError("qr_code ya existe en otro sector")
    res = sb.table("sectores").update(payload).eq("id", sector_id).execute()
    if not res.data:
        raise LookupError("Sector no encontrado")
    return res.data[0]

def delete_admin(sector_id: int) -> None:
    sb = get_public()
    # (Opcional: validar que no tenga ejemplares asociados)
    sb.table("sectores").delete().eq("id", sector_id).execute()

def get_sector_species_staff(sector_id: int) -> List[Dict[str, Any]]:
    """
    Obtiene las especies asociadas a un sector desde la tabla sectores_especies.
    """
    sb = get_public()
    # Obtener los IDs de especies desde sectores_especies
    relations = sb.table("sectores_especies").select("especie_id").eq("sector_id", sector_id).execute()
    if not relations.data:
        return []
    
    especie_ids = [r["especie_id"] for r in relations.data]
    
    # Obtener información de las especies
    especies = sb.table("especies").select("id, scientific_name, nombre_común, slug").in_("id", especie_ids).execute()
    
    # Ordenar por nombre científico
    result = especies.data or []
    result.sort(key=lambda x: x.get("scientific_name", "").lower())
    return result

def update_sector_species_staff(sector_id: int, especie_ids: List[int]) -> List[Dict[str, Any]]:
    """
    Actualiza las especies asociadas a un sector en la tabla sectores_especies.
    Elimina las relaciones existentes y crea las nuevas.
    
    Args:
        sector_id: ID del sector
        especie_ids: Lista de IDs de especies a asociar
    
    Returns:
        Lista de especies asociadas al sector
    """
    sb = get_public()
    
    # Validar que el sector exista
    sector_check = sb.table("sectores").select("id").eq("id", sector_id).limit(1).execute()
    if not sector_check.data:
        raise ValueError(f"Sector con id {sector_id} no existe")
    
    # Validar que las especies existan (si hay IDs)
    if especie_ids:
        especies_check = sb.table("especies").select("id").in_("id", especie_ids).execute()
        found_ids = {e["id"] for e in (especies_check.data or [])}
        invalid_ids = set(especie_ids) - found_ids
        if invalid_ids:
            raise ValueError(f"Especies con IDs {invalid_ids} no existen")
    
    # Eliminar relaciones existentes para este sector
    delete_result = sb.table("sectores_especies").delete().eq("sector_id", sector_id).execute()
    
    # Crear nuevas relaciones en la tabla sectores_especies
    if especie_ids:
        # Eliminar duplicados y asegurar que son enteros
        unique_ids = list(set(int(eid) for eid in especie_ids if eid is not None))
        new_relations = [{"sector_id": int(sector_id), "especie_id": int(eid)} for eid in unique_ids]
        
        # Insertar en la tabla sectores_especies
        insert_result = sb.table("sectores_especies").insert(new_relations).execute()
        
        if not insert_result.data:
            raise ValueError("Error al insertar relaciones en sectores_especies")
    
    # Retornar las especies actualizadas para confirmar
    return get_sector_species_staff(sector_id)
