# High level steps for project

The project will be built in ten clear phases. Each phase includes implementation steps, tests, and success criteria. Part 1 is the planning phase and must be approved before development continues.

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
- [ ] Create `backend/` with a minimal FastAPI app.
- [ ] Add Docker files that build the backend and frontend into a single container.
- [ ] Add `scripts/start.ps1`, `scripts/stop.ps1`, and equivalent shell scripts if desired.
- [ ] Add a minimal API route such as `/health` or `/api/ping`.
- [ ] Add a static HTML route or static file to confirm the app can serve content.
- [ ] Verify the Docker container can start and serve a page at `/`.
- [ ] Verify the backend can answer an example API call.

Tests / success criteria:
- `docker build` succeeds.
- Container responds with HTML on `/`.
- Container responds to `/api/ping` or `/health` with a valid JSON payload.
- Start/stop scripts successfully run the service locally.

## Part 3: Add in Frontend

Goal: integrate the existing Next.js frontend build into the backend container and serve the Kanban UI from `/`.

Checklist:
- [ ] Build the frontend as a static app using `npm run build`.
- [ ] Configure the backend to serve the built frontend files.
- [ ] Ensure `frontend/` remains the canonical source for the app UI.
- [ ] Keep the existing Kanban board UI unchanged in behavior.
- [ ] Add or update tests to verify the rendered board page loads.

Tests / success criteria:
- `frontend` builds successfully with `npm run build`.
- App home page renders the Kanban board when the container is running.
- Frontend unit test coverage is at least 80% for the current board logic.
- At least one integration test confirms the frontend page loads successfully.

## Part 4: Add in a fake user sign in experience

Goal: require dummy credentials before showing the Kanban board.

Checklist:
- [ ] Add a login UI either as a separate page or a modal.
- [ ] Accept only `user` / `password`.
- [ ] Implement frontend state for logged-in status.
- [ ] Add logout functionality.
- [ ] Keep the board hidden until signed in.
- [ ] Add unit and integration tests for login and logout.

Tests / success criteria:
- The home page shows a login flow when the user is not signed in.
- Correct credentials unlock the Kanban board.
- Incorrect credentials are rejected.
- Logged-in state persists for the current session while on the page.
- Tests cover the login flow and board visibility.

## Part 5: Database modeling

Goal: define the Kanban data model and document it in `docs/`.

Checklist:
- [ ] Propose a simple schema for users, boards, columns, and cards.
- [ ] Store the Kanban board state as JSON in SQLite.
- [ ] Document the schema design in a new `docs/DATABASE.md` or within `docs/PLAN.md`.
- [ ] Review the schema with the user and get approval before coding.

Tests / success criteria:
- The database schema is documented clearly.
- The schema supports multiple users and one board per user.
- The schema is easy to read and implement in SQLite.
- User approves the schema before Part 6 begins.

## Part 6: Backend

Goal: add API routes for user-specific Kanban persistence.

Checklist:
- [ ] Add backend user session or request context support.
- [ ] Add routes to read and update the current user's Kanban board.
- [ ] Ensure the database is created automatically if absent.
- [ ] Add backend unit tests for API routes and database logic.
- [ ] Keep the dummy auth model simple and local.

Tests / success criteria:
- Backend returns saved Kanban data for the signed-in user.
- Backend accepts updates to board data and persists them.
- The database file is created automatically on first run.
- Backend logic is covered by unit tests.

## Part 7: Frontend + Backend

Goal: make the frontend load and save the board via backend APIs.

Checklist:
- [ ] Replace in-memory board state with API calls.
- [ ] Load the board after login from `/api/board`.
- [ ] Save card moves and edits via backend API endpoints.
- [ ] Add frontend tests for the API integration layer.
- [ ] Add end-to-end verification for the full persisted flow.

Tests / success criteria:
- The board persists between page refreshes (backend-backed state).
- Card changes are reflected in the database after API calls.
- E2E tests cover login, load, change, refresh, and persistence.
- The frontend and backend together behave as a complete app.

## Part 8: AI connectivity

Goal: verify the backend can call OpenRouter.

Checklist:
- [ ] Add OpenRouter connectivity to `backend/`.
- [ ] Use `OPENROUTER_API_KEY` from `.env` for the backend.
- [ ] Add a simple `/api/ai/ping` or `/api/ai/test` endpoint.
- [ ] Verify an AI request returns a valid response for `2+2`.
- [ ] Add backend tests that mock the OpenRouter call.

Tests / success criteria:
- The AI endpoint returns a valid response from OpenRouter.
- The backend can use the environment key securely.
- Test coverage includes the AI call integration path.

## Part 9: Structured AI payloads

Goal: send the current board plus user input to the AI and parse structured output.

Checklist:
- [ ] Add an AI request payload that includes board JSON and user question.
- [ ] Add conversation history support in the backend request.
- [ ] Parse structured output from the AI response.
- [ ] Allow the AI to include an optional board update in the response.
- [ ] Add tests that verify structured output parsing and conditional board updates.

Tests / success criteria:
- The backend sends board JSON and user text to the AI.
- The backend can detect and apply an AI-suggested board update.
- Tests cover both user-only responses and AI-triggered board changes.
- The AI API contract is documented for frontend usage.

## Part 10: AI chat UI

Goal: add a polished sidebar chat widget and connect it to the AI backend.

Checklist:
- [ ] Add a sidebar chat panel next to the Kanban board.
- [ ] Allow users to send chat messages to the AI.
- [ ] Display AI text responses in the chat UI.
- [ ] If the AI returns a board update, refresh the Kanban UI automatically.
- [ ] Add tests for the chat UI and AI update flow.

Tests / success criteria:
- Users can send messages and receive AI replies in the UI.
- Board changes returned by the AI are immediately visible.
- The chat UI is stable and usable on desktop screens.
- Integration tests confirm the end-to-end AI-assisted workflow.
