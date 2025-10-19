from fastapi import FastAPI
from app.api import routes_species, routes_sectors, routes_auth, routes_debug
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Sistema Cactario Casa Molle")

# Permitir el origen del frontend - configuración dinámica por entorno
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://cactario-casa-molle.vercel.app",  # Tu dominio de Vercel
    "https://*.vercel.app",  # Cualquier subdominio de Vercel
    "https://*.railway.app",  # Cualquier subdominio de Railway
    "https://cactario-casa-molle-production.up.railway.app"  # Tu dominio de Railway
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
    allow_origins=origins,  # Origenes permitidos
    allow_credentials=True,
    allow_methods=["*"],    # Métodos permitidos (GET, POST, etc.)
    allow_headers=["*"],    # Encabezados permitidos
)

app.include_router(routes_auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(routes_species.router, prefix="/species", tags=["Species"])
app.include_router(routes_sectors.router, prefix="/sectors", tags=["Sectors"])
app.include_router(routes_debug.router, prefix="/debug", tags=["Debug"])

@app.get("/")
def root():
    return {"message": "API Cactario Casa Molle funcionando correctamente"}
