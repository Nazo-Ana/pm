import json
import os

import requests


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"


class AIServiceError(RuntimeError):
    pass


def call_ai(user_message: str, board: dict, history: list[dict]) -> tuple[str, list[dict]]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise AIServiceError("OPENROUTER_API_KEY is not configured")

    system = (
        "You are a project management assistant. Return only JSON with a concise 'message' "
        "and an 'actions' array. Allowed actions: "
        "create_card(column_id,title,details), update_card(card_id,title?,details?), "
        "move_card(card_id,column_id,position?), delete_card(card_id), and "
        "rename_column(column_id,title). Use only IDs from the board except for newly created cards. "
        "Card titles must be 200 characters or fewer, card details 4000 characters or fewer, "
        "and column titles 100 characters or fewer. "
        f"Current board: {json.dumps(board, separators=(',', ':'))}"
    )
    messages = [{"role": "system", "content": system}, *history[-10:], {"role": "user", "content": user_message}]
    response = requests.post(
        OPENROUTER_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": MODEL, "messages": messages, "response_format": {"type": "json_object"}},
        timeout=45,
    )
    try:
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
        return str(result.get("message", "Board updated.")), list(result.get("actions", []))
    except (requests.RequestException, KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        raise AIServiceError("OpenRouter returned an invalid response") from error
