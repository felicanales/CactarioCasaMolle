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
    El cliente de Supabase Python usa postgrest internamente. Configuramos los headers
    directamente en el cliente postgrest.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env")
    
    # Crear un nuevo cliente para esta operación
    client = supabase_create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    if access_token:
        logger.info(f"[get_authenticated_client] Configurando token para RLS")
        
        # Configurar headers en el cliente postgrest
        # El cliente de Supabase Python expone postgrest que tiene un session con headers
        try:
            if hasattr(client, 'postgrest'):
                postgrest = client.postgrest
                
                # Intentar múltiples formas de configurar headers
                # Forma 1: session.headers (más común)
                if hasattr(postgrest, 'session'):
                    session = postgrest.session
                    if not hasattr(session, 'headers') or session.headers is None:
                        # Crear un objeto tipo dict si no existe
                        from types import SimpleNamespace
                        session.headers = {}
                    if isinstance(session.headers, dict):
                        session.headers.update({
                            "Authorization": f"Bearer {access_token}",
                            "apikey": SUPABASE_ANON_KEY
                        })
                        logger.info("[get_authenticated_client] Headers configurados en postgrest.session.headers")
                
                # Forma 2: headers directo en postgrest
                if hasattr(postgrest, 'headers'):
                    if isinstance(postgrest.headers, dict):
                        postgrest.headers.update({
                            "Authorization": f"Bearer {access_token}",
                            "apikey": SUPABASE_ANON_KEY
                        })
                        logger.info("[get_authenticated_client] Headers configurados en postgrest.headers")
                
                # Forma 3: Modificar el cliente httpx directamente si está disponible
                if hasattr(postgrest, '_client') or hasattr(postgrest, 'client'):
                    httpx_client = getattr(postgrest, '_client', None) or getattr(postgrest, 'client', None)
                    if httpx_client and hasattr(httpx_client, 'headers'):
                        if isinstance(httpx_client.headers, dict):
                            httpx_client.headers.update({
                                "Authorization": f"Bearer {access_token}",
                                "apikey": SUPABASE_ANON_KEY
                            })
                            logger.info("[get_authenticated_client] Headers configurados en httpx client")
        except Exception as e:
            logger.error(f"[get_authenticated_client] Error configurando headers: {e}")
            logger.exception(e)
            # Continuar de todas formas, pero RLS puede fallar
    
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
        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
        
        if access_token:
            # Usar requests directamente con el token para asegurar que RLS funcione
            import requests
            headers = {
                "Authorization": f"Bearer {access_token}",
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
            url = f"{SUPABASE_URL}/rest/v1/home_content?select=*&order=updated_at.desc&limit=1"
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    content = data[0]
                else:
                    return {
                        "welcome_text": "Bienvenido al Cactario CasaMolle",
                        "carousel_images": [],
                        "sections": []
                    }
            else:
                # Si falla, retornar contenido por defecto
                return {
                    "welcome_text": "Bienvenido al Cactario CasaMolle",
                    "carousel_images": [],
                    "sections": []
                }
        else:
            # Sin token, usar cliente público
            sb = get_public_clean()
            res = sb.table("home_content").select("*").order("updated_at", desc=True).limit(1).execute()
            
            if not res.data or len(res.data) == 0:
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
    
    Usa requests directamente para asegurar que el token se envíe correctamente.
    """
    import logging
    import requests
    logger = logging.getLogger(__name__)
    
    if not access_token:
        raise ValueError("access_token es requerido para crear o actualizar contenido del home")
    
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env")
    
    # Preparar datos
    carousel_data = payload.get("carousel_images", [])
    sections_data = payload.get("sections", [])
    
    data = {
        "welcome_text": payload.get("welcome_text", "Bienvenido al Cactario CasaMolle"),
        "carousel_images": carousel_data if isinstance(carousel_data, (list, dict)) else json.dumps(carousel_data),
        "sections": sections_data if isinstance(sections_data, (list, dict)) else json.dumps(sections_data),
        "is_active": payload.get("is_active", True)
    }
    
    # Headers con el token de autenticación
    headers = {
        "Authorization": f"Bearer {access_token}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Verificar si ya existe un registro activo usando requests directamente
    check_url = f"{SUPABASE_URL}/rest/v1/home_content?is_active=eq.true&select=id&limit=1"
    check_response = requests.get(check_url, headers=headers)
    
    if check_response.status_code == 200:
        existing_data = check_response.json()
        
        if existing_data and len(existing_data) > 0:
            # Actualizar registro existente
            content_id = existing_data[0]["id"]
            logger.info(f"[create_or_update_staff] Actualizando registro existente ID: {content_id}")
            
            update_url = f"{SUPABASE_URL}/rest/v1/home_content?id=eq.{content_id}"
            update_response = requests.patch(update_url, json=data, headers=headers)
            
            if update_response.status_code not in [200, 204]:
                error_detail = update_response.text
                logger.error(f"[create_or_update_staff] Error en update: {update_response.status_code} - {error_detail}")
                raise Exception(f"Error al actualizar contenido del home: {error_detail}")
            
            # Obtener el registro actualizado
            get_url = f"{SUPABASE_URL}/rest/v1/home_content?id=eq.{content_id}&select=*"
            get_response = requests.get(get_url, headers=headers)
            if get_response.status_code == 200:
                updated = get_response.json()[0]
            else:
                updated = data
                updated["id"] = content_id
        else:
            # Crear nuevo registro
            logger.info("[create_or_update_staff] Creando nuevo registro")
            
            insert_url = f"{SUPABASE_URL}/rest/v1/home_content"
            insert_response = requests.post(insert_url, json=data, headers=headers)
            
            if insert_response.status_code not in [200, 201]:
                error_detail = insert_response.text
                logger.error(f"[create_or_update_staff] Error en insert: {insert_response.status_code} - {error_detail}")
                raise Exception(f"Error al crear contenido del home: {error_detail}")
            
            updated = insert_response.json()
            if isinstance(updated, list) and len(updated) > 0:
                updated = updated[0]
    else:
        # Si falla la verificación, intentar crear directamente
        logger.warning(f"[create_or_update_staff] Error verificando existencia: {check_response.status_code}, intentando crear")
        
        insert_url = f"{SUPABASE_URL}/rest/v1/home_content"
        insert_response = requests.post(insert_url, json=data, headers=headers)
        
        if insert_response.status_code not in [200, 201]:
            error_detail = insert_response.text
            logger.error(f"[create_or_update_staff] Error en insert: {insert_response.status_code} - {error_detail}")
            raise Exception(f"Error al crear contenido del home: {error_detail}")
        
        updated = insert_response.json()
        if isinstance(updated, list) and len(updated) > 0:
            updated = updated[0]
    
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

