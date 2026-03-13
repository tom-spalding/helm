import { useNoteStore } from "../../store/notes";
import type { Note } from "../../types/note";

interface BacklinksPanelProps {
  note: Note;
}

export function BacklinksPanel({ note }: BacklinksPanelProps) {
  const { notes, selectNote } = useNoteStore();

  // Notes that link TO this note (backlinks)
  const backlinks = notes.filter(
    (n) => n.id !== note.id && (n.frontmatter.links ?? []).includes(note.id)
  );

  // Notes this note links TO (outgoing)
  const outgoing = (note.frontmatter.links ?? [])
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is Note => n !== undefined);

  if (backlinks.length === 0 && outgoing.length === 0) return null;

  return (
    <div className="border-t border-[var(--color-border)] px-12 py-4 text-sm">
      {outgoing.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Links to
          </p>
          <div className="flex flex-col gap-1">
            {outgoing.map((n) => (
              <button
                key={n.id}
                onClick={() => selectNote(n.id)}
                className="text-left text-sm text-[var(--color-accent)] hover:opacity-80"
              >
                → {n.frontmatter.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {backlinks.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Backlinks
          </p>
          <div className="flex flex-col gap-1">
            {backlinks.map((n) => (
              <button
                key={n.id}
                onClick={() => selectNote(n.id)}
                className="text-left text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ← {n.frontmatter.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
