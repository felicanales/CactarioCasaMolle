from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
import re
import os
import secrets as secrets_mod
import logging
from app.core.supabase_auth import get_public, get_service
from app.core.security import (
    set_supabase_session_cookies,
    clear_supabase_session_cookies,
    get_token_from_request,
    get_refresh_token_from_request,
    validate_supabase_jwt,
    sync_user_supabase_uid,
    validate_user_active,
    revoke_auth_session,
)
from app.middleware.rate_limiter import check_rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)

# Validadores de seguridad
def sanitize_email(email: str) -> str:
    """Sanitiza y valida email para prevenir inyecciones"""
    if not email:
        raise ValueError("Email no puede estar vacío")
    
    # Eliminar espacios y convertir a minúsculas
    email = email.strip().lower()
    
    # Validar longitud
    if len(email) < 5 or len(email) > 254:
        raise ValueError("Email debe tener entre 5 y 254 caracteres")
    
    # Validar formato estricto
    email_regex = r'^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        raise ValueError("Formato de email inválido")
    
    # Verificar partes del email
    local, domain = email.split('@')
    if len(local) > 64:
        raise ValueError("Parte local del email demasiado larga")
    
    return email

def sanitize_otp_code(code: str) -> str:
    """Sanitiza y valida código OTP para prevenir inyecciones"""
    if not code:
        raise ValueError("Código OTP no puede estar vacío")
    
    # Eliminar espacios y caracteres no numéricos
    code = re.sub(r'\D', '', code.strip())
    
    # Validar longitud exacta
    if len(code) != 6:
        raise ValueError("Código OTP debe tener exactamente 6 dígitos")
    
    # Validar que sean solo dígitos
    if not code.isdigit():
        raise ValueError("Código OTP debe contener solo dígitos")
    
    return code

