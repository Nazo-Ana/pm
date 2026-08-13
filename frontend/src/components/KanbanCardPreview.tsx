import type { Card } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="rounded-2xl border border-fuchsia-300/25 bg-[linear-gradient(145deg,rgba(21,48,82,0.94),rgba(26,12,57,0.9))] px-4 py-4 text-cyan-50 shadow-[0_24px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="font-display text-base font-semibold text-cyan-50">
          {card.title}
        </h4>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {card.details}
        </p>
      </div>
    </div>
  </article>
);
