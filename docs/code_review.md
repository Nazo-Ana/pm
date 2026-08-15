# Code Review

Comprehensive review of the entire repository — `backend/`, `frontend/src/`,
`frontend/tests/`, `scripts/`, Docker/CI config, and `docs/` — high effort.
Each finding below was reproduced directly (not inferred from reading alone)
before being included. Ordered most severe first.

**Status: all 6 findings fixed.** Line numbers below refer to the code as it
was at review time, before the fixes.

**Prior review status:** the previous review's 7 findings (path traversal,
unhandled AI-output crash, `"None"`-string bug, silent save failures, rename
debounce, drag-preview contrast, timing-safe token compare) are all fixed and
committed (`ceb17dc`). This pass covers new ground: things not in scope last
time (`frontend/tests/`, `scripts/`, config, `docs/`), plus a re-check of
everything touched since.

Note: the `board_data_invalid` 409 handling in `get_board()`/`chat()`
(`backend/main.py`) and the cross-column card-id uniqueness check
(`backend/schemas.py`) were already fixed earlier in this session and are
reflected as already-applied code below, not listed as open findings.

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | Medium | `backend/main.py:78` | `move_card`'s `position` field silently accepts JSON booleans as `0`/`1` because `isinstance(True, int)` is `True` in Python |
| 2 | Medium | `.gitignore` | `backend/.venv_test/` (a full Python virtualenv) is not excluded, unlike `.dockerignore` which was updated for it — one `git add -A` away from being committed |
| 3 | Medium | `frontend/src/components/AppShell.tsx:15-27` | No handling for the backend's `409 board_data_invalid` response; the two failure paths (post-login load vs. mount-time check) behave inconsistently and both give the user a confusing or silent failure |
| 4 | Low | `frontend/src/components/KanbanColumn.tsx:29-46` | Render-time title sync can race with a pending debounced rename, letting a stale locally-typed title overwrite a newer externally-applied one (e.g. an AI rename) |
| 5 | Low | `docs/PLAN.md`, `backend/AGENTS.md`, `frontend/AGENTS.md` | Planning docs are far out of sync with the shipped implementation (Parts 2-10 all show `[ ]`, `AGENTS.md` files still describe Part-1/Part-2 scaffolding) |
| 6 | Low | `frontend/src/` | No unit tests for `Login.tsx`, `AppShell.tsx`, `ChatSidebar.tsx`, or the `KanbanColumn.tsx` debounce logic — `docs/PLAN.md` Part 4 explicitly calls for login-flow unit tests that don't exist |

## Action checklist

