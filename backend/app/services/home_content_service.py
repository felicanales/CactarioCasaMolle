# app/services/home_content_service.py
from typing import List, Optional, Dict, Any
from app.core.supabase_auth import (
    get_public as get_supabase_client,
    get_public_clean,
    get_service,
)
from supabase import create_client as supabase_create_client
import json
import os
import requests
import logging

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

def get_public(lang: str = "es") -> Optional[Dict[str, Any]]:
    """
    Obtiene el contenido público del home (sin autenticación).
    
    Args:
        lang: Idioma del contenido ('es' para español, 'en' para inglés). Default: 'es'
    
    Returns:
        Dict con welcome_text, carousel_images y sections en el idioma solicitado
    """
    try:
        sb = get_public_clean()
        res = sb.table("home_content").select("*").eq("is_active", True).order("updated_at", desc=True).limit(1).execute()
        
        if not res.data or len(res.data) == 0:
            # Retornar contenido por defecto si no hay configuración
            default_welcome = "Bienvenido al Cactario CasaMolle" if lang == "es" else "Welcome to Cactario CasaMolle"
            return {
                "welcome_text": default_welcome,
                "carousel_images": [],
                "sections": []
            }
        
        content = res.data[0]
    except Exception as e:
        # Si la tabla no existe o hay otro error, retornar contenido por defecto
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "relation" in error_msg or "table" in error_msg:
            # La tabla no existe, retornar contenido por defecto
            default_welcome = "Bienvenido al Cactario CasaMolle" if lang == "es" else "Welcome to Cactario CasaMolle"
            return {
                "welcome_text": default_welcome,
                "carousel_images": [],
                "sections": []
            }
        # Otro tipo de error, re-lanzar
        raise
    
    # Seleccionar contenido según el idioma
    welcome_key = f"welcome_text_{lang}" if lang in ["es", "en"] else "welcome_text_es"
    sections_key = f"sections_{lang}" if lang in ["es", "en"] else "sections_es"
    
    # Si las columnas nuevas no existen, usar las antiguas (compatibilidad hacia atrás)
    if welcome_key not in content or content.get(welcome_key) is None:
        if "welcome_text" in content:
            welcome_text = content["welcome_text"]
        else:
            welcome_text = "Bienvenido al Cactario CasaMolle" if lang == "es" else "Welcome to Cactario CasaMolle"
    else:
        welcome_text = content.get(welcome_key) or ("Bienvenido al Cactario CasaMolle" if lang == "es" else "Welcome to Cactario CasaMolle")
    
    if sections_key not in content or content.get(sections_key) is None:
        if "sections" in content:
            sections = content["sections"]
        else:
            sections = []
    else:
        sections = content.get(sections_key) or []
    
    # Parsear JSON fields si existen
    if isinstance(sections, str):
        try:
            sections = json.loads(sections)
        except:
            sections = []
    
    # Parsear carousel_images
    carousel_images = content.get("carousel_images") or []
    if isinstance(carousel_images, str):
        try:
            carousel_images = json.loads(carousel_images)
        except:
            carousel_images = []
    
    # Procesar alt text de imágenes según idioma
    processed_carousel = []
    for img in carousel_images:
        if isinstance(img, dict):
            # Usar alt_es o alt_en según el idioma, o alt como fallback
            alt_key = f"alt_{lang}" if lang in ["es", "en"] else "alt_es"
            alt_text = img.get(alt_key) or img.get("alt") or ""
            processed_carousel.append({
                "url": img.get("url", ""),
                "alt": alt_text
            })
    
    return {
        "welcome_text": welcome_text,
        "carousel_images": processed_carousel,
        "sections": sections
    }

# ----------------- STAFF (privado) -----------------

