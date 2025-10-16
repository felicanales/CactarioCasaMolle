# app/utils/security_utils.py
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase_auth import get_public

bearer = HTTPBearer(auto_error=False)
TOKEN_COOKIE_NAME = "cm_session"

def _get_token(request: Request, creds: HTTPAuthorizationCredentials | None) -> str | None:
    if creds and creds.credentials:
        return creds.credentials
    return request.cookies.get(TOKEN_COOKIE_NAME)

def get_current_user(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    """
    Devuelve el usuario autenticado (Auth) sin consultar roles en tu tabla 'usuarios'.
    Si quieres, aquí mismo puedes sincronizar con 'usuarios' más adelante (opcional).
    """
    token = _get_token(request, creds)
    if not token:
        raise HTTPException(401, "Falta token (usa Authorization: Bearer o cookie)")

    sb = get_public()
    try:
        auth_res = sb.auth.get_user(token)
    except Exception:
        raise HTTPException(401, "Token inválido")

    if not auth_res.user:
        raise HTTPException(401, "Token inválido")

    # Solo datos básicos del Auth (sin rol)
    return {
        "auth_uid": str(auth_res.user.id),
        "email": auth_res.user.email,
    }
