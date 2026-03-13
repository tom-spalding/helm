import { ulid } from "ulid";
import { useNoteStore } from "../../store/notes";
import { noteFilePath, serializeNote } from "../../lib/note-parser";
import { tauriCommands } from "../../lib/tauri-commands";
import { useUIStore } from "../../store/ui";
import type { Note } from "../../types/note";

export function NewNoteButton() {
  const { vaultPath, addNote, selectNote } = useNoteStore();
  const { setView } = useUIStore();

  async function handleCreate() {
    if (!vaultPath) return;

    const id = ulid();
    const title = "Untitled";
    // Use id suffix to avoid filename collisions with other "Untitled" notes
    const filePath = noteFilePath(vaultPath, `untitled-${id.slice(-8).toLowerCase()}`);
    const fileName = filePath.split("/").pop()!;

    const note: Note = {
      id,
      filePath,
      fileName,
      content: "",
      frontmatter: {
        id,
        title,
        created: new Date().toISOString().split("T")[0],
        updated: new Date().toISOString().split("T")[0],
        tags: [],
        urgent: false,
        important: false,
        state: "Prepare",
        blocked: false,
        links: [],
      },
    };

    try {
      await tauriCommands.writeNote(filePath, serializeNote(note));
      addNote(note);
      selectNote(id);
      setView("notes");
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }

  return (
    <button
      onClick={handleCreate}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
    >
      <span className="text-base leading-none">+</span>
      <span>New Note</span>
    </button>
  );
}
