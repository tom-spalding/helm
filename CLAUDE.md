# Helm — Claude Code Context

Helm is a personal knowledge management desktop app. Tauri 2.x (Rust) for file I/O and OS integration, React 19 + TypeScript + Vite for 100% of the UI. Notes are plain `.md` files with YAML frontmatter stored in a local vault directory.

## Commands

```bash
npm run tauri dev       # start the full app (Rust + React)
npm run dev             # frontend only (no Tauri window)
npm test                # run Vitest tests
npm run test:watch      # tests in watch mode
npm run tauri build     # produce distributable .dmg
```

## Project Structure

```
src/
  components/
    editor/         # NoteEditor (TipTap), PropertyPanel, BacklinksPanel, WikiLink extension
    layout/         # LeftColumn (sidebar), MainPanel
    settings/       # SettingsModal
    sidebar/        # TagTree, NewNoteButton
  hooks/
    useVault.ts     # vault init, note loading, file watch listener
  lib/
    note-parser.ts  # parseNote, serializeNote, slugify (uses gray-matter)
    tauri-commands.ts # typed wrappers around Tauri invoke calls
    themes.ts       # 6 theme definitions + applyTheme
    settings.ts     # settings interface + applySettings
    search.ts       # MiniSearch index builder
  store/
    notes.ts        # Zustand: all notes, selectedNoteId, tagTree, search
    ui.ts           # Zustand: active view
    theme.ts        # Zustand: current theme (persisted to localStorage)
    settings.ts     # Zustand: typography settings (persisted to localStorage)
  types/
    note.ts         # Note, NoteFrontmatter, NoteState, EisenhowerQuadrant types
  views/
    DashboardView.tsx
    EisenhowerView.tsx
    KanbanView.tsx
    GraphView.tsx
src-tauri/
  src/
    lib.rs          # Tauri app entry, command registration
    vault.rs        # Rust commands: list_notes, read/write/delete/rename_note, watch_vault
mcp-server/
  index.ts          # MCP server for Claude Desktop: list_notes, search_notes, create_note, update_note, get_eisenhower
```

## Data Model

Each note is a `.md` file with YAML frontmatter:

```yaml
---
id: 01JPMXYZ123        # ULID — stable, survives renames
title: My Note
created: 2026-03-13
updated: 2026-03-13
tags: [work, work/project]
urgent: true
important: true
state: Doing           # Prepare | Doing | Maintain | Done
blocked: false
locked: false          # read-only in editor
pinned: false          # floats to top of lists
links: [01JPMXYZ456]   # ULID refs for zettelkasten graph
---

Markdown content here. You can use [[Wiki Links]] and #inline-tags.
```

## Key Conventions

- **IDs are ULIDs** — never use filenames as identifiers; notes can be renamed
- **Links use IDs** — `links` frontmatter stores ULIDs so renames never break the graph
- **Tauri commands** — all file I/O goes through `src/lib/tauri-commands.ts` (never use `fetch` or `fs` directly in React)
- **State management** — Zustand only; no React context for global state
- **Styling** — Tailwind CSS v4 utility classes + CSS custom properties for theming (`--color-bg`, `--color-surface`, `--color-accent`, etc.)
- **Auto-save** — editor saves on blur and debounced 1s; always call `serializeNote()` before writing to disk

## Themes

Six themes available via the theme store. Apply by calling `applyTheme(theme)` which sets CSS custom properties on `:root`. Theme persists to localStorage.

## MCP Server

`mcp-server/` is a standalone Node.js MCP server for Claude Desktop. It reads/writes the vault directly via the filesystem (not through Tauri). Configured via `HELM_VAULT` env var. Register in `~/Library/Application Support/Claude/claude_desktop_config.json`.

## Releasing

**Always use `release.sh` — never bump versions or run `npm run tauri build` manually.**

```bash
./release.sh patch   # 0.3.0 → 0.3.1
./release.sh minor   # 0.3.0 → 0.4.0
./release.sh major   # 0.3.0 → 1.0.0
```

Full process is documented in `CONTRIBUTING.md` under the **Releasing** section.

## Docs

- `docs/plans/2026-03-13-helm.md` — original implementation plan (fully executed)
- `docs/plans/2026-03-13-helm-design.md` — design document
- `docs/FEATURES.md` — full feature documentation
