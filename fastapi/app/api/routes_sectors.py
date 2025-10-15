from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase

router = APIRouter()

@router.get("/")
def list_sectors():
    try:
        sb = get_supabase()
        resp = sb.table("sectores").select(
            "id,name,description,location,qr_code,created_at,updated_at"
        ).order("id").execute()
        return resp.data
    except Exception as e:
        raise HTTPException(500, f"Error al obtener sectores: {e}")
