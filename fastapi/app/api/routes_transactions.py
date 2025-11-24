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
    try:
        return svc.get_purchases_grouped(request)
    except Exception as e:
        raise HTTPException(500, f"Error al listar compras: {str(e)}")

@router.get("/sales", dependencies=[Depends(get_current_user)])
def list_sales(request: Request):
    """
    Lista todas las ventas agrupadas por fecha.
    """
    try:
        return svc.get_sales_grouped(request)
    except Exception as e:
        raise HTTPException(500, f"Error al listar ventas: {str(e)}")


