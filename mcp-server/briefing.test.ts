import { describe, expect, it } from "vitest";
import { buildBriefing } from "./briefing";

const TODAY = "2026-07-10";

function fm(overrides: Record<string, unknown> = {}) {
  return {
    id: "01A",
    title: "t",
    created: "2026-07-01",
    updated: TODAY,
    tags: [] as string[],
    urgent: false,
    important: false,
    state: "Prepare",
    blocked: false,
    ...overrides,
  };
}

describe("MCP buildBriefing", () => {
  it("buckets doing, blocked, overdue, dueSoon, staleDoing and excludes Done", () => {
    const notes = [
      { frontmatter: fm({ id: "doing", state: "Doing" }) },
      { frontmatter: fm({ id: "blocked", blocked: true }) },
      { frontmatter: fm({ id: "late", deadline: "2026-07-01" }) },
      { frontmatter: fm({ id: "soon", deadline: "2026-07-15" }) },
      { frontmatter: fm({ id: "stale", state: "Doing", updated: "2026-06-01" }) },
      { frontmatter: fm({ id: "done", state: "Done", blocked: true, deadline: "2020-01-01" }) },
    ];
    const b = buildBriefing(notes, TODAY);
    expect(b.doing.map((n) => n.frontmatter.id)).toEqual(["doing", "stale"]);
    expect(b.blocked.map((n) => n.frontmatter.id)).toEqual(["blocked"]);
    expect(b.overdue.map((n) => n.frontmatter.id)).toEqual(["late"]);
    expect(b.dueSoon.map((n) => n.frontmatter.id)).toEqual(["soon"]);
    expect(b.staleDoing.map((n) => n.frontmatter.id)).toEqual(["stale"]);
  });

  it("dueSoon window is today through today+7 inclusive", () => {
    const notes = [
      { frontmatter: fm({ id: "today", deadline: TODAY }) },
      { frontmatter: fm({ id: "edge", deadline: "2026-07-17" }) },
      { frontmatter: fm({ id: "out", deadline: "2026-07-18" }) },
    ];
    const b = buildBriefing(notes, TODAY);
    expect(b.dueSoon.map((n) => n.frontmatter.id)).toEqual(["today", "edge"]);
  });
});
