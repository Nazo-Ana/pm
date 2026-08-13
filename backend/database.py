import json
import os
from collections.abc import Generator

from sqlalchemy import ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/pm.db")
if DATABASE_URL.startswith("sqlite:///"):
    database_path = DATABASE_URL.removeprefix("sqlite:///")
    directory = os.path.dirname(database_path)
    if directory:
        os.makedirs(directory, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(120))


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    data: Mapped[str] = mapped_column(Text)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)


def default_board() -> dict:
    columns = [
        ("col-backlog", "Backlog"),
        ("col-discovery", "Discovery"),
        ("col-progress", "In Progress"),
        ("col-review", "Review"),
        ("col-done", "Done"),
    ]
    return {
        "columns": [{"id": column_id, "title": title, "cardIds": []} for column_id, title in columns],
        "cards": {},
    }


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        user = session.query(User).filter_by(username="user").first()
        if user is None:
            user = User(username="user", password="password")
            session.add(user)
            session.flush()
            session.add(Board(user_id=user.id, data=json.dumps(default_board())))
            session.commit()


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
