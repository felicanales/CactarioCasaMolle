"""
Servicio de auditoría para registrar cambios en la base de datos
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.supabase_auth import get_public, get_service

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
        logger.info(f"[Audit] ========== INICIO log_change ==========")
        logger.info(f"[Audit] Parámetros recibidos: table={table_name}, record_id={record_id}, action={action}, user_id={user_id}, user_email={user_email}")
        
        # Usar service client para bypass RLS y asegurar que siempre se puedan insertar logs
        try:
            sb = get_service()
            logger.info(f"[Audit] ✅ Cliente Supabase service obtenido correctamente")
        except Exception as sb_error:
            logger.error(f"[Audit] ❌ Error al obtener cliente Supabase service: {str(sb_error)}", exc_info=True)
            raise
        
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
        
        logger.info(f"[Audit] Datos preparados para insertar (sin campos grandes): tabla={table_name}, registro_id={record_id}, accion={action}, usuario_id={user_id}, usuario_email={user_email}")
        
        # Insertar en la tabla de auditoría
        try:
            logger.info(f"[Audit] Ejecutando insert en tabla 'auditoria_cambios'...")
            result = sb.table('auditoria_cambios').insert(audit_data).execute()
            logger.info(f"[Audit] Insert ejecutado. Resultado recibido: {type(result)}")
            
            if result.data:
                log_id = result.data[0].get('id') if result.data else None
                logger.info(f"[Audit] ✅ Cambio registrado exitosamente: {action} en {table_name} (ID: {record_id}) por usuario {user_email or user_id}")
                logger.info(f"[Audit] ID del log creado: {log_id}")
            else:
                logger.warning(f"[Audit] ⚠️ Insert ejecutado pero result.data está vacío o es None")
                logger.warning(f"[Audit] result completo: {result}")
        except Exception as insert_error:
            logger.error(f"[Audit] ❌ Error al ejecutar insert: {str(insert_error)}", exc_info=True)
            logger.error(f"[Audit] Tipo de error: {type(insert_error).__name__}")
            if hasattr(insert_error, 'message'):
                logger.error(f"[Audit] Mensaje de error: {insert_error.message}")
            if hasattr(insert_error, 'details'):
                logger.error(f"[Audit] Detalles: {insert_error.details}")
            if hasattr(insert_error, 'code'):
                logger.error(f"[Audit] Código de error: {insert_error.code}")
            raise
        
        logger.info(f"[Audit] ========== FIN log_change (éxito) ==========")
        
    except Exception as e:
        # No fallar la operación principal si la auditoría falla
        logger.error(f"[Audit] ========== FIN log_change (ERROR) ==========")
        logger.error(f"[Audit] ❌ Error al registrar cambio: {str(e)}", exc_info=True)
        logger.error(f"[Audit] Tipo de error: {type(e).__name__}")
        if hasattr(e, 'message'):
            logger.error(f"[Audit] Mensaje de error: {e.message}")
        if hasattr(e, 'details'):
            logger.error(f"[Audit] Detalles: {e.details}")
        if hasattr(e, 'code'):
            logger.error(f"[Audit] Código de error: {e.code}")

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
        # Usar service client para bypass RLS y poder leer todos los logs
        sb = get_service()
        
        # Primero verificar si la tabla existe y tiene datos
        count_query = sb.table('auditoria_cambios').select('id', count='exact')
        if table_name:
            count_query = count_query.eq('tabla_afectada', table_name)
        if record_id:
            count_query = count_query.eq('registro_id', record_id)
        if user_id:
            count_query = count_query.eq('usuario_id', user_id)
        
        try:
            count_result = count_query.execute()
            total_count = count_result.count if hasattr(count_result, 'count') else len(count_result.data or [])
            logger.info(f"[Audit] Total de registros disponibles: {total_count}")
        except Exception as count_error:
            logger.warning(f"[Audit] No se pudo obtener el conteo total: {str(count_error)}")
        
        # Obtener los logs
        query = sb.table('auditoria_cambios').select('*')
        
        if table_name:
            query = query.eq('tabla_afectada', table_name)
        if record_id:
            query = query.eq('registro_id', record_id)
        if user_id:
            query = query.eq('usuario_id', user_id)
        
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        logs = result.data or []
        logger.info(f"[Audit] Obtenidos {len(logs)} logs (limit={limit}, offset={offset})")
        if logs:
            logger.info(f"[Audit] Primer log: tabla={logs[0].get('tabla_afectada')}, acción={logs[0].get('accion')}, usuario={logs[0].get('usuario_email')}, fecha={logs[0].get('created_at')}")
        else:
            logger.warning(f"[Audit] No se encontraron logs con los filtros aplicados")
        return logs
    except Exception as e:
        logger.error(f"[Audit] Error al obtener historial: {str(e)}", exc_info=True)
        return []
