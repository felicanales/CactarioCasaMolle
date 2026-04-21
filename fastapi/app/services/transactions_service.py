# app/services/transactions_service.py
from typing import List, Dict, Any, Optional
from app.core.supabase_auth import get_public, get_service
from app.core.security import get_token_from_request
from fastapi import Request
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def get_purchases_grouped(
    request: Optional[Request] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """
    Obtiene compras agrupadas por fecha, factura y vivero.
    Soporta filtros de rango de fecha y paginación para evitar traer todo el historial.
    """
    sb = get_service()

    try:
        query = sb.table("ejemplar").select(
            "id, species_id, sector_id, purchase_date, purchase_price, "
            "invoice_number, nursery, age_months, health_status, location, has_offshoots"
        ).not_.is_("purchase_date", "null")

        if date_from:
            query = query.gte("purchase_date", date_from)
        if date_to:
            query = query.lte("purchase_date", date_to)

        query = query.order("purchase_date", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        if not result.data:
            return []
        
        # Agrupar por purchase_date, invoice_number y nursery
        grouped = {}
        
        for ejemplar in result.data:
            # Crear clave única para agrupar
            purchase_date = ejemplar.get("purchase_date")
            invoice_number = ejemplar.get("invoice_number") or ""
            nursery = ejemplar.get("nursery") or ""
            
            key = f"{purchase_date}|{invoice_number}|{nursery}"
            
            if key not in grouped:
                grouped[key] = {
                    "purchase_date": purchase_date,
                    "invoice_number": invoice_number,
                    "nursery": nursery,
                    "total_amount": 0,
                    "total_quantity": 0,
                    "items": []
                }
            
            # Agregar ejemplar al grupo
            price = float(ejemplar.get("purchase_price") or 0)
            grouped[key]["total_amount"] += price
            grouped[key]["total_quantity"] += 1
            
            # Agrupar items por especie y precio para mostrar mejor
            species_id = ejemplar.get("species_id")
            item_key = f"{species_id}_{price}"
            
            # Buscar si ya existe un item con esta especie y precio
            existing_item = None
            for item in grouped[key]["items"]:
                if item.get("species_id") == species_id and item.get("price") == price:
                    existing_item = item
                    break
            
            if existing_item:
                # Incrementar cantidad si ya existe
                existing_item["quantity"] = (existing_item.get("quantity") or 1) + 1
            else:
                # Crear nuevo item
                grouped[key]["items"].append({
                    "species_id": species_id,
                    "sector_id": ejemplar.get("sector_id"),
                    "price": price,
                    "quantity": 1,
                    "age_months": ejemplar.get("age_months"),
                    "health_status": ejemplar.get("health_status"),
                    "location": ejemplar.get("location"),
                    "has_offshoots": ejemplar.get("has_offshoots")
                })
        
        # Convertir a lista y ordenar por fecha (más reciente primero)
        purchases = list(grouped.values())
        purchases.sort(key=lambda x: x["purchase_date"], reverse=True)
        
        # Obtener información de especies para cada item
        species_ids = set()
        for purchase in purchases:
            for item in purchase["items"]:
                if item.get("species_id"):
                    species_ids.add(item["species_id"])
        
        if species_ids:
            species_result = sb.table("especies").select("id, scientific_name, nombre_común").in_("id", list(species_ids)).execute()
            species_map = {s["id"]: s for s in species_result.data}
            
            # Agregar información de especie a cada item
            for purchase in purchases:
                for item in purchase["items"]:
                    species_id = item.get("species_id")
                    if species_id and species_id in species_map:
                        item["species"] = species_map[species_id]
        
        return purchases
        
    except Exception as e:
        logger.error(f"[get_purchases_grouped] Error: {str(e)}", exc_info=True)
        raise


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
            "purchase_date, purchase_price, nursery, invoice_number, "
            "age_months, health_status, location, has_offshoots"
        ).not_.is_("sale_date", "null")

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
                    "has_offshoots": ejemplar.get("has_offshoots")
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
            species_result = sb.table("especies").select("id, scientific_name, nombre_común").in_("id", list(species_ids)).execute()
            species_map = {s["id"]: s for s in species_result.data}
            
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

