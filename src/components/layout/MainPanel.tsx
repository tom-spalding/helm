import { useUIStore } from "../../store/ui";
import { useNoteStore } from "../../store/notes";
import { NoteEditor } from "../editor/NoteEditor";
import { PropertyPanel } from "../editor/PropertyPanel";
import { serializeNote } from "../../lib/note-parser";
import { tauriCommands } from "../../lib/tauri-commands";
import type { NoteFrontmatter } from "../../types/note";
import { EisenhowerView } from "../../views/EisenhowerView";
import { KanbanView } from "../../views/KanbanView";

export function MainPanel() {
  const { activeView } = useUIStore();
  const { notes, selectedNoteId, updateNote } = useNoteStore();
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  async function handleSave(content: string) {
    if (!selectedNote) return;
    const updated = { ...selectedNote, content };
    updateNote(updated);
    try {
      await tauriCommands.writeNote(updated.filePath, serializeNote(updated));
    } catch (e) {
      console.error("Failed to save note:", e);
    }
  }

  async function handleFrontmatterChange(updates: Partial<NoteFrontmatter>) {
    if (!selectedNote) return;
    const updated = {
      ...selectedNote,
      frontmatter: {
        ...selectedNote.frontmatter,
        ...updates,
        updated: new Date().toISOString().split("T")[0],
      },
    };
    updateNote(updated);
    try {
      await tauriCommands.writeNote(updated.filePath, serializeNote(updated));
    } catch (e) {
      console.error("Failed to save frontmatter:", e);
    }
  }

  if (activeView === "notes") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedNote ? (
          <>
            <PropertyPanel
              frontmatter={selectedNote.frontmatter}
              onChange={handleFrontmatterChange}
            />
            <NoteEditor note={selectedNote} onSave={handleSave} />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
            Select a note to start editing
          </div>
        )}
      </div>
    );
  }

  if (activeView === "eisenhower") return <EisenhowerView />;

  if (activeView === "kanban") return <KanbanView />;

  return (
    <div className="flex flex-1 h-full items-center justify-center text-[var(--color-text-muted)]">
      <p>{activeView} view — coming soon</p>
    </div>
  );
}
