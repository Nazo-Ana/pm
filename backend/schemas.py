from typing import Literal

from pydantic import BaseModel, Field, model_validator


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

    @model_validator(mode="after")
    def check_card_ids_exist(self) -> "BoardData":
        all_ids = [card_id for column in self.columns for card_id in column.cardIds]
        missing = {card_id for card_id in all_ids if card_id not in self.cards}
        if missing:
            raise ValueError(f"columns reference unknown card ids: {sorted(missing)}")
        duplicates = {card_id for card_id in all_ids if all_ids.count(card_id) > 1}
        if duplicates:
            raise ValueError(f"card ids referenced by more than one column: {sorted(duplicates)}")
        return self


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    message: str
    board: BoardData
