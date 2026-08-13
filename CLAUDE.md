# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A Kanban-based project management app: Next.js frontend, Python FastAPI backend, packaged into a single Docker container. The backend serves the built frontend as static files. Auth is a single hardcoded user (`user` / `password`) with a session token issued at login.

Review `docs/PLAN.md` before working on any phase of the project.

## Commands

### Frontend (`frontend/`)

```bash
npm install
npm run dev          # dev server
npm run build        # static export to frontend/out/
npm run lint
npm run test:unit    # vitest (single run)
npm run test:unit:watch
npm run test:e2e     # playwright
npm run test:all
```

### Backend

The backend uses `uv` inside Docker. For local testing install deps with pip into a venv:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload   # run from repo root
```

Backend tests (from repo root):

```bash
python -m pytest backend/tests/
python -m pytest backend/tests/test_api.py::test_auth_and_board_persistence   # single test
```

Frontend single test:

```bash
npx vitest run -t "test name"          # single vitest test by name
npx playwright test tests/kanban.spec.ts   # single e2e spec
```

### Docker

```bash
# Windows
scripts\start.ps1
scripts\stop.ps1

# Mac/Linux
bash scripts/start.sh
bash scripts/stop.sh
```

Or directly:

```bash
docker build -t pm-app .
docker run -p 8000:8000 --env-file .env pm-app
```

The `.env` file in the project root must contain `OPENROUTER_API_KEY`.

## Architecture

### Request flow

Browser → FastAPI (`backend/main.py`) → SQLite (`data/pm.db`)

- `POST /api/auth/login` — validates credentials, returns a `SESSION_TOKEN` (generated fresh each server start, in-memory only).
- `GET /api/board` / `PUT /api/board` — load and save the board JSON for the authenticated user.
- `POST /api/chat` — sends user message + board state + history to OpenRouter (`openai/gpt-oss-120b`, forced JSON output), applies returned actions to the board via `apply_actions()`, persists updated board and chat history (last 10 messages sent as context).
- Static frontend files are served from `frontend/out/` by FastAPI's `StaticFiles` + a catch-all route.

### Backend modules

| File | Role |
|---|---|
| `backend/main.py` | FastAPI app, all routes, `apply_actions()` logic |
| `backend/database.py` | SQLAlchemy models (`User`, `Board`, `ChatMessage`), `init_db()`, default board seed |
| `backend/schemas.py` | Pydantic models for request/response validation |
| `backend/ai_service.py` | `call_ai()` — OpenRouter HTTP call, returns `(message, actions)` |

The AI's action vocabulary (`apply_actions()` in `main.py`) is fixed: `create_card`, `update_card`, `delete_card`, `move_card`, `rename_column`. The system prompt in `ai_service.py` enumerates these for the model; extending the AI's capabilities means updating both the prompt and `apply_actions()` together.

### Database

SQLite at `data/pm.db` (or `DATABASE_URL` env var). Created automatically on startup. Three tables: `users`, `boards` (one per user, board state stored as JSON text), `chat_messages` (compact AI conversation history per board).

### Frontend structure

- `src/app/` — Next.js App Router pages (`page.tsx`, `layout.tsx`)
- `src/components/` — `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `KanbanCardPreview`, `NewCardForm`
- `src/lib/kanban.ts` — shared board logic utilities
- Drag-and-drop via `@dnd-kit`; styling via Tailwind CSS v4

The frontend is exported as a static site (`next build` → `out/`), so it cannot use Next.js server-side features.

## Color scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991`
- Dark Navy: `#032147`
- Gray Text: `#888888`

## Coding standards

- No over-engineering. No extra features beyond what is specified.
- No emojis anywhere.
- Identify root cause before fixing. Never guess; prove with evidence.
- Latest library versions and idiomatic patterns.
- Keep READMEs minimal.
