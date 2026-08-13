import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi.testclient import TestClient

from backend.database import Base, engine
from backend.main import app


def login(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_auth_and_board_persistence():
    Base.metadata.drop_all(engine)
    with TestClient(app) as client:
        headers = login(client)
        board = client.get("/api/board", headers=headers).json()
        board["columns"][0]["title"] = "Ideas"
        assert client.put("/api/board", headers=headers, json=board).status_code == 200
        assert client.get("/api/board", headers=headers).json()["columns"][0]["title"] == "Ideas"


def test_invalid_login_is_rejected():
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
        assert response.status_code == 401
