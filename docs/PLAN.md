# High level steps for project

The project will be built in ten clear phases. Each phase includes implementation steps, tests, and success criteria. Part 1 is the planning phase and must be approved before development continues.

**Status: Parts 1-10 are complete.** Checkboxes below were verified against the current codebase (tests run, `docker build`/`docker run` exercised live) rather than assumed — see `docs/code_review.md` for known open issues that don't block phase completion.

## Part 1: Plan

Goal: document the full work plan and capture the current frontend architecture.

Checklist:
- [x] Review the existing frontend code in `frontend/`.
- [x] Create `frontend/AGENTS.md` describing the current frontend app and how it evolves.
- [x] Expand this `docs/PLAN.md` with step-by-step substeps, tests, and success criteria.
- [x] Confirm the plan with the user before changing code beyond Part 1.

Tests / success criteria:
- The plan is complete and actionable for each phase.
- The plan includes a clear Phase 1 acceptance check.
- The frontend agent doc exists and accurately reflects current files.
- The user approves the plan before proceeding.

## Part 2: Scaffolding

Goal: add backend scaffolding, Docker support, and basic app serving.

Checklist:
- [x] Create `backend/` with a FastAPI app.
- [x] Add Docker files that build the backend and frontend into a single container (`Dockerfile`, `docker-compose.yml`).
- [x] Add `scripts/start.ps1`, `scripts/stop.ps1`, and equivalent shell scripts.
- [x] Add a minimal API route (`GET /health`).
- [x] Add a static HTML route or static file to confirm the app can serve content (catch-all static route in `backend/main.py`).
- [x] Verify the Docker container can start and serve a page at `/`.
- [x] Verify the backend can answer an example API call.

Tests / success criteria:
- `docker build` succeeds. *(Verified directly: `docker build -t pm-app .` completes clean.)*
- Container responds with HTML on `/`. *(Verified directly: `curl http://localhost:8000/` returns the Next.js page.)*
- Container responds to `/health` with a valid JSON payload. *(Verified directly: returns `{"status":"ok"}`.)*
- Start/stop scripts successfully run the service locally.

## Part 3: Add in Frontend

Goal: integrate the existing Next.js frontend build into the backend container and serve the Kanban UI from `/`.

Checklist:
- [x] Build the frontend as a static app using `npm run build`.
- [x] Configure the backend to serve the built frontend files (`frontend/out/` mounted in `backend/main.py`).
- [x] Ensure `frontend/` remains the canonical source for the app UI.
- [x] Keep the existing Kanban board UI unchanged in behavior.
- [x] Add or update tests to verify the rendered board page loads.

Tests / success criteria:
- `frontend` builds successfully with `npm run build`. *(Verified directly.)*
- App home page renders the Kanban board when the container is running. *(Verified directly against a running container.)*
- Frontend unit tests cover the current board logic (`kanban.test.ts`, `KanbanBoard.test.tsx`, `KanbanColumn.test.tsx`, and the AI-chat/login-related component tests).
- At least one integration test confirms the frontend page loads successfully (`frontend/tests/kanban.spec.ts`).

## Part 4: Add in a fake user sign in experience

Goal: require dummy credentials before showing the Kanban board.

Checklist:
- [x] Add a login UI (`frontend/src/components/Login.tsx`).
- [x] Accept only `user` / `password` (`backend/database.py` seeds this one user; `POST /api/auth/login` checks it).
- [x] Implement frontend state for logged-in status (`AppShell.tsx`, session token in `sessionStorage`).
- [x] Add logout functionality.
- [x] Keep the board hidden until signed in.
- [x] Add unit and integration tests for login and logout (`Login.test.tsx`, `AppShell.test.tsx`, e2e `signIn` flow in `kanban.spec.ts`).

Tests / success criteria:
- The home page shows a login flow when the user is not signed in.
- Correct credentials unlock the Kanban board.
- Incorrect credentials are rejected (`test_invalid_login_is_rejected`, `Login.test.tsx`).
- Logged-in state persists for the current session while on the page.
- Tests cover the login flow and board visibility.

## Part 5: Database modeling

Goal: define the Kanban data model and document it in `docs/`.

Checklist:
- [x] Propose a simple schema for users, boards, columns, and cards.
- [x] Store the Kanban board state as JSON in SQLite.
- [x] Document the schema design in `docs/DATABASE.md`.
- [x] Review the schema with the user and get approval before coding.

