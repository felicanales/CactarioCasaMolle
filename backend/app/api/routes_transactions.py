# app/api/routes_transactions.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from typing import Optional, Dict, Any
from app.middleware.auth_middleware import get_current_user
from app.services import transactions_service as svc
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def _request_context(request: Request, current_user: dict) -> Dict[str, Any]:
    """Extrae usuario, IP y user-agent del request para auditoría."""
    return {
        "user_id": current_user.get("id"),
        "user_email": current_user.get("email"),
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }


# ============================================================
# COMPRAS (FACTURAS)
# ============================================================
@router.get("/purchases", dependencies=[Depends(get_current_user)])
def list_purchases(
    request: Request,
    date_from: Optional[str] = Query(None, description="Fecha emisión inicio (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Fecha emisión fin (YYYY-MM-DD)"),
    limit: int = Query(500, ge=1, le=2000, description="Máximo de facturas a consultar"),
    offset: int = Query(0, ge=0, description="Desplazamiento"),
):
    """Lista las facturas de compra registradas."""
    try:
        return svc.list_purchases(request, date_from=date_from, date_to=date_to, limit=limit, offset=offset)
    except Exception as e:
        logger.error(f"[list_purchases] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al listar compras: {str(e)}")


@router.post("/purchases")
def create_purchase(payload: Dict[str, Any], request: Request, current_user: dict = Depends(get_current_user)):
    """Crea una factura de compra (ingreso de compra)."""
    try:
        ctx = _request_context(request, current_user)
        return svc.create_purchase(payload, **ctx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[create_purchase] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al crear factura: {str(e)}")


@router.put("/purchases/{factura_id}")
def update_purchase(factura_id: int, payload: Dict[str, Any], request: Request, current_user: dict = Depends(get_current_user)):
    """Actualiza una factura de compra existente."""
    try:
        ctx = _request_context(request, current_user)
        return svc.update_purchase(factura_id, payload, **ctx)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[update_purchase] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al actualizar factura: {str(e)}")


@router.delete("/purchases/{factura_id}", status_code=204)
def delete_purchase(factura_id: int, request: Request, current_user: dict = Depends(get_current_user)):
    """Elimina una factura de compra."""
    try:
        ctx = _request_context(request, current_user)
        svc.delete_purchase(factura_id, **ctx)
        return
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[delete_purchase] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al eliminar factura: {str(e)}")


@router.post("/purchases/document")
async def upload_invoice_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Sube el documento de una factura (imagen o PDF) y retorna su ruta y URL."""
    try:
        return await svc.upload_invoice_document(file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[upload_invoice_document] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al subir documento: {str(e)}")


# ============================================================
# VENTAS
# ============================================================
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


@router.post("/sales")
def register_sale(payload: Dict[str, Any], request: Request, current_user: dict = Depends(get_current_user)):
    """Registra la venta de uno o más ejemplares (fecha + precio)."""
    try:
        ctx = _request_context(request, current_user)
        ejemplar_ids = payload.get("ejemplar_ids") or []
        sale_date = payload.get("sale_date")
        sale_price = payload.get("sale_price")
        return svc.register_sale(ejemplar_ids, sale_date, sale_price, **ctx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[register_sale] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al registrar venta: {str(e)}")
