import { useState } from "react";
import { useUIStore, type View } from "../../store/ui";
import { TagTree } from "../sidebar/TagTree";
import { useNoteStore } from "../../store/notes";

const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: "notes", label: "All Notes", icon: "📝" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "eisenhower", label: "Eisenhower", icon: "🎯" },
  { id: "kanban", label: "Kanban", icon: "📋" },
  { id: "graph", label: "Graph", icon: "🕸️" },
];

export function LeftColumn() {
  const [collapsed, setCollapsed] = useState(false);
  const { activeView, setView } = useUIStore();
  const { tagTree, selectedNoteId, selectNote, searchQuery, searchResults, search } = useNoteStore();

  if (collapsed) {
    return (
      <div className="flex w-10 flex-col border-r border-[var(--color-border)]">
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          title="Expand sidebar"
        >
          →
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border-r border-[var(--color-border)]"
      style={{ width: "var(--sidebar-width)", minWidth: "var(--sidebar-width)" }}
    >
      {/* Search */}
      <div className="relative border-b border-[var(--color-border)] p-3">
        <input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => search(e.target.value)}
          className="w-full rounded-md bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none"
        />
        {searchQuery && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl">
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No results</p>
            ) : (
              searchResults.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    selectNote(n.id);
                    setView("notes");
                    search("");
                  }}
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--color-surface)]"
                >
                  <span className="text-sm text-[var(--color-text)]">{n.frontmatter.title}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {n.frontmatter.tags.join(", ")}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Named views */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                activeView === v.id
                  ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-2 border-t border-[var(--color-border)] pt-2">
          <TagTree
            tree={tagTree}
            onSelectNote={(id) => {
              selectNote(id);
              setView("notes");
            }}
            selectedNoteId={selectedNoteId}
          />
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(true)}
        className="border-t border-[var(--color-border)] p-2 text-left text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        ← Collapse
      </button>
    </div>
  );
}
