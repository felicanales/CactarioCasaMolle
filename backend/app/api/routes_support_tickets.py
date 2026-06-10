from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.middleware.auth_middleware import get_current_user
from app.services import support_tickets_service as svc

router = APIRouter()


def _request_context(request: Request, current_user: dict) -> Dict[str, Any]:
    return {
        "user_id": current_user.get("id"),
        "user_email": current_user.get("email"),
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }


@router.get("/staff", dependencies=[Depends(get_current_user)])
def list_support_tickets_staff(
    request: Request,
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    type: Optional[str] = Query(None, description="Filtrar por tipo"),
    module: Optional[str] = Query(None, description="Filtrar por modulo"),
    q: Optional[str] = Query(None, description="Busqueda general"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    try:
        return svc.list_staff(
            status=status,
            type=type,
            module=module,
            q=q,
            limit=limit,
            offset=offset,
            user_id=current_user.get("id"),
            user_email=current_user.get("email"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar tickets: {str(e)}")


@router.get("/staff/summary", dependencies=[Depends(get_current_user)])
def get_support_tickets_summary_staff(current_user: dict = Depends(get_current_user)):
    try:
        return svc.get_summary(user_email=current_user.get("email"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cargar resumen de tickets: {str(e)}")


@router.post("/staff", dependencies=[Depends(get_current_user)])
def create_support_ticket_staff(
    payload: Dict[str, Any],
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    try:
        ctx = _request_context(request, current_user)
        return svc.create_staff(payload, **ctx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear ticket: {str(e)}")


@router.put("/staff/{ticket_id}", dependencies=[Depends(get_current_user)])
def update_support_ticket_staff(
    ticket_id: int,
    payload: Dict[str, Any],
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    try:
        ctx = _request_context(request, current_user)
        return svc.update_staff(ticket_id, payload, **ctx)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar ticket: {str(e)}")


@router.delete("/staff/{ticket_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_support_ticket_staff(
    ticket_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    try:
        ctx = _request_context(request, current_user)
        svc.delete_staff(ticket_id, **ctx)
        return
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar ticket: {str(e)}")
