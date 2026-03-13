import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const VAULT_PATH =
  process.env.HELM_VAULT ?? `${process.env.HOME}/notes`;

interface NoteData {
  id: string;
  title: string;
  tags: string[];
  urgent: boolean;
  important: boolean;
  state: string;
  blocked: boolean;
  deadline?: string;
  team?: string[];
  links?: string[];
  [key: string]: unknown;
}

function listMdFiles(): string[] {
  if (!fs.existsSync(VAULT_PATH)) return [];
  return fs
    .readdirSync(VAULT_PATH)
    .filter((f) => f.endsWith(".md"));
}

function readNote(fileName: string): {
  frontmatter: NoteData;
  content: string;
  filePath: string;
  fileName: string;
} {
  const filePath = path.join(VAULT_PATH, fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { frontmatter: data as NoteData, content, filePath, fileName };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const server = new Server(
  { name: "helm", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_notes",
      description:
        "List all notes in the Helm vault, optionally filtered by tag, state, urgent, or important",
      inputSchema: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Filter by tag" },
          state: {
            type: "string",
            enum: ["Prepare", "Doing", "Maintain", "Done"],
            description: "Filter by state",
          },
          urgent: { type: "boolean", description: "Filter by urgent flag" },
          important: {
            type: "boolean",
            description: "Filter by important flag",
          },
        },
      },
    },
    {
      name: "search_notes",
      description: "Search notes by keyword across title, content, and tags",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_eisenhower",
      description:
        "Get all notes grouped into Eisenhower matrix quadrants (do, schedule, delegate, eliminate)",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "create_note",
      description: "Create a new note in the Helm vault",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          content: {
            type: "string",
            description: "Note body content in markdown",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags for the note",
          },
          urgent: { type: "boolean" },
          important: { type: "boolean" },
          state: {
            type: "string",
            enum: ["Prepare", "Doing", "Maintain", "Done"],
          },
        },
        required: ["title"],
      },
    },
    {
      name: "update_note",
      description: "Update a note's content or frontmatter by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Note ULID" },
          content: { type: "string", description: "New content (optional)" },
          frontmatter: {
            type: "object",
            description: "Frontmatter fields to update (optional)",
          },
        },
        required: ["id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const files = listMdFiles();
  const notes = files.map(readNote);

  if (name === "list_notes") {
    let filtered = notes;
    if (args?.tag)
      filtered = filtered.filter((n) =>
        n.frontmatter.tags?.includes(String(args.tag))
      );
    if (args?.state)
      filtered = filtered.filter(
        (n) => n.frontmatter.state === args.state
      );
    if (args?.urgent !== undefined)
      filtered = filtered.filter(
        (n) => n.frontmatter.urgent === args.urgent
      );
    if (args?.important !== undefined)
      filtered = filtered.filter(
        (n) => n.frontmatter.important === args.important
      );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            filtered.map((n) => ({
              ...n.frontmatter,
              content: n.content.slice(0, 200),
            })),
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "search_notes") {
    const query = String(args?.query ?? "").toLowerCase();
    if (!query) return { content: [{ type: "text", text: "[]" }] };
    const results = notes.filter(
      (n) =>
        n.frontmatter.title?.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.frontmatter.tags?.some((t: string) =>
          t.toLowerCase().includes(query)
        )
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            results.map((n) => ({
              ...n.frontmatter,
              content: n.content.slice(0, 200),
            })),
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_eisenhower") {
    const quadrants = {
      do: notes.filter(
        (n) => n.frontmatter.urgent && n.frontmatter.important
      ),
      schedule: notes.filter(
        (n) => !n.frontmatter.urgent && n.frontmatter.important
      ),
      delegate: notes.filter(
        (n) => n.frontmatter.urgent && !n.frontmatter.important
      ),
      eliminate: notes.filter(
        (n) => !n.frontmatter.urgent && !n.frontmatter.important
      ),
    };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            Object.fromEntries(
              Object.entries(quadrants).map(([k, v]) => [
                k,
                v.map((n) => n.frontmatter),
              ])
            ),
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "create_note") {
    const { ulid } = await import("ulid");
    const id = ulid();
    const title = String(args?.title ?? "Untitled");
    const slug = slugify(title);
    const filePath = path.join(VAULT_PATH, `${slug}-${id.slice(-6).toLowerCase()}.md`);

    const frontmatter = {
      id,
      title,
      created: new Date().toISOString().split("T")[0],
      updated: new Date().toISOString().split("T")[0],
      tags: (args?.tags as string[]) ?? [],
      urgent: (args?.urgent as boolean) ?? false,
      important: (args?.important as boolean) ?? false,
      state: (args?.state as string) ?? "Prepare",
      blocked: false,
      links: [],
    };

    const raw = matter.stringify(String(args?.content ?? ""), frontmatter);
    fs.writeFileSync(filePath, raw);

    return {
      content: [
        { type: "text", text: `Created note: "${title}" (id: ${id})` },
      ],
    };
  }

  if (name === "update_note") {
    const id = String(args?.id);
    const note = notes.find((n) => n.frontmatter.id === id);
    if (!note) {
      return {
        content: [{ type: "text", text: `Note not found: ${id}` }],
      };
    }

    const updatedFrontmatter = {
      ...note.frontmatter,
      ...((args?.frontmatter as Record<string, unknown>) ?? {}),
      updated: new Date().toISOString().split("T")[0],
    };
    const content =
      args?.content !== undefined
        ? String(args.content)
        : note.content;

    const raw = matter.stringify(content, updatedFrontmatter);
    fs.writeFileSync(note.filePath, raw);

    return {
      content: [
        {
          type: "text",
          text: `Updated note: "${updatedFrontmatter.title}"`,
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
