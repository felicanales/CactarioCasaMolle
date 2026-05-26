# app/core/supabase_auth.py
import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # opcional (solo si usarás admin endpoints)

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env")

_service_client: Optional[Client] = None

def get_public() -> Client:
    """
    Obtiene un cliente anon nuevo por llamada.

    supabase-py conserva la sesion despues de llamadas auth como verify_otp o
    refresh_session. En un servidor, compartir ese cliente entre requests puede
    filtrar un JWT expirado hacia consultas publicas y provocar PGRST303.
    """
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_public_clean() -> Client:
    """
    Obtiene un cliente público de Supabase SIN sesión activa.
    Usar para consultas públicas que no requieren autenticación.
    Esto evita problemas con JWTs expirados en endpoints públicos.
    
    Crea un nuevo cliente cada vez, lo que garantiza que no tenga
    ninguna sesión almacenada de requests anteriores.
    """
    # Crear un nuevo cliente cada vez para asegurar que no tenga sesión
    # Un cliente nuevo no tiene sesión activa por defecto
    return get_public()

def get_service() -> Client:
    global _service_client
    if _service_client is None:
        if not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("Falta SUPABASE_SERVICE_ROLE_KEY en .env")
        _service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _service_client
