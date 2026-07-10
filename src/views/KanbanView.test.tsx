import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useNoteStore } from "../store/notes";
import { useUIStore } from "../store/ui";
import type { Note } from "../types/note";
import { KanbanView } from "./KanbanView";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "id-managed",
    filePath: "/vault/managed.md",
    fileName: "managed.md",
    content: "",
    vaultId: "v1",
    frontmatter: {
      id: "id-managed",
      title: "Managed Note",
      created: "2026-01-01",
      updated: "2026-01-01",
      tags: [],
      urgent: false,
      important: false,
      state: "Doing",
      blocked: false,
      links: [],
      ...overrides.frontmatter,
    },
    ...overrides,
  };
}

beforeEach(() => {
  useNoteStore.setState({
    notes: [],
    selectedNoteId: null,
    vaults: [{ id: "v1", name: "Vault", path: "/vault" }],
    activeVaultId: "v1",
    tagTree: {},
    searchIndex: null,
    searchQuery: "",
    searchResults: [],
    knownFolderPaths: [],
  });
  useUIStore.setState({ activeView: "kanban" });
});

describe("KanbanView — unmanaged notes", () => {
  it("hides unmanaged notes from the board", () => {
    useNoteStore.setState({
      notes: [
        makeNote(),
        makeNote({
          id: "id-unmanaged",
          filePath: "/vault/unmanaged.md",
          fileName: "unmanaged.md",
          frontmatter: {
            id: "id-unmanaged",
            title: "Unmanaged Note",
            created: "2026-01-01",
            updated: "2026-01-01",
            tags: [],
            urgent: false,
            important: false,
            state: "Doing",
            blocked: false,
            links: [],
            unmanaged: true,
          },
        }),
      ],
    });

    render(<KanbanView />);

    expect(screen.getByText("Managed Note")).toBeInTheDocument();
    expect(screen.queryByText("Unmanaged Note")).not.toBeInTheDocument();
  });
});
