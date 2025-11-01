import os
os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_register_and_login_success():
    # Register new user
    payload = {
        "nome": "Lucas",
        "email": "lucas@example.com",
        "password": "StrongPass!123"
    }
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == payload["email"]
    assert "id" in data

    # Duplicate email should fail with 409
    r2 = client.post("/api/auth/register", json=payload)
    assert r2.status_code == 409

    # Login with the created user
    login_payload = {"email": payload["email"], "password": payload["password"]}
    r3 = client.post("/api/auth/login", json=login_payload)
    assert r3.status_code == 200
    token_data = r3.json()
    assert token_data["token_type"] == "bearer"
    assert token_data["access_token"]

    # Verify token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    r4 = client.get("/api/auth/verify-token", headers=headers)
    assert r4.status_code == 200


def test_login_invalid_password():
    # Create user
    payload = {
        "nome": "Ana",
        "email": "ana@example.com",
        "password": "AnaPass!123"
    }
    client.post("/api/auth/register", json=payload)

    # Wrong password
    r = client.post("/api/auth/login", json={"email": payload["email"], "password": "wrong"})
    assert r.status_code == 401