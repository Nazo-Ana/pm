"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";
import { ChatSidebar } from "@/components/ChatSidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Login } from "@/components/Login";

export const AppShell = () => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [checking, setChecking] = useState(true);

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
    setBoard(await api.board());
  };

  if (checking) return <main className="grid min-h-screen place-items-center text-sm font-semibold text-[var(--gray-text)]">Loading workspace…</main>;
  if (!board) return <Login onLogin={login} />;

  return <div className="mx-auto grid max-w-[1800px] gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6"><KanbanBoard board={board} onChange={(next) => { setBoard(next); void api.saveBoard(next); }} onLogout={() => { sessionStorage.removeItem("pm-token"); setBoard(null); }} /><ChatSidebar onSend={async (message) => { const result = await api.chat(message); setBoard(result.board); return result; }} /></div>;
};
