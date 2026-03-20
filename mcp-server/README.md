# Helm MCP Server

Exposes your Helm vault(s) to Claude and any other MCP-compatible AI tool. Supports full CRUD, zettelkasten graph navigation, multi-vault, and built-in prompts for common workflows.

## Setup

```bash
cd mcp-server
npm install
```

## Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "helm": {
      "command": "node",
      "args": ["--import", "tsx/esm", "/absolute/path/to/helm/mcp-server/index.ts"],
      "env": {
        "HELM_VAULT": "/absolute/path/to/your/notes"
      }
    }
  }
}
```

### Multiple vaults

Use `HELM_VAULTS` (comma-separated) instead of `HELM_VAULT`:

```json
"env": {
  "HELM_VAULTS": "/path/to/personal,/path/to/work"
}
```

## Tools

| Tool | Description |
|------|-------------|
| `get_rules` | Vault conventions — call this first in any session |
| `list_notes` | List notes with rich filtering (tag, state, quadrant, blocked, pinned, overdue, team member, vault) |
| `read_note` | Full content + frontmatter + derived info (wiki links, inline tags, quadrant, overdue) |
| `resolve_note` | Turn a title into a ULID — use before linking |
| `search_notes` | Keyword search across title, content, tags with relevance ranking |
| `get_eisenhower` | Active notes grouped into the 4 Eisenhower quadrants |
| `get_kanban` | All notes grouped by state (Prepare / Doing / Maintain / Done) |
| `get_backlinks` | Find all notes that link TO a given note (inbound references) |
| `get_tag_tree` | Hierarchical tag tree with note counts |
| `create_note` | Create a note with full frontmatter support |
| `update_note` | Update content/frontmatter — use `append_tags`/`append_links` to safely add without overwriting |
| `delete_note` | Permanently delete a note (refuses if locked) |

## Resources

Every note is exposed as a resource at `note://{ulid}`. AI clients that support MCP resources can read notes directly without tool calls.

## Prompts

Built-in prompt templates for common workflows:

| Prompt | Description |
|--------|-------------|
| `capture` | Quickly capture an idea or task into the vault |
| `daily_standup` | Generate a standup from Doing notes + blockers + overdue |
| `weekly_review` | Full weekly review across all quadrants |
| `project_brief` | Status brief for all notes under a given tag |

## Note conventions

```yaml
---
id: 01JPMXYZ123          # ULID — stable, survives renames
title: My Note
created: 2026-03-13      # YYYY-MM-DD
updated: 2026-03-13      # set automatically on every write
tags: [work, work/project]  # hierarchical with /
urgent: true
important: true
state: Prepare           # Prepare | Doing | Maintain | Done
blocked: false
locked: false            # if true, MCP server refuses all writes
pinned: false
deadline: 2026-03-20     # YYYY-MM-DD
team: [Alice, Bob]
links: [01JPMXYZ456]     # ULIDs of related notes
---

Markdown body. Use [[Note Title]] for wiki links and #tag for inline tags.
```

**Key rules:**
- Always use ULIDs as identifiers, never filenames
- Call `resolve_note` before adding to `links`
- `update_note` does a **shallow merge** — use `append_tags`/`append_links` to add without replacing
- `locked: true` notes are read-only — unlock in the Helm app first
