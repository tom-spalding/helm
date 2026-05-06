import { useState } from "react";
import { useUIStore, type View } from "../../store/ui";
import { TagTree } from "../sidebar/TagTree";
import { useNoteStore } from "../../store/notes";
import { NewNoteButton } from "../sidebar/NewNoteButton";
import { tauriCommands } from "../../lib/tauri-commands";
import { useThemeStore } from "../../store/theme";
import { THEMES } from "../../lib/themes";
import type { Note } from "../../types/note";
import { SettingsModal } from "../settings/SettingsModal";
import { addVault, removeVault } from "../../hooks/useVault";

const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "eisenhower", label: "Eisenhower", icon: "🎯" },
  { id: "kanban", label: "Kanban", icon: "📋" },
  { id: "graph", label: "Graph", icon: "🕸️" },
];

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

type NoteFilter = "all" | "locked" | "pinned" | string; // string = tag path

function filterAndSort(notes: Note[], filter: NoteFilter): Note[] {
  let filtered: Note[];
  if (filter === "locked") {
    filtered = notes.filter((n) => n.frontmatter.locked);
  } else if (filter === "pinned") {
    filtered = notes.filter((n) => n.frontmatter.pinned);
  } else if (filter !== "all") {
    // tag filter — match tag or any subtag
    filtered = notes.filter((n) =>
      n.frontmatter.tags.some(
        (t) => t === filter || t.startsWith(filter + "/")
      )
    );
  } else {
    filtered = notes;
  }
  return [...filtered].sort((a, b) => {
    const pinA = a.frontmatter.pinned ? 1 : 0;
    const pinB = b.frontmatter.pinned ? 1 : 0;
    if (pinB !== pinA) return pinB - pinA;
    return (b.frontmatter.updated || "").localeCompare(a.frontmatter.updated || "");
  });
}

