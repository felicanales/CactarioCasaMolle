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
        
        response = {
            "logs": logs,
            "count": len(logs),
            "limit": limit,
            "offset": offset,
            "total_available": len(logs)  # Indica si hay más resultados disponibles
        }
        
        # Log detallado de la respuesta
        if logs:
            logger.info(f"[Audit API] Primer log en respuesta: ID={logs[0].get('id')}, tabla={logs[0].get('tabla_afectada')}, acción={logs[0].get('accion')}")
        else:
            logger.warning(f"[Audit API] ⚠️ No se encontraron logs con los filtros aplicados")
        
        return response
    except Exception as e:
        logger.error(f"[Audit API] ❌ Error al obtener logs: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Error al obtener logs de auditoría: {str(e)}")

@router.get("/audit/test", dependencies=[Depends(get_current_user)])
def test_audit_table(current_user: dict = Depends(get_current_user)):
    """
    Endpoint de prueba para verificar que la tabla de auditoría existe y tiene datos.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from app.core.supabase_auth import get_service
        sb = get_service()
        
        # Intentar contar todos los registros
        count_result = sb.table('auditoria_cambios').select('id', count='exact').execute()
        total_count = count_result.count if hasattr(count_result, 'count') else len(count_result.data or [])
        
        # Obtener los últimos 5 registros
        recent_logs = sb.table('auditoria_cambios').select('*').order('created_at', desc=True).limit(5).execute()
        
        return {
            "table_exists": True,
            "total_records": total_count,
            "recent_logs": recent_logs.data or [],
            "message": f"Tabla de auditoría existe y tiene {total_count} registros"
        }
    except Exception as e:
        logger.error(f"[Audit Test] Error: {str(e)}", exc_info=True)
        return {
            "table_exists": False,
            "error": str(e),
            "message": "Error al acceder a la tabla de auditoría"
        }