- [x] Reject or ignore non-integer `position` values (explicitly exclude `bool`) in `apply_actions`'s `move_card` handling (#1)
- [x] Add `backend/.venv_test/` (or a `**/.venv_test` pattern) to `.gitignore` (#2)
- [x] Handle `409 board_data_invalid` explicitly in the frontend: distinguish it from a real login failure and surface a clear message in both the post-login and mount-check paths (#3)
- [x] Cancel/flush the pending rename debounce before the render-time sync overwrites local title state (#4)
- [x] Update `docs/PLAN.md` checkboxes and refresh `backend/AGENTS.md` / `frontend/AGENTS.md` to reflect the current architecture (#5)
- [x] Add unit tests for `Login.tsx`, `AppShell.tsx` error paths, and `KanbanColumn.tsx` debounce/sync behavior (#6)

---

## 1. `move_card` treats JSON booleans as valid positions — Medium

**File:** `backend/main.py:73-79`

```python
elif kind == "move_card" and card_id in data.cards and column_id in columns:
    for column in data.columns:
        column.cardIds = [item for item in column.cardIds if item != card_id]
    position = action.get("position")
    target = columns[column_id].cardIds
    index = len(target) if not isinstance(position, int) else max(0, min(position, len(target)))
    target.insert(index, card_id)
```

Python's `bool` is a subtype of `int`, so `isinstance(True, int)` and
`isinstance(False, int)` are both `True`. If the AI (or any future caller of
`apply_actions`) sends `"position": true` or `"position": false` — a
plausible way for a JSON-emitting model to express "yes, move it" without
meaning a specific index — it's silently coerced to `1` or `0` instead of
being treated as "no position given" (which falls back to appending at the
end via `len(target)`).

**Reproduced directly:**

```python
apply_actions(board, [{"action": "move_card", "card_id": "card-3", "column_id": "col-a", "position": True}])
# cardIds after position=True: ['card-1', 'card-3', 'card-2']  (inserted at index 1, not appended)
```

**Recommended fix:** exclude `bool` explicitly:

```python
index = len(target) if not isinstance(position, int) or isinstance(position, bool) else max(0, min(position, len(target)))
```

**Fixed:** `apply_actions` now computes `has_position = isinstance(position, int) and not isinstance(position, bool)` and only uses `position` as an index when that's true. Covered by `test_move_card_treats_boolean_position_as_no_position` in `backend/tests/test_apply_actions.py`.

---

## 2. `backend/.venv_test/` is not covered by `.gitignore` — Medium

**File:** `.gitignore`

The working tree already has `.dockerignore` updated (in this session's
pending changes) to exclude `**/.venv_test` from the Docker build context,
but `.gitignore` still only has bare `.venv` / `venv` entries, which match a
directory *named* `.venv`, not `.venv_test`:

```
$ git check-ignore -v backend/.venv_test
(no output — not ignored)
```

`backend/.venv_test/` is a full Python virtualenv containing hundreds of
files (pip's entire internal source tree, compiled `.exe` launchers, cached
wheels). It happens not to be tracked today only because nobody has run
`git add -A` / `git add backend/` from a state where it existed on disk.

**Recommended fix:** add a line to `.gitignore`, matching the pattern already
used in `.dockerignore`:

```
**/.venv_test
```

**Fixed:** added to `.gitignore`. Confirmed with `git check-ignore -v backend/.venv_test`, which now reports it ignored.

---

## 3. No frontend handling for `409 board_data_invalid` — Medium

**File:** `frontend/src/components/AppShell.tsx:15-27`

```tsx
useEffect(() => {
  const token = sessionStorage.getItem("pm-token");
  const check = token
    ? api.board().then(setBoard).catch(() => sessionStorage.removeItem("pm-token"))
    : Promise.resolve();
  check.finally(() => setChecking(false));
}, []);

const login = async (username: string, password: string) => {
  const session = await api.login(username, password);
  sessionStorage.setItem("pm-token", session.token);
  setBoard(await api.board());   // <-- unguarded
};
```

`get_board()` now returns `409 board_data_invalid` for a corrupted stored
board (see `backend/main.py`'s `load_board()`). The frontend has two
different call sites for `api.board()` and they fail in two different,
unhelpful ways:

- **Mount-time check** (line 18): the `.catch()` only clears the token and
  never surfaces anything — the user is silently bounced to the login screen
  with zero explanation, as if they were simply logged out.
- **Post-login load** (line 26): there is no `.catch()` at all, so the
  exception propagates out of `login()` into `Login.tsx`'s `submit()` handler,
  which displays the raw backend string `board_data_invalid` as if it were a
  login failure — even though the credentials were correct and login
  succeeded (the token is already stored in `sessionStorage` by this point).

**Failure scenario:** a board row becomes corrupted (dangling card
reference from data written before the current validators existed, or any
future write path that regresses this). Every subsequent login attempt with
the *correct* password shows "board_data_invalid" as a login error, and
every page refresh silently dumps the user back to a blank login screen with
no error at all — two different symptoms for the same underlying problem,
neither of which points at the real cause.

**Recommended fix:** catch the `409` specifically in both places and show
one consistent, actionable message (e.g. "Your board data is corrupted and
needs to be reset — contact support" instead of routing it through the login
error path).

**Fixed:** `frontend/src/lib/api.ts` now throws an `ApiError` carrying the
HTTP status. `AppShell.tsx` checks `reason.status === 409` in both the
mount-time check and the post-login load, and renders one dedicated
corrupted-board screen (with a sign-out action) instead of either path.
Covered by `AppShell.test.tsx`.

---

## 4. Rename debounce can be overwritten by a stale sync — Low

**File:** `frontend/src/components/KanbanColumn.tsx:29-46`

```tsx
const [title, setTitle] = useState(column.title);
const [syncedTitle, setSyncedTitle] = useState(column.title);
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

if (column.title !== syncedTitle) {
  setSyncedTitle(column.title);
  setTitle(column.title);
}
...
const handleTitleChange = (value: string) => {
  setTitle(value);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => onRename(column.id, value), RENAME_DEBOUNCE_MS);
};
```

The render-time sync (lines 33-36) resets local `title` whenever the
`column.title` prop changes externally, but it does not cancel a pending
debounce timer. The pending `setTimeout` closure still holds the
locally-typed value from before the external update.

**Failure scenario:** user is mid-keystroke renaming a column (debounce
timer running) exactly when an AI chat action renames the same column via
`rename_column`. The incoming prop update overwrites the visible input with
the AI's new title, but ~500ms later the still-pending debounced `onRename`
fires with the user's stale, pre-sync value and immediately reverts the
AI's rename with a full-board `PUT` — with no further signal to the user
about what just happened.

**Recommended fix:** clear `debounceRef.current` inside the sync branch
(mirroring what `flushRename`/unmount cleanup already do elsewhere in the
same file) whenever `column.title` changes externally.

**Fixed:** the sync branch now clears and nulls `debounceRef.current` before
adopting the externally-changed title. Covered by
`KanbanColumn.test.tsx`'s "cancels a pending debounced rename when the title
changes externally" test.

---

## 5. Planning docs are far behind the implementation — Low

**Files:** `docs/PLAN.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`

`docs/PLAN.md` still shows every checkbox unchecked from Part 2 onward
("Add `backend/` with a minimal FastAPI app", "Load the board after login
from `/api/board`", "Add the AI sidebar chat...") despite all of it being
built, tested, and working. `backend/AGENTS.md` still says the backend
"Provides `GET /health`, `GET /api/ping`, and a simple HTML landing page" and
lists `requirements.txt` as containing only `fastapi`, `uvicorn[standard]`,
and `python-dotenv` — none of which matches the current app (auth, board
CRUD, AI chat, SQLAlchemy, static frontend serving, five real dependencies).
`frontend/AGENTS.md` similarly still describes "There is no backend
integration yet."

CLAUDE.md instructs contributors to "Review `docs/PLAN.md` before working on
any phase of the project" — as it stands, that review would misinform rather
than orient a new contributor or agent.

**Recommended fix:** check off the completed `docs/PLAN.md` items and update
both `AGENTS.md` files' "What exists today" sections to match the current
file layout and behavior described in the root `CLAUDE.md`.

**Fixed:** `docs/PLAN.md` checkboxes for Parts 2-10 now reflect verified
reality (including a live `docker build`/`docker run` check, not just file
presence); the one item that was genuinely never built (a standalone
`/api/ai/ping` endpoint, superseded by going straight to `/api/chat`) is
marked as such rather than falsely checked. Both `AGENTS.md` files were
rewritten to describe the current architecture.

---

## 6. Missing unit tests for login/shell/chat and rename debounce — Low

**Files:** `frontend/src/`

`docs/PLAN.md` Part 4's success criteria explicitly require "Tests cover the
login flow and board visibility," but there are only two unit test files in
the whole frontend: `KanbanBoard.test.tsx` and `kanban.test.ts`. There is no
unit coverage for `Login.tsx` (correct/incorrect credentials, error display),
`AppShell.tsx` (the two `api.board()` failure paths described in finding #3
are entirely untested), `ChatSidebar.tsx`, or `KanbanColumn.tsx`'s debounce/
sync logic (finding #4 would have been caught by a test exercising an
external title update while a rename is in flight). The Playwright spec
(`frontend/tests/kanban.spec.ts`) only drives login as a setup step for other
tests, not as a target of its own assertions.

**Recommended fix:** add unit tests for the two `AppShell` error branches
(including the 409 case once #3 is fixed), `Login.tsx`'s error path, and a
`KanbanColumn` test that changes the `column` prop while a debounced rename
is pending.

**Fixed:** added `Login.test.tsx`, `AppShell.test.tsx` (6 cases, including
both `409` branches and the sign-out recovery path), `ChatSidebar.test.tsx`,
and `KanbanColumn.test.tsx` (debounce timing plus the external-rename race
from #4). Frontend unit suite is now 6 test files / 20 tests, all passing.

---

## Scope note

This review covered `backend/` (excluding the `.venv_test/` virtualenv
contents themselves), `frontend/src/`, `frontend/tests/`, `scripts/`,
`Dockerfile`, `docker-compose.yml`, `.dockerignore`/`.gitignore`, and
`docs/`. `node_modules/` and the vendored contents of `.venv_test/` were not
audited (third-party code, not this project's). Items already covered and
fixed in the previous review pass are not repeated here.
