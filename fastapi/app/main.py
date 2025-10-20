from fastapi import FastAPI
from app.api import routes_species, routes_sectors, routes_auth, routes_debug
from app.middleware.auth_middleware import AuthMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Sistema Cactario Casa Molle")

# Add authentication middleware
app.add_middleware(AuthMiddleware)

# Permitir el origen del frontend - configuración dinámica por entorno
origins = [
    "http://localhost:3001",  # Frontend en puerto 3001
    "http://127.0.0.1:3001",
    "https://cactario-casa-molle.vercel.app",
    "https://*.vercel.app",
    "https://*.railway.app",
    "https://cactario-casa-molle-production.up.railway.app"
]

# Agregar orígenes desde variables de entorno si existen
if os.getenv("CORS_ORIGINS"):
    origins.extend(os.getenv("CORS_ORIGINS").split(","))

# En producción, permitir el mismo dominio (para Railway)
if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    origins.append(f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN')}")
    origins.append(f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN').replace('https://', '')}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-CSRF-Token"],  # Include CSRF token header
)

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
