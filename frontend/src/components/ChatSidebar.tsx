"use client";

import { useState, type FormEvent } from "react";
import type { BoardData } from "@/lib/kanban";

type Message = { role: "user" | "assistant"; content: string };
type ChatSidebarProps = { onSend: (message: string) => Promise<{ message: string; board: BoardData }> };

export const ChatSidebar = ({ onSend }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Tell me what to create, edit, move, rename, or remove." }]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = value.trim();
    if (!content || loading) return;
    setValue("");
    setMessages((current) => [...current, { role: "user", content }]);
    setLoading(true);
    try {
      const result = await onSend(content);
      setMessages((current) => [...current, { role: "assistant", content: result.message }]);
    } catch (reason) {
      setMessages((current) => [...current, { role: "assistant", content: reason instanceof Error ? reason.message : "The assistant is unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex min-h-[620px] flex-col rounded-[28px] border border-fuchsia-300/20 bg-[linear-gradient(165deg,rgba(8,37,73,0.82),rgba(34,13,61,0.8))] p-5 text-cyan-50 shadow-[var(--shadow)] backdrop-blur-2xl lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-yellow)]">AI assistant</p>
      <h2 className="mt-2 font-display text-2xl font-semibold">Board copilot</h2>
      <div aria-live="polite" className="mt-6 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((message, index) => <div key={index} className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto border-fuchsia-300/25 bg-[var(--secondary-purple)]/80" : "border-cyan-300/10 bg-[#09264c]/65"}`}>{message.content}</div>)}
        {loading && <p className="text-sm text-white/60">Thinking…</p>}
      </div>
      <form onSubmit={submit} className="mt-4">
        <label className="sr-only" htmlFor="chat-message">Message</label>
        <textarea id="chat-message" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Create a card in Backlog…" rows={3} className="w-full resize-none rounded-2xl border border-cyan-300/15 bg-[#071c3a]/75 px-4 py-3 text-sm text-cyan-50 outline-none placeholder:text-cyan-100/35 focus:border-[var(--primary-blue)]" />
        <button disabled={loading || !value.trim()} className="mt-3 w-full rounded-xl bg-[var(--accent-yellow)] px-4 py-3 text-sm font-bold text-[var(--navy-dark)] disabled:opacity-50">Send message</button>
      </form>
    </aside>
  );
};
