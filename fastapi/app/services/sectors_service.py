# app/services/sectors_service.py
from typing import List, Optional, Dict, Any, Set
from app.core.supabase_auth import get_public, get_public_clean, get_service
from app.services import photos_service

PUBLIC_SECTOR_FIELDS = ["id", "name", "description", "qr_code"]
STAFF_SECTOR_FIELDS = PUBLIC_SECTOR_FIELDS + ["created_at", "updated_at"]

def list_public(q: Optional[str] = None) -> List[Dict[str, Any]]:
    # Usar cliente limpio sin sesión para consultas públicas
    sb = get_public_clean()
    query = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS))
    if q:
        query = query.ilike("name", f"%{q}%")
    res = query.order("name").execute()
    return res.data or []

def get_public_by_qr(qr_code: str) -> Optional[Dict[str, Any]]:
    import logging
    logger = logging.getLogger(__name__)
    
    # Usar cliente limpio sin sesión para consultas públicas
    sb = get_public_clean()
    # Normalizar qr_code: remover espacios y convertir a string
    qr_code_normalized = str(qr_code).strip() if qr_code else None
    
    if not qr_code_normalized:
        logger.warning("[get_public_by_qr] qr_code vacío o None")
        return None
    
    logger.info(f"[get_public_by_qr] Buscando sector con qr_code: '{qr_code_normalized}'")
    
    try:
        res = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS)).eq("qr_code", qr_code_normalized).limit(1).execute()
        
        # Log detallado de la respuesta
        logger.info(f"[get_public_by_qr] Respuesta de Supabase:")
        logger.info(f"  - tiene data: {bool(res.data)}")
        logger.info(f"  - tipo de data: {type(res.data)}")
        logger.info(f"  - longitud: {len(res.data) if res.data else 0}")
        if res.data:
            logger.info(f"  - contenido: {res.data}")
        
        if res.data and len(res.data) > 0:
            sector = res.data[0]
            logger.info(f"[get_public_by_qr] Sector encontrado: id={sector.get('id')}, name={sector.get('name')}, qr_code={sector.get('qr_code')}")
            return sector
        else:
            logger.warning(f"[get_public_by_qr] No se encontró sector con qr_code: '{qr_code_normalized}'")
            
            # Intentar búsqueda por ID si el qr_code tiene formato SECTOR{id}
            import re
            match = re.match(r'^SECTOR(\d+)$', qr_code_normalized, re.IGNORECASE)
            if match:
                sector_id = int(match.group(1))
                logger.info(f"[get_public_by_qr] qr_code tiene formato SECTOR{{id}}, buscando por ID: {sector_id}")
                res_by_id = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS)).eq("id", sector_id).limit(1).execute()
                if res_by_id.data and len(res_by_id.data) > 0:
                    sector = res_by_id.data[0]
                    logger.info(f"[get_public_by_qr] Sector encontrado por ID: id={sector.get('id')}, name={sector.get('name')}, qr_code={sector.get('qr_code')}")
                    return sector
            
            # Intentar búsqueda sin distinción de mayúsculas/minúsculas como fallback
            logger.info(f"[get_public_by_qr] Intentando búsqueda alternativa (case-insensitive)...")
            all_sectors = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS)).execute()
            if all_sectors.data:
                for sector in all_sectors.data:
                    if sector.get("qr_code") and str(sector.get("qr_code")).strip().upper() == qr_code_normalized.upper():
                        logger.info(f"[get_public_by_qr] Sector encontrado (case-insensitive): id={sector.get('id')}, qr_code={sector.get('qr_code')}")
                        return sector
            logger.warning(f"[get_public_by_qr] No se encontró sector con qr_code (ni por ID, ni case-insensitive): '{qr_code_normalized}'")
            return None
    except Exception as e:
        logger.error(f"[get_public_by_qr] Error al buscar sector: {str(e)}", exc_info=True)
        return None

