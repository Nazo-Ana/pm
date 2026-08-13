# Frontend AGENTS.md

## Purpose

This file describes the existing frontend code in `frontend/` and explains how the frontend should evolve during the MVP build.

## What exists today

- `src/app/page.tsx`
  - Renders the existing `KanbanBoard` component as the home page.
- `src/app/layout.tsx`
  - Provides a global HTML layout and font styling.
- `src/components/KanbanBoard.tsx`
  - Main board component.
  - Likely manages board state and renders columns and cards.
- `src/components/KanbanColumn.tsx`
  - Renders a single Kanban column.
- `src/components/KanbanCard.tsx`
  - Renders a single Kanban card.
- `src/components/KanbanCardPreview.tsx`
  - Provides a card preview UI, probably used while dragging.
- `src/components/NewCardForm.tsx`
  - Provides a form to create new cards.
- `src/components/KanbanBoard.test.tsx`
  - Frontend component tests for the Kanban board and interactions.
- `src/lib/kanban.ts`
  - Shared Kanban logic utilities.
- `src/lib/kanban.test.ts`
  - Unit tests for Kanban logic.
- `src/test/setup.ts`
  - Test environment setup for `vitest`.
- `frontend/package.json`
  - Defines Next.js, React, testing, and Tailwind dependencies.

## Existing behavior

The current app is a standalone Next.js frontend that renders the Kanban board. There is no backend integration yet.

## Part 1 goals

For Part 1, this file should help the agent understand:

- The existing app is a static Next.js demo with an in-browser Kanban board.
- The first implementation step is to preserve this behavior while adding tests and Docker/backend scaffolding.
- A future step will replace local board state with API-driven persistence.

## Evolution path

Planned frontend changes after Part 1:

1. Keep the current Kanban board UI and add strong unit test coverage.
2. Add a new login route/page or modal for dummy credentials.
3. Add a session or authentication state wrapper in the frontend.
4. Replace local state with API calls to the backend to load and save the board.
5. Add the AI sidebar chat as a new UI panel that posts user queries to the backend.

## Notes for the agent

- Do not change the frontend behavior in Part 1 except to add test coverage and documentation.
- Preserve the existing Next.js app structure.
- Make sure the plan and implementation keep the app buildable with `npm run build`.