class RequestOtpIn(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return sanitize_email(v)

class VerifyOtpIn(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return sanitize_email(v)
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        return sanitize_otp_code(v)

class MasterKeyLoginIn(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    master_key: str = Field(..., min_length=8, max_length=512)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return sanitize_email(v)

    @field_validator('master_key')
    @classmethod
    def normalize_master_key(cls, v):
        return v.strip()

# Legacy functions removed - now using security.py helpers

@router.post("/master-key-login")
def master_key_login(request: Request, payload: MasterKeyLoginIn, response: Response):
    """Fallback login con clave maestra cuando Supabase alcanza el límite de emails OTP."""
    is_allowed, time_remaining = check_rate_limit(
        request, limit=5, window_seconds=60, scope="master-key-login"
    )
    if not is_allowed:
        raise HTTPException(429, f"Demasiados intentos. Espera {time_remaining} segundos.")

    master_key_env = os.environ.get("MASTER_LOGIN_KEY", "").strip()
    if not master_key_env:
        raise HTTPException(503, "Inicio de sesión alternativo no disponible.")

    if not secrets_mod.compare_digest(payload.master_key.encode(), master_key_env.encode()):
        raise HTTPException(401, "Clave maestra inválida.")

    email = payload.email
    sb_admin = get_service()
    sb = get_public()

    try:
        u = sb_admin.table("usuarios").select("id, active, supabase_uid").eq("email", email).eq("active", True).limit(1).execute()
    except Exception as exc:
        logger.exception("Error consulting authorized users: %s", exc)
        raise HTTPException(500, "No se pudo validar el acceso.") from exc
    if not u.data:
        raise HTTPException(403, "Este correo no está autorizado o está inactivo.")

    try:
        users = sb_admin.auth.admin.list_users()
        auth_user = next((au for au in users if au.email == email), None)
        if not auth_user:
            created = sb_admin.auth.admin.create_user({"email": email, "email_confirm": True})
            if not getattr(created, "user", None):
                raise HTTPException(500, "No se pudo preparar el usuario en Auth.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error preparing Supabase Auth user: %s", exc)
        raise HTTPException(500, "No se pudo preparar el usuario en Auth.") from exc

    try:
        link_res = sb_admin.auth.admin.generate_link({"type": "magiclink", "email": email})
        email_otp = link_res.properties.email_otp
        hashed_token = link_res.properties.hashed_token
    except Exception as exc:
        logger.exception("Error generating alternate login link: %s", exc)
        raise HTTPException(500, "No se pudo generar la sesión alternativa.") from exc

    session_res = None
    try:
        session_res = sb.auth.verify_otp({"email": email, "token": email_otp, "type": "email"})
    except Exception:
        pass

    if not session_res or not getattr(session_res, "session", None):
        try:
            session_res = sb.auth.verify_otp({"token_hash": hashed_token, "type": "magiclink"})
        except Exception as exc:
            logger.exception("Error creating alternate session: %s", exc)
            raise HTTPException(500, "No se pudo crear la sesión.") from exc

    if (
        not session_res
        or not session_res.session
        or not session_res.session.access_token
        or not session_res.user
    ):
        raise HTTPException(500, "No se pudo crear la sesión.")

    # Vincular tambien el login con clave maestra a la whitelist local.
    # Sin esta sincronizacion, el JWT es valido pero validate_user_active()
    # no encuentra una fila activa porque supabase_uid queda NULL.
    auth_uid = str(session_res.user.id)
    user_row = u.data[0]
    stored_uid = str(user_row.get("supabase_uid") or "")
    if stored_uid and stored_uid != auth_uid:
        logger.error("Supabase UID mismatch during alternate login")
        raise HTTPException(403, "La cuenta requiere revisión del administrador.")
    if not stored_uid and not sync_user_supabase_uid(email, auth_uid):
        raise HTTPException(500, "No se pudo sincronizar el usuario con Supabase.")
    if not validate_user_active(auth_uid):
        raise HTTPException(500, "No se pudo sincronizar el usuario con Supabase.")

    set_supabase_session_cookies(response, session_res.session)

    try:
        from app.services.audit_service import log_change
        log_change(
            table_name="usuarios", record_id=user_row["id"], action="UPDATE",
            user_id=user_row["id"], user_email=email, user_name=None,
            old_values={"evento": None}, new_values={"evento": "LOGIN_MASTER_KEY"},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except Exception as exc:
        logger.warning("Could not audit alternate login: %s", exc)

    return {
        "access_token": session_res.session.access_token,
        "token_type": "bearer",
        "user": {"id": session_res.user.id, "email": session_res.user.email},
        "expires_in": getattr(session_res.session, "expires_in", 3600),
    }

@router.post("/request-otp", status_code=204)
def request_otp(request: Request, payload: RequestOtpIn):
    """
    Whitelist por email (tabla 'usuarios', active=true). Usamos service role para evitar RLS
    y creamos el usuario de Auth si aún no existe. Luego enviamos OTP.
    """
    # Rate limiting: máximo 5 solicitudes por minuto.
    is_allowed, time_remaining = check_rate_limit(
        request, limit=5, window_seconds=60, scope="request-otp"
    )
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos. Espera {time_remaining} segundos."
        )
    
    email = payload.email.strip().lower()
    logger.info("OTP request received")

    sb_admin = get_service()  # service role
    sb = get_public()         # anon para el envío de OTP

    # 1) ¿Email autorizado (y activo)?
    try:
        u = sb_admin.table("usuarios").select("id").eq("email", email).eq("active", True).limit(1).execute()
    except Exception as exc:
        logger.exception("Error consulting OTP allowlist: %s", exc)
        raise HTTPException(500, "No se pudo validar el acceso.") from exc
    if not u.data:
        logger.warning("OTP request rejected for unauthorized or inactive email")
        raise HTTPException(403, "Este correo no está autorizado para acceder al sistema. Contacta al administrador si crees que esto es un error.")

    # 2) Revisar si ya existe user en Auth; si no, lo creamos con admin API
    try:
        users = sb_admin.auth.admin.list_users()
        auth_user = next((u for u in users if u.email == email), None)

        if not auth_user:
            created = sb_admin.auth.admin.create_user({
                "email": email,
                "email_confirm": True,
            })
            auth_user = getattr(created, "user", None)
            if not auth_user:
                raise HTTPException(500, "No se pudo preparar el usuario para enviar OTP.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error preparing OTP user: %s", exc)
        raise HTTPException(500, "Error interno preparando el envio del codigo.") from exc


    # 3) Enviar OTP
    try:
        sb.auth.sign_in_with_otp({
            "email": email,
            "options": { "should_create_user": False }
        })
    except Exception as exc:
        logger.warning("Supabase rejected OTP delivery: %s", exc)
        error_text = str(exc).lower()
        cooldown_match = re.search(r"after\s+(\d+)\s+seconds?", error_text)
        if "you can only request this after" in error_text:
            wait_seconds = cooldown_match.group(1) if cooldown_match else None
            message = (
                f"Debes esperar {wait_seconds} segundos antes de pedir otro codigo."
                if wait_seconds
                else "Debes esperar unos segundos antes de pedir otro codigo."
            )
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "otp_request_cooldown",
                    "message": message,
                },
            )
        if "over_email_send_rate_limit" in error_text or "2 emails per hour" in error_text or "email rate limit" in error_text:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "over_email_send_rate_limit",
                    "message": "Supabase limita el envio de correos a 2 por hora (2/hr).",
                },
            )
        raise HTTPException(502, "No se pudo enviar el codigo de verificacion. Intenta nuevamente mas tarde.")

    logger.info("OTP delivery accepted")
    return  # 204

