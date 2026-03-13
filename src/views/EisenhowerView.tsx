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
import { getQuadrant, type EisenhowerQuadrant } from "../types/note";
import { EISENHOWER_QUADRANTS } from "../lib/constants";
import type { Note } from "../types/note";

interface NoteCardProps {
  note: Note;
}

function NoteCard({ note }: NoteCardProps) {
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
      <p className="truncate text-sm font-medium text-[var(--color-text)]">
        {note.frontmatter.title}
      </p>
      {note.frontmatter.blocked && (
        <p className="mt-0.5 text-xs text-red-400">⊘ Blocked</p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {note.frontmatter.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="text-xs text-[var(--color-text-muted)]"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

interface QuadrantProps {
  id: EisenhowerQuadrant;
  notes: Note[];
}

function Quadrant({ id, notes }: QuadrantProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const q = EISENHOWER_QUADRANTS[id];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border p-4 min-h-[200px] gap-2 transition-colors ${
        isOver
          ? "border-[var(--color-accent)] bg-blue-500/5"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="mb-1">
        <p className="font-semibold text-[var(--color-text)]">{q.label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{q.subtitle}</p>
      </div>
      <div className="flex flex-col gap-2">
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} />
        ))}
      </div>
      {notes.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)] opacity-50 mt-auto">
          Drop here
        </p>
      )}
    </div>
  );
}

export function EisenhowerView() {
  const { notes, updateNote } = useNoteStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const quadrantNotes: Record<EisenhowerQuadrant, Note[]> = {
    do: notes.filter((n) => getQuadrant(n) === "do"),
    schedule: notes.filter((n) => getQuadrant(n) === "schedule"),
    delegate: notes.filter((n) => getQuadrant(n) === "delegate"),
    eliminate: notes.filter((n) => getQuadrant(n) === "eliminate"),
  };

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const quadrant = over.id as EisenhowerQuadrant;
    const q = EISENHOWER_QUADRANTS[quadrant];
    const note = notes.find((n) => n.id === String(active.id));
    if (!note) return;

    // No change if already in this quadrant
    if (note.frontmatter.urgent === q.urgent && note.frontmatter.important === q.important) {
      return;
    }

    const updated = {
      ...note,
      frontmatter: {
        ...note.frontmatter,
        urgent: q.urgent,
        important: q.important,
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
    <div className="h-full overflow-y-auto p-6">
      <h2 className="mb-6 text-xl font-bold text-[var(--color-text)]">
        Eisenhower Matrix
      </h2>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-4">
          <Quadrant id="do" notes={quadrantNotes.do} />
          <Quadrant id="schedule" notes={quadrantNotes.schedule} />
          <Quadrant id="delegate" notes={quadrantNotes.delegate} />
          <Quadrant id="eliminate" notes={quadrantNotes.eliminate} />
        </div>
        <DragOverlay>
          {activeNote ? <NoteCard note={activeNote} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
