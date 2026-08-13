# Backend AGENTS.md

## Purpose

This file describes the backend architecture and how the backend should evolve during the MVP build.

## What exists today

- `backend/main.py`
  - Minimal FastAPI application.
  - Provides `GET /health`, `GET /api/ping`, and a simple HTML landing page at `/`.
- `backend/requirements.txt`
  - Lists `fastapi`, `uvicorn[standard]`, and `python-dotenv`.

## Existing behavior

The backend currently serves a lightweight health check and a static HTML confirmation page. It does not yet integrate with the frontend or any persistence layer.

## Part 2 goals

For Part 2, the backend should:
- Provide a working FastAPI app that can serve a live endpoint.
- Be containerized with Docker.
- Offer a starting point for backend API routes and future persistence.

## Evolution path

Planned backend changes after Part 2:

1. Add core API routes for login, board load, and board save.
2. Add SQLite database support and automatic DB creation.
3. Add AI connectivity via OpenRouter.
4. Add structured output parsing and board update logic.

## Notes for the agent

- Keep backend APIs simple and explicit.
- Use SQLite for persistence in later phases.
- Avoid unnecessary complexity in Part 2: a working app and container is enough.
