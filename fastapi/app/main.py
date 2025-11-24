from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from app.api import routes_species, routes_sectors, routes_auth, routes_ejemplar, routes_debug, routes_photos, routes_audit, routes_transactions
from app.middleware.auth_middleware import AuthMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import logging
from datetime import datetime

# ============================================================
# CONFIGURACIÓN DE LOGGING
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("cactario-backend")

# ============================================================
# INFORMACIÓN DE ARRANQUE
# ============================================================
logger.info("=" * 60)
logger.info("🚀 Iniciando Cactario Casa Molle Backend")
logger.info("=" * 60)

# Variables de entorno críticas
PORT = os.getenv("PORT", "No definido")
ENV_NAME = os.getenv("RAILWAY_ENVIRONMENT_NAME", "No definido")
REGION = os.getenv("RAILWAY_REGION", "No definido")
PUBLIC_DOMAIN = os.getenv("RAILWAY_PUBLIC_DOMAIN", "No definido")
SUPABASE_URL = os.getenv("SUPABASE_URL", "No definido")

logger.info(f"📋 Variables de Entorno:")
logger.info(f"   PORT: {PORT}")
logger.info(f"   RAILWAY_ENVIRONMENT_NAME: {ENV_NAME}")
logger.info(f"   RAILWAY_REGION: {REGION}")
logger.info(f"   RAILWAY_PUBLIC_DOMAIN: {PUBLIC_DOMAIN}")
logger.info(f"   SUPABASE_URL: {SUPABASE_URL[:30]}..." if SUPABASE_URL != "No definido" else f"   SUPABASE_URL: {SUPABASE_URL}")
logger.info(f"   Python Version: {sys.version.split()[0]}")
logger.info(f"   Working Directory: {os.getcwd()}")

# Validar configuración crítica
missing_vars = []
if SUPABASE_URL == "No definido":
    missing_vars.append("SUPABASE_URL")
if os.getenv("SUPABASE_ANON_KEY") is None:
    missing_vars.append("SUPABASE_ANON_KEY")
if os.getenv("SUPABASE_SERVICE_ROLE_KEY") is None:
    missing_vars.append("SUPABASE_SERVICE_ROLE_KEY")

if missing_vars:
    logger.warning(f"⚠️  Variables de entorno faltantes: {', '.join(missing_vars)}")
else:
    logger.info("✅ Todas las variables críticas están configuradas")

logger.info("=" * 60)

app = FastAPI(
    title="Sistema Cactario Casa Molle",
    version="1.0.0",
    description="API para gestión de cactáceas - Casa Molle"
)

# Permitir el origen del frontend - configuración dinámica por entorno
origins = []

# Desarrollo local - siempre agregar localhost para desarrollo
# Esto permite trabajar localmente incluso si ENVIRONMENT=production
origins.extend([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
])

# Producción - usar variables de entorno
# Frontend domain desde variable de entorno (recomendado)
frontend_domain = os.getenv("FRONTEND_DOMAIN")
if frontend_domain:
    # Remover protocolo si está incluido
    domain = frontend_domain.replace("https://", "").replace("http://", "")
    origins.append(f"https://{domain}")
    origins.append(f"http://{domain}")

# Railway - usar dominio público automáticamente
railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
if railway_domain:
    # Remover protocolo si está incluido
    domain = railway_domain.replace("https://", "").replace("http://", "")
    origins.append(f"https://{domain}")
    origins.append(f"http://{domain}")

# CORS adicional desde variable de entorno (separado por comas)
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    additional_origins = [origin.strip() for origin in cors_origins_env.split(",")]
    origins.extend(additional_origins)

# Agregar dominio del frontend de Railway si está disponible
# Railway proporciona el dominio del servicio actual, pero necesitamos el del frontend
# Si el frontend está en un servicio separado, debe configurarse en FRONTEND_DOMAIN o CORS_ORIGINS
frontend_railway = os.getenv("FRONTEND_RAILWAY_DOMAIN")
if frontend_railway:
    domain = frontend_railway.replace("https://", "").replace("http://", "")
    origins.append(f"https://{domain}")

# Filtrar strings vacíos de la lista
origins = [origin for origin in origins if origin and origin.strip()]

# Remover duplicados
origins = list(set(origins))

# Log de configuración CORS
logger.info("🌐 Configuración CORS:")
logger.info(f"   Orígenes permitidos: {len(origins)} dominios")
for origin in origins:
    logger.info(f"      - {origin}")

# IMPORTANTE: CORS debe ir ANTES del middleware de autenticación
logger.info("🔧 Configurando middlewares...")

# Permitir ngrok y Railway: usar allow_origin_regex para dominios dinámicos
# Permite CUALQUIER dominio de ngrok y Railway
ngrok_regex = r"https://.*\.ngrok.*"
railway_regex = r"https://.*\.railway\.app"  # Permitir todos los dominios de Railway

