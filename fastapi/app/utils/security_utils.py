# app/utils/security_utils.py
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase_auth import get_public

bearer = HTTPBearer(auto_error=False)
TOKEN_COOKIE_NAME = "cm_session"

def _get_token(request: Request, creds: HTTPAuthorizationCredentials | None) -> str | None:
    """
    Obtiene el token desde Authorization: Bearer o, si no hay, desde la cookie cm_session.
    """
    if creds and creds.credentials:
        return creds.credentials
    return request.cookies.get(TOKEN_COOKIE_NAME)

def get_current_user(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    """
    Valida que haya un usuario autenticado en Supabase y devuelve datos básicos.
    No usa roles ni claves administrativas.
    """
    token = _get_token(request, creds)
    if not token:
        raise HTTPException(401, "Falta token (usa Authorization: Bearer <token> o cookie)")

    sb = get_public()
    try:
        auth_res = sb.auth.get_user(token)
    except Exception:
        raise HTTPException(401, "Token inválido")

    if not auth_res.user:
        raise HTTPException(401, "Token inválido")

    return {
        "auth_uid": str(auth_res.user.id),
        "email": auth_res.user.email,
    }
