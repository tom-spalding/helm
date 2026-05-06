# File Tree View — Design Spec

**Date:** 2026-05-06  
**Status:** Approved

---

## Overview

Replace the flat note list in the sidebar with a folder-based file tree, matching the explorer UX familiar from Cursor/VS Code. Notes are organized by their vault directory structure. The tree supports expand/collapse, drag-and-drop to move notes, inline rename, and a full right-click context menu.

---

## Architecture

### Where it lives

The file tree replaces the note list section at the bottom of the left sidebar (`LeftColumn.tsx`). All other sidebar elements are unchanged: search, view nav, note filters (All / Locked / Pinned), vault switcher, tag tree, theme picker, and settings.

### Data model

No new Zustand state. The tree is derived at render time from the existing `notes` array using a pure utility function:

```ts
buildTree(notes: Note[], vaultPath: string): TreeNode[]
```

`TreeNode` is a discriminated union:

```ts
type TreeNode =
  | { kind: "folder"; name: string; path: string; children: TreeNode[] }
  | { kind: "note"; note: Note }
```

`buildTree` groups notes by their `filePath` relative to the active vault root, producing a nested tree sorted folders-first then alphabetically.

### New component

`src/components/sidebar/FileTree.tsx` — self-contained. Receives `notes`, `vaultPath`, `selectedNoteId`, and callbacks (`onSelectNote`, `onMoveNote`, `onRenameNote`, `onDeleteNote`, `onCreateNote`, `onCreateFolder`, `onDeleteFolder`). Manages its own expanded/collapsed state via `useState<Set<string>>`.

---

## Toolbar

A slim header renders above the tree inside the FILES section:

```
FILES                          [📄+]  [📁+]
```

- **New Note** (📄+) — creates a note inside the folder containing the currently selected note, or at vault root if no note is selected.
- **New Folder** (📁+) — inserts an inline input inside the folder containing the currently selected note (or vault root). Pressing Enter calls `create_folder`, Escape cancels.

These mirror the icons in the Cursor screenshot provided as reference.

---

## Context Menu

Implemented as a `ContextMenu` component that renders a fixed-position overlay on right-click, dismissed on outside click or Escape.

### On a note

| Item | Action |
|---|---|
| Open | `selectNote(id)`, `setView("notes")` |
| New Note Here | Create note in same folder as this note |
| Pin / Unpin | Toggle `pinned` frontmatter, write note to disk |
| Rename | Activate inline edit on the label |
| Move to… | Open submenu listing all folders + root |
| ─── | |
| Delete | Confirm dialog → `deleteNote`, remove from store |

### On a folder

| Item | Action |
|---|---|
| New Note Here | Create note inside this folder |
| New Subfolder | Inline input inside this folder |
| Rename | Inline edit on the folder label |
| ─── | |
| Delete | Confirm if non-empty → `delete_folder` (file watcher picks up the removal automatically) |

### Move to… submenu

Appears as a cascading panel on hover/click of the Move to… item. Lists:
- `/ (root)` — vault root
- One entry per folder in the vault (flat list, alphabetical)

Selecting a destination calls `rename_note(oldPath, destinationFolder + "/" + filename)` and updates `filePath` in the store.

---

## Inline Rename

Triggered by context menu "Rename" or pressing **F2** while a node is focused.

1. The node label is replaced with an `<input>` pre-filled with the current name.
2. On **Enter** or **blur**: call `rename_note(oldPath, newPath)`, update `filePath` in store.
3. On **Escape**: cancel, restore label.
4. For notes: new filename = `slug(newTitle) + ".md"`. Frontmatter `title` is also updated.
5. For folders: `rename_note` is not used — a new `rename_folder` Rust command renames the directory. All affected note `filePath` values are updated in the store.

---

## Drag and Drop

Uses **dnd-kit** (already installed). Notes are draggable; folders are drop targets.

- Dragging a note over a folder highlights the folder as a drop target.
- On drop: calls `rename_note(note.filePath, targetFolderPath + "/" + filename)`, updates `filePath` in store.
- Dragging to `/ (root)` moves the note to the vault root.
- Folders are not draggable in v1 (only notes move).

---

## Rust Additions

Three new commands added to `src-tauri/src/vault.rs`:

```rust
#[tauri::command]
pub async fn create_folder(path: String) -> Result<(), String> {
    let p = validate_path(&path)?;
    fs::create_dir_all(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_folder(path: String) -> Result<(), String> {
    let p = validate_path(&path)?;
    fs::remove_dir_all(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_folder(old_path: String, new_path: String) -> Result<(), String> {
    let old = validate_path(&old_path)?;
    let new = validate_path(&new_path)?;
    fs::rename(&old, &new).map_err(|e| e.to_string())
}
```

All three registered in `lib.rs`. Typed wrappers added to `src/lib/tauri-commands.ts`.

`delete_folder` on a non-empty folder: the confirmation dialog is handled on the frontend (Tauri dialog plugin, same pattern as `handleDeleteNote`). The Rust command does not check emptiness — it trusts the frontend guard.

---

## What stays the same

- Search, view nav, note filters (All / Locked / Pinned), vault switcher, tag tree, theme picker, settings — all unchanged.
- Note IDs remain ULIDs. Rename/move updates `filePath` only; backlinks and frontmatter `links` are unaffected.
- The file watcher (`watch_vault`) is already `RecursiveMode::Recursive` (updated in recent commit), so moves and new folders are picked up automatically.

---

## Out of scope (v1)

- Dragging folders
- Multi-select
- Cut / Copy / Paste
- Sorting options (name, date)
