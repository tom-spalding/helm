import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import { useState } from "react";
import { useNoteStore } from "../store/notes";
import { serializeNote } from "../lib/note-parser";
import { tauriCommands } from "../lib/tauri-commands";
import { NOTE_STATES } from "../lib/constants";
import type { Note, NoteState } from "../types/note";

function KanbanCard({ note }: { note: Note }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 cursor-grab select-none transition-opacity ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <p className="text-sm font-medium text-[var(--color-text)]">
        {note.frontmatter.title}
      </p>
      {note.frontmatter.blocked && (
        <p className="mt-0.5 text-xs text-red-400">⊘ Blocked</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {note.frontmatter.tags.slice(0, 2).map((t) => (
          <span
            key={t}
            className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({ state, notes }: { state: string; notes: Note[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: state });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] min-w-[220px] flex-col rounded-xl border p-4 gap-3 transition-colors ${
        isOver
          ? "border-[var(--color-accent)] bg-blue-500/5"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[var(--color-text)]">{state}</p>
        <span className="text-xs text-[var(--color-text-muted)]">
          {notes.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {notes.map((n) => (
          <KanbanCard key={n.id} note={n} />
        ))}
      </div>
    </div>
  );
}

export function KanbanView() {
  const { notes, updateNote } = useNoteStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const newState = over.id as NoteState;
    const note = notes.find((n) => n.id === String(active.id));
    if (!note || note.frontmatter.state === newState) return;

    const updated = {
      ...note,
      frontmatter: {
        ...note.frontmatter,
        state: newState,
        updated: new Date().toISOString().split("T")[0],
      },
    };
    updateNote(updated);
    try {
      await tauriCommands.writeNote(updated.filePath, serializeNote(updated));
    } catch (e) {
      console.error("Failed to save note:", e);
    }
  }

  const activeNote = activeId ? notes.find((n) => n.id === activeId) : null;

  return (
    <div className="h-full overflow-x-auto p-6">
      <h2 className="mb-6 text-xl font-bold text-[var(--color-text)]">Kanban</h2>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4">
          {NOTE_STATES.map((state) => (
            <KanbanColumn
              key={state}
              state={state}
              notes={notes.filter((n) => n.frontmatter.state === state)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeNote ? <KanbanCard note={activeNote} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
