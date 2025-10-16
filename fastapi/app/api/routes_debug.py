from fastapi import APIRouter
from fastapi.routing import APIRoute


router = APIRouter()

@router.get("/", summary="Ping Debug")
def ping():
    return {"ok": True}

@router.get("/routes", summary="List routes")
def list_routes():
    return [
        {"path": r.path, "name": r.name, "methods": list(r.methods or [])}
        for r in app.router.routes if isinstance(r, APIRoute)
    ]
