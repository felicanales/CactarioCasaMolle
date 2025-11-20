# app/api/routes_audit.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.middleware.auth_middleware import get_current_user
from app.services.audit_service import get_audit_log

router = APIRouter()

@router.get("/audit", dependencies=[Depends(get_current_user)])
def get_audit_logs(
    table_name: Optional[str] = Query(None, description="Filtrar por tabla (especies, sectores)"),
    record_id: Optional[int] = Query(None, description="Filtrar por ID de registro"),
    user_id: Optional[int] = Query(None, description="Filtrar por ID de usuario"),
    limit: int = Query(100, ge=1, le=500, description="Límite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación")
):
    """
    Obtiene el historial de auditoría (requiere usuario autenticado).
    """
    try:
        logs = get_audit_log(
            table_name=table_name,
            record_id=record_id,
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        return {
            "logs": logs,
            "count": len(logs),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(500, f"Error al obtener logs de auditoría: {str(e)}")
