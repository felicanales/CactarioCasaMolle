"""
Servicio de auditoría para registrar cambios en la base de datos
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.supabase_auth import get_public

logger = logging.getLogger(__name__)

def log_change(
    table_name: str,
    record_id: int,
    action: str,  # 'CREATE', 'UPDATE', 'DELETE'
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> None:
    """
    Registra un cambio en la tabla de auditoría.
    
    Args:
        table_name: Nombre de la tabla afectada (ej: 'especies', 'sectores')
        record_id: ID del registro modificado
        action: Tipo de acción ('CREATE', 'UPDATE', 'DELETE')
        user_id: ID del usuario que realizó el cambio
        user_email: Email del usuario
        user_name: Nombre del usuario
        old_values: Valores anteriores (solo para UPDATE)
        new_values: Valores nuevos
        ip_address: Dirección IP del cliente
        user_agent: User agent del cliente
    """
    try:
        sb = get_public()
        
        # Para UPDATE, detectar solo los campos que cambiaron
        changes_detected = None
        if action == 'UPDATE' and old_values and new_values:
            changes_detected = {}
            for key, new_value in new_values.items():
                old_value = old_values.get(key)
                if old_value != new_value:
                    changes_detected[key] = {
                        'anterior': old_value,
                        'nuevo': new_value
                    }
        
        # Preparar datos para insertar
        audit_data = {
            'tabla_afectada': table_name,
            'registro_id': record_id,
            'accion': action,
            'usuario_id': user_id,
            'usuario_email': user_email,
            'usuario_nombre': user_name,
            'campos_anteriores': old_values,
            'campos_nuevos': new_values,
            'cambios_detectados': changes_detected,
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        # Insertar en la tabla de auditoría
        result = sb.table('auditoria_cambios').insert(audit_data).execute()
        
        logger.info(f"[Audit] Cambio registrado: {action} en {table_name} (ID: {record_id}) por usuario {user_email or user_id}")
        
    except Exception as e:
        # No fallar la operación principal si la auditoría falla
        logger.error(f"[Audit] Error al registrar cambio: {str(e)}", exc_info=True)

def get_audit_log(
    table_name: Optional[str] = None,
    record_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0
) -> list:
    """
    Obtiene el historial de auditoría.
    
    Args:
        table_name: Filtrar por tabla (opcional)
        record_id: Filtrar por ID de registro (opcional)
        user_id: Filtrar por usuario (opcional)
        limit: Límite de resultados
        offset: Offset para paginación
    
    Returns:
        Lista de registros de auditoría
    """
    try:
        sb = get_public()
        query = sb.table('auditoria_cambios').select('*')
        
        if table_name:
            query = query.eq('tabla_afectada', table_name)
        if record_id:
            query = query.eq('registro_id', record_id)
        if user_id:
            query = query.eq('usuario_id', user_id)
        
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        return result.data or []
    except Exception as e:
        logger.error(f"[Audit] Error al obtener historial: {str(e)}")
        return []

