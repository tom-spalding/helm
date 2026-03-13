# Helm MCP Server

Exposes Helm notes vault to Claude via MCP protocol.

## Setup

```bash
cd mcp-server
npm install
```

## Add to Claude Desktop config

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "helm": {
      "command": "node",
      "args": ["--import", "tsx/esm", "/Users/jordan.papaleo/Projects/helm/mcp-server/index.ts"],
      "env": {
        "HELM_VAULT": "/Users/jordan.papaleo/notes"
      }
    }
  }
}
```

## Available tools

- `list_notes` — list notes, filter by tag/state/urgent/important
- `search_notes` — full-text search
- `get_eisenhower` — notes grouped by quadrant
- `create_note` — create a new note
- `update_note` — update content or frontmatter by ID
