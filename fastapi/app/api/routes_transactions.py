# app/api/routes_transactions.py
from fastapi import APIRouter, Depends, HTTPException, Request
from app.middleware.auth_middleware import get_current_user
from app.services import transactions_service as svc

router = APIRouter()

@router.get("/purchases", dependencies=[Depends(get_current_user)])
def list_purchases(request: Request):
    """
    Lista todas las compras agrupadas por fecha, factura y vivero.
    """
    import logging
    logger = logging.getLogger(__name__)
    try:
        return svc.get_purchases_grouped(request)
    except Exception as e:
        logger.error(f"[list_purchases] Error al listar compras: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al listar compras: {str(e)}")

@router.get("/sales", dependencies=[Depends(get_current_user)])
def list_sales(request: Request):
    """
    Lista todas las ventas agrupadas por fecha.
    """
    import logging
    logger = logging.getLogger(__name__)
    try:
        return svc.get_sales_grouped(request)
    except Exception as e:
        logger.error(f"[list_sales] Error al listar ventas: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al listar ventas: {str(e)}")


