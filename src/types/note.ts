export type NoteState = "Prepare" | "Doing" | "Maintain" | "Done";

export interface NoteFrontmatter {
  id: string;           // ULID
  title: string;
  created: string;      // ISO date string
  updated: string;      // ISO date string
  tags: string[];
  urgent: boolean;
  important: boolean;
  state: NoteState;
  blocked: boolean;
  deadline?: string;    // ISO date string, optional
  team?: string[];
  links?: string[];     // ULIDs of linked notes
  [key: string]: unknown; // allow arbitrary extra fields
}

export interface Note {
  id: string;
  frontmatter: NoteFrontmatter;
  content: string;      // markdown body (without frontmatter)
  filePath: string;     // absolute path on disk
  fileName: string;     // e.g. "rule-builder.md"
}

export type EisenhowerQuadrant =
  | "do"        // urgent + important
  | "schedule"  // not urgent + important
  | "delegate"  // urgent + not important
  | "eliminate"; // not urgent + not important

export function getQuadrant(note: Note): EisenhowerQuadrant {
  const { urgent, important } = note.frontmatter;
  if (urgent && important) return "do";
  if (!urgent && important) return "schedule";
  if (urgent && !important) return "delegate";
  return "eliminate";
}
