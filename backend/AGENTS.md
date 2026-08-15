# Backend AGENTS.md

## Purpose

This file describes the backend architecture as it exists today. See root `CLAUDE.md` for the authoritative, actively-maintained architecture reference — this file gives a shorter orientation specific to `backend/`.

## What exists today

- `backend/main.py`
  - FastAPI application: session-token auth, board CRUD, AI chat, and static frontend serving.
  - Routes: `GET /health`, `POST /api/auth/login`, `GET /api/board`, `PUT /api/board`, `POST /api/chat`, plus a catch-all static route that serves `frontend/out/`.
  - `apply_actions()` interprets the AI's action vocabulary (`create_card`, `update_card`, `delete_card`, `move_card`, `rename_column`) against the board.
  - `load_board()` wraps stored-board deserialization and returns `409 board_data_invalid` instead of a raw 500 if the stored JSON fails validation.
- `backend/database.py`
  - SQLAlchemy models (`User`, `Board`, `ChatMessage`), `init_db()`, and the default five-column board seed.
- `backend/schemas.py`
  - Pydantic request/response models. `BoardData` validates that every `cardIds` entry exists in `cards` and that no card id is referenced by more than one column.
- `backend/ai_service.py`
  - `call_ai()`: builds the system prompt (including the action vocabulary and field length limits) and calls OpenRouter (`openai/gpt-oss-120b`, forced JSON output).
- `backend/tests/`
  - `test_api.py`: auth and board-persistence integration tests.
  - `test_apply_actions.py`: unit tests for `apply_actions()` and the board-validation boundary (dangling references, duplicate references, oversized fields, corrupted-board 409s).
- `backend/requirements.txt`
  - `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `pydantic`, `requests`, `python-dotenv`.

## Existing behavior

The backend is feature-complete for the MVP: single hardcoded user, one board per user, AI chat that can mutate the board, and it serves the built frontend directly so the whole app ships as one Docker container.

## Notes for the agent

- Keep backend APIs simple and explicit.
- The AI's action vocabulary is fixed by design — extending it means updating both the system prompt in `ai_service.py` and `apply_actions()` in `main.py` together (see root `CLAUDE.md`).
- Known open issues (not blocking, tracked for follow-up) are listed in `docs/code_review.md`.
