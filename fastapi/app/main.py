from fastapi import FastAPI
from app.api import routes_species, routes_sectors, routes_auth, routes_debug

app = FastAPI(title="Sistema Cactario Casa Molle")

app.include_router(routes_auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(routes_species.router, prefix="/species", tags=["Species"])
app.include_router(routes_sectors.router, prefix="/sectors", tags=["Sectors"])
app.include_router(routes_debug.router, prefix="/debug", tags=["Debug"])

@app.get("/")
def root():
    return {"message": "API Cactario Casa Molle funcionando correctamente"}
