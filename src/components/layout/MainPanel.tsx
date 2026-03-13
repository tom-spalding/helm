import { useNoteStore } from "../../store/notes";

export function MainPanel() {
  const selectedNote = useNoteStore((s) =>
    s.notes.find((n) => n.id === s.selectedNoteId)
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {selectedNote ? (
        <div className="p-8">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {selectedNote.frontmatter.title}
          </h1>
          <pre className="mt-4 text-sm text-[var(--color-text-muted)] whitespace-pre-wrap">
            {selectedNote.content}
          </pre>
        </div>
      ) : (
        <div className="flex flex-1 h-full items-center justify-center text-[var(--color-text-muted)]">
          Select a note to start editing
        </div>
      )}
    </div>
  );
}
