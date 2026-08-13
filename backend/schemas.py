from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


class CardData(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=200)
    details: str = Field(default="", max_length=4000)


class ColumnData(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=100)
    cardIds: list[str]


class BoardData(BaseModel):
    columns: list[ColumnData]
    cards: dict[str, CardData]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    message: str
    board: BoardData
