import type { BoardData } from "@/lib/kanban";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = sessionStorage.getItem("pm-token");
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(response.status, body?.detail ?? "Request failed");
  }
  return response.json() as Promise<T>;
};

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  board: () => request<BoardData>("/api/board"),
  saveBoard: (board: BoardData) =>
    request<BoardData>("/api/board", { method: "PUT", body: JSON.stringify(board) }),
  chat: (message: string) =>
    request<{ message: string; board: BoardData }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
