import { render, screen, fireEvent } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import type { Column } from "@/lib/kanban";

const baseColumn: Column = { id: "col-a", title: "Backlog", cardIds: [] };

const renderColumn = (column: Column, onRename: (columnId: string, title: string) => void) =>
  render(
    <DndContext>
      <KanbanColumn
        column={column}
        cards={[]}
        onRename={onRename}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
      />
    </DndContext>
  );

describe("KanbanColumn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces title edits before calling onRename", () => {
    const onRename = vi.fn();
    renderColumn(baseColumn, onRename);

    fireEvent.change(screen.getByLabelText("Column title"), { target: { value: "New Name" } });
    expect(onRename).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(onRename).toHaveBeenCalledWith("col-a", "New Name");
  });

  it("cancels a pending debounced rename when the title changes externally", () => {
    const onRename = vi.fn();
    const { rerender } = renderColumn(baseColumn, onRename);

    fireEvent.change(screen.getByLabelText("Column title"), { target: { value: "Stale Local Edit" } });

    // An external rename (e.g. an AI chat action) lands before the debounce fires.
    rerender(
      <DndContext>
        <KanbanColumn
          column={{ ...baseColumn, title: "Renamed By AI" }}
          cards={[]}
          onRename={onRename}
          onAddCard={vi.fn()}
          onDeleteCard={vi.fn()}
          onEditCard={vi.fn()}
        />
      </DndContext>
    );

    vi.advanceTimersByTime(500);

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Column title")).toHaveValue("Renamed By AI");
  });
});
