from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel, EmailStr
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional
from app.core.supabase_auth import get_public, get_service

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

TOKEN_COOKIE_NAME = "cm_session"
COOKIE_MAX_AGE_FALLBACK = 60 * 60  # 1 hora

class RequestOtpIn(BaseModel):
    email: EmailStr

class VerifyOtpIn(BaseModel):
    email: EmailStr
    code: str  # OTP numérico

def _set_session_cookie(response: Response, access_token: str, max_age: Optional[int] = None):
    response.set_cookie(
        key=TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,   # True en producción (HTTPS)
        samesite="lax",
        max_age=max_age or COOKIE_MAX_AGE_FALLBACK,
        path="/",
    )

def _clear_session_cookie(response: Response):
    # Importante: usar mismos atributos (path/samesite/secure) para que el navegador la elimine
    response.delete_cookie(
        key=TOKEN_COOKIE_NAME,
        path="/",
        samesite="lax",
        secure=False,
    )

def _get_token_from_header_or_cookie(request: Request, creds: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    if creds and creds.credentials:
        return creds.credentials
    return request.cookies.get(TOKEN_COOKIE_NAME)

@router.post("/request-otp", status_code=204)
def request_otp(payload: RequestOtpIn):
    """
    Whitelist por email (tabla 'usuarios', active=true). Usamos service role para evitar RLS
    y creamos el usuario de Auth si aún no existe. Luego enviamos OTP.
    """
    email = payload.email.strip().lower()
    print(f"[request_otp] Solicitud recibida para: {email}")

    sb_admin = get_service()  # service role
    sb = get_public()         # anon para el envío de OTP

    # 1) ¿Email autorizado (y activo)?
    try:
        u = sb_admin.table("usuarios").select("id").eq("email", email).eq("active", True).limit(1).execute()
        print(f"[request_otp] Resultado whitelist: {u.data}")
    except Exception as e:
        print(f"[request_otp] Error consultando whitelist: {e}")
        raise HTTPException(500, f"Error consultando whitelist: {e}")
    if not u.data:
        print(f"[request_otp] Email no autorizado o inactivo: {email}")
        return

    # 2) Revisar si ya existe user en Auth; si no, lo creamos con admin API
    try:
        users = sb_admin.auth.admin.list_users()
        auth_user = next((u for u in users if u.email == email), None)

        if auth_user:
            print(f"[request_otp] Usuario ya existe en Auth: {auth_user.id}")
        else:
            print(f"[request_otp] Usuario no existe en Auth. Creando...")
            created = sb_admin.auth.admin.create_user({
                "email": email,
                "email_confirm": True,
            })
            auth_user = getattr(created, "user", None)
            if auth_user:
                print(f"[request_otp] Usuario creado en Auth: {auth_user.id}")
            else:
                print(f"[request_otp] Falló la creación del usuario en Auth")
                return
    except Exception as e:
        print(f"[request_otp] Error al verificar/crear usuario en Auth: {e}")
        return


    # 3) Enviar OTP
    try:
        print(f"[request_otp] Enviando OTP a: {email}")
        res = sb.auth.sign_in_with_otp({
            "email": email,
            "options": { "should_create_user": False }
        })
        print(f"[request_otp] OTP enviado. Respuesta: {res}")
    except Exception as e:
        print(f"[request_otp] Error al enviar OTP: {e}")
        return

    print(f"[request_otp] Proceso completado para: {email}")
    return  # 204

@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpIn, response: Response):
    """
    Verifica OTP; re-chequea que el email esté en whitelist (active=true).
    Si el supabase_uid no está guardado en 'usuarios', lo completa en el primer login.
    """
    sb = get_public()
    sb_admin = get_service()  # para operar sobre la tabla usuarios
    email = payload.email.strip().lower()

    # 0) Normalización del código
    code = payload.code.strip().replace(" ", "")
    if not code.isdigit():
        raise HTTPException(400, "El código debe ser numérico")

    # 1) Verificar OTP
    res = sb.auth.verify_otp({
        "email": email,
        "token": code,
        "type": "email"
    })
    if getattr(res, "error", None):
        raise HTTPException(400, str(res.error))
    if not res.session or not res.session.access_token or not res.user:
        raise HTTPException(400, "Código inválido o expirado")

    auth_uid = str(res.user.id)

    # 2) Re-chequeo whitelist por email activo
    try:
        w = sb_admin.table("usuarios").select("id, supabase_uid, active").eq("email", email).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Error consultando whitelist: {e}")

    if not w.data or not w.data[0].get("active"):
        raise HTTPException(403, "Usuario no autorizado")

    row = w.data[0]

    # 3) Guardar supabase_uid si no estaba
    if not row.get("supabase_uid"):
        try:
            sb_admin.table("usuarios").update({"supabase_uid": auth_uid}).eq("id", row["id"]).execute()
        except Exception:
            # Si falla, no bloqueamos login
            pass

    # 4) Emitir cookie + respuesta
    access_token = res.session.access_token
    max_age = getattr(res.session, "expires_in", None) or COOKIE_MAX_AGE_FALLBACK
    _set_session_cookie(response, access_token, max_age=max_age)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": res.user.id, "email": res.user.email},
        "expires_in": getattr(res.session, "expires_in", None),
    }

@router.post("/logout", status_code=204)
def logout(response: Response, request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    # Opcional: podríamos revocar el token si el proveedor lo soporta. Por ahora, solo borramos cookie.
    _clear_session_cookie(response)
    return

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