def get_staff(access_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Obtiene el contenido del home para staff (requiere autenticación).
    Retorna ambos idiomas (español e inglés) para edición.
    """
    try:
        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
        
        if access_token:
            # Usar requests directamente con el token para asegurar que RLS funcione
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
                        "welcome_text_es": "Bienvenido al Cactario CasaMolle",
                        "welcome_text_en": "Welcome to Cactario CasaMolle",
                        "carousel_images": [],
                        "sections_es": [],
                        "sections_en": []
                    }
            else:
                # Si falla, retornar contenido por defecto
                return {
                    "welcome_text_es": "Bienvenido al Cactario CasaMolle",
                    "welcome_text_en": "Welcome to Cactario CasaMolle",
                    "carousel_images": [],
                    "sections_es": [],
                    "sections_en": []
                }
        else:
            # Sin token, usar cliente público
            sb = get_public_clean()
            res = sb.table("home_content").select("*").order("updated_at", desc=True).limit(1).execute()
            
            if not res.data or len(res.data) == 0:
                return {
                    "welcome_text_es": "Bienvenido al Cactario CasaMolle",
                    "welcome_text_en": "Welcome to Cactario CasaMolle",
                    "carousel_images": [],
                    "sections_es": [],
                    "sections_en": []
                }
            
            content = res.data[0]
    except Exception as e:
        # Si la tabla no existe o hay otro error, retornar contenido por defecto
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "relation" in error_msg or "table" in error_msg:
            # La tabla no existe, retornar contenido por defecto
            return {
                "welcome_text_es": "Bienvenido al Cactario CasaMolle",
                "welcome_text_en": "Welcome to Cactario CasaMolle",
                "carousel_images": [],
                "sections_es": [],
                "sections_en": []
            }
        # Otro tipo de error, re-lanzar
        raise
    
    # Parsear JSON fields si existen
    carousel_images = content.get("carousel_images") or []
    if isinstance(carousel_images, str):
        try:
            carousel_images = json.loads(carousel_images)
        except:
            carousel_images = []
    
    sections_es = content.get("sections_es") or content.get("sections") or []
    if isinstance(sections_es, str):
        try:
            sections_es = json.loads(sections_es)
        except:
            sections_es = []
    
    sections_en = content.get("sections_en") or []
    if isinstance(sections_en, str):
        try:
            sections_en = json.loads(sections_en)
        except:
            sections_en = []
    
    # Compatibilidad hacia atrás: si no existen las columnas nuevas, usar las antiguas
    welcome_text_es = content.get("welcome_text_es") or content.get("welcome_text") or "Bienvenido al Cactario CasaMolle"
    welcome_text_en = content.get("welcome_text_en") or "Welcome to Cactario CasaMolle"
    
    return {
        "welcome_text_es": welcome_text_es,
        "welcome_text_en": welcome_text_en,
        "carousel_images": carousel_images,
        "sections_es": sections_es,
        "sections_en": sections_en,
        "is_active": content.get("is_active", True)
    }

def create_or_update_staff(payload: Dict[str, Any], user_id: Optional[int] = None, user_email: Optional[str] = None, access_token: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
    """
    Crea o actualiza el contenido del home.
    Si ya existe un registro activo, lo actualiza. Si no, crea uno nuevo.
    Requiere access_token para que las políticas RLS funcionen correctamente.
    
    Usa requests directamente para asegurar que el token se envíe correctamente.
    """
    logger = logging.getLogger(__name__)
    
    if not access_token:
        raise ValueError("access_token es requerido para crear o actualizar contenido del home")
    
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env")
    
    # Preparar datos con soporte multiidioma
    carousel_data = payload.get("carousel_images", [])
    sections_es = payload.get("sections_es", [])
    sections_en = payload.get("sections_en", [])
    
    # Compatibilidad hacia atrás: si viene sections (sin _es), usarlo para sections_es
    if not sections_es and payload.get("sections"):
        sections_es = payload.get("sections")
    
    data = {
        "welcome_text_es": payload.get("welcome_text_es") or payload.get("welcome_text") or "Bienvenido al Cactario CasaMolle",
        "welcome_text_en": payload.get("welcome_text_en") or "Welcome to Cactario CasaMolle",
        "carousel_images": carousel_data if isinstance(carousel_data, (list, dict)) else json.dumps(carousel_data),
        "sections_es": sections_es if isinstance(sections_es, (list, dict)) else json.dumps(sections_es),
        "sections_en": sections_en if isinstance(sections_en, (list, dict)) else json.dumps(sections_en),
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
    old_values = None
    check_url = f"{SUPABASE_URL}/rest/v1/home_content?is_active=eq.true&select=id&limit=1"
    check_response = requests.get(check_url, headers=headers)
    
    if check_response.status_code == 200:
        existing_data = check_response.json()
        
        if existing_data and len(existing_data) > 0:
            # Actualizar registro existente
            content_id = existing_data[0]["id"]
            logger.info(f"[create_or_update_staff] Actualizando registro existente ID: {content_id}")
            try:
                sb_admin = get_service()
                old_res = sb_admin.table("home_content").select("*").eq("id", content_id).limit(1).execute()
                if old_res.data:
                    old_values = old_res.data[0]
            except Exception as audit_error:
                logger.warning(f"[create_or_update_staff] Error obteniendo valores anteriores: {str(audit_error)}")
            
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

    try:
        from app.services.audit_service import log_change
        record_id = updated.get("id") if isinstance(updated, dict) else None
        if record_id:
            log_change(
                table_name="home_content",
                record_id=record_id,
                action="UPDATE" if old_values else "CREATE",
                user_id=user_id,
                user_email=user_email,
                user_name=None,
                old_values=old_values,
                new_values=updated,
                ip_address=ip_address,
                user_agent=user_agent
            )
    except Exception as audit_error:
        logger.warning(f"[create_or_update_staff] Error registrando auditoría: {str(audit_error)}")

    return updated

