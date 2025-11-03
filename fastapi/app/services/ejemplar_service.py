# app/services/ejemplar_service.py
from typing import List, Optional, Dict, Any
from app.core.supabase_auth import get_public

def _ensure_sector_species_relation(sector_id: int, species_id: int) -> None:
    """
    Asegura que existe una relación entre sector y especie en la tabla sectores_especies.
    Si la relación no existe, la crea. Si ya existe, no hace nada.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    try:
        # Verificar si la relación ya existe
        existing = sb.table("sectores_especies").select("sector_id, especie_id").eq("sector_id", sector_id).eq("especie_id", species_id).limit(1).execute()
        
        if not existing.data:
            # La relación no existe, crearla
            logger.info(f"[_ensure_sector_species_relation] Creando relación sector_id={sector_id}, especie_id={species_id}")
            sb.table("sectores_especies").insert({
                "sector_id": sector_id,
                "especie_id": species_id
            }).execute()
            logger.info(f"[_ensure_sector_species_relation] Relación creada exitosamente")
        else:
            logger.debug(f"[_ensure_sector_species_relation] Relación ya existe (sector_id={sector_id}, especie_id={species_id})")
    except Exception as e:
        # Log el error pero no fallar la creación del ejemplar
        logger.warning(f"[_ensure_sector_species_relation] Error al crear relación: {str(e)}")
        # No lanzar excepción para no interrumpir la creación del ejemplar

def list_staff(
    q: Optional[str] = None,
    species_id: Optional[int] = None,
    sector_id: Optional[int] = None,
    tamaño: Optional[str] = None,
    morfologia: Optional[str] = None,
    nombre_comun: Optional[str] = None,
    sort_by: str = "scientific_name",
    sort_order: str = "asc"
) -> List[Dict[str, Any]]:
    """
    Lista ejemplares con información completa de especie y sector.
    Soporta filtros por especie, sector, tamaño, morfología y nombre común.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    try:
        # Consultar ejemplares directamente (sin joins, más confiable)
        query = sb.table("ejemplar").select("*")
        
        # Aplicar filtros directos
        if species_id:
            query = query.eq("species_id", species_id)
        
        if sector_id:
            query = query.eq("sector_id", sector_id)
        
        if tamaño:
            query = query.eq("tamaño", tamaño)
        
        # Ejecutar la consulta
        res = query.execute()
        ejemplares = res.data or []
        
        # Si no hay ejemplares, retornar lista vacía
        if not ejemplares:
            return []
        
        # Obtener IDs únicos de especies y sectores
        species_ids = list(set([e.get("species_id") for e in ejemplares if e.get("species_id")]))
        sector_ids = list(set([e.get("sector_id") for e in ejemplares if e.get("sector_id")]))
        
        # Consultar especies relacionadas
        especies_map = {}
        if species_ids:
            try:
                especies_res = sb.table("especies").select("id, scientific_name, nombre_común, nombres_comunes, tipo_morfología, morfología_cactus").in_("id", species_ids).execute()
                for especie in (especies_res.data or []):
                    especies_map[especie["id"]] = especie
            except Exception as e:
                logger.warning(f"[list_staff] Error cargando especies: {str(e)}")
        
        # Consultar sectores relacionados
        sectores_map = {}
        if sector_ids:
            try:
                sectores_res = sb.table("sectores").select("id, name, description").in_("id", sector_ids).execute()
                for sector in (sectores_res.data or []):
                    sectores_map[sector["id"]] = sector
            except Exception as e:
                logger.warning(f"[list_staff] Error cargando sectores: {str(e)}")
        
        # Combinar datos
        for ej in ejemplares:
            ej["especies"] = especies_map.get(ej.get("species_id"))
            ej["sectores"] = sectores_map.get(ej.get("sector_id"))
        
    except Exception as e:
        logger.error(f"[list_staff] Error al listar ejemplares: {str(e)}")
        return []
    
    # Filtros adicionales que requieren procesamiento en memoria
    # (porque involucran campos de las tablas relacionadas)
    filtered = []
    for ej in ejemplares:
        # Filtrar por morfología (en la tabla especies)
        if morfologia:
            especie = ej.get("especies") or {}
            tipo_morf = especie.get("tipo_morfología") or especie.get("morfología_cactus") or ""
            if morfologia.lower() not in tipo_morf.lower():
                continue
        
        # Filtrar por nombre común (en la tabla especies)
        if nombre_comun:
            especie = ej.get("especies") or {}
            nombre_comun_val = especie.get("nombre_común") or ""
            nombres_comunes_val = especie.get("nombres_comunes") or ""
            search_text = f"{nombre_comun_val} {nombres_comunes_val}".lower()
            if nombre_comun.lower() not in search_text:
                continue
        
        # Filtro de búsqueda general (en múltiples campos)
        if q:
            especie = ej.get("especies") or {}
            sector = ej.get("sectores") or {}
            search_text = (
                f"{ej.get('id', '')} "
                f"{especie.get('scientific_name', '')} "
                f"{especie.get('nombre_común', '')} "
                f"{sector.get('name', '')} "
                f"{ej.get('nursery', '')} "
                f"{ej.get('health_status', '')} "
                f"{ej.get('location', '')}"
            ).lower()
            if q.lower() not in search_text:
                continue
        
        filtered.append(ej)
    
    # Ordenamiento
    if sort_by == "scientific_name":
        filtered.sort(
            key=lambda x: (
                (x.get("especies") or {}).get("scientific_name") or ""
            ).lower(),
            reverse=(sort_order == "desc")
        )
    elif sort_by == "nombre_comun":
        filtered.sort(
            key=lambda x: (
                (x.get("especies") or {}).get("nombre_común") or ""
            ).lower(),
            reverse=(sort_order == "desc")
        )
    elif sort_by == "tamaño":
        # Ordenar por tamaño: XS < S < M < L < XL < XXL
        tamaño_order = {"XS": 0, "S": 1, "M": 2, "L": 3, "XL": 4, "XXL": 5}
        filtered.sort(
            key=lambda x: tamaño_order.get(x.get("tamaño"), 99),
            reverse=(sort_order == "desc")
        )
    elif sort_by == "purchase_date":
        filtered.sort(
            key=lambda x: x.get("purchase_date") or "",
            reverse=(sort_order == "desc")
        )
    elif sort_by == "sector_name":
        filtered.sort(
            key=lambda x: (
                (x.get("sectores") or {}).get("name") or ""
            ).lower(),
            reverse=(sort_order == "desc")
        )
    
    return filtered

