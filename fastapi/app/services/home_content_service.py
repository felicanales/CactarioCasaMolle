# app/services/home_content_service.py
from typing import List, Optional, Dict, Any
from app.core.supabase_auth import get_public as get_supabase_client, get_public_clean
import json

# ----------------- PÚBLICO -----------------

def get_public() -> Optional[Dict[str, Any]]:
    """
    Obtiene el contenido público del home (sin autenticación).
    """
    try:
        sb = get_public_clean()
        res = sb.table("home_content").select("*").eq("is_active", True).order("updated_at", desc=True).limit(1).execute()
        
        if not res.data or len(res.data) == 0:
            # Retornar contenido por defecto si no hay configuración
            return {
                "welcome_text": "Bienvenido al Cactario CasaMolle",
                "carousel_images": [],
                "sections": []
            }
        
        content = res.data[0]
    except Exception as e:
        # Si la tabla no existe o hay otro error, retornar contenido por defecto
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "relation" in error_msg or "table" in error_msg:
            # La tabla no existe, retornar contenido por defecto
            return {
                "welcome_text": "Bienvenido al Cactario CasaMolle",
                "carousel_images": [],
                "sections": []
            }
        # Otro tipo de error, re-lanzar
        raise
    
    # Parsear JSON fields si existen (Supabase puede devolver strings o objetos ya parseados)
    if content.get("carousel_images") is not None:
        if isinstance(content["carousel_images"], str):
            try:
                content["carousel_images"] = json.loads(content["carousel_images"])
            except:
                content["carousel_images"] = []
        # Si ya es una lista/dict, dejarlo como está
    else:
        content["carousel_images"] = []
    
    if content.get("sections") is not None:
        if isinstance(content["sections"], str):
            try:
                content["sections"] = json.loads(content["sections"])
            except:
                content["sections"] = []
        # Si ya es una lista/dict, dejarlo como está
    else:
        content["sections"] = []
    
    return content

# ----------------- STAFF (privado) -----------------

def get_staff() -> Optional[Dict[str, Any]]:
    """
    Obtiene el contenido del home para staff (requiere autenticación).
    """
    try:
        sb = get_supabase_client()
        res = sb.table("home_content").select("*").order("updated_at", desc=True).limit(1).execute()
        
        if not res.data or len(res.data) == 0:
            # Retornar contenido por defecto
            return {
                "welcome_text": "Bienvenido al Cactario CasaMolle",
                "carousel_images": [],
                "sections": []
            }
        
        content = res.data[0]
    except Exception as e:
        # Si la tabla no existe o hay otro error, retornar contenido por defecto
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "relation" in error_msg or "table" in error_msg:
            # La tabla no existe, retornar contenido por defecto
            return {
                "welcome_text": "Bienvenido al Cactario CasaMolle",
                "carousel_images": [],
                "sections": []
            }
        # Otro tipo de error, re-lanzar
        raise
    
    # Parsear JSON fields si existen (Supabase puede devolver strings o objetos ya parseados)
    if content.get("carousel_images") is not None:
        if isinstance(content["carousel_images"], str):
            try:
                content["carousel_images"] = json.loads(content["carousel_images"])
            except:
                content["carousel_images"] = []
        # Si ya es una lista/dict, dejarlo como está
    else:
        content["carousel_images"] = []
    
    if content.get("sections") is not None:
        if isinstance(content["sections"], str):
            try:
                content["sections"] = json.loads(content["sections"])
            except:
                content["sections"] = []
        # Si ya es una lista/dict, dejarlo como está
    else:
        content["sections"] = []
    
    return content

def create_or_update_staff(payload: Dict[str, Any], user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Crea o actualiza el contenido del home.
    Si ya existe un registro activo, lo actualiza. Si no, crea uno nuevo.
    """
    sb = get_supabase_client()
    
    # Verificar si ya existe un registro activo
    existing = sb.table("home_content").select("id").eq("is_active", True).limit(1).execute()
    
    # Preparar datos
    # Supabase acepta JSONB directamente como Python dict/list, pero también acepta strings JSON
    carousel_data = payload.get("carousel_images", [])
    sections_data = payload.get("sections", [])
    
    data = {
        "welcome_text": payload.get("welcome_text", "Bienvenido al Cactario CasaMolle"),
        "carousel_images": carousel_data if isinstance(carousel_data, (list, dict)) else json.dumps(carousel_data),
        "sections": sections_data if isinstance(sections_data, (list, dict)) else json.dumps(sections_data),
        "is_active": payload.get("is_active", True)
    }
    
    if existing.data and len(existing.data) > 0:
        # Actualizar registro existente
        content_id = existing.data[0]["id"]
        res = sb.table("home_content").update(data).eq("id", content_id).execute()
        if not res.data:
            raise Exception("Error al actualizar contenido del home")
        updated = res.data[0]
    else:
        # Crear nuevo registro
        res = sb.table("home_content").insert(data).execute()
        if not res.data:
            raise Exception("Error al crear contenido del home")
        updated = res.data[0]
    
    # Parsear JSON fields para la respuesta (si vienen como strings)
    if updated.get("carousel_images") is not None:
        if isinstance(updated["carousel_images"], str):
            try:
                updated["carousel_images"] = json.loads(updated["carousel_images"])
            except:
                updated["carousel_images"] = []
    else:
        updated["carousel_images"] = []
    
    if updated.get("sections") is not None:
        if isinstance(updated["sections"], str):
            try:
                updated["sections"] = json.loads(updated["sections"])
            except:
                updated["sections"] = []
    else:
        updated["sections"] = []
    
    return updated

