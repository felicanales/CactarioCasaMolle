from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def ping_debug():
    return {"ok": True, "resource": "debug"}
