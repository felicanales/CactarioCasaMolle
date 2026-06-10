from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict, Optional

from app.core.supabase_auth import get_service
from app.services import audit_service

logger = logging.getLogger(__name__)

SUPPORT_ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv("SUPPORT_TICKET_ADMIN_EMAILS", "felicaniu@gmail.com").split(",")
    if email.strip()
}

ALLOWED_TYPES = {"error", "mejora", "duda"}
ALLOWED_STATUSES = {"en_espera", "en_revision", "resuelto", "cancelado"}
ALLOWED_MODULES = {
    "Dashboard",
    "Especies",
    "Sectores",
    "Inventario",
    "Compras y Ventas",
    "Reportes",
    "Auditoria",
    "Editor QR",
    "Home App QR",
    "Login",
    "App QR Publica",
    "Otro",
}

CREATE_TEXT_FIELDS = [
    "title",
    "description",
    "steps_to_reproduce",
    "expected_result",
    "actual_result",
    "page_url",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()


def _clean_string(value: Any, max_len: Optional[int] = None) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    cleaned = value.strip()
    if not cleaned:
        return None
    if max_len and len(cleaned) > max_len:
        cleaned = cleaned[:max_len]
    return cleaned


def _is_support_admin(user_email: Optional[str]) -> bool:
    return _normalize_email(user_email) in SUPPORT_ADMIN_EMAILS


def _is_creator(row: Dict[str, Any], user_id: Optional[str], user_email: Optional[str]) -> bool:
    uid = str(user_id or "")
    email = _normalize_email(user_email)
    return bool(
        (uid and uid == str(row.get("created_by_uid") or ""))
        or (email and email == _normalize_email(row.get("created_by_email")))
    )


def _annotate_permissions(row: Dict[str, Any], user_id: Optional[str], user_email: Optional[str]) -> Dict[str, Any]:
    is_admin = _is_support_admin(user_email)
    is_creator = _is_creator(row, user_id, user_email)
    status = row.get("status")

    row["permissions"] = {
        "can_update_status": is_admin,
        "can_cancel": (is_admin or is_creator) and status not in {"resuelto", "cancelado"},
        "can_delete": is_admin or is_creator,
    }
    return row


def _get_ticket(ticket_id: int) -> Optional[Dict[str, Any]]:
    sb = get_service()
    result = sb.table("support_tickets").select("*").eq("id", ticket_id).limit(1).execute()
    if not result.data:
        return None
    return result.data[0]


def _audit(
    record_id: int,
    action: str,
    user_id: Optional[str],
    user_email: Optional[str],
    user_name: Optional[str],
    old_values: Optional[Dict[str, Any]],
    new_values: Optional[Dict[str, Any]],
    ip: Optional[str],
    user_agent: Optional[str],
) -> None:
    try:
        audit_service.log_change(
            table_name="support_tickets",
            record_id=record_id,
            action=action,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip,
            user_agent=user_agent,
        )
    except Exception as audit_error:
        logger.warning("[support_tickets] Error registrando auditoria: %s", audit_error)


def list_staff(
    status: Optional[str] = None,
    type: Optional[str] = None,
    module: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
) -> Dict[str, Any]:
    sb = get_service()

    query = sb.table("support_tickets").select("*")
    if status:
        query = query.eq("status", status)
    if type:
        query = query.eq("type", type)
    if module:
        query = query.eq("module", module)

    result = query.order("created_at", desc=True).range(0, 999).execute()
    rows = result.data or []

    if q:
        needle = q.strip().lower()
        rows = [
            row
            for row in rows
            if needle in " ".join(
                [
                    str(row.get("id") or ""),
                    row.get("title") or "",
                    row.get("description") or "",
                    row.get("module") or "",
                    row.get("created_by_email") or "",
                ]
            ).lower()
        ]

    total = len(rows)
    page = rows[offset: offset + limit]
    return {
        "data": [_annotate_permissions(row, user_id, user_email) for row in page],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_summary(user_email: Optional[str] = None) -> Dict[str, Any]:
    sb = get_service()
    result = sb.table("support_tickets").select("id, status").range(0, 1999).execute()
    rows = result.data or []

    by_status = {status: 0 for status in ALLOWED_STATUSES}
    for row in rows:
        status = row.get("status")
        if status in by_status:
            by_status[status] += 1

    return {
        "by_status": by_status,
        "open_count": by_status["en_espera"] + by_status["en_revision"],
        "total": len(rows),
        "can_manage_all": _is_support_admin(user_email),
    }


def create_staff(
    payload: Dict[str, Any],
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    sb = get_service()

    ticket_type = _clean_string(payload.get("type"))
    if ticket_type not in ALLOWED_TYPES:
        raise ValueError("Tipo de ticket invalido")

    module = _clean_string(payload.get("module"))
    if module not in ALLOWED_MODULES:
        raise ValueError("Modulo invalido")

    title = _clean_string(payload.get("title"), max_len=180)
    description = _clean_string(payload.get("description"), max_len=5000)
    if not title:
        raise ValueError("El resumen del ticket es obligatorio")
    if not description:
        raise ValueError("La descripcion del ticket es obligatoria")

    creator_email = _normalize_email(user_email)
    if not user_id or not creator_email:
        raise ValueError("Usuario autenticado no disponible")

    clean = {
        "type": ticket_type,
        "status": "en_espera",
        "module": module,
        "title": title,
        "description": description,
        "created_by_uid": str(user_id),
        "created_by_email": creator_email,
        "created_by_name": _clean_string(user_name, max_len=180),
        "user_agent": _clean_string(user_agent, max_len=1000),
    }

    for field in CREATE_TEXT_FIELDS:
        if field in {"title", "description"}:
            continue
        value = _clean_string(payload.get(field), max_len=5000)
        if ticket_type != "error" and field in {"steps_to_reproduce", "expected_result", "actual_result"}:
            value = None
        clean[field] = value

    result = sb.table("support_tickets").insert(clean).execute()
    if not result.data:
        raise ValueError("No se pudo crear el ticket")

    created = result.data[0]
    _audit(
        record_id=created["id"],
        action="CREATE",
        user_id=user_id,
        user_email=user_email,
        user_name=user_name,
        old_values=None,
        new_values=created,
        ip=ip,
        user_agent=user_agent,
    )
    return _annotate_permissions(created, user_id, user_email)


def update_staff(
    ticket_id: int,
    payload: Dict[str, Any],
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    sb = get_service()
    current = _get_ticket(ticket_id)
    if not current:
        raise LookupError("Ticket no encontrado")

    is_admin = _is_support_admin(user_email)
    is_creator = _is_creator(current, user_id, user_email)

    new_status = _clean_string(payload.get("status"))
    resolution_note = _clean_string(payload.get("resolution_note"), max_len=4000)

    if new_status and new_status not in ALLOWED_STATUSES:
        raise ValueError("Estado invalido")

    clean: Dict[str, Any] = {}
    if new_status:
        if is_admin:
            clean["status"] = new_status
        elif is_creator and new_status == "cancelado" and current.get("status") not in {"resuelto", "cancelado"}:
            clean["status"] = "cancelado"
        else:
            raise PermissionError("No tienes permiso para cambiar este ticket")

    if "resolution_note" in payload:
        if not is_admin:
            raise PermissionError("Solo soporte puede actualizar la nota de resolucion")
        clean["resolution_note"] = resolution_note

    if not clean:
        raise ValueError("No hay cambios para guardar")

    status_for_closed_at = clean.get("status", current.get("status"))
    if status_for_closed_at in {"resuelto", "cancelado"}:
        clean["closed_at"] = _now_iso()
    elif "status" in clean:
        clean["closed_at"] = None

    clean["updated_at"] = _now_iso()

    result = sb.table("support_tickets").update(clean).eq("id", ticket_id).execute()
    if not result.data:
        raise LookupError("Ticket no encontrado")

    updated = result.data[0]
    _audit(
        record_id=ticket_id,
        action="UPDATE",
        user_id=user_id,
        user_email=user_email,
        user_name=user_name,
        old_values=current,
        new_values=updated,
        ip=ip,
        user_agent=user_agent,
    )
    return _annotate_permissions(updated, user_id, user_email)


def delete_staff(
    ticket_id: int,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    sb = get_service()
    current = _get_ticket(ticket_id)
    if not current:
        raise LookupError("Ticket no encontrado")

    if not (_is_support_admin(user_email) or _is_creator(current, user_id, user_email)):
        raise PermissionError("No tienes permiso para eliminar este ticket")

    sb.table("support_tickets").delete().eq("id", ticket_id).execute()
    _audit(
        record_id=ticket_id,
        action="DELETE",
        user_id=user_id,
        user_email=user_email,
        user_name=user_name,
        old_values=current,
        new_values=None,
        ip=ip,
        user_agent=user_agent,
    )
