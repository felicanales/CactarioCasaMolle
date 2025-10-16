# fastapi/app/api/routes_auth.py
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel, EmailStr
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.supabase_auth import get_public
from datetime import datetime, timezone, timedelta

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

TOKEN_COOKIE_NAME = "cm_session"  # nombre de la cookie
COOKIE_MAX_AGE_FALLBACK = 60 * 60  # 1h si Supabase no entrega expires_in

class RequestOtpIn(BaseModel):
    email: EmailStr

class VerifyOtpIn(BaseModel):
    email: EmailStr
    code: str

def _set_session_cookie(response: Response, access_token: str, max_age: int | None = None):
    """
    Crea una cookie http-only con el access_token.
    En local, puedes poner secure=False. En producción: secure=True.
    """
    response.set_cookie(
        key=TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,          # <-- CAMBIA A True en producción (https)
        samesite="lax",
        max_age=max_age or COOKIE_MAX_AGE_FALLBACK,
        path="/",
    )

def _get_token_from_header_or_cookie(
    request: Request,
    creds: HTTPAuthorizationCredentials | None
) -> str | None:
    if creds and creds.credentials:
        return creds.credentials
    # Fallback a cookie
    return request.cookies.get(TOKEN_COOKIE_NAME)

@router.post("/request-otp", status_code=204)
def request_otp(payload: RequestOtpIn):
    sb = get_public()
    # Opcional: crear usuario automático si no existe
    res = sb.auth.sign_in_with_otp({"email": payload.email, "options": {"should_create_user": True}})
    if getattr(res, "error", None):
        raise HTTPException(400, str(res.error))
    return

@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpIn, response: Response):
    # Normalizaciones básicas
    code = payload.code.strip().replace(" ", "")
    if not code.isdigit():
        raise HTTPException(400, "El código debe ser numérico")
    if len(code) < 4:  # normalmente 6 dígitos, pero no lo atamos por si cambias en el panel
        raise HTTPException(400, "Código demasiado corto")

    sb = get_public()
    data = {"email": payload.email, "token": code, "type": "email"}
    res = sb.auth.verify_otp(data)

    if getattr(res, "error", None):
        raise HTTPException(400, str(res.error))
    if not res.session or not res.session.access_token:
        raise HTTPException(400, "Código inválido o expirado")

    access_token = res.session.access_token
    # Supabase suele enviar expires_in (segundos) o expires_at; usamos expires_in si está
    max_age = getattr(res.session, "expires_in", None) or COOKIE_MAX_AGE_FALLBACK

    # OPCIONAL: setea cookie http-only para que el frontend no maneje tokens
    _set_session_cookie(response, access_token, max_age=max_age)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": res.user.id, "email": res.user.email},
        "expires_in": getattr(res.session, "expires_in", None),
    }

@router.get("/me")
def me(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    sb = get_public()
    token = _get_token_from_header_or_cookie(request, creds)
    if not token:
        raise HTTPException(401, "Falta token (usa Authorization: Bearer o cookie)")
    res = sb.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Token inválido")
    return {"id": res.user.id, "email": res.user.email}

@router.post("/logout", status_code=204)
def logout(response: Response):
    # Limpia cookie (y en frontend puedes olvidar cualquier bearer almacenado)
    response.delete_cookie(TOKEN_COOKIE_NAME, path="/")
    return
