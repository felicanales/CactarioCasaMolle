# app/services/transactions_service.py
from typing import List, Dict, Any, Optional
from app.core.supabase_auth import get_public
from datetime import datetime

def get_purchases_grouped() -> List[Dict[str, Any]]:
    """
    Obtiene todas las compras agrupadas por fecha, factura y vivero.
    Calcula el monto total y la cantidad de ejemplares por compra.
    """
    sb = get_public()
    
    try:
        # Obtener todos los ejemplares con purchase_date
        result = sb.table("ejemplar").select(
            "id, purchase_date, purchase_price, invoice_number, nursery, species_id, sector_id, age_months, health_status, location, has_offshoots"
        ).not_.is_("purchase_date", "null").order("purchase_date", desc=True).execute()
        
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[get_purchases_grouped] Error: {str(e)}")
        raise


def get_sales_grouped() -> List[Dict[str, Any]]:
    """
    Obtiene todas las ventas agrupadas por fecha.
    Calcula el monto total y la cantidad de ejemplares por venta.
    """
    sb = get_public()
    
    try:
        # Obtener todos los ejemplares con sale_date
        result = sb.table("ejemplar").select(
            "id, sale_date, sale_price, species_id, sector_id, purchase_date, purchase_price, nursery, invoice_number, age_months, health_status, location, has_offshoots"
        ).not_.is_("sale_date", "null").order("sale_date", desc=True).execute()
        
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[get_sales_grouped] Error: {str(e)}")
        raise

