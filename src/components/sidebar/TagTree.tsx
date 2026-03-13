import { useState } from "react";
import type { TagNode } from "../../store/notes";
import type { Note } from "../../types/note";

interface TagTreeProps {
  tree: Record<string, TagNode>;
  onSelectNote: (id: string) => void;
  selectedNoteId: string | null;
}

interface TagNodeItemProps {
  tag: string;
  node: TagNode;
  depth?: number;
  onSelectNote: (id: string) => void;
  selectedNoteId: string | null;
}

function TagNodeItem({
  tag,
  node,
  depth = 0,
  onSelectNote,
  selectedNoteId,
}: TagNodeItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ paddingLeft: `${depth * 12}px` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <span className="text-xs opacity-60">{expanded ? "▼" : "▶"}</span>
        <span>#{tag}</span>
        <span className="ml-auto text-xs opacity-40">{node.notes.length}</span>
      </button>

      {expanded && (
        <div>
          {node.notes.map((note: Note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`flex w-full truncate rounded px-2 py-1 text-sm text-left ${
                selectedNoteId === note.id
                  ? "bg-blue-600/20 text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              {note.frontmatter.title}
            </button>
          ))}

          {Object.entries(node.children).map(([childTag, childNode]) => (
            <TagNodeItem
              key={childTag}
              tag={childTag}
              node={childNode}
              depth={depth + 1}
              onSelectNote={onSelectNote}
              selectedNoteId={selectedNoteId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagTree({ tree, onSelectNote, selectedNoteId }: TagTreeProps) {
  return (
    <div>
      {Object.entries(tree)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, node]) => (
          <TagNodeItem
            key={tag}
            tag={tag}
            node={node}
            onSelectNote={onSelectNote}
            selectedNoteId={selectedNoteId}
          />
        ))}
    </div>
  );
}