def get_staff(ejemplar_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene un ejemplar por su ID con información completa.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    try:
        # Consultar ejemplar
        res = sb.table("ejemplar").select("*").eq("id", ejemplar_id).limit(1).execute()
        
        if not res.data:
            return None
        
        ejemplar = res.data[0]
        
        # Consultar especie relacionada
        species_id = ejemplar.get("species_id")
        if species_id:
            try:
                especie_res = sb.table("especies").select("id, scientific_name, nombre_común, nombres_comunes, tipo_morfología, morfología_cactus").eq("id", species_id).limit(1).execute()
                ejemplar["especies"] = especie_res.data[0] if especie_res.data else None
            except Exception as e:
                logger.warning(f"[get_staff] Error cargando especie: {str(e)}")
                ejemplar["especies"] = None
        
        # Consultar sector relacionado
        sector_id = ejemplar.get("sector_id")
        if sector_id:
            try:
                sector_res = sb.table("sectores").select("id, name, description").eq("id", sector_id).limit(1).execute()
                ejemplar["sectores"] = sector_res.data[0] if sector_res.data else None
            except Exception as e:
                logger.warning(f"[get_staff] Error cargando sector: {str(e)}")
                ejemplar["sectores"] = None
        
        return ejemplar
        
    except Exception as e:
        logger.error(f"[get_staff] Error al obtener ejemplar: {str(e)}")
        return None

def create_staff(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un nuevo ejemplar.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Validar campos obligatorios
    if not payload.get("species_id"):
        raise ValueError("species_id es obligatorio")
    if not payload.get("sector_id"):
        raise ValueError("sector_id es obligatorio")
    
    # Limpiar payload: remover campos que no deben enviarse
    clean_payload = {k: v for k, v in payload.items() 
                    if k not in ["id", "created_at", "updated_at", "especies", "sectores"]}
    
    # Convertir strings vacíos a None para campos opcionales
    optional_fields = ["nursery", "location"]
    for field in optional_fields:
        if field in clean_payload and clean_payload[field] == "":
            clean_payload[field] = None
    
    # Convertir strings vacíos a None para ENUM de health_status
    if "health_status" in clean_payload and clean_payload["health_status"] == "":
        clean_payload["health_status"] = None
    
    # Convertir valores numéricos vacíos a None
    numeric_fields = ["age_months", "purchase_price", "sale_price"]
    for field in numeric_fields:
        if field in clean_payload and clean_payload[field] == "":
            clean_payload[field] = None
    
    # Convertir strings vacíos a None para ENUM de tamaño (si el campo existe)
    # IMPORTANTE: Si la columna no existe en la BD, removerla completamente del payload
    # Eliminar el campo si está vacío, None, o es una cadena vacía después de trim
    if "tamaño" in clean_payload:
        tamaño_value = clean_payload["tamaño"]
        # Remover si está vacío, None, o es una cadena vacía/espacios
        if tamaño_value is None or tamaño_value == "" or (isinstance(tamaño_value, str) and tamaño_value.strip() == ""):
            del clean_payload["tamaño"]
    
    logger.info(f"[create_staff] Creando ejemplar con datos: {list(clean_payload.keys())}")
    
    try:
        res = sb.table("ejemplar").insert(clean_payload).execute()
        if not res.data:
            raise ValueError("No se pudo crear el ejemplar")
        logger.info(f"[create_staff] Ejemplar creado exitosamente: {res.data[0].get('id')}")
        
        # Asegurar que la relación especie-sector existe en sectores_especies
        species_id = clean_payload["species_id"]
        sector_id = clean_payload["sector_id"]
        _ensure_sector_species_relation(sector_id, species_id)
        
        return res.data[0]
    except Exception as e:
        logger.error(f"[create_staff] Error al crear ejemplar: {str(e)}")
        raise

def update_staff(ejemplar_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Actualiza un ejemplar existente.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    sb = get_public()
    
    # Obtener el ejemplar actual para verificar si cambió species_id o sector_id
    current_ejemplar = sb.table("ejemplar").select("species_id, sector_id").eq("id", ejemplar_id).limit(1).execute()
    old_species_id = current_ejemplar.data[0].get("species_id") if current_ejemplar.data else None
    old_sector_id = current_ejemplar.data[0].get("sector_id") if current_ejemplar.data else None
    
    # Limpiar payload
    clean_payload = {k: v for k, v in payload.items() 
                    if k not in ["id", "created_at", "updated_at", "especies", "sectores"]}
    
    # Convertir strings vacíos a None
    optional_fields = ["nursery", "location"]
    for field in optional_fields:
        if field in clean_payload and clean_payload[field] == "":
            clean_payload[field] = None
    
    # Convertir strings vacíos a None para ENUM de health_status
    if "health_status" in clean_payload and clean_payload["health_status"] == "":
        clean_payload["health_status"] = None
    
    # Convertir valores numéricos vacíos a None
    numeric_fields = ["age_months", "purchase_price", "sale_price"]
    for field in numeric_fields:
        if field in clean_payload and clean_payload[field] == "":
            clean_payload[field] = None
    
    # Convertir strings vacíos a None para ENUM de tamaño (si el campo existe)
    # IMPORTANTE: Si está vacío o es None, removerlo completamente (la columna puede no existir)
    if "tamaño" in clean_payload:
        tamaño_value = clean_payload["tamaño"]
        # Remover si está vacío, None, o es una cadena vacía/espacios
        if tamaño_value is None or tamaño_value == "" or (isinstance(tamaño_value, str) and tamaño_value.strip() == ""):
            del clean_payload["tamaño"]
    
    try:
        res = sb.table("ejemplar").update(clean_payload).eq("id", ejemplar_id).execute()
        if not res.data:
            raise LookupError("Ejemplar no encontrado")
        
        # Si se actualizó species_id o sector_id, asegurar la relación en sectores_especies
        new_species_id = clean_payload.get("species_id", old_species_id)
        new_sector_id = clean_payload.get("sector_id", old_sector_id)
        
        if new_species_id and new_sector_id:
            # Si cambió la especie o el sector, crear la nueva relación
            if (new_species_id != old_species_id or new_sector_id != old_sector_id) or not old_species_id:
                _ensure_sector_species_relation(new_sector_id, new_species_id)
        
        return res.data[0]
    except Exception as e:
        logger.error(f"[update_staff] Error al actualizar ejemplar: {str(e)}")
        raise

def delete_staff(ejemplar_id: int) -> None:
    """
    Elimina un ejemplar.
    """
    sb = get_public()
    sb.table("ejemplar").delete().eq("id", ejemplar_id).execute()

