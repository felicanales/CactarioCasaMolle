from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
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

class RequestOtpIn(BaseModel):
    email: EmailStr

class VerifyOtpIn(BaseModel):
    email: EmailStr
    code: str  # OTP numérico

# Legacy functions removed - now using security.py helpers

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
def verify_otp(payload: VerifyOtpIn, response: Response):
    """
    Verifica OTP usando Supabase como IdP, revalida whitelist y sincroniza supabase_uid
    """
    sb = get_public()
    sb_admin = get_service()
    email = payload.email.strip().lower()

    # 1) Normalización del código
    code = payload.code.strip().replace(" ", "")
    if not code.isdigit():
        raise HTTPException(400, "El código debe ser numérico")

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
    response.set_cookie(
        "csrf-token",
        csrf_token,
        httponly=False,  # Necesario para que JS lo lea
        secure=IS_PRODUCTION,  # Only secure in production
        samesite="strict",
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
        # Set session with refresh token to get new tokens
        session_response = sb.auth.set_session(refresh_token, refresh_token)
        
        if not session_response.session:
            raise HTTPException(401, "Invalid refresh token")
        
        # Update cookies with new tokens
        set_supabase_session_cookies(response, session_response.session)
        
        # Generate new CSRF token
        csrf_token = generate_csrf_token()
        response.set_cookie(
            "csrf-token",
            csrf_token,
            httponly=False,
            secure=IS_PRODUCTION,  # Only secure in production
            samesite="strict",
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
    response.delete_cookie("csrf-token", path="/", samesite="strict", secure=IS_PRODUCTION)
    
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
    
    # Return user information
    return {
        "id": user_claims["id"],
        "email": user_claims["email"],
        "role": user_claims.get("role", "authenticated"),
        "authenticated": True
    }
