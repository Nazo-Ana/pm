import json
import os
from unittest.mock import patch

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

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.database import Base, Board, User, init_db
from backend.main import app, apply_actions
from backend.schemas import BoardData


def make_board() -> BoardData:
    return BoardData.model_validate(
        {
            "columns": [
                {"id": "col-a", "title": "A", "cardIds": ["card-1"]},
                {"id": "col-b", "title": "B", "cardIds": []},
            ],
            "cards": {"card-1": {"id": "card-1", "title": "First", "details": "Some details"}},
        }
    )


def login(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_create_card_adds_card_and_column_reference():
    result = apply_actions(make_board(), [{"action": "create_card", "column_id": "col-b", "title": "New", "details": "d"}])
    new_ids = result.columns[1].cardIds
    assert len(new_ids) == 1
    assert result.cards[new_ids[0]].title == "New"


def test_create_card_ignored_without_title():
    result = apply_actions(make_board(), [{"action": "create_card", "column_id": "col-b", "title": "   "}])
    assert result.columns[1].cardIds == []


def test_create_card_ignored_for_unknown_column():
    result = apply_actions(make_board(), [{"action": "create_card", "column_id": "col-missing", "title": "New"}])
    assert result == make_board()


def test_update_card_title_and_details():
    result = apply_actions(make_board(), [{"action": "update_card", "card_id": "card-1", "title": "Renamed", "details": "Updated"}])
    assert result.cards["card-1"].title == "Renamed"
    assert result.cards["card-1"].details == "Updated"


def test_update_card_null_details_clears_instead_of_stringifying():
    result = apply_actions(make_board(), [{"action": "update_card", "card_id": "card-1", "details": None}])
    assert result.cards["card-1"].details == ""


def test_delete_card_removes_from_cards_and_columns():
    result = apply_actions(make_board(), [{"action": "delete_card", "card_id": "card-1"}])
    assert "card-1" not in result.cards
    assert result.columns[0].cardIds == []


def test_move_card_between_columns_with_position():
    board = BoardData.model_validate(
        {
            "columns": [
                {"id": "col-a", "title": "A", "cardIds": ["card-1", "card-2"]},
                {"id": "col-b", "title": "B", "cardIds": []},
            ],
            "cards": {
                "card-1": {"id": "card-1", "title": "First", "details": ""},
                "card-2": {"id": "card-2", "title": "Second", "details": ""},
            },
        }
    )
    result = apply_actions(board, [{"action": "move_card", "card_id": "card-1", "column_id": "col-b", "position": 0}])
    assert result.columns[0].cardIds == ["card-2"]
    assert result.columns[1].cardIds == ["card-1"]


def test_move_card_treats_boolean_position_as_no_position():
    board = BoardData.model_validate(
        {
            "columns": [
                {"id": "col-a", "title": "A", "cardIds": ["card-1", "card-2", "card-3"]},
            ],
            "cards": {
                "card-1": {"id": "card-1", "title": "One", "details": ""},
                "card-2": {"id": "card-2", "title": "Two", "details": ""},
                "card-3": {"id": "card-3", "title": "Three", "details": ""},
            },
        }
    )
    result = apply_actions(board, [{"action": "move_card", "card_id": "card-3", "column_id": "col-a", "position": True}])
    assert result.columns[0].cardIds == ["card-1", "card-2", "card-3"]


def test_move_card_ignored_for_unknown_card():
    result = apply_actions(make_board(), [{"action": "move_card", "card_id": "missing", "column_id": "col-b"}])
    assert result == make_board()


def test_rename_column():
    result = apply_actions(make_board(), [{"action": "rename_column", "column_id": "col-a", "title": "Renamed"}])
    assert result.columns[0].title == "Renamed"


def test_oversized_title_raises_validation_error():
    with pytest.raises(ValidationError):
        apply_actions(make_board(), [{"action": "create_card", "column_id": "col-b", "title": "x" * 250}])


def test_chat_endpoint_returns_502_when_ai_returns_invalid_action_data():
    Base.metadata.drop_all(_engine)
    init_db()
    with TestClient(app) as client:
        headers = login(client)
        with patch("backend.main.call_ai", return_value=("ok", [{"action": "create_card", "column_id": "col-backlog", "title": "x" * 250}])):
            response = client.post("/api/chat", headers=headers, json={"message": "hi"})
        assert response.status_code == 502


def test_save_board_rejects_dangling_card_reference():
    Base.metadata.drop_all(_engine)
    init_db()
    with TestClient(app) as client:
        headers = login(client)
        board = client.get("/api/board", headers=headers).json()
        board["columns"][0]["cardIds"].append("ghost-card")
        response = client.put("/api/board", headers=headers, json=board)
        assert response.status_code == 422


def test_get_board_and_chat_return_409_for_corrupted_stored_board():
    Base.metadata.drop_all(_engine)
    init_db()
    with TestClient(app) as client:
        headers = login(client)

        # Seed a board row with a dangling card reference directly into the
        # DB, bypassing BoardData validation (as if it had been written
        # before the cross-reference check existed).
        with db_module.SessionLocal() as session:
            user = session.query(User).filter_by(username="user").first()
            board_row = session.query(Board).filter_by(user_id=user.id).first()
            board_row.data = json.dumps(
                {
                    "columns": [{"id": "col-a", "title": "A", "cardIds": ["ghost-card"]}],
                    "cards": {},
                }
            )
            session.commit()

        get_response = client.get("/api/board", headers=headers)
        assert get_response.status_code == 409
        assert get_response.json()["detail"] == "board_data_invalid"

        chat_response = client.post("/api/chat", headers=headers, json={"message": "hi"})
        assert chat_response.status_code == 409
        assert chat_response.json()["detail"] == "board_data_invalid"
