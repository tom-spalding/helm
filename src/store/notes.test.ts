import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNoteStore } from "./notes";
import type { Note } from "../types/note";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "01JPMXYZ123",
    filePath: "/notes/test.md",
    fileName: "test.md",
    content: "Test content",
    frontmatter: {
      id: "01JPMXYZ123",
      title: "Test Note",
      created: "2026-03-13",
      updated: "2026-03-13",
      tags: ["Code"],
      urgent: false,
      important: true,
      state: "Doing",
      blocked: false,
      links: [],
    },
    ...overrides,
  };
}

describe("useNoteStore", () => {
  beforeEach(() => {
    useNoteStore.setState({ notes: [], selectedNoteId: null, vaultPath: null });
  });

  it("loads notes into the store", () => {
    const { result } = renderHook(() => useNoteStore());
    act(() => result.current.setNotes([makeNote()]));
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].id).toBe("01JPMXYZ123");
  });

  it("selects a note by id", () => {
    const { result } = renderHook(() => useNoteStore());
    act(() => {
      result.current.setNotes([makeNote()]);
      result.current.selectNote("01JPMXYZ123");
    });
    expect(result.current.selectedNoteId).toBe("01JPMXYZ123");
  });

  it("updates a note in place", () => {
    const { result } = renderHook(() => useNoteStore());
    act(() => {
      result.current.setNotes([makeNote()]);
      result.current.updateNote({ ...makeNote(), content: "Updated content" });
    });
    expect(result.current.notes[0].content).toBe("Updated content");
  });

  it("removes a note by id", () => {
    const { result } = renderHook(() => useNoteStore());
    act(() => {
      result.current.setNotes([makeNote()]);
      result.current.removeNote("01JPMXYZ123");
    });
    expect(result.current.notes).toHaveLength(0);
  });

  it("builds tag tree from notes", () => {
    const note1 = makeNote({ id: "01", frontmatter: { ...makeNote().frontmatter, id: "01", tags: ["rl", "ce"] } });
    const note2 = makeNote({ id: "02", frontmatter: { ...makeNote().frontmatter, id: "02", tags: ["rl"] } });
    const { result } = renderHook(() => useNoteStore());
    act(() => result.current.setNotes([note1, note2]));
    const tree = result.current.tagTree;
    expect(tree["rl"]).toBeDefined();
    expect(tree["rl"].notes).toHaveLength(2);
    expect(tree["ce"]).toBeDefined();
    expect(tree["ce"].notes).toHaveLength(1);
  });
});