@router.post("/verify-otp")
def verify_otp(request: Request, payload: VerifyOtpIn, response: Response):
    """
    Verifica OTP usando Supabase como IdP, revalida whitelist y sincroniza supabase_uid
    """
    # Rate limiting: máximo 10 intentos por minuto
    is_allowed, time_remaining = check_rate_limit(
        request, limit=10, window_seconds=60, scope="verify-otp"
    )
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos de verificación. Espera {time_remaining} segundos."
        )
    
    sb = get_public()
    sb_admin = get_service()
    email = payload.email  # Ya sanitizado por el validador
    code = payload.code    # Ya sanitizado por el validador
    
    logger.info("OTP verification received")

    # 2) Verificar OTP con Supabase
    try:
        res = sb.auth.verify_otp({
            "email": email,
            "token": code,
            "type": "email"
        })
        if getattr(res, "error", None):
            raise HTTPException(400, str(res.error))
        if not res.session or not res.session.access_token or not res.user:
            raise HTTPException(400, "Código inválido o expirado")
    except HTTPException:
        raise
    except Exception as exc:
        logger.info("OTP verification rejected: %s", exc)
        raise HTTPException(400, "Código inválido o expirado.") from exc

    auth_uid = str(res.user.id)

    # 3) Re-validar whitelist (usuario activo)
    try:
        w = sb_admin.table("usuarios").select("id, supabase_uid, active").eq("email", email).limit(1).execute()
    except Exception as exc:
        logger.exception("Error consulting OTP allowlist: %s", exc)
        raise HTTPException(500, "No se pudo validar el acceso.") from exc

    if not w.data or not w.data[0].get("active"):
        raise HTTPException(403, "Usuario no autorizado")

    row = w.data[0]

    # 4) Sincronizar supabase_uid si no está y rechazar asociaciones distintas.
    stored_uid = str(row.get("supabase_uid") or "")
    if stored_uid and stored_uid != auth_uid:
        logger.error("Supabase UID mismatch during OTP verification")
        raise HTTPException(403, "La cuenta requiere revisión del administrador.")
    if not stored_uid and not sync_user_supabase_uid(email, auth_uid):
        raise HTTPException(500, "No se pudo sincronizar el usuario con Supabase.")
    if not validate_user_active(auth_uid):
        raise HTTPException(403, "Usuario no autorizado")

    # 5) Configurar cookies seguras de Supabase
    set_supabase_session_cookies(response, res.session)

    # Registrar inicio de sesion en auditoria
    try:
        from app.services.audit_service import log_change
        user_row_id = row.get("id")
        if user_row_id:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            log_change(
                table_name="usuarios",
                record_id=user_row_id,
                action="UPDATE",
                user_id=user_row_id,
                user_email=email,
                user_name=None,
                old_values={"evento": None},
                new_values={"evento": "LOGIN"},
                ip_address=ip_address,
                user_agent=user_agent
            )
    except Exception as audit_error:
        logger.warning("Could not audit OTP login: %s", audit_error)

    return {
        "access_token": res.session.access_token,
        "token_type": "bearer",
        "user": {"id": res.user.id, "email": res.user.email},
        "expires_in": getattr(res.session, "expires_in", 3600),
    }

