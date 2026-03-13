import { useUIStore } from "../../store/ui";
import { useNoteStore } from "../../store/notes";
import { NoteEditor } from "../editor/NoteEditor";
import { serializeNote } from "../../lib/note-parser";
import { tauriCommands } from "../../lib/tauri-commands";

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

  if (activeView === "notes") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedNote ? (
          <>
            <div className="border-b border-[var(--color-border)] px-12 py-4">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                {selectedNote.frontmatter.title}
              </h1>
            </div>
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

  return (
    <div className="flex flex-1 h-full items-center justify-center text-[var(--color-text-muted)]">
      <p>{activeView} view — coming soon</p>
    </div>
  );
}
