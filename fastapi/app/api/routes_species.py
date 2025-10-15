from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase

router = APIRouter()

@router.get("/")
def list_species(limit: int = 20):
    try:
        sb = get_supabase()
        resp = sb.table("especies").select(
            "id,nombre_común,scientific_name,tipo_planta,estado_conservación,slug"
        ).limit(limit).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(500, f"Error al obtener especies: {e}")
