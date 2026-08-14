import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy.orm import Session

from .ai_service import AIServiceError, call_ai
from .database import Board, ChatMessage, User, get_db, init_db
from .schemas import BoardData, CardData, ChatRequest, ChatResponse, LoginRequest, LoginResponse


SESSION_TOKEN = secrets.token_urlsafe(32)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Project Management MVP", lifespan=lifespan)


def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if authorization is None or not secrets.compare_digest(authorization, f"Bearer {SESSION_TOKEN}"):
        raise HTTPException(status_code=401, detail="Authentication required")
    user = db.query(User).filter_by(username="user").first()
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def user_board(user: User, db: Session) -> Board:
    board = db.query(Board).filter_by(user_id=user.id).first()
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


def apply_actions(board: BoardData, actions: list[dict]) -> BoardData:
    data = board.model_copy(deep=True)
    columns = {column.id: column for column in data.columns}
    for action in actions:
        kind = action.get("action")
        card_id = str(action.get("card_id", ""))
        column_id = str(action.get("column_id", ""))
        if kind == "create_card" and column_id in columns and str(action.get("title", "")).strip():
            card_id = f"card-ai-{secrets.token_hex(5)}"
            card = {"id": card_id, "title": str(action["title"]).strip(), "details": str(action.get("details", ""))}
            data.cards[card_id] = CardData.model_validate(card)
            columns[column_id].cardIds.append(card_id)
        elif kind == "update_card" and card_id in data.cards:
            if str(action.get("title", "")).strip():
                data.cards[card_id].title = str(action["title"]).strip()
            if "details" in action:
                details = action.get("details")
                data.cards[card_id].details = "" if details is None else str(details)
        elif kind == "delete_card" and card_id in data.cards:
            del data.cards[card_id]
            for column in data.columns:
                column.cardIds = [item for item in column.cardIds if item != card_id]
        elif kind == "move_card" and card_id in data.cards and column_id in columns:
            for column in data.columns:
                column.cardIds = [item for item in column.cardIds if item != card_id]
            position = action.get("position")
            target = columns[column_id].cardIds
            index = len(target) if not isinstance(position, int) else max(0, min(position, len(target)))
            target.insert(index, card_id)
        elif kind == "rename_column" and column_id in columns and str(action.get("title", "")).strip():
            columns[column_id].title = str(action["title"]).strip()
    return BoardData.model_validate(data.model_dump())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.query(User).filter_by(username=request.username, password=request.password).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return LoginResponse(token=SESSION_TOKEN, username=user.username)


def load_board(record: Board) -> BoardData:
    try:
        return BoardData.model_validate_json(record.data)
    except ValidationError as error:
        raise HTTPException(status_code=409, detail="board_data_invalid") from error


@app.get("/api/board", response_model=BoardData)
def get_board(user: User = Depends(current_user), db: Session = Depends(get_db)) -> BoardData:
    return load_board(user_board(user, db))


@app.put("/api/board", response_model=BoardData)
def save_board(payload: BoardData, user: User = Depends(current_user), db: Session = Depends(get_db)) -> BoardData:
    board = user_board(user, db)
    board.data = payload.model_dump_json()
    db.commit()
    return payload


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> ChatResponse:
    board_record = user_board(user, db)
    board = load_board(board_record)
    history_records = db.query(ChatMessage).filter_by(board_id=board_record.id).order_by(ChatMessage.id.desc()).limit(10).all()
    history = [{"role": item.role, "content": item.content} for item in reversed(history_records)]
    try:
        message, actions = call_ai(request.message, board.model_dump(), history)
    except AIServiceError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    try:
        updated = apply_actions(board, actions)
    except ValidationError as error:
        raise HTTPException(status_code=502, detail="OpenRouter returned an invalid response") from error
    board_record.data = updated.model_dump_json()
    db.add_all([
        ChatMessage(board_id=board_record.id, role="user", content=request.message),
        ChatMessage(board_id=board_record.id, role="assistant", content=message),
    ])
    db.commit()
    return ChatResponse(message=message, board=updated)


frontend = (Path(__file__).resolve().parents[1] / "frontend" / "out").resolve()
if frontend.exists():
    assets = frontend / "_next"
    if assets.exists():
        app.mount("/_next", StaticFiles(directory=assets), name="next-assets")

    @app.get("/{path:path}", include_in_schema=False)
    def static_app(path: str):
        requested = (frontend / path).resolve()
        if requested.is_relative_to(frontend):
            if requested.is_file():
                return FileResponse(requested)
            nested_index = requested / "index.html"
            if nested_index.is_file():
                return FileResponse(nested_index)
        return FileResponse(frontend / "index.html")
else:
    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {"message": "Frontend build not found"}
