# Frontend AGENTS.md

## Purpose

This file describes the frontend as it exists today. See root `CLAUDE.md` for the authoritative, actively-maintained architecture reference — this file gives a shorter orientation specific to `frontend/`.

## What exists today

- `src/app/page.tsx` / `src/app/layout.tsx`
  - Renders `AppShell` as the home page, with global layout/font styling.
- `src/components/AppShell.tsx`
  - Top-level app state: session check on mount, login, board load/save, and the corrupted-board (`409`) screen. Chooses between the loading state, the corrupted-board screen, `Login`, and the signed-in board+chat layout.
- `src/components/Login.tsx`
  - Login form (`user` / `password`), shows an error on rejected credentials.
- `src/components/KanbanBoard.tsx`
  - Board container: drag-and-drop context (`@dnd-kit`), card/column mutation handlers, delegates persistence to `AppShell` via `onChange`.
- `src/components/KanbanColumn.tsx`
  - Single column: renders cards, debounces title-rename saves (500ms, flushed on blur), and cancels a pending debounced rename if the column's title changes externally (e.g. an AI-driven rename) so a stale keystroke can't overwrite it.
- `src/components/KanbanCard.tsx` / `KanbanCardPreview.tsx`
  - Card display/edit UI and the `DragOverlay` preview shown while dragging.
- `src/components/NewCardForm.tsx`
  - Inline form to create a new card in a column.
- `src/components/ChatSidebar.tsx`
  - AI chat panel; sends messages via the `onSend` prop and renders the conversation.
- `src/lib/api.ts`
  - Thin `fetch` wrapper (`api.login`/`api.board`/`api.saveBoard`/`api.chat`); throws `ApiError` (carries the HTTP status) on non-2xx responses so callers can distinguish e.g. a `409` corrupted-board response from an auth failure.
- `src/lib/kanban.ts`
  - Shared board types and pure logic (`moveCard`, `createId`).
- Unit tests (`vitest`, colocated `*.test.ts(x)`): `kanban.test.ts`, `KanbanBoard.test.tsx`, `KanbanColumn.test.tsx`, `Login.test.tsx`, `AppShell.test.tsx`, `ChatSidebar.test.tsx`.
- `frontend/tests/kanban.spec.ts`
  - Playwright e2e: login, load, add a card, drag a card between columns.

## Existing behavior

The frontend is a fully backend-integrated Next.js app, statically exported (`next build` → `out/`) and served by the FastAPI backend. It cannot use Next.js server-side features. Auth state lives in `sessionStorage` (a bearer token); board state is loaded from and saved to the backend on every mutation.

## Notes for the agent

- Preserve the static-export constraint — no Next.js server features.
- Keep `frontend/` the canonical source for the app UI; `frontend/out/` is a build artifact.
- Known open issues (not blocking, tracked for follow-up) are listed in `docs/code_review.md`.
