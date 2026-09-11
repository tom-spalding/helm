import { beforeEach, describe, expect, it } from "vitest";
import { useNoteStore } from "./notes";
import { MAX_PANES, useUIStore } from "./ui";

/** Resolves each pane to the note actually on screen, active pane included. */
function visibleNotes(): Array<string | null> {
  const { panes, activePaneId } = useUIStore.getState();
  const { selectedNoteId } = useNoteStore.getState();
  return panes.map((p) => (p.id === activePaneId ? selectedNoteId : p.noteId));
}

function reset() {
  useUIStore.setState({
    panes: [{ id: "pane-1", noteId: null, markdownMode: false }],
    activePaneId: "pane-1",
    splitDirection: "row",
    activeView: "notes",
    markdownMode: false,
  });
  useNoteStore.setState({ selectedNoteId: "note-a" });
}

describe("useUIStore — splitting", () => {
  beforeEach(reset);

  it("keeps the current note on the left and shows the new one in the new pane", () => {
    useUIStore.getState().splitPane("note-b", "row");

    expect(visibleNotes()).toEqual(["note-a", "note-b"]);
    expect(useUIStore.getState().splitDirection).toBe("row");
  });

  it("makes the new pane the active one", () => {
    useUIStore.getState().splitPane("note-b", "row");

    const { panes, activePaneId } = useUIStore.getState();
    expect(activePaneId).toBe(panes[1].id);
    expect(useNoteStore.getState().selectedNoteId).toBe("note-b");
  });

  it("records the direction the split was asked for", () => {
    useUIStore.getState().splitPane("note-b", "column");
    expect(useUIStore.getState().splitDirection).toBe("column");
  });

  it("switches the view to notes, so splitting from the dashboard shows the panes", () => {
    useUIStore.setState({ activeView: "dashboard" });
    useUIStore.getState().splitPane("note-b", "row");
    expect(useUIStore.getState().activeView).toBe("notes");
  });

  it("carries the current markdown mode into the new pane", () => {
    useUIStore.setState({ markdownMode: true });
    useUIStore.getState().splitPane("note-b", "row");

    const { panes } = useUIStore.getState();
    expect(panes[0].markdownMode).toBe(true);
    expect(useUIStore.getState().markdownMode).toBe(true);
  });

  it("opens in the active pane instead of splitting once the cap is reached", () => {
    for (let i = 0; i < MAX_PANES - 1; i++) {
      useUIStore.getState().splitPane(`note-${i}`, "row");
    }
    expect(useUIStore.getState().panes).toHaveLength(MAX_PANES);

    useUIStore.getState().splitPane("note-z", "row");

    expect(useUIStore.getState().panes).toHaveLength(MAX_PANES);
    expect(useNoteStore.getState().selectedNoteId).toBe("note-z");
  });
});

describe("useUIStore — clicking a note after a split", () => {
  beforeEach(reset);

  it("changes only the active pane", () => {
    useUIStore.getState().splitPane("note-b", "row");

    // What clicking a note in the list does.
    useNoteStore.getState().selectNote("note-c");

    expect(visibleNotes()).toEqual(["note-a", "note-c"]);
  });

  it("leaves the background pane alone across several clicks", () => {
    useUIStore.getState().splitPane("note-b", "row");

    useNoteStore.getState().selectNote("note-c");
    useNoteStore.getState().selectNote("note-d");

    expect(visibleNotes()).toEqual(["note-a", "note-d"]);
  });
});

describe("useUIStore — switching the active pane", () => {
  beforeEach(reset);

  it("hands the live selection over to the pane being focused", () => {
    useUIStore.getState().splitPane("note-b", "row");
    const [left] = useUIStore.getState().panes;

    useUIStore.getState().setActivePane(left.id);

    expect(useNoteStore.getState().selectedNoteId).toBe("note-a");
    expect(visibleNotes()).toEqual(["note-a", "note-b"]);
  });

  it("then follows clicks in the newly focused pane", () => {
    useUIStore.getState().splitPane("note-b", "row");
    const [left] = useUIStore.getState().panes;

    useUIStore.getState().setActivePane(left.id);
    useNoteStore.getState().selectNote("note-c");

    expect(visibleNotes()).toEqual(["note-c", "note-b"]);
  });

  it("restores the markdown mode the focused pane was left in", () => {
    useUIStore.getState().splitPane("note-b", "row");
    const [left] = useUIStore.getState().panes;
    useUIStore.setState({ markdownMode: true });

    useUIStore.getState().setActivePane(left.id);
    expect(useUIStore.getState().markdownMode).toBe(false);

    useUIStore.getState().setActivePane(useUIStore.getState().panes[1].id);
    expect(useUIStore.getState().markdownMode).toBe(true);
  });

  it("ignores a pane id that is already active, or does not exist", () => {
    useUIStore.getState().splitPane("note-b", "row");
    const before = useUIStore.getState().panes;

    useUIStore.getState().setActivePane(useUIStore.getState().activePaneId);
    useUIStore.getState().setActivePane("pane-nope");

    expect(useUIStore.getState().panes).toBe(before);
    expect(useNoteStore.getState().selectedNoteId).toBe("note-b");
  });
});

describe("useUIStore — closing a pane", () => {
  beforeEach(reset);

  it("hands the selection to the neighbour when the active pane closes", () => {
    useUIStore.getState().splitPane("note-b", "row");
    const { activePaneId, panes } = useUIStore.getState();

    useUIStore.getState().closePane(activePaneId);

    expect(useUIStore.getState().panes).toHaveLength(1);
    expect(useUIStore.getState().activePaneId).toBe(panes[0].id);
    expect(useNoteStore.getState().selectedNoteId).toBe("note-a");
  });

  it("keeps the live selection when a background pane closes", () => {
    useUIStore.getState().splitPane("note-b", "row");
    const [left] = useUIStore.getState().panes;

    useUIStore.getState().closePane(left.id);

    expect(useUIStore.getState().panes).toHaveLength(1);
    expect(useNoteStore.getState().selectedNoteId).toBe("note-b");
    expect(visibleNotes()).toEqual(["note-b"]);
  });

  it("refuses to close the last pane", () => {
    useUIStore.getState().closePane("pane-1");
    expect(useUIStore.getState().panes).toHaveLength(1);
    expect(useNoteStore.getState().selectedNoteId).toBe("note-a");
  });

  it("ignores a pane id that does not exist", () => {
    useUIStore.getState().splitPane("note-b", "row");
    useUIStore.getState().closePane("pane-nope");
    expect(useUIStore.getState().panes).toHaveLength(2);
  });
});
