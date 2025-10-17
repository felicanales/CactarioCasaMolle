from fastapi import FastAPI
from app.api import routes_species, routes_sectors, routes_auth, routes_debug
from fastapi.middleware.cors import CORSMiddleware




app = FastAPI(title="Sistema Cactario Casa Molle")

# Permitir el origen del frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://cactario-casa-molle.vercel.app",  # Tu dominio de Vercel
    "https://*.vercel.app"  # Cualquier subdominio de Vercel
]

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