@router.post("/refresh")
def refresh_token(response: Response, request: Request):
    """
    Refresh access token using refresh token from cookie
    """
    refresh_token = get_refresh_token_from_request(request)
    
    if not refresh_token:
        raise HTTPException(401, "Missing refresh token")
    
    try:
        sb = get_public()
        # Use refresh_session instead of set_session to properly refresh tokens
        session_response = sb.auth.refresh_session(refresh_token)
        
        if not session_response.session or not session_response.session.access_token:
            raise HTTPException(401, "Invalid refresh token")

        user_claims = validate_supabase_jwt(session_response.session.access_token)
        if not user_claims:
            raise HTTPException(401, "Invalid refresh token")
        if not validate_user_active(user_claims["id"]):
            raise HTTPException(403, "User account is inactive")
        
        # Update cookies with new tokens
        set_supabase_session_cookies(response, session_response.session)
        
        return {
            "access_token": session_response.session.access_token,
            "token_type": "bearer",
            "expires_in": getattr(session_response.session, "expires_in", 3600),
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.info("Token refresh failed: %s", exc)
        raise HTTPException(401, "Token refresh failed") from exc

@router.post("/logout", status_code=204)
def logout(response: Response, request: Request):
    """
    Logout user and clear all session cookies
    """
    try:
        token = get_token_from_request(request)
        if token:
            user_claims = validate_supabase_jwt(token)
            if user_claims:
                try:
                    revoke_auth_session(user_claims)
                except Exception as exc:
                    logger.warning("No se pudo revocar la sesión local: %s", exc)
                try:
                    get_service().auth.admin.sign_out(token, scope="local")
                except Exception as exc:
                    logger.warning("No se pudo cerrar la sesión en Supabase Auth: %s", exc)
    finally:
        clear_supabase_session_cookies(response)
    
    return

@router.get("/me")
def me(request: Request):
    """
    Get current user information - handles both authenticated and unauthenticated requests
    This endpoint manually validates the token since it's skipped by the middleware
    """
    # Try to get token from request (cookie or Authorization header)
    token = get_token_from_request(request)
    
    if not token:
        # No token found
        return {
            "authenticated": False,
            "message": "No user authenticated"
        }
    
    # Validate JWT token
    user_claims = validate_supabase_jwt(token)
    
    if not user_claims:
        # Invalid or expired token
        return {
            "authenticated": False,
            "message": "Invalid or expired token"
        }
    
    # Validate user is still active
    if not validate_user_active(user_claims["id"]):
        raise HTTPException(403, "User account is inactive")
    
    # Return only session state and minimal user information.
    response_data = {
        "id": user_claims["id"],
        "email": user_claims["email"],
        "role": user_claims.get("role", "authenticated"),
        "authenticated": True,
    }
    
    return response_data
