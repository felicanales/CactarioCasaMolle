# app/api/routes_transactions.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
from app.middleware.auth_middleware import get_current_user
from app.services import transactions_service as svc
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/purchases", dependencies=[Depends(get_current_user)])
def list_purchases(
    request: Request,
    date_from: Optional[str] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    limit: int = Query(500, ge=1, le=2000, description="Máximo de ejemplares a consultar"),
    offset: int = Query(0, ge=0, description="Desplazamiento"),
):
    """Lista compras agrupadas por fecha, factura y vivero."""
    try:
        return svc.get_purchases_grouped(request, date_from=date_from, date_to=date_to, limit=limit, offset=offset)
    except Exception as e:
        logger.error(f"[list_purchases] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al listar compras: {str(e)}")

@router.get("/sales", dependencies=[Depends(get_current_user)])
def list_sales(
    request: Request,
    date_from: Optional[str] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    limit: int = Query(500, ge=1, le=2000, description="Máximo de ejemplares a consultar"),
    offset: int = Query(0, ge=0, description="Desplazamiento"),
):
    """Lista ventas agrupadas por fecha."""
    try:
        return svc.get_sales_grouped(request, date_from=date_from, date_to=date_to, limit=limit, offset=offset)
    except Exception as e:
        logger.error(f"[list_sales] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al listar ventas: {str(e)}")


