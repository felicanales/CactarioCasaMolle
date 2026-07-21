from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import routes_species
from app.middleware.auth_middleware import get_current_user


app = FastAPI()
app.include_router(routes_species.router, prefix="/species")
app.dependency_overrides[get_current_user] = lambda: {
    "id": "qa-user",
    "email": "qa@example.com",
}
client = TestClient(app)


def test_public_species_rejects_negative_limit():
    response = client.get("/species/public?limit=-1")
    assert response.status_code == 422


def test_staff_species_rejects_negative_limit():
    response = client.get("/species/staff?limit=-1")
    assert response.status_code == 422