# Combinar regex en una sola expresión
combined_regex = f"({ngrok_regex}|{railway_regex})"

# Asegurarse de que el frontend de Railway esté en la lista de orígenes permitidos
# Si no está explícitamente, el regex lo cubrirá, pero es mejor tenerlo explícito
if "https://cactario-frontend-production.up.railway.app" not in origins:
    origins.append("https://cactario-frontend-production.up.railway.app")
    logger.info("   ➕ Agregado explícitamente: https://cactario-frontend-production.up.railway.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=combined_regex,  # Permitir dominios de ngrok y Railway con regex
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],  # Todos los métodos HTTP comunes
    allow_headers=["*"],  # Permitir todos los headers (FastAPI acepta "*" aquí)
    expose_headers=["*"],
)
logger.info("   ✅ CORSMiddleware configurado con soporte para ngrok y Railway")

# Add authentication middleware AFTER CORS
app.add_middleware(AuthMiddleware)
logger.info("   ✅ AuthMiddleware configurado")

logger.info("📡 Registrando rutas de API...")
app.include_router(routes_auth.router,    prefix="/auth",    tags=["Auth"])
logger.info("   ✅ /auth/* - Rutas de autenticación")
app.include_router(routes_species.router, prefix="/species", tags=["Species"])
logger.info("   ✅ /species/* - Rutas de especies")
app.include_router(routes_sectors.router, prefix="/sectors", tags=["Sectors"])
logger.info("   ✅ /sectors/* - Rutas de sectores")
app.include_router(routes_ejemplar.router, prefix="/ejemplar", tags=["Ejemplar"])
logger.info("   ✅ /ejemplar/* - Rutas de ejemplares (inventario)")
try:
    app.include_router(routes_photos.router, prefix="/photos", tags=["Photos"])
    logger.info("   ✅ /photos/* - Rutas de fotos (genérico)")
except Exception as e:
    logger.error(f"   ❌ Error al registrar rutas de fotos: {e}")
    import traceback
    logger.error(traceback.format_exc())
app.include_router(routes_debug.router, prefix="/debug", tags=["Debug"])
logger.info("   ✅ /debug/* - Rutas de debug")
app.include_router(routes_audit.router, prefix="", tags=["Audit"])
logger.info("   ✅ /audit - Rutas de auditoría")
app.include_router(routes_transactions.router, prefix="/transactions", tags=["Transactions"])
logger.info("   ✅ /transactions/* - Rutas de transacciones (compras y ventas)")

@app.get("/")
def root():
    """Endpoint raíz de la API"""
    logger.debug("Acceso a endpoint raíz /")
    return {"message": "API Cactario Casa Molle funcionando correctamente"}

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway - must return 200 immediately"""
    # Endpoint simple que no depende de servicios externos
    # Railway usa este endpoint para verificar que el servicio está funcionando
    return {
        "status": "ok", 
        "message": "Service is healthy", 
        "service": "Cactario Casa Molle API",
        "version": "1.0.0"
    }

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle preflight OPTIONS requests for CORS"""
    logger.debug(f"OPTIONS request para: /{path}")
    return {"message": "OK"}

# Exception handler para HTTPException - FastAPI ya maneja esto, pero agregamos CORS
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handler para HTTPException que asegura headers CORS.
    FastAPI maneja HTTPException automáticamente, pero este handler asegura CORS.
    """
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    
    # Agregar headers CORS
    origin = request.headers.get("origin")
    if origin:
        import re
        railway_regex = r"https://.*\.railway\.app"
        ngrok_regex = r"https://.*\.ngrok.*"
        if re.match(railway_regex, origin) or re.match(ngrok_regex, origin) or origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Exception handler global solo para excepciones no manejadas (no HTTPException)
# Esto evita interferir con el middleware de CORS de Starlette
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler para excepciones no manejadas.
    Solo captura excepciones que no son HTTPException para evitar interferir con CORS.
    """
    import traceback
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    
    # Crear respuesta de error
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Error interno del servidor: {str(exc)}"}
    )
    
    # Agregar headers CORS explícitamente
    origin = request.headers.get("origin")
    if origin:
        import re
        railway_regex = r"https://.*\.railway\.app"
        ngrok_regex = r"https://.*\.ngrok.*"
        if re.match(railway_regex, origin) or re.match(ngrok_regex, origin) or origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# ============================================================
# MENSAJE DE INICIO COMPLETADO
# ============================================================
logger.info("=" * 60)
logger.info("✅ Servidor FastAPI inicializado correctamente")
logger.info("📚 Documentación disponible en: /docs")
logger.info("🏥 Health endpoint disponible en: /health")
logger.info("🔍 Debug endpoint disponible en: /debug/environment")
logger.info("=" * 60)
