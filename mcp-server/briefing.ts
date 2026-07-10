/**
 * Rules-based daily briefing for the MCP server.
 * KEEP IN SYNC with src/lib/briefing.ts — same buckets, windows, and ordering.
 */

interface BriefingFrontmatter {
  id: string;
  state: string;
  blocked: boolean;
  updated: string;
  deadline?: string;
  [key: string]: unknown;
}

interface BriefingNote {
  frontmatter: BriefingFrontmatter;
}

export interface Briefing<N extends BriefingNote = BriefingNote> {
  doing: N[];
  blocked: N[];
  overdue: N[];
  dueSoon: N[];
  staleDoing: N[];
}

const DUE_SOON_DAYS = 7;
const STALE_DAYS = 14;

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

export function buildBriefing<N extends BriefingNote>(notes: N[], today: string): Briefing<N> {
  const open = notes.filter((n) => n.frontmatter.state !== "Done");
  const withDeadline = open.filter((n) => n.frontmatter.deadline);
  const byDeadline = (a: N, b: N) =>
    (a.frontmatter.deadline ?? "").localeCompare(b.frontmatter.deadline ?? "");

  const dueSoonCutoff = addDays(today, DUE_SOON_DAYS);
  const staleCutoff = addDays(today, -STALE_DAYS);

  return {
    doing: open.filter((n) => n.frontmatter.state === "Doing"),
    blocked: open.filter((n) => n.frontmatter.blocked),
    overdue: withDeadline
      .filter((n) => (n.frontmatter.deadline as string) < today)
      .sort(byDeadline),
    dueSoon: withDeadline
      .filter((n) => {
        const d = n.frontmatter.deadline as string;
        return d >= today && d <= dueSoonCutoff;
      })
      .sort(byDeadline),
    staleDoing: open
      .filter((n) => n.frontmatter.state === "Doing" && n.frontmatter.updated <= staleCutoff)
      .sort((a, b) => a.frontmatter.updated.localeCompare(b.frontmatter.updated)),
  };
}
