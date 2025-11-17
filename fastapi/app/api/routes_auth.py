from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, Dict, Tuple
import re
from datetime import datetime, timedelta
from collections import defaultdict
import threading
from app.core.supabase_auth import get_public, get_service
from app.core.security import (
    set_supabase_session_cookies,
    clear_supabase_session_cookies,
    get_token_from_request,
    get_refresh_token_from_request,
    validate_supabase_jwt,
    sync_user_supabase_uid,
    validate_user_active,
    generate_csrf_token,
    IS_PRODUCTION
)
from app.middleware.auth_middleware import get_current_user

router = APIRouter()

# Rate limiting storage
_rate_limit_store: Dict[str, list] = defaultdict(list)
_rate_limit_lock = threading.Lock()

def check_rate_limit(request: Request, limit: int, window_seconds: int) -> Tuple[bool, int]:
    """
    Check if request is within rate limit
    
    Args:
        request: FastAPI request object
        limit: Maximum number of requests allowed
        window_seconds: Time window in seconds
        
    Returns:
        Tuple of (is_allowed, time_remaining)
    """
    now = datetime.now()
    client_ip = request.client.host if request.client else "unknown"
    
    with _rate_limit_lock:
        # Clean old entries
        client_requests = _rate_limit_store[client_ip]
        cutoff_time = now - timedelta(seconds=window_seconds)
        client_requests = [req_time for req_time in client_requests if req_time > cutoff_time]
        
        # Check if limit exceeded
        if len(client_requests) >= limit:
            # Calculate time remaining until oldest request expires
            oldest_request = min(client_requests)
            time_remaining = int((oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())
            return False, max(0, time_remaining)
        
        # Add current request
        client_requests.append(now)
        _rate_limit_store[client_ip] = client_requests
        
        # Calculate time remaining
        if len(client_requests) > 1:
            oldest_request = min(client_requests)
            time_remaining = int((oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())
        else:
            time_remaining = window_seconds
        
        return True, time_remaining

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
    
    @validator('email')
    def validate_email(cls, v):
        return sanitize_email(v)

class VerifyOtpIn(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')
    
    @validator('email')
    def validate_email(cls, v):
        return sanitize_email(v)
    
    @validator('code')
    def validate_code(cls, v):
        return sanitize_otp_code(v)

# Legacy functions removed - now using security.py helpers

@router.post("/request-otp", status_code=204)
def request_otp(request: Request, payload: RequestOtpIn):
    """
    Whitelist por email (tabla 'usuarios', active=true). Usamos service role para evitar RLS
    y creamos el usuario de Auth si aún no existe. Luego enviamos OTP.
    """
    # Rate limiting: máximo 5 requests por minuto
    is_allowed, time_remaining = check_rate_limit(request, limit=5, window_seconds=60)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos. Espera {time_remaining} segundos."
        )
    
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
        raise HTTPException(403, "Este correo no está autorizado para acceder al sistema. Contacta al administrador si crees que esto es un error.")

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
def verify_otp(request: Request, payload: VerifyOtpIn, response: Response):
    """
    Verifica OTP usando Supabase como IdP, revalida whitelist y sincroniza supabase_uid
    """
    # Rate limiting: máximo 10 intentos por minuto
    is_allowed, time_remaining = check_rate_limit(request, limit=10, window_seconds=60)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos de verificación. Espera {time_remaining} segundos."
        )
    
    sb = get_public()
    sb_admin = get_service()
    email = payload.email  # Ya sanitizado por el validador
    code = payload.code    # Ya sanitizado por el validador
    
    print(f"[verify_otp] Verificando código para: {email}")

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
    except Exception as e:
        raise HTTPException(400, f"Error verificando OTP: {e}")

    auth_uid = str(res.user.id)

    # 3) Re-validar whitelist (usuario activo)
    try:
        w = sb_admin.table("usuarios").select("id, supabase_uid, active").eq("email", email).limit(1).execute()
    except Exception as e:
        raise HTTPException(500, f"Error consultando whitelist: {e}")

    if not w.data or not w.data[0].get("active"):
        raise HTTPException(403, "Usuario no autorizado")

    row = w.data[0]

    # 4) Sincronizar supabase_uid si no está
    if not row.get("supabase_uid"):
        sync_user_supabase_uid(email, auth_uid)

    # 5) Configurar cookies seguras de Supabase
    set_supabase_session_cookies(response, res.session)

    # 6) Generar CSRF token
    csrf_token = generate_csrf_token()
    # En producción, usar samesite="none" para cookies cross-domain
    samesite_value = "lax" if not IS_PRODUCTION else "none"
    response.set_cookie(
        "csrf-token",
        csrf_token,
        httponly=False,  # Necesario para que JS lo lea
        secure=IS_PRODUCTION,  # Only secure in production (required for samesite=none)
        samesite=samesite_value,  # lax in dev, none in prod para cross-domain
        path="/",
        max_age=3600
    )

    return {
        "access_token": res.session.access_token,
        "token_type": "bearer",
        "user": {"id": res.user.id, "email": res.user.email},
        "expires_in": getattr(res.session, "expires_in", 3600),
        "csrf_token": csrf_token
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
        
        if not session_response.session:
            raise HTTPException(401, "Invalid refresh token")
        
        # Update cookies with new tokens
        set_supabase_session_cookies(response, session_response.session)
        
        # Generate new CSRF token
        csrf_token = generate_csrf_token()
        # En producción, usar samesite="none" para cookies cross-domain
        samesite_value = "lax" if not IS_PRODUCTION else "none"
        response.set_cookie(
            "csrf-token",
            csrf_token,
            httponly=False,
            secure=IS_PRODUCTION,  # Only secure in production (required for samesite=none)
            samesite=samesite_value,  # lax in dev, none in prod para cross-domain
            path="/",
            max_age=3600
        )
        
        return {
            "access_token": session_response.session.access_token,
            "token_type": "bearer",
            "expires_in": getattr(session_response.session, "expires_in", 3600),
            "csrf_token": csrf_token
        }
        
    except Exception as e:
        raise HTTPException(401, f"Token refresh failed: {e}")

@router.post("/logout", status_code=204)
def logout(response: Response, request: Request):
    """
    Logout user and clear all session cookies
    """
    # Clear Supabase session cookies
    clear_supabase_session_cookies(response)
    
    # Clear CSRF token
    # En producción, usar samesite="none" para cookies cross-domain
    samesite_value = "lax" if not IS_PRODUCTION else "none"
    response.delete_cookie("csrf-token", path="/", samesite=samesite_value, secure=IS_PRODUCTION)
    
    # Optional: Sign out from Supabase
    token = get_token_from_request(request)
    if token:
        try:
            sb = get_public()
            sb.auth.sign_out()
        except Exception:
            pass  # Don't fail logout if sign_out fails
    
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
    
    # Get CSRF token from cookie if available
    csrf_token = request.cookies.get("csrf-token")
    
    # Return user information including the access token and CSRF token
    response_data = {
        "id": user_claims["id"],
        "email": user_claims["email"],
        "role": user_claims.get("role", "authenticated"),
        "authenticated": True,
        "access_token": token  # Include the token so frontend can update localStorage
    }
    
    # Include CSRF token if available (necesario para cookies cross-domain)
    if csrf_token:
        response_data["csrf_token"] = csrf_token
    
    return response_data
