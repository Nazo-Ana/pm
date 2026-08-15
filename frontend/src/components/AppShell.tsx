"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";
import { ChatSidebar } from "@/components/ChatSidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Login } from "@/components/Login";

const BOARD_CORRUPTED_MESSAGE =
  "Your board data is corrupted and can't be loaded. Contact support to have it reset.";

export const AppShell = () => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [checking, setChecking] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [boardError, setBoardError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("pm-token");
    const check = token
      ? api
          .board()
          .then(setBoard)
          .catch((reason: unknown) => {
            if (reason instanceof ApiError && reason.status === 409) {
              setBoardError(BOARD_CORRUPTED_MESSAGE);
            } else {
              sessionStorage.removeItem("pm-token");
            }
          })
      : Promise.resolve();
    check.finally(() => setChecking(false));
  }, []);

  const login = async (username: string, password: string) => {
    const session = await api.login(username, password);
    sessionStorage.setItem("pm-token", session.token);
    try {
      setBoard(await api.board());
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setBoardError(BOARD_CORRUPTED_MESSAGE);
        return;
      }
      throw reason;
    }
  };

  const persistBoard = (next: BoardData) => {
    setBoard(next);
    api
      .saveBoard(next)
      .then(() => setSaveError(""))
      .catch((reason: unknown) => {
        setSaveError(reason instanceof Error ? reason.message : "Failed to save board.");
      });
  };

  if (checking) return <main className="grid min-h-screen place-items-center text-sm font-semibold text-[var(--gray-text)]">Loading workspace…</main>;

  if (boardError) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-md">
          <p role="alert" className="text-sm font-semibold text-red-300">{boardError}</p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("pm-token");
              setBoardError("");
            }}
            className="mt-6 rounded-xl bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (!board) return <Login onLogin={login} />;

  return (
    <div className="mx-auto grid max-w-[1800px] gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6">
      <div className="flex flex-col gap-4">
        {saveError && (
          <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-300">
            {saveError}
          </p>
        )}
        <KanbanBoard
          board={board}
          onChange={persistBoard}
          onLogout={() => {
            sessionStorage.removeItem("pm-token");
            setBoard(null);
          }}
        />
      </div>
      <ChatSidebar
        onSend={async (message) => {
          const result = await api.chat(message);
          setBoard(result.board);
          return result;
        }}
      />
    </div>
  );
};
