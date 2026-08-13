import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import backend.database as db_module

_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
db_module.engine = _engine
db_module.SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)

from fastapi.testclient import TestClient

from backend.database import Base, init_db
from backend.main import app


def login(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_auth_and_board_persistence():
    Base.metadata.drop_all(_engine)
    init_db()
    with TestClient(app) as client:
        headers = login(client)
        board = client.get("/api/board", headers=headers).json()
        board["columns"][0]["title"] = "Ideas"
        assert client.put("/api/board", headers=headers, json=board).status_code == 200
        assert client.get("/api/board", headers=headers).json()["columns"][0]["title"] == "Ideas"


def test_invalid_login_is_rejected():
    Base.metadata.drop_all(_engine)
    init_db()
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
        assert response.status_code == 401
