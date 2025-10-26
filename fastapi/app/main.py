from fastapi import FastAPI
from app.api import routes_species, routes_sectors, routes_auth, routes_debug
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
origins = [
    "http://localhost:3001",  # Frontend en puerto 3001
    "http://127.0.0.1:3001",
    "http://localhost:3000",  # Frontend alternativo
    "http://127.0.0.1:3000",
    "https://cactario-casa-molle.vercel.app",
    "https://cactario-frontend-production.up.railway.app",  # Frontend Railway
    "https://cactario-backend-production.up.railway.app"    # Backend Railway
]

# Agregar orígenes desde variables de entorno si existen
if os.getenv("CORS_ORIGINS"):
    origins.extend(os.getenv("CORS_ORIGINS").split(","))

# En producción, permitir el mismo dominio (para Railway)
if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    origins.append(f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN')}")
    origins.append(f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN').replace('https://', '')}")

# Remover duplicados
origins = list(set(origins))

# Log de configuración CORS
logger.info("🌐 Configuración CORS:")
logger.info(f"   Orígenes permitidos: {len(origins)} dominios")
for origin in origins:
    logger.info(f"      - {origin}")

# IMPORTANTE: CORS debe ir ANTES del middleware de autenticación
logger.info("🔧 Configurando middlewares...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*", "X-CSRF-Token", "Authorization", "Content-Type"],
    expose_headers=["*"],
)
logger.info("   ✅ CORSMiddleware configurado")

# ========================================
# AUTENTICACIÓN DESACTIVADA - DESARROLLO
# ========================================
# ✅ AuthMiddleware comentado para desarrollo (local y Railway)
# Para reactivar: descomentar la línea de abajo
# app.add_middleware(AuthMiddleware)
# logger.info("   ✅ AuthMiddleware configurado")
logger.info("   ⚠️ AuthMiddleware DESACTIVADO para desarrollo")

logger.info("📡 Registrando rutas de API...")
app.include_router(routes_auth.router,    prefix="/auth",    tags=["Auth"])
logger.info("   ✅ /auth/* - Rutas de autenticación")
app.include_router(routes_species.router, prefix="/species", tags=["Species"])
logger.info("   ✅ /species/* - Rutas de especies")
app.include_router(routes_sectors.router, prefix="/sectors", tags=["Sectors"])
logger.info("   ✅ /sectors/* - Rutas de sectores")
app.include_router(routes_debug.router, prefix="/debug", tags=["Debug"])
logger.info("   ✅ /debug/* - Rutas de debug")

@app.get("/")
def root():
    """Endpoint raíz de la API"""
    logger.debug("Acceso a endpoint raíz /")
    return {"message": "API Cactario Casa Molle funcionando correctamente"}

@app.get("/health")
def health_check():
    """Health check endpoint for Railway - must return 200 immediately"""
    import time
    logger.debug("Healthcheck ejecutado")
    return {
        "status": "ok", 
        "message": "Service is healthy", 
        "timestamp": time.time(),
        "service": "Cactario Casa Molle API",
        "version": "1.0.0"
    }

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle preflight OPTIONS requests for CORS"""
    logger.debug(f"OPTIONS request para: /{path}")
    return {"message": "OK"}

# ============================================================
# MENSAJE DE INICIO COMPLETADO
# ============================================================
logger.info("=" * 60)
logger.info("✅ Servidor FastAPI inicializado correctamente")
logger.info("📚 Documentación disponible en: /docs")
logger.info("🏥 Health endpoint disponible en: /health")
logger.info("🔍 Debug endpoint disponible en: /debug/environment")
logger.info("=" * 60)
