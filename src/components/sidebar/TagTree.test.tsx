import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TagTree } from "./TagTree";
import type { TagNode } from "../../store/notes";
import type { Note } from "../../types/note";

function makeNote(id: string, title: string, tags: string[]): Note {
  return {
    id,
    filePath: `/notes/${id}.md`,
    fileName: `${id}.md`,
    content: "",
    vaultId: "",
    frontmatter: {
      id,
      title,
      created: "2026-03-13",
      updated: "2026-03-13",
      tags,
      urgent: false,
      important: false,
      state: "Doing",
      blocked: false,
    },
  };
}

const mockTree: Record<string, TagNode> = {
  rl: {
    notes: [makeNote("01", "Rule Builder", ["rl", "ce"])],
    children: {},
  },
  ce: {
    notes: [makeNote("01", "Rule Builder", ["rl", "ce"])],
    children: {},
  },
};

describe("TagTree", () => {
  it("renders top-level tags", () => {
    render(
      <TagTree tree={mockTree} onSelectNote={vi.fn()} selectedNoteId={null} />
    );
    expect(screen.getByText("#rl")).toBeInTheDocument();
    expect(screen.getByText("#ce")).toBeInTheDocument();
  });

  it("does not show notes before tag is expanded", () => {
    render(
      <TagTree tree={mockTree} onSelectNote={vi.fn()} selectedNoteId={null} />
    );
    expect(screen.queryByText("Rule Builder")).not.toBeInTheDocument();
  });

  it("expands a tag to show notes on click", () => {
    render(
      <TagTree tree={mockTree} onSelectNote={vi.fn()} selectedNoteId={null} />
    );
    fireEvent.click(screen.getByText("#rl"));
    expect(screen.getByText("Rule Builder")).toBeInTheDocument();
  });

  it("calls onSelectNote when a note is clicked", () => {
    const onSelect = vi.fn();
    render(
      <TagTree tree={mockTree} onSelectNote={onSelect} selectedNoteId={null} />
    );
    fireEvent.click(screen.getByText("#rl"));
    fireEvent.click(screen.getByText("Rule Builder"));
    expect(onSelect).toHaveBeenCalledWith("01");
  });

  it("highlights selected note", () => {
    render(
      <TagTree tree={mockTree} onSelectNote={vi.fn()} selectedNoteId="01" />
    );
    fireEvent.click(screen.getByText("#rl"));
    const noteBtn = screen.getByText("Rule Builder").closest("button");
    expect(noteBtn?.className).toContain("bg-blue");
  });
});
