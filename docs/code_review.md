# Code Review

Full review of `backend/` and `frontend/src/`, high effort. Each finding below was reproduced directly (not inferred from reading alone) before being included. Ordered most severe first.

**Status: all 7 findings fixed and committed (`ceb17dc`).** Line numbers below refer to the code as it was at review time, before the fixes.

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | Critical | `backend/main.py:131-137` | Static file route allows path traversal — arbitrary file read from the running container |
| 2 | High | `backend/main.py:46-76` | AI-returned action fields bypass validation until the final `model_validate`, crashing `/api/chat` with an unhandled 500 |
| 3 | Medium | `backend/main.py:61-62` | `update_card` stores the literal string `"None"` when the AI sends `details: null` |
| 4 | Medium | `frontend/src/components/AppShell.tsx:31` | Board saves are fire-and-forget; failed writes are silently lost |
| 5 | Medium | `frontend/src/components/KanbanColumn.tsx:46` | Column rename fires a full-board `PUT` on every keystroke, with no protection against out-of-order responses |
| 6 | Low (UX) | `frontend/src/components/KanbanCardPreview.tsx:11` | Card title is unreadable (dark text on dark background) during drag |
| 7 | Low | `backend/main.py:31` | Session token is compared with `!=` instead of a constant-time comparison |

## Action checklist

