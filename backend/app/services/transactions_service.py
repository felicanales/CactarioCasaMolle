# app/services/transactions_service.py
from typing import List, Dict, Any, Optional
from pathlib import Path
from fastapi import Request, UploadFile
from datetime import datetime
import uuid
import logging

from app.core.supabase_auth import get_service
from app.core import storage_router
from app.services.query_helpers import fetch_all_by_ids
from app.services import ejemplar_service
from app.services import audit_service

logger = logging.getLogger(__name__)

# Campos editables de una factura de compra (lo demás se ignora del payload).
FACTURA_FIELDS = [
    "nursery",
    "invoice_number",
    "issue_date",
    "net_amount",
    "tax_amount",
    "total_amount",
    "document_path",
    "document_name",
    "document_content_type",
]
FACTURA_NUMERIC_FIELDS = ["net_amount", "tax_amount", "total_amount"]

ALLOWED_DOCUMENT_TYPES = ("image/", "application/pdf")
DOCUMENT_CACHE_CONTROL = "public, max-age=31536000, immutable"


# ============================================================
# COMPRAS (FACTURAS)
# ============================================================
def _to_number(value: Any) -> Optional[float]:
    """Convierte un valor a float; strings vacíos o None -> None."""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clean_factura_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Filtra y normaliza el payload de una factura."""
    clean: Dict[str, Any] = {}
    for field in FACTURA_FIELDS:
        if field not in payload:
            continue
        value = payload[field]
        if field in FACTURA_NUMERIC_FIELDS:
            clean[field] = _to_number(value)
        elif isinstance(value, str):
            stripped = value.strip()
            clean[field] = stripped if stripped else None
        else:
            clean[field] = value
    return clean


def _serialize_factura(row: Dict[str, Any]) -> Dict[str, Any]:
    """Agrega la URL pública del documento a una fila de factura."""
    document_path = row.get("document_path")
    row["document_url"] = (
        storage_router.get_public_url(document_path) if document_path else None
    )
    return row


def list_purchases(
    request: Optional[Request] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """
    Lista las facturas de compra registradas, ordenadas por fecha de emisión
    descendente. Soporta filtros por rango de fecha (issue_date) y paginación.
    """
    sb = get_service()

    try:
        query = sb.table("facturas_compra").select("*")

        if date_from:
            query = query.gte("issue_date", date_from)
        if date_to:
            query = query.lte("issue_date", date_to)

        query = query.order("issue_date", desc=True).order("id", desc=True).range(
            offset, offset + limit - 1
        )
        result = query.execute()

        rows = result.data or []
        return [_serialize_factura(row) for row in rows]
    except Exception as e:
        logger.error(f"[list_purchases] Error: {str(e)}", exc_info=True)
        raise


def create_purchase(
    payload: Dict[str, Any],
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """Crea una factura de compra y registra auditoría."""
    sb = get_service()

    clean = _clean_factura_payload(payload)

    if not clean.get("nursery"):
        raise ValueError("El vivero (nursery) es obligatorio")

    if user_id is not None:
        clean["created_by"] = user_id

    try:
        result = sb.table("facturas_compra").insert(clean).execute()
        if not result.data:
            raise ValueError("No se pudo crear la factura")

        created = result.data[0]
        factura_id = created.get("id")

        try:
            audit_service.log_change(
                table_name="facturas_compra",
                record_id=factura_id,
                action="CREATE",
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
                old_values=None,
                new_values=created,
                ip_address=ip,
                user_agent=user_agent,
            )
        except Exception as audit_error:
            logger.warning(f"[create_purchase] Error auditoría: {str(audit_error)}")

        return _serialize_factura(created)
    except Exception as e:
        logger.error(f"[create_purchase] Error: {str(e)}", exc_info=True)
        raise


def update_purchase(
    factura_id: int,
    payload: Dict[str, Any],
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """Actualiza una factura de compra existente y registra auditoría."""
    sb = get_service()

    current = sb.table("facturas_compra").select("*").eq("id", factura_id).limit(1).execute()
    if not current.data:
        raise LookupError("Factura no encontrada")
    old_values = current.data[0]

    clean = _clean_factura_payload(payload)
    if "nursery" in clean and not clean.get("nursery"):
        raise ValueError("El vivero (nursery) es obligatorio")

    clean["updated_at"] = datetime.utcnow().isoformat()

    try:
        result = sb.table("facturas_compra").update(clean).eq("id", factura_id).execute()
        if not result.data:
            raise LookupError("Factura no encontrada")
        updated = result.data[0]

        try:
            audit_service.log_change(
                table_name="facturas_compra",
                record_id=factura_id,
                action="UPDATE",
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
                old_values=old_values,
                new_values=updated,
                ip_address=ip,
                user_agent=user_agent,
            )
        except Exception as audit_error:
            logger.warning(f"[update_purchase] Error auditoría: {str(audit_error)}")

        return _serialize_factura(updated)
    except Exception as e:
        logger.error(f"[update_purchase] Error: {str(e)}", exc_info=True)
        raise


def delete_purchase(
    factura_id: int,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Elimina una factura (y su documento de storage) y registra auditoría."""
    sb = get_service()

    current = sb.table("facturas_compra").select("*").eq("id", factura_id).limit(1).execute()
    if not current.data:
        raise LookupError("Factura no encontrada")
    old_values = current.data[0]

    # Borrar el documento del storage si existe
    document_path = old_values.get("document_path")
    if document_path:
        try:
            storage_router.delete_object(document_path)
        except Exception as storage_error:
            logger.warning(f"[delete_purchase] No se pudo borrar documento: {str(storage_error)}")

    sb.table("facturas_compra").delete().eq("id", factura_id).execute()

    try:
        audit_service.log_change(
            table_name="facturas_compra",
            record_id=factura_id,
            action="DELETE",
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            old_values=old_values,
            new_values=None,
            ip_address=ip,
            user_agent=user_agent,
        )
    except Exception as audit_error:
        logger.warning(f"[delete_purchase] Error auditoría: {str(audit_error)}")