Tests / success criteria:
- The database schema is documented clearly.
- The schema supports multiple users and one board per user.
- The schema is easy to read and implement in SQLite.
- User approves the schema before Part 6 begins.

## Part 6: Backend

Goal: add API routes for user-specific Kanban persistence.

Checklist:
- [x] Add backend user session or request context support (bearer session token, `current_user` dependency).
- [x] Add routes to read and update the current user's Kanban board (`GET`/`PUT /api/board`).
- [x] Ensure the database is created automatically if absent (`init_db()` on startup).
- [x] Add backend unit tests for API routes and database logic (`backend/tests/`).
- [x] Keep the dummy auth model simple and local.

Tests / success criteria:
- Backend returns saved Kanban data for the signed-in user.
- Backend accepts updates to board data and persists them.
- The database file is created automatically on first run. *(Verified directly against a running container.)*
- Backend logic is covered by unit tests. *(16 tests in `backend/tests/`, all passing.)*

## Part 7: Frontend + Backend

Goal: make the frontend load and save the board via backend APIs.

Checklist:
- [x] Replace in-memory board state with API calls (`frontend/src/lib/api.ts`).
- [x] Load the board after login from `/api/board`.
- [x] Save card moves and edits via backend API endpoints.
- [x] Add frontend tests for the API integration layer (`AppShell.test.tsx` covers the `api.board()`/`api.login()` integration points; `api.ts` itself is a thin fetch wrapper exercised through them).
- [x] Add end-to-end verification for the full persisted flow (`frontend/tests/kanban.spec.ts`).

Tests / success criteria:
- The board persists between page refreshes (backend-backed state).
- Card changes are reflected in the database after API calls. *(Verified directly: login, then `GET /api/board`, against a running container.)*
- E2E tests cover login, load, change, refresh, and persistence.
- The frontend and backend together behave as a complete app.

## Part 8: AI connectivity

Goal: verify the backend can call OpenRouter.

Checklist:
- [x] Add OpenRouter connectivity to `backend/` (`backend/ai_service.py`).
- [x] Use `OPENROUTER_API_KEY` from `.env` for the backend.
- [ ] ~~Add a simple `/api/ai/ping` or `/api/ai/test` endpoint.~~ Superseded — the project went straight to the full `/api/chat` integration (Part 9/10) instead of adding a throwaway ping endpoint first. No `/api/ai/*` route exists, by design.
- [x] Verify an AI request returns a valid response *(exercised via `/api/chat`, not a standalone `2+2` ping endpoint)*.
- [x] Add backend tests that mock the OpenRouter call (`test_chat_endpoint_returns_502_when_ai_returns_invalid_action_data` and others patch `backend.main.call_ai`).

Tests / success criteria:
- The AI endpoint returns a valid response from OpenRouter.
- The backend can use the environment key securely.
- Test coverage includes the AI call integration path.

## Part 9: Structured AI payloads

Goal: send the current board plus user input to the AI and parse structured output.

Checklist:
- [x] Add an AI request payload that includes board JSON and user question (`call_ai()` in `backend/ai_service.py`).
- [x] Add conversation history support in the backend request (last 10 `chat_messages` sent as context).
- [x] Parse structured output from the AI response (forced JSON response format, parsed in `call_ai()`).
- [x] Allow the AI to include an optional board update in the response (`actions` array applied via `apply_actions()`).
- [x] Add tests that verify structured output parsing and conditional board updates (`backend/tests/test_apply_actions.py`).

Tests / success criteria:
- The backend sends board JSON and user text to the AI.
- The backend can detect and apply an AI-suggested board update.
- Tests cover both user-only responses and AI-triggered board changes.
- The AI API contract is documented for frontend usage (see "Backend modules" / action vocabulary in root `CLAUDE.md`).

## Part 10: AI chat UI

Goal: add a polished sidebar chat widget and connect it to the AI backend.

Checklist:
- [x] Add a sidebar chat panel next to the Kanban board (`ChatSidebar.tsx`).
- [x] Allow users to send chat messages to the AI.
- [x] Display AI text responses in the chat UI.
- [x] If the AI returns a board update, refresh the Kanban UI automatically (`AppShell.tsx`'s `onSend` calls `setBoard(result.board)`).
- [x] Add tests for the chat UI and AI update flow (`ChatSidebar.test.tsx`).

Tests / success criteria:
- Users can send messages and receive AI replies in the UI.
- Board changes returned by the AI are immediately visible.
- The chat UI is stable and usable on desktop screens.
- Integration tests confirm the end-to-end AI-assisted workflow.