def _get_sector_id_by_qr(qr_code: str) -> Optional[int]:
    import logging
    logger = logging.getLogger(__name__)
    
    # Usar cliente limpio sin sesión para consultas públicas
    sb = get_public_clean()
    qr_code_normalized = str(qr_code).strip() if qr_code else None
    
    if not qr_code_normalized:
        return None
    
    try:
        r = sb.table("sectores").select("id").eq("qr_code", qr_code_normalized).limit(1).execute()
        if r.data and len(r.data) > 0:
            logger.info(f"[_get_sector_id_by_qr] Sector encontrado con id: {r.data[0]['id']} para qr_code: {qr_code_normalized}")
            return r.data[0]["id"]
        else:
            # Intentar búsqueda por ID si el qr_code tiene formato SECTOR{id}
            import re
            match = re.match(r'^SECTOR(\d+)$', qr_code_normalized, re.IGNORECASE)
            if match:
                sector_id = int(match.group(1))
                logger.info(f"[_get_sector_id_by_qr] qr_code tiene formato SECTOR{{id}}, retornando ID: {sector_id}")
                return sector_id
            
            logger.warning(f"[_get_sector_id_by_qr] No se encontró sector con qr_code: {qr_code_normalized}")
            return None
    except Exception as e:
        logger.error(f"[_get_sector_id_by_qr] Error al buscar sector: {str(e)}", exc_info=True)
        return None

