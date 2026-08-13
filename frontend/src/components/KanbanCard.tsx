import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useState, type FormEvent } from "react";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string, title: string, details: string) => void;
};

export const KanbanCard = ({ card, onDelete, onEdit }: KanbanCardProps) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onEdit(card.id, title.trim(), details.trim());
    setEditing(false);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(21,48,82,0.88),rgba(8,24,51,0.82))] px-4 py-4 shadow-[0_16px_35px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        "transition-all duration-150",
        isDragging && "border-[var(--accent-yellow)]/60 opacity-70 shadow-[0_20px_45px_rgba(0,0,0,0.42)]"
      )}
      {...(!editing ? attributes : {})}
      {...(!editing ? listeners : {})}
      data-testid={`card-${card.id}`}
    >
      {editing ? <form onSubmit={submit} className="space-y-3">
        <input aria-label="Card title" value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-cyan-300/15 bg-[#071c3a]/75 px-3 py-2 text-sm font-semibold text-cyan-50 outline-none focus:border-[var(--primary-blue)]" />
        <textarea aria-label="Card details" value={details} onChange={(event) => setDetails(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-cyan-300/15 bg-[#071c3a]/75 px-3 py-2 text-sm text-cyan-100/70 outline-none focus:border-[var(--primary-blue)]" />
        <div className="flex gap-2"><button className="rounded-full bg-[var(--secondary-purple)] px-3 py-1.5 text-xs font-semibold text-white">Save</button><button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-[var(--gray-text)]">Cancel</button></div>
      </form> : <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-base font-semibold text-cyan-50">
            {card.title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {card.details}
          </p>
        </div>
        <div className="flex flex-col gap-1"><button type="button" onClick={() => setEditing(true)} className="rounded-full px-2 py-1 text-xs font-semibold text-sky-300 transition hover:bg-cyan-400/10" aria-label={`Edit ${card.title}`}>Edit</button><button
          type="button"
          onClick={() => onDelete(card.id)}
          className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-slate-400 transition hover:border-cyan-300/15 hover:bg-cyan-400/10 hover:text-cyan-50"
          aria-label={`Delete ${card.title}`}
        >
          Remove
        </button>
        </div>
      </div>
      }
    </article>
  );
};
