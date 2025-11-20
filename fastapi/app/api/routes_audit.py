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
    limit: int = Query(200, ge=1, le=500, description="Límite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el historial de auditoría (requiere usuario autenticado).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[Audit API] Solicitud de logs - usuario: {current_user.get('email')}, filtros: table={table_name}, record={record_id}, user={user_id}, limit={limit}, offset={offset}")
        
        logs = get_audit_log(
            table_name=table_name,
            record_id=record_id,
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        logger.info(f"[Audit API] Retornando {len(logs)} logs")
        
        return {
            "logs": logs,
            "count": len(logs),
            "limit": limit,
            "offset": offset,
            "total_available": len(logs)  # Indica si hay más resultados disponibles
        }
    except Exception as e:
        logger.error(f"[Audit API] Error al obtener logs: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Error al obtener logs de auditoría: {str(e)}")
