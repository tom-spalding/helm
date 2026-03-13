# Helm — Design Document

**Date:** 2026-03-13
**Status:** Approved

## Overview

Helm is a personal knowledge management desktop app. Markdown files on disk, Claude-accessible, beautiful to write in. The simplicity and feel of Bear, structured views from Notion (Eisenhower matrix, Kanban, dashboard), and zettelkasten relationship discovery — all backed by plain `.md` files you own.

---

## Platform

**Tauri 2.x + React 18 + TypeScript + Vite**

- Tauri handles file system ops, file watching, window management, and `.dmg` packaging
- React/TypeScript for 100% of the UI
- Distribution: signed `.dmg` — coworkers download and double-click, no Node required
- Each person runs their own copy with their own vault

---

## Data Model

One `.md` file per note. YAML frontmatter carries all structured data.

```yaml
---
id: 01JPMXYZ123          # ULID — stable, sortable, survives file renames
title: Rule Builder
created: 2026-03-13
updated: 2026-03-13
tags: [Code, CE, Portfolio Management]
urgent: true
important: true
state: Doing             # Prepare | Doing | Maintain | Done
blocked: false
deadline: 2026-04-01     # optional
team: [CE, RL]
links: [01JPMXYZ456, 01JPMXYZ789]  # zettelkasten backlinks by ULID
---

Your markdown content here...
```

**Key decisions:**
- `id` is a ULID — sortable, collision-free, stable even when files are renamed
- `links` uses IDs not filenames so renaming never breaks zettelkasten relationships
- `state` drives Kanban columns
- `urgent` + `important` drive Eisenhower quadrants
- Frontmatter is extensible — any additional field is preserved and surfaced

**Vault:** `~/notes/` by default, configurable on first launch. Tauri watches for external changes (Claude Code, VS Code edits) and reloads notes live.

---

## UI Layout

Three-region layout: left column (unified tree) + main panel.

```
┌───────────────────┬──────────────────────────────────────────┐
│  🔍 Search        │                                          │
│  ─────────────── │   # Rule Builder                         │
│  All Notes        │                                          │
│  Dashboard        │   urgent: true  |  important: true       │
│  Eisenhower       │   state: Doing  |  tags: Code, CE        │
│  Kanban           │                                          │
│  ─────────────── │   ─────────────────────────────────────  │
│  ▼ #rl            │                                          │
│    ▶ #adr         │   Beautiful markdown content here...     │
│    ▶ #ai          │                                          │
│    ▼ #ce          │                                          │
│        Rule Build │                                          │
│        CE Tooling │                                          │
│  ▶ #code          │                                          │
│  ▶ #influence     │                                          │
└───────────────────┴──────────────────────────────────────────┘
```

**Left column:**
- Search at top
- Named views: All Notes, Dashboard, Eisenhower, Kanban
- Unified collapsible tag tree — tags nest, notes appear as leaves
- Tag hierarchy derived from frontmatter (e.g. `rl/ce` or combined tags)
- Collapsible entirely for focus mode

**Main panel:**
- **Editor view:** TipTap markdown editor with WYSIWYG-ish rendering (raw on focus, rendered on blur like Bear). Frontmatter rendered as a clean property panel above content — not raw YAML.
- **Dashboard view:** Captain's Log style donut charts (task distribution by type/team), recent activity
- **Eisenhower view:** 2×2 grid, cards draggable between quadrants, dropping updates `urgent`/`important` frontmatter
- **Kanban view:** Columns are `state` values (Prepare → Doing → Maintain → Done), cards draggable across columns
- **Graph view:** Force-directed zettelkasten relationship graph via `links` field

---

## Key Libraries

| Concern | Library |
|---|---|
| Markdown editor | TipTap |
| Frontmatter parsing | gray-matter |
| Search | minisearch |
| Drag & drop | @dnd-kit |
| Charts | recharts |
| Zettelkasten graph | react-force-graph |
| Unique IDs | ulid |
| Styling | Tailwind CSS |
| File watching | Tauri built-in fs + watch |

No heavy UI framework — custom components with Tailwind for a Bear-like feel.

---

## Claude / MCP Integration

Notes are plain `.md` files — Claude Code has full access by default.

A built-in MCP server ships with Helm and exposes:

```
search_notes(query, filters?)     → matching notes with frontmatter
create_note(title, frontmatter)   → creates a new .md file in vault
update_note(id, content?)         → update content or frontmatter fields
list_notes(filter?)               → filter by tag, state, urgent, important
get_eisenhower()                  → all 4 quadrants with tasks
get_backlinks(id)                 → notes that link to a given note ID
```

Registered in `claude_desktop_config.json`. Enables Claude to query, create, and update notes conversationally.

---

## Future Considerations

- **iOS/iPadOS:** Tauri does not currently support iOS. Future path would be a companion SwiftUI app reading the same vault (via iCloud Drive sync) or a React Native port.
- **Handwriting:** Apple Pencil support deferred to the iOS companion app.
- **Sharing/distribution:** Mac App Store or direct `.dmg` download via GitHub Releases.