async def upload_invoice_document(file: UploadFile) -> Dict[str, Any]:
    """
    Sube el documento de una factura (imagen o PDF) a R2 y retorna su key,
    URL pública y metadata. No procesa la imagen (a diferencia de fotos).
    """
    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith("image/") and content_type != "application/pdf":
        raise ValueError("El documento debe ser una imagen o un PDF")

    data = await file.read()
    if not data:
        raise ValueError("El archivo está vacío")

    extension = (Path(file.filename).suffix if file.filename else "").lower()
    if not extension:
        extension = ".pdf" if content_type == "application/pdf" else ".jpg"

    key = f"facturas/{uuid.uuid4()}{extension}"

    storage_router.upload_object(
        key=key,
        data=data,
        content_type=content_type,
        cache_control=DOCUMENT_CACHE_CONTROL,
    )

    return {
        "document_path": key,
        "document_url": storage_router.get_public_url(key),
        "document_name": file.filename,
        "document_content_type": content_type,
    }


# ============================================================
# VENTAS
# ============================================================
def register_sale(
    ejemplar_ids: List[int],
    sale_date: str,
    sale_price: Any,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Registra la venta de uno o más ejemplares: setea sale_date y sale_price
    en cada uno reutilizando ejemplar_service.update_staff (que ya audita la
    acción SALE). Omite los que ya tengan sale_date.
    """
    if not ejemplar_ids:
        raise ValueError("Debes seleccionar al menos un ejemplar")
    if not sale_date:
        raise ValueError("La fecha de venta es obligatoria")

    price = _to_number(sale_price)
    sb = get_service()

    sold: List[int] = []
    skipped: List[int] = []
    errors: List[Dict[str, Any]] = []

    for ejemplar_id in ejemplar_ids:
        try:
            current = sb.table("ejemplar").select("id, sale_date").eq("id", ejemplar_id).limit(1).execute()
            if not current.data:
                errors.append({"id": ejemplar_id, "error": "no encontrado"})
                continue
            if current.data[0].get("sale_date"):
                skipped.append(ejemplar_id)
                continue

            ejemplar_service.update_staff(
                ejemplar_id,
                {"sale_date": sale_date, "sale_price": price},
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
                ip_address=ip,
                user_agent=user_agent,
            )
            sold.append(ejemplar_id)
        except Exception as e:
            logger.warning(f"[register_sale] Error en ejemplar {ejemplar_id}: {str(e)}")
            errors.append({"id": ejemplar_id, "error": str(e)})

    return {
        "sold": sold,
        "skipped": skipped,
        "errors": errors,
        "sold_count": len(sold),
    }


# ============================================================
# VENTAS (vista agrupada — sin cambios)
# ============================================================
def get_sales_grouped(
    request: Optional[Request] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """
    Obtiene ventas agrupadas por fecha.
    Soporta filtros de rango de fecha y paginación.
    """
    sb = get_service()

    try:
        query = sb.table("ejemplar").select(
            "id, species_id, sector_id, sale_date, sale_price, "
            "purchase_date, purchase_price, nursery, "
            "age_months, health_status, location"
        ).filter("sale_date", "not.is", "null")

        if date_from:
            query = query.gte("sale_date", date_from)
        if date_to:
            query = query.lte("sale_date", date_to)

        query = query.order("sale_date", desc=True).range(offset, offset + limit - 1)
        result = query.execute()

        if not result.data:
            return []

        # Agrupar por sale_date
        grouped = {}

        for ejemplar in result.data:
            sale_date = ejemplar.get("sale_date")

            if sale_date not in grouped:
                grouped[sale_date] = {
                    "sale_date": sale_date,
                    "total_amount": 0,
                    "total_quantity": 0,
                    "items": []
                }

            # Agregar ejemplar al grupo
            price = float(ejemplar.get("sale_price") or 0)
            grouped[sale_date]["total_amount"] += price
            grouped[sale_date]["total_quantity"] += 1

            # Agrupar items por especie y precio para mostrar mejor
            species_id = ejemplar.get("species_id")

            # Buscar si ya existe un item con esta especie y precio
            existing_item = None
            for item in grouped[sale_date]["items"]:
                if item.get("species_id") == species_id and item.get("price") == price:
                    existing_item = item
                    break

            if existing_item:
                # Incrementar cantidad si ya existe
                existing_item["quantity"] = (existing_item.get("quantity") or 1) + 1
            else:
                # Crear nuevo item
                grouped[sale_date]["items"].append({
                    "species_id": species_id,
                    "sector_id": ejemplar.get("sector_id"),
                    "price": price,
                    "quantity": 1,
                    "purchase_date": ejemplar.get("purchase_date"),
                    "purchase_price": ejemplar.get("purchase_price"),
                    "nursery": ejemplar.get("nursery"),
                    "invoice_number": ejemplar.get("invoice_number"),
                    "age_months": ejemplar.get("age_months"),
                    "health_status": ejemplar.get("health_status"),
                    "location": ejemplar.get("location"),
                })

        # Convertir a lista y ordenar por fecha (más reciente primero)
        sales = list(grouped.values())
        sales.sort(key=lambda x: x["sale_date"], reverse=True)

        # Obtener información de especies para cada item
        species_ids = set()
        for sale in sales:
            for item in sale["items"]:
                if item.get("species_id"):
                    species_ids.add(item["species_id"])

        if species_ids:
            species_rows = fetch_all_by_ids(
                sb,
                "especies",
                "id, scientific_name, nombre_común",
                "id",
                list(species_ids),
                order_by="id",
            )
            species_map = {s["id"]: s for s in species_rows}

            # Agregar información de especie a cada item
            for sale in sales:
                for item in sale["items"]:
                    species_id = item.get("species_id")
                    if species_id and species_id in species_map:
                        item["species"] = species_map[species_id]

        return sales

    except Exception as e:
        logger.error(f"[get_sales_grouped] Error: {str(e)}", exc_info=True)
        raise
