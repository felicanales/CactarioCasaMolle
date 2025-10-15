import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

ROOT = Path(__file__).resolve().parents[2]  # .../fastapi
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env")

_supabase: Client | None = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase
