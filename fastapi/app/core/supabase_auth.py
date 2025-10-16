# fastapi/app/core/supabase_auth.py
import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()  # carga variables desde .env en desarrollo

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # opcional

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env")

_public_client: Optional[Client] = None
_service_client: Optional[Client] = None

def get_public() -> Client:
    """Cliente público (anon) para auth y lecturas públicas."""
    global _public_client
    if _public_client is None:
        _public_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _public_client

def get_service() -> Client:
    """Cliente service-role (si lo necesitas para tareas server-side)."""
    global _service_client
    if _service_client is None:
        if not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("Falta SUPABASE_SERVICE_ROLE_KEY en .env")
        _service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _service_client
