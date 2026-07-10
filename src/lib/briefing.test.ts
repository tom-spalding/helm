import { describe, expect, it } from "vitest";
import type { Note } from "../types/note";
import { buildBriefing } from "./briefing";

const TODAY = "2026-07-10";

function makeNote(overrides: Partial<Note["frontmatter"]> = {}, id = "n1"): Note {
  const frontmatter = {
    id,
    title: `Note ${id}`,
    created: "2026-07-01",
    updated: TODAY,
    tags: [],
    urgent: false,
    important: false,
    state: "Prepare" as const,
    blocked: false,
    links: [],
    ...overrides,
  };
  return {
    id,
    filePath: `/vault/${id}.md`,
    fileName: `${id}.md`,
    content: "",
    vaultId: "v1",
    frontmatter,
  };
}

describe("buildBriefing", () => {
  it("collects notes in the Doing state", () => {
    const notes = [makeNote({ state: "Doing" }, "a"), makeNote({ state: "Prepare" }, "b")];
    const b = buildBriefing(notes, TODAY);
    expect(b.doing.map((n) => n.id)).toEqual(["a"]);
  });

  it("collects blocked notes, excluding Done", () => {
    const notes = [
      makeNote({ blocked: true }, "a"),
      makeNote({ blocked: true, state: "Done" }, "b"),
      makeNote({ blocked: false }, "c"),
    ];
    const b = buildBriefing(notes, TODAY);
    expect(b.blocked.map((n) => n.id)).toEqual(["a"]);
  });

  it("splits deadlines into overdue and due-soon at today", () => {
    const notes = [
      makeNote({ deadline: "2026-07-09" }, "past"),
      makeNote({ deadline: TODAY }, "today"),
      makeNote({ deadline: "2026-07-17" }, "week"),
      makeNote({ deadline: "2026-07-18" }, "later"),
    ];
    const b = buildBriefing(notes, TODAY);
    expect(b.overdue.map((n) => n.id)).toEqual(["past"]);
    // deadline today through today+7 counts as due soon; beyond that is out
    expect(b.dueSoon.map((n) => n.id)).toEqual(["today", "week"]);
  });

  it("excludes Done notes from deadline buckets", () => {
    const notes = [
      makeNote({ deadline: "2026-07-01", state: "Done" }, "a"),
      makeNote({ deadline: TODAY, state: "Done" }, "b"),
    ];
    const b = buildBriefing(notes, TODAY);
    expect(b.overdue).toHaveLength(0);
    expect(b.dueSoon).toHaveLength(0);
  });

  it("sorts overdue and due-soon by deadline ascending", () => {
    const notes = [
      makeNote({ deadline: "2026-07-08" }, "b"),
      makeNote({ deadline: "2026-07-05" }, "a"),
      makeNote({ deadline: "2026-07-14" }, "d"),
      makeNote({ deadline: "2026-07-11" }, "c"),
    ];
    const b = buildBriefing(notes, TODAY);
    expect(b.overdue.map((n) => n.id)).toEqual(["a", "b"]);
    expect(b.dueSoon.map((n) => n.id)).toEqual(["c", "d"]);
  });

  it("flags Doing notes untouched for 14+ days as stale, oldest first", () => {
    const notes = [
      makeNote({ state: "Doing", updated: "2026-06-26" }, "exactly14"),
      makeNote({ state: "Doing", updated: "2026-06-01" }, "ancient"),
      makeNote({ state: "Doing", updated: "2026-06-27" }, "thirteen"),
      makeNote({ state: "Prepare", updated: "2026-05-01" }, "notDoing"),
    ];
    const b = buildBriefing(notes, TODAY);
    expect(b.staleDoing.map((n) => n.id)).toEqual(["ancient", "exactly14"]);
  });

  it("is empty across the board for an empty vault", () => {
    const b = buildBriefing([], TODAY);
    expect(b.doing).toHaveLength(0);
    expect(b.blocked).toHaveLength(0);
    expect(b.overdue).toHaveLength(0);
    expect(b.dueSoon).toHaveLength(0);
    expect(b.staleDoing).toHaveLength(0);
  });
});