export function LeftColumn() {
  const [collapsed, setCollapsed] = useState(false);
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [showSettings, setShowSettings] = useState(false);
  const { activeView, setView } = useUIStore();
  const { notes, tagTree, selectedNoteId, selectNote, removeNote, searchQuery, searchResults, search, vaults, activeVaultId, setActiveVaultId } =
    useNoteStore();
  const { theme, setTheme } = useThemeStore();

  // Apply vault filter first, then note filter
  const vaultFilteredNotes = activeVaultId
    ? notes.filter((n) => n.vaultId === activeVaultId)
    : notes;
  const visibleNotes = filterAndSort(vaultFilteredNotes, noteFilter);

  function setFilter(filter: NoteFilter) {
    setNoteFilter((prev) => (prev === filter ? "all" : filter));
  }

  function handleVaultClick(id: string) {
    setActiveVaultId(activeVaultId === id ? null : id);
  }

  async function handleAddVault() {
    try {
      const path = await tauriCommands.openFolderDialog();
      if (path) await addVault(path);
    } catch (e) {
      console.error("Failed to add vault:", e);
    }
  }

  async function handleRemoveVault(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const { confirm } = await import("@tauri-apps/plugin-dialog");
    const vault = vaults.find((v) => v.id === id);
    const confirmed = await confirm(
      `Remove vault "${vault?.name}"? Notes on disk are untouched.`,
      { title: "Remove Vault", kind: "warning" }
    );
    if (!confirmed) return;
    await removeVault(id);
  }

  async function handleDeleteNote(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    const { confirm } = await import("@tauri-apps/plugin-dialog");
    const confirmed = await confirm(`Delete "${note.frontmatter.title || "Untitled"}"? This cannot be undone.`, { title: "Delete Note", kind: "warning" });
    if (!confirmed) return;
    if (note.id === selectedNoteId) selectNote(null);
    removeNote(note.id);
    try {
      await tauriCommands.deleteNote(note.filePath);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  if (collapsed) {
    return (
      <div className="flex w-10 flex-col justify-end border-r border-[var(--color-border)]">
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

  const filterNavCls = (f: NoteFilter) =>
    `flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
      noteFilter === f
        ? "bg-[var(--color-surface)] text-[var(--color-text)]"
        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    }`;

  const vaultNavCls = (id: string) =>
    `group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
      activeVaultId === id
        ? "bg-[var(--color-surface)] text-[var(--color-text)]"
        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    }`;

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
                  onClick={() => { selectNote(n.id); setView("notes"); search(""); }}
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--color-surface)]"
                >
                  <span className="text-sm text-[var(--color-text)]">{n.frontmatter.title}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{n.frontmatter.tags.join(", ")}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden p-2">
        {/* View nav */}
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

        {/* Note filters */}
        <div className="mb-2 border-t border-[var(--color-border)] pt-2">
          <button className={filterNavCls("all")} onClick={() => setFilter("all")}>
            <span className="text-sm">≡</span>
            <span>All Notes</span>
            <span className="ml-auto text-xs opacity-40">{notes.length}</span>
          </button>

          <button className={filterNavCls("locked")} onClick={() => setFilter("locked")}>
            <LockIcon />
            <span>Locked</span>
            {notes.some((n) => n.frontmatter.locked) && (
              <span className="ml-auto text-xs opacity-40">
                {notes.filter((n) => n.frontmatter.locked).length}
              </span>
            )}
          </button>

          <button className={filterNavCls("pinned")} onClick={() => setFilter("pinned")}>
            <PinIcon />
            <span>Pinned</span>
            {notes.some((n) => n.frontmatter.pinned) && (
              <span className="ml-auto text-xs opacity-40">
                {notes.filter((n) => n.frontmatter.pinned).length}
              </span>
            )}
          </button>
        </div>

        {/* Vaults section */}
        <div className="mb-2 border-t border-[var(--color-border)] pt-2">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
            Vaults
          </p>
          {vaults.map((vault) => (
            <button
              key={vault.id}
              className={vaultNavCls(vault.id)}
              onClick={() => handleVaultClick(vault.id)}
            >
              <span className="shrink-0">📁</span>
              <span className="flex-1 truncate text-left">{vault.name}</span>
              <span className="text-xs opacity-40">
                {notes.filter((n) => n.vaultId === vault.id).length}
              </span>
              <span
                role="button"
                onClick={(e) => handleRemoveVault(vault.id, e)}
                title="Remove vault"
                className="ml-1 shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </button>
          ))}
          <button
            onClick={handleAddVault}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Vault</span>
          </button>
        </div>

        {/* New Note button */}
        <div className="mb-2">
          <NewNoteButton />
        </div>

        {/* Tag tree — tags only, no note names */}
        {Object.keys(tagTree).length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-2">
            <TagTree
              tree={tagTree}
              onSelectTag={(tag) => setFilter(tag)}
              activeTag={typeof noteFilter === "string" && !["all", "locked", "pinned"].includes(noteFilter) ? noteFilter : null}
            />
          </div>
        )}

        {/* Note list — filtered */}
        <div className="mt-2 border-t border-[var(--color-border)] pt-2 flex-1 overflow-y-auto min-h-0">
          {visibleNotes.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[var(--color-text-muted)]">No notes</p>
          ) : (
            visibleNotes.map((note) => (
              <div
                key={note.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors ${
                  note.id === selectedNoteId && activeView === "notes"
                    ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                }`}
              >
                {note.frontmatter.pinned && <span className="shrink-0 opacity-40"><PinIcon /></span>}
                {note.frontmatter.locked && <span className="shrink-0 opacity-40"><LockIcon /></span>}
                <button
                  className="flex-1 truncate text-left text-sm"
                  onClick={() => { selectNote(note.id); setView("notes"); }}
                >
                  {note.frontmatter.title || "Untitled"}
                </button>
                {!note.frontmatter.locked && (
                  <button
                    onClick={(e) => handleDeleteNote(note, e)}
                    title="Delete note"
                    className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer: theme picker + settings + collapse */}
      <div className="border-t border-[var(--color-border)] px-3 py-2 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              title={t.name}
              onClick={() => setTheme(t.id)}
              className="rounded-full transition-transform hover:scale-110"
              style={{
                width: 14,
                height: 14,
                background: t.swatch,
                outline: theme.id === t.id ? `2px solid ${t.swatch}` : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          title="Settings"
          className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Collapse
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
