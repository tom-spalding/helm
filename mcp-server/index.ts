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
  locked?: boolean;
  pinned?: boolean;
  deadline?: string;
  team?: string[];
  links?: string[];
  [key: string]: unknown;
}

function listMdFiles(): string[] {
  if (!fs.existsSync(VAULT_PATH)) return [];
  return fs.readdirSync(VAULT_PATH).filter((f) => f.endsWith(".md"));
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

const RULES = `
HELM VAULT RULES — always follow these:

1. LOCKED NOTES: Never modify a note where locked: true. Return an error instead.
2. IDs ARE ULIDs: Every note has a stable ULID id. Never use filenames as identifiers.
3. LINKS USE IDs: The 'links' frontmatter field stores ULIDs, not titles. Use resolve_note to get a ULID from a title before linking.
4. TAGS: Tags go in the 'tags' frontmatter array (e.g. ["work", "work/project"]) OR inline in the body as #tag or #parent/child. Both are valid.
5. STATES: Valid states are Prepare | Doing | Maintain | Done.
6. WIKI LINKS: Use [[Note Title]] syntax in body content to reference other notes.
7. DATES: Use YYYY-MM-DD format for created, updated, deadline fields.
`.trim();

const server = new Server(
  { name: "helm", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_rules",
      description: "Get the rules and conventions for working with this Helm vault. Call this first before creating or updating notes.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_notes",
      description: "List all notes in the Helm vault with their metadata. Optionally filter by tag, state, urgent, or important.",
      inputSchema: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Filter by tag" },
          state: { type: "string", enum: ["Prepare", "Doing", "Maintain", "Done"] },
          urgent: { type: "boolean" },
          important: { type: "boolean" },
        },
      },
    },
    {
      name: "read_note",
      description: "Read the full content and frontmatter of a note by its ULID. Use this before updating a note.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Note ULID" },
        },
        required: ["id"],
      },
    },
    {
      name: "resolve_note",
      description: "Look up a note's ULID by its title. Use this to get the correct ID before adding a link to another note.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title to search for (case-insensitive)" },
        },
        required: ["title"],
      },
    },
    {
      name: "search_notes",
      description: "Search notes by keyword across title, content, and tags.",
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
      description: "Get all notes grouped into Eisenhower matrix quadrants (do, schedule, delegate, eliminate).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "create_note",
      description: `Create a new note in the Helm vault. ${RULES}`,
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "Body content in markdown. Use [[Note Title]] for wiki links." },
          tags: { type: "array", items: { type: "string" }, description: "Tag array e.g. ['work', 'work/project']" },
          links: { type: "array", items: { type: "string" }, description: "Array of ULIDs to link to. Use resolve_note to get IDs first." },
          urgent: { type: "boolean" },
          important: { type: "boolean" },
          state: { type: "string", enum: ["Prepare", "Doing", "Maintain", "Done"] },
          deadline: { type: "string", description: "YYYY-MM-DD" },
          team: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      },
    },
    {
      name: "update_note",
      description: `Update a note's content or frontmatter by ULID. Will refuse if the note is locked. ${RULES}`,
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Note ULID" },
          content: { type: "string", description: "New full body content (optional)" },
          frontmatter: { type: "object", description: "Frontmatter fields to merge in (optional). Never set locked: false." },
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

  if (name === "get_rules") {
    return { content: [{ type: "text", text: RULES }] };
  }

  if (name === "list_notes") {
    let filtered = notes;
    if (args?.tag) filtered = filtered.filter((n) => n.frontmatter.tags?.includes(String(args.tag)));
    if (args?.state) filtered = filtered.filter((n) => n.frontmatter.state === args.state);
    if (args?.urgent !== undefined) filtered = filtered.filter((n) => n.frontmatter.urgent === args.urgent);
    if (args?.important !== undefined) filtered = filtered.filter((n) => n.frontmatter.important === args.important);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(
          filtered.map((n) => ({ ...n.frontmatter, preview: n.content.slice(0, 200) })),
          null, 2
        ),
      }],
    };
  }

  if (name === "read_note") {
    const id = String(args?.id);
    const note = notes.find((n) => n.frontmatter.id === id);
    if (!note) return { content: [{ type: "text", text: `Note not found: ${id}` }] };
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ frontmatter: note.frontmatter, content: note.content }, null, 2),
      }],
    };
  }

  if (name === "resolve_note") {
    const query = String(args?.title ?? "").toLowerCase();
    const matches = notes.filter((n) =>
      n.frontmatter.title?.toLowerCase().includes(query)
    );
    if (matches.length === 0) return { content: [{ type: "text", text: `No note found matching: "${args?.title}"` }] };
    return {
      content: [{
        type: "text",
        text: JSON.stringify(
          matches.map((n) => ({ id: n.frontmatter.id, title: n.frontmatter.title })),
          null, 2
        ),
      }],
    };
  }

  if (name === "search_notes") {
    const query = String(args?.query ?? "").toLowerCase();
    if (!query) return { content: [{ type: "text", text: "[]" }] };
    const results = notes.filter(
      (n) =>
        n.frontmatter.title?.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.frontmatter.tags?.some((t: string) => t.toLowerCase().includes(query))
    );
    return {
      content: [{
        type: "text",
        text: JSON.stringify(
          results.map((n) => ({ ...n.frontmatter, preview: n.content.slice(0, 200) })),
          null, 2
        ),
      }],
    };
  }

  if (name === "get_eisenhower") {
    const quadrants = {
      do: notes.filter((n) => n.frontmatter.urgent && n.frontmatter.important),
      schedule: notes.filter((n) => !n.frontmatter.urgent && n.frontmatter.important),
      delegate: notes.filter((n) => n.frontmatter.urgent && !n.frontmatter.important),
      eliminate: notes.filter((n) => !n.frontmatter.urgent && !n.frontmatter.important),
    };
    return {
      content: [{
        type: "text",
        text: JSON.stringify(
          Object.fromEntries(Object.entries(quadrants).map(([k, v]) => [k, v.map((n) => n.frontmatter)])),
          null, 2
        ),
      }],
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
      locked: false,
      links: (args?.links as string[]) ?? [],
      ...(args?.deadline ? { deadline: args.deadline } : {}),
      ...(args?.team ? { team: args.team } : {}),
    };

    const raw = matter.stringify(String(args?.content ?? ""), frontmatter);
    fs.writeFileSync(filePath, raw);

    return {
      content: [{ type: "text", text: `Created note: "${title}" (id: ${id})\nFile: ${filePath}` }],
    };
  }

  if (name === "update_note") {
    const id = String(args?.id);
    const note = notes.find((n) => n.frontmatter.id === id);
    if (!note) return { content: [{ type: "text", text: `Note not found: ${id}` }] };

    if (note.frontmatter.locked) {
      return {
        content: [{ type: "text", text: `Refused: "${note.frontmatter.title}" is locked. Unlock it in Helm first.` }],
      };
    }

    const updatedFrontmatter = {
      ...note.frontmatter,
      ...((args?.frontmatter as Record<string, unknown>) ?? {}),
      id, // never allow id to be overwritten
      locked: note.frontmatter.locked, // never allow locked to be changed via AI
      updated: new Date().toISOString().split("T")[0],
    };
    const content = args?.content !== undefined ? String(args.content) : note.content;

    const raw = matter.stringify(content, updatedFrontmatter);
    fs.writeFileSync(note.filePath, raw);

    return {
      content: [{ type: "text", text: `Updated note: "${updatedFrontmatter.title}"` }],
    };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
