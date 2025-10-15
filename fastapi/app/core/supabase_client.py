from supabase import create_client, Client
from app.core.config import settings

_sb: Client | None = None

def get_supabase() -> Client:
    global _sb
    if _sb is None:
        _sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _sb