def list_species_public_by_sector_qr(qr_code: str) -> List[Dict[str, Any]]:
    """
    Devuelve especies (campos públicos) presentes en el sector identificado por 'qr_code'.
    Las especies se obtienen desde la tabla sectores_especies.
    Campos: id, slug, scientific_name, nombre_común + cover_photo (si existe).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Usar cliente limpio sin sesión para consultas públicas
    sb = get_public_clean()
    sector_id = _get_sector_id_by_qr(qr_code)
    
    if not sector_id:
        logger.warning(f"[list_species_public_by_sector_qr] No se encontró sector_id para qr_code: {qr_code}")
        return []

    logger.info(f"[list_species_public_by_sector_qr] Buscando especies para sector_id: {sector_id}")

    # 1) Obtener los IDs de especies desde sectores_especies (tabla de relación)
    relations = sb.table("sectores_especies").select("especie_id").eq("sector_id", sector_id).execute()
    
    logger.info(f"[list_species_public_by_sector_qr] Relaciones encontradas: {len(relations.data) if relations.data else 0}")
    
    if not relations.data:
        logger.info(f"[list_species_public_by_sector_qr] No hay relaciones en sectores_especies para sector_id: {sector_id}")
        return []
    
    especie_ids = [r["especie_id"] for r in relations.data if r.get("especie_id")]
    
    if not especie_ids:
        logger.warning(f"[list_species_public_by_sector_qr] No hay especie_ids válidos en las relaciones")
        return []

    logger.info(f"[list_species_public_by_sector_qr] Obteniendo información de {len(especie_ids)} especies")

    # 2) Obtener información de las especies (campos públicos)
    #    NOTA: nombres en tu schema: scientific_name, nombre_común, slug
    sp = sb.table("especies").select("id, slug, scientific_name, nombre_común").in_("id", especie_ids).execute()
    species = sp.data or []

    logger.info(f"[list_species_public_by_sector_qr] Especies obtenidas: {len(species)}")

    # 3) Traer foto de portada por especie usando el servicio genérico
    cover_map: Dict[int, Optional[str]] = {}
    if species:
        ids = [s["id"] for s in species]
        cover_map = photos_service.get_cover_photos_map("especie", ids)
        logger.info(f"[list_species_public_by_sector_qr] Fotos de portada obtenidas: {len([k for k, v in cover_map.items() if v])}")

    # 4) Construir respuesta con cover_photo
    out = []
    for s in species:
        out.append({
            "id": s["id"],
            "slug": s["slug"],
            "scientific_name": s["scientific_name"],
            "nombre_común": s.get("nombre_común"),
            "cover_photo": cover_map.get(s["id"]),
        })
    
    # Ordenar por nombre común o científico
    out.sort(key=lambda x: (x["nombre_común"] or x["scientific_name"]).lower())
    
    logger.info(f"[list_species_public_by_sector_qr] Retornando {len(out)} especies ordenadas")
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

def create_staff(payload: Dict[str, Any], user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
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
    # IMPORTANTE: NO incluir 'id' - debe ser generado automáticamente por la base de datos
    valid_fields = ["name", "description", "qr_code"]
    clean_payload = {k: v for k, v in payload.items() if k in valid_fields}
    
    # Asegurar que no se esté enviando el ID (debe ser auto-generado)
    if "id" in clean_payload:
        logger.warning(f"[create_staff] Se intentó enviar 'id' en el payload, removiéndolo: {clean_payload.get('id')}")
        del clean_payload["id"]
    
    # También remover campos de timestamp que deben ser generados automáticamente
    for auto_field in ["created_at", "updated_at"]:
        if auto_field in clean_payload:
            logger.warning(f"[create_staff] Se intentó enviar '{auto_field}' en el payload, removiéndolo")
            del clean_payload[auto_field]
    
    # Convertir strings vacíos a None para campos opcionales
    for field in ["description"]:
        if field in clean_payload and clean_payload[field] == "":
            clean_payload[field] = None
    
    logger.info(f"[create_staff] Payload limpio para insertar: {clean_payload}")
    
    try:
        res = sb.table("sectores").insert(clean_payload).execute()
        logger.info(f"[create_staff] Respuesta de Supabase: {res}")
        if not res.data:
            logger.error("[create_staff] Error: Supabase no devolvió datos")
            raise ValueError("No se pudo crear el sector")
        created_sector = res.data[0]
        sector_id = created_sector.get('id')
        logger.info(f"[create_staff] Sector creado exitosamente: {sector_id}")
        
        # Registrar en auditoría
        if user_id or user_email:
            try:
                from app.services.audit_service import log_change
                log_change(
                    table_name='sectores',
                    record_id=sector_id,
                    action='CREATE',
                    user_id=user_id,
                    user_email=user_email,
                    user_name=user_name,
                    old_values=None,
                    new_values=created_sector,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            except Exception as audit_error:
                logger.warning(f"[create_staff] Error al registrar auditoría: {str(audit_error)}")
        
        return created_sector
    except Exception as e:
        # Capturar errores de Supabase y proporcionar mensaje más claro
        logger.error(f"[create_staff] Excepción capturada: {type(e).__name__}: {str(e)}")
        logger.error(f"[create_staff] Atributos de la excepción: {dir(e)}")
        
        error_msg = str(e)
        
        # Intentar extraer el mensaje de error de Supabase si está disponible
        # Supabase Python client puede lanzar diferentes tipos de excepciones
        if hasattr(e, 'message'):
            error_msg = str(e.message)
            logger.error(f"[create_staff] Error message attribute: {error_msg}")
        elif hasattr(e, 'args') and len(e.args) > 0:
            error_msg = str(e.args[0])
            logger.error(f"[create_staff] Error args: {error_msg}")
        
        # Intentar extraer información de respuesta HTTP si está disponible
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            try:
                import json
                error_data = json.loads(e.response.text)
                if 'message' in error_data:
                    error_msg = error_data['message']
                    logger.error(f"[create_staff] Error de Supabase: {error_msg}")
                if 'details' in error_data:
                    error_msg += f" - {error_data['details']}"
            except:
                pass
        
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
            logger.error("[create_staff] Error: campos obligatorios faltantes")
            raise ValueError("Faltan campos obligatorios para crear el sector")
        elif "duplicate" in error_lower or "unique" in error_lower or "already exists" in error_lower:
            # Intentar determinar qué campo está duplicado
            if "pkey" in error_lower or "id" in error_lower:
                # Error de primary key duplicado - la secuencia está desincronizada
                logger.error(f"[create_staff] Error: ID duplicado - la secuencia de auto-incremento está desincronizada. {error_msg}")
                raise ValueError("Error interno: la secuencia de IDs está desincronizada. Por favor, contacta al administrador.")
            elif "qr_code" in error_lower or "sectors_qr_code_key" in error_lower:
                logger.error("[create_staff] Error: qr_code duplicado")
                raise ValueError("Ya existe un sector con ese código QR")
            elif "name" in error_lower or "sectors_name_key" in error_lower:
                logger.error("[create_staff] Error: nombre duplicado")
                raise ValueError("Ya existe un sector con ese nombre")
            else:
                logger.error(f"[create_staff] Error: constraint único violado - {error_msg}")
                raise ValueError(f"Ya existe un sector con estos datos: {error_msg}")
        elif "400" in error_msg or "bad request" in error_lower:
            logger.error(f"[create_staff] Error de validación: {error_msg}")
            raise ValueError(f"Error de validación: {error_msg}")
        else:
            logger.error(f"[create_staff] Error inesperado: {error_msg}")
            raise ValueError(f"Error al crear sector: {error_msg}")

def update_staff(sector_id: int, payload: Dict[str, Any], user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Obtener valores anteriores para auditoría
    old_values = None
    if user_id or user_email:
        try:
            old_res = sb.table("sectores").select("*").eq("id", sector_id).limit(1).execute()
            if old_res.data:
                old_values = old_res.data[0]
        except Exception as e:
            logger.warning(f"[update_staff] No se pudieron obtener valores anteriores para auditoría: {str(e)}")
    
    # Convertir string vacío a None para qr_code
    if "qr_code" in payload and payload["qr_code"] == "":
        payload["qr_code"] = None
    # Validar unicidad solo si qr_code tiene un valor
    if "qr_code" in payload and payload["qr_code"]:
        exists = sb.table("sectores").select("id").eq("qr_code", payload["qr_code"]).neq("id", sector_id).limit(1).execute()
        if exists.data:
            raise ValueError("qr_code ya existe en otro sector")
    
    # Remover campos que no deben actualizarse
    for field in ["id", "created_at", "updated_at"]:
        if field in payload:
            del payload[field]
    
    res = sb.table("sectores").update(payload).eq("id", sector_id).execute()
    if not res.data:
        raise LookupError("Sector no encontrado")
    
    updated_sector = res.data[0]
    
    # Registrar en auditoría
    if user_id or user_email:
        try:
            from app.services.audit_service import log_change
            log_change(
                table_name='sectores',
                record_id=sector_id,
                action='UPDATE',
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
                old_values=old_values,
                new_values=updated_sector,
                ip_address=ip_address,
                user_agent=user_agent
            )
        except Exception as audit_error:
            logger.warning(f"[update_staff] Error al registrar auditoría: {str(audit_error)}")
    
    return updated_sector

def delete_admin(sector_id: int, user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> None:
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    sb_admin = get_service()
    
    # Obtener el sector antes de eliminarlo para auditoría
    old_sector_res = sb_admin.table("sectores").select("*").eq("id", sector_id).limit(1).execute()
    old_values = old_sector_res.data[0] if old_sector_res.data else None
    
    # (Opcional: validar que no tenga ejemplares asociados)
    sb.table("sectores").delete().eq("id", sector_id).execute()
    
    # Registrar en auditoría
    if (user_id or user_email) and old_values:
        try:
            from app.services.audit_service import log_change
            log_change(
                table_name='sectores',
                record_id=sector_id,
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

def update_sector_species_staff(sector_id: int, especie_ids: List[int], user_id: Optional[int] = None, user_email: Optional[str] = None, user_name: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> List[Dict[str, Any]]:
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
    
    # Obtener relaciones anteriores para auditoría
    old_relations_res = sb.table("sectores_especies").select("*").eq("sector_id", sector_id).execute()
    old_relations = old_relations_res.data or []
    old_especie_ids = [r["especie_id"] for r in old_relations]
    
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
    
    # Registrar en auditoría (registrar como UPDATE en la tabla sectores_especies)
    if user_id or user_email:
        import logging
        logger = logging.getLogger(__name__)
        try:
            from app.services.audit_service import log_change
            # Registrar como UPDATE del sector (cambios en especies asociadas)
            log_change(
                table_name='sectores_especies',
                record_id=sector_id,  # Usar sector_id como identificador
                action='UPDATE',
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
                old_values={'especie_ids': old_especie_ids},
                new_values={'especie_ids': especie_ids},
                ip_address=ip_address,
                user_agent=user_agent
            )
        except Exception as audit_error:
            logger.warning(f"[update_sector_species_staff] Error al registrar auditoría: {str(audit_error)}")
    
    # Retornar las especies actualizadas para confirmar
    return get_sector_species_staff(sector_id)
