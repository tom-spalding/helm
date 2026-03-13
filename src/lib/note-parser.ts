import matter from "gray-matter";
import type { Note, NoteFrontmatter } from "../types/note";

export function parseNote(raw: string, filePath: string): Note {
  const { data, content } = matter(raw);
  const fileName = filePath.split("/").pop() ?? "";

  const frontmatter: NoteFrontmatter = {
    id: data.id ?? "",
    title: data.title ?? "",
    created: data.created ?? new Date().toISOString().split("T")[0],
    updated: data.updated ?? new Date().toISOString().split("T")[0],
    tags: data.tags ?? [],
    urgent: data.urgent ?? false,
    important: data.important ?? false,
    state: data.state ?? "Prepare",
    blocked: data.blocked ?? false,
    deadline: data.deadline,
    team: data.team,
    links: data.links ?? [],
    ...data, // preserve unknown fields
  };

  return { id: frontmatter.id, frontmatter, content, filePath, fileName };
}

export function serializeNote(note: Note): string {
  // js-yaml cannot serialize undefined values; strip them out before dumping
  const data = Object.fromEntries(
    Object.entries(note.frontmatter).filter(([, v]) => v !== undefined)
  );
  return matter.stringify(note.content, data);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function noteFilePath(vaultPath: string, title: string): string {
  return `${vaultPath}/${slugify(title)}.md`;
}