- [x] Fix path traversal in the static-file catch-all route (#1)
- [x] Catch validation/model errors around `apply_actions` in `/api/chat` (#2)
- [x] Guard against `None` in `update_card`'s `details` handling (#3)
- [x] Surface board-save failures to the user instead of swallowing them (#4)
- [x] Debounce or commit-on-blur for column rename (#5)
- [x] Fix text color in `KanbanCardPreview` (#6)
- [x] Swap `!=` for `secrets.compare_digest` on the session token check (#7)

---

## 1. Path traversal in static file serving — Critical

**File:** `backend/main.py:131-137`

```python
@app.get("/{path:path}", include_in_schema=False)
def static_app(path: str):
    requested = frontend / path
    if requested.is_file():
        return FileResponse(requested)
    ...
```

The catch-all route joins the raw URL path onto `frontend/out` with no traversal check. Only the `/_next` mount (via `StaticFiles`) gets Starlette's built-in dot-segment protection — this route does not.

**Failure scenario:** A request whose raw path segment contains a literal `..` component (sent with a client that doesn't normalize dot-segments, e.g. `curl --path-as-is`) reaches `static_app`. Verified locally: `Path('frontend/out') / '../../backend/main.py'` resolves and `.is_file()` returns `True`, so `FileResponse` would serve `backend/main.py` — or `data/pm.db` (containing the password and all board data) or `.env` (containing `OPENROUTER_API_KEY`) — straight off disk.

**Recommended fix:** Resolve the joined path and verify it stays inside `frontend`, e.g.:

```python
requested = (frontend / path).resolve()
if requested.is_relative_to(frontend) and requested.is_file():
    return FileResponse(requested)
```

(`Path.is_relative_to` requires Python 3.9+; the project already targets 3.13.)

---

## 2. Unhandled `ValidationError` crashes `/api/chat` — High

**File:** `backend/main.py:46-76` (`apply_actions`), called from `chat()` at `main.py:105-122`

`CardData`/`BoardData` enforce `title` (max 200 chars) and `details` (max 4000 chars) via Pydantic `Field(max_length=...)`, but these constraints are only checked when `apply_actions` constructs or re-validates the model (`main.py:56` and `main.py:76`). `chat()` only catches `AIServiceError`:

```python
try:
    message, actions = call_ai(request.message, board.model_dump(), history)
except AIServiceError as error:
    raise HTTPException(status_code=502, detail=str(error)) from error
updated = apply_actions(board, actions)   # <-- unguarded
```

**Failure scenario:** Reproduced directly — calling `apply_actions()` with a `create_card` action whose `title` is 250 characters raises `pydantic.ValidationError: String should have at most 200 characters`. Since nothing catches this in `chat()`, it propagates as an unhandled 500. This is not an adversarial case: it's a realistic outcome of free-form LLM generation, since the system prompt in `ai_service.py` never tells the model about the length limits.

**Recommended fix:** Either (a) wrap the `apply_actions` call in a `try/except (ValidationError, ...)` in `chat()` and return a clean 502/400, or (b) truncate/validate action fields defensively inside `apply_actions` before constructing the models (preferred, since it lets valid parts of a multi-action response still apply). Consider also mentioning the length limits in the system prompt in `ai_service.py` to reduce how often this happens.

---

## 3. `update_card` writes the string `"None"` — Medium

**File:** `backend/main.py:61-62`

```python
if "details" in action:
    data.cards[card_id].details = str(action.get("details", ""))
```

`action.get("details", "")` only falls back to `""` when the key is *absent*. If the AI returns `"details": null` (a very plausible way for a model to express "clear/omit details"), `.get` returns `None` because the key **is** present, and `str(None)` stores the literal text `"None"` on the card — permanently visible garbage.

**Reproduced:** `apply_actions(board, [{"action": "update_card", "card_id": "c1", "details": None}])` sets `card.details` to `"None"`.

**Recommended fix:**

```python
if "details" in action:
    details = action.get("details")
    data.cards[card_id].details = str(details) if details is not None else ""
```

---

## 4. Silent board-save failures — Medium

**File:** `frontend/src/components/AppShell.tsx:31`

```tsx
<KanbanBoard board={board} onChange={(next) => { setBoard(next); void api.saveBoard(next); }} ... />
```

Every board mutation optimistically updates local state and fires `api.saveBoard` with no error handling (`void` discards the promise/rejection).

**Failure scenario:** A user edits a card with an overlong title, or the network drops briefly. The UI shows the change as successful immediately (optimistic update), but the `PUT /api/board` fails — either from a network error or a 422 from the backend's field-length validation (see #2's validation constraints, which apply symmetrically to `PUT /api/board`). The failure is never surfaced. On the next reload, or the next time a chat action re-fetches the board, the edit is simply gone.

**Recommended fix:** Catch the rejection and surface it (toast/inline banner), and consider reverting the optimistic update on failure:

```tsx
onChange={(next) => {
  const previous = board;
  setBoard(next);
  api.saveBoard(next).catch(() => { setBoard(previous); /* show error */ });
}}
```

---

## 5. Column rename sends a full-board `PUT` per keystroke — Medium

**File:** `frontend/src/components/KanbanColumn.tsx:46`

```tsx
<input
  value={column.title}
  onChange={(event) => onRename(column.id, event.target.value)}
  ...
/>
```

`onRename` flows straight through to the board's `onChange`, which (per #4) fires an immediate `PUT /api/board` on every keystroke.

**Failure scenario:** Typing an 8-character column name fires 8 separate full-board `PUT` requests. Under real network conditions these can arrive out of order; whichever response lands last wins, so an earlier keystroke's snapshot can overwrite a later one, silently reverting characters that are still visible in the (locally controlled) input.

**Recommended fix:** Debounce the outbound save (e.g. commit on blur / Enter, or debounce `onRename` ~400ms) while keeping the input itself fully responsive locally.

---

## 6. Drag-preview card title is unreadable — Low (UX)

**File:** `frontend/src/components/KanbanCardPreview.tsx:11`

```tsx
<article className="... bg-[linear-gradient(145deg,rgba(21,48,82,0.94),rgba(26,12,57,0.9))] ...">
  <h4 className="... text-[var(--navy-dark)]">
```

The preview background is a dark navy/purple gradient (`rgba(21,48,82)` → `rgba(26,12,57)`), but the title text color is `--navy-dark` (`#032147`) — near-black on near-black. The equivalent static card (`KanbanCard.tsx:51`) correctly uses `text-cyan-50` on the same-family background.

**Failure scenario:** Any drag of any card renders this component as the `DragOverlay`; the title is effectively invisible for the entire duration of the drag.

**Recommended fix:** Match `KanbanCard`'s text color:

```tsx
<h4 className="font-display text-base font-semibold text-cyan-50">
```

---

## 7. Session token compared with `!=` — Low

**File:** `backend/main.py:31`

```python
if authorization != f"Bearer {SESSION_TOKEN}":
```

String `!=` short-circuits on the first differing byte, which is a timing side-channel on the bearer token.

**Failure scenario:** An attacker able to measure response timing on `/api/board` or `/api/chat` could in principle use the variable comparison time to guess `SESSION_TOKEN` faster than brute force. Practical exploitability against this app is low (local single-user MVP, network jitter dominates), but the fix is trivial and worth doing since the token is the only auth boundary in the app.

**Recommended fix:**

```python
import secrets
if authorization is None or not secrets.compare_digest(authorization, f"Bearer {SESSION_TOKEN}"):
```

---

## Scope note

This review covered `backend/` and `frontend/src/` only (not `frontend/tests/`, `scripts/`, or Docker/CI config). No issues were found in `backend/database.py`, `backend/schemas.py`, or `backend/ai_service.py` beyond what's captured above.
