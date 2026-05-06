import React, { useState, useMemo } from "react";
import { ulid } from "ulid";
import { useNoteStore } from "../../store/notes";
import { useUIStore } from "../../store/ui";
import { buildTree, getAllFolderPaths, type TreeNode } from "../../lib/file-tree";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { tauriCommands } from "../../lib/tauri-commands";
import { serializeNote } from "../../lib/note-parser";
import type { Note, VaultConfig } from "../../types/note";

interface Props {
  notes: Note[];
  vault: VaultConfig;
}

function NewFolderInput({ onCommit }: { onCommit: (name: string) => void }) {
  const committed = React.useRef(false);
  return (
    <div style={{ paddingLeft: 8 }} className="flex items-center gap-1.5 py-1 pr-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <input
        autoFocus
        placeholder="folder name"
        className="flex-1 rounded bg-[var(--color-bg)] px-1 text-sm text-[var(--color-text)] outline outline-1 outline-[var(--color-accent)]"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            committed.current = true;
            onCommit((e.target as HTMLInputElement).value.trim());
          }
          if (e.key === "Escape") {
            committed.current = true;
            onCommit("");
          }
          e.stopPropagation();
        }}
        onBlur={(e) => {
          if (!committed.current) onCommit(e.target.value.trim());
        }}
      />
    </div>
  );
}

type MenuState = { x: number; y: number; items: ContextMenuItem[] } | null;

export function FileTree({ notes, vault }: Props) {
  const { selectedNoteId, selectNote } = useNoteStore();
  const { setView } = useUIStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // renamingPath is scaffolded here; wired in a later task
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(notes, vault.path), [notes, vault.path]);
  // allFolders is scaffolded here for use in the "Move to…" context menu (later task)
  const allFolders = useMemo(() => getAllFolderPaths(tree, vault.path), [tree, vault.path]);

  // Suppress unused-variable warnings for scaffolded state until later tasks wire them up
  void renamingPath;
  void setRenamingPath;
  void allFolders;

  async function handleCreateNote(folderPath: string) {
    const id = ulid();
    const slug = `untitled-${id.slice(-8).toLowerCase()}`;
    const filePath = `${folderPath}/${slug}.md`;
    const fileName = `${slug}.md`;
    const today = new Date().toISOString().split("T")[0];

    const note: Note = {
      id,
      filePath,
      fileName,
      content: "",
      vaultId: vault.id,
      frontmatter: {
        id,
        title: "Untitled",
        created: today,
        updated: today,
        tags: [],
        urgent: false,
        important: false,
        state: "Prepare",
        blocked: false,
      },
    };

    try {
      await tauriCommands.writeNote(filePath, serializeNote(note));
      useNoteStore.getState().addNote(note);
      selectNote(id);
      setView("notes");
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }

  function toggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  function openNote(note: Note) {
    selectNote(note.id);
    setView("notes");
  }

  function renderNote(note: Note, depth: number) {
    const isSelected = note.id === selectedNoteId;
    return (
      <div
        style={{ paddingLeft: depth * 12 + 8 }}
        className={`group flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm transition-colors cursor-pointer ${
          isSelected
            ? "bg-[var(--color-surface)] text-[var(--color-text)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        }`}
        onClick={() => openNote(note)}
        onContextMenu={(e) => {
          e.preventDefault();
          // context menu wired in Task 6
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 shrink-0 opacity-50"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="flex-1 truncate">{note.frontmatter.title || note.fileName}</span>
        {note.frontmatter.pinned && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 shrink-0 opacity-40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
        )}
      </div>
    );
  }

  function renderFolder(
    node: Extract<TreeNode, { kind: "folder" }>,
    depth: number
  ) {
    const isOpen = expanded.has(node.path);
    return (
      <div>
        <div
          style={{ paddingLeft: depth * 12 + 8 }}
          className="group flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] cursor-pointer transition-colors"
          onClick={() => toggleFolder(node.path)}
          onContextMenu={(e) => {
            e.preventDefault();
            // context menu wired in Task 7
          }}
        >
          {/* Chevron rotates 90° when the folder is open */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 shrink-0 opacity-60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="flex-1 truncate">{node.name}</span>
        </div>
        {isOpen && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  function renderNode(node: TreeNode, depth = 0): React.ReactNode {
    if (node.kind === "folder") {
      return (
        <React.Fragment key={node.path}>
          {renderFolder(node, depth)}
        </React.Fragment>
      );
    }
    return (
      <React.Fragment key={node.note.id}>
        {renderNote(node.note, depth)}
      </React.Fragment>
    );
  }

  return (
    <div className="relative flex flex-col min-h-0 h-full">
      {/* Toolbar — New Note and New Folder buttons wired in Task 5 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
          Files
        </span>
        <div className="flex gap-2">
          <button
            title="New Note"
            className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            onClick={() => handleCreateNote(vault.path)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
          <button
            title="New Folder"
            className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            onClick={() => setNewFolderParent(vault.path)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {tree.length === 0 && (
          <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">No notes</p>
        )}
        {newFolderParent === vault.path && (
          <NewFolderInput
            onCommit={async (name) => {
              if (name) {
                try {
                  await tauriCommands.createFolder(`${vault.path}/${name}`);
                } catch (e) {
                  console.error("Failed to create folder:", e);
                }
              }
              setNewFolderParent(null);
            }}
          />
        )}
        {tree.map((node) => renderNode(node))}
      </div>

      {/* Context Menu — rendered at portal-like fixed position within this container */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
