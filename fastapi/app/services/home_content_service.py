# app/services/home_content_service.py
from typing import List, Optional, Dict, Any
from app.core.supabase_auth import (
    get_public as get_supabase_client,
    get_public_clean,
)
from supabase import create_client as supabase_create_client
import json
import os

def get_authenticated_client(access_token: Optional[str] = None):
    """
    Obtiene un cliente de Supabase con la sesión del usuario autenticado.
    Si no se proporciona token, retorna un cliente sin sesión.
    
    Para que RLS funcione correctamente, necesitamos configurar el token en el cliente.
    El cliente de Supabase Python permite configurar headers adicionales a través
    del cliente postgrest interno.
    """
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env")
    
    # Crear un nuevo cliente para esta operación
    client = supabase_create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    if access_token:
        # Configurar el token en el cliente postgrest interno
        # El cliente de Supabase Python expone el postgrest_client que tiene un session
        # Podemos modificar los headers del session para incluir el token
        try:
            # Acceder al cliente postgrest y configurar headers
            if hasattr(client, 'postgrest'):
                postgrest_client = client.postgrest
                # El postgrest client tiene un session que podemos modificar
                if hasattr(postgrest_client, 'session'):
                    session = postgrest_client.session
                    # Configurar headers si no existen
                    if not hasattr(session, 'headers') or session.headers is None:
                        session.headers = {}
                    # Actualizar headers con el token de autorización
                    session.headers.update({
                        "Authorization": f"Bearer {access_token}",
                        "apikey": SUPABASE_ANON_KEY
                    })
        except Exception as e:
            # Si no podemos configurar los headers, loguear el error pero continuar
            # El cliente funcionará pero puede que RLS no funcione correctamente
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"No se pudo configurar headers del postgrest client: {e}")
            logger.warning("El cliente se creará sin autenticación, RLS puede fallar")
    
    return client

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

def get_staff(access_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Obtiene el contenido del home para staff (requiere autenticación).
    """
    try:
        # Usar cliente autenticado si hay token, sino usar cliente público
        if access_token:
            sb = get_authenticated_client(access_token)
        else:
            sb = get_public_clean()
        
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

def create_or_update_staff(payload: Dict[str, Any], user_id: Optional[int] = None, access_token: Optional[str] = None) -> Dict[str, Any]:
    """
    Crea o actualiza el contenido del home.
    Si ya existe un registro activo, lo actualiza. Si no, crea uno nuevo.
    Requiere access_token para que las políticas RLS funcionen correctamente.
    """
    if not access_token:
        raise ValueError("access_token es requerido para crear o actualizar contenido del home")
    
    # Usar cliente autenticado con la sesión del usuario
    sb = get_authenticated_client(access_token)
    
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

