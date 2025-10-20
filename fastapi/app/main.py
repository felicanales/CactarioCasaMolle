from fastapi import FastAPI
from app.api import routes_species, routes_sectors, routes_auth, routes_debug
from app.middleware.auth_middleware import AuthMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Sistema Cactario Casa Molle")

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

# Log de orígenes permitidos para debugging
print(f"CORS Origins configured: {origins}")

# IMPORTANTE: CORS debe ir ANTES del middleware de autenticación
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*", "X-CSRF-Token", "Authorization", "Content-Type"],
    expose_headers=["*"],
)

# Add authentication middleware AFTER CORS
app.add_middleware(AuthMiddleware)

app.include_router(routes_auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(routes_species.router, prefix="/species", tags=["Species"])
app.include_router(routes_sectors.router, prefix="/sectors", tags=["Sectors"])
app.include_router(routes_debug.router, prefix="/debug", tags=["Debug"])

@app.get("/")
def root():
    return {"message": "API Cactario Casa Molle funcionando correctamente"}

@app.get("/health")
def health_check():
    """Health check endpoint for Railway - must return 200 immediately"""
    import time
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
    return {"message": "OK"}
