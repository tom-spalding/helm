import { create } from "zustand";
import { useNoteStore } from "./notes";

export type View = "notes" | "dashboard" | "eisenhower" | "kanban" | "graph";
export type GroupingType = "all" | "folder" | "tag" | "trash";

export interface Grouping {
  type: GroupingType;
  id: string | null; // folder path for "folder", null for "all"
}

/** Splits are flat: a second split appends to the same row/column, never nests. */
export type SplitDirection = "row" | "column";

export interface Pane {
  id: string;
  /**
   * Only read while this pane is in the background — the active pane always
   * shows `selectedNoteId`. One source of truth, so clicking a note in the list
   * re-points exactly one pane and there is nothing to keep in sync.
   */
  noteId: string | null;
  /** Background-only, same as `noteId`; the active pane uses `markdownMode`. */
  markdownMode: boolean;
}

export interface NavEntry {
  view: View;
  selectedNoteId: string | null;
  selectedGrouping: Grouping;
}

const MAX_HISTORY = 100;

function entriesAreEqual(a: NavEntry, b: NavEntry): boolean {
  return (
    a.view === b.view &&
    a.selectedNoteId === b.selectedNoteId &&
    a.selectedGrouping.type === b.selectedGrouping.type &&
    a.selectedGrouping.id === b.selectedGrouping.id
  );
}

interface UIStore {
  activeView: View;
  setView: (view: View) => void;
  selectedGrouping: Grouping;
  setSelectedGrouping: (grouping: Grouping) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  markdownMode: boolean;
  toggleMarkdownMode: () => void;
  setMarkdownMode: (v: boolean) => void;

  panes: Pane[];
  activePaneId: string;
  splitDirection: SplitDirection;
  /** Opens `noteId` in a new pane, which becomes the active one. */
  splitPane: (noteId: string | null, direction: SplitDirection) => void;
  setActivePane: (paneId: string) => void;
  closePane: (paneId: string) => void;
  setPaneNote: (paneId: string, noteId: string | null) => void;

  navHistory: NavEntry[];
  navIndex: number;
  navigate: (entry: NavEntry) => void;
  goBack: () => void;
  goForward: () => void;
}

/** Past four, panes are too narrow to read — a further split opens in place instead. */
export const MAX_PANES = 4;

let paneCounter = 0;
function nextPaneId(): string {
  paneCounter += 1;
  return `pane-${paneCounter}`;
}

const FIRST_PANE_ID = nextPaneId();

const initialEntry: NavEntry = {
  view: "dashboard",
  selectedNoteId: null,
  selectedGrouping: { type: "all", id: null },
};

export const useUIStore = create<UIStore>((set, get) => ({
  activeView: "dashboard",
  setView: (view) => set({ activeView: view }),
  selectedGrouping: { type: "all", id: null },
  setSelectedGrouping: (grouping) => set({ selectedGrouping: grouping }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  markdownMode: false,
  toggleMarkdownMode: () => set((s) => ({ markdownMode: !s.markdownMode })),
  setMarkdownMode: (markdownMode) => set({ markdownMode }),

  panes: [{ id: FIRST_PANE_ID, noteId: null, markdownMode: false }],
  activePaneId: FIRST_PANE_ID,
  splitDirection: "row",

  splitPane: (noteId, direction) => {
    const { panes, activePaneId, markdownMode } = get();
    const noteStore = useNoteStore.getState();

    if (panes.length >= MAX_PANES) {
      set({ activeView: "notes" });
      noteStore.selectNote(noteId);
      return;
    }

    // Freeze the outgoing pane *before* selectNote, which overwrites selectedNoteId.
    const frozen = panes.map((p) =>
      p.id === activePaneId ? { ...p, noteId: noteStore.selectedNoteId, markdownMode } : p,
    );
    const pane: Pane = { id: nextPaneId(), noteId, markdownMode };

    set({
      panes: [...frozen, pane],
      activePaneId: pane.id,
      splitDirection: direction,
      activeView: "notes",
    });
    noteStore.selectNote(noteId);
  },

  setActivePane: (paneId) => {
    const { panes, activePaneId, markdownMode } = get();
    if (paneId === activePaneId) return;
    const target = panes.find((p) => p.id === paneId);
    if (!target) return;
    const noteStore = useNoteStore.getState();

    set({
      panes: panes.map((p) =>
        p.id === activePaneId ? { ...p, noteId: noteStore.selectedNoteId, markdownMode } : p,
      ),
      activePaneId: paneId,
      markdownMode: target.markdownMode,
    });
    noteStore.selectNote(target.noteId);
  },

  setPaneNote: (paneId, noteId) =>
    set((state) => ({
      panes: state.panes.map((p) => (p.id === paneId ? { ...p, noteId } : p)),
    })),

  closePane: (paneId) => {
    const { panes, activePaneId } = get();
    if (panes.length <= 1) return;
    const index = panes.findIndex((p) => p.id === paneId);
    if (index === -1) return;
    const remaining = panes.filter((p) => p.id !== paneId);

    if (paneId !== activePaneId) {
      set({ panes: remaining });
      return;
    }

    // The neighbour inherits the selection by becoming active.
    const next = remaining[Math.min(index, remaining.length - 1)];
    const noteStore = useNoteStore.getState();
    set({
      panes: remaining,
      activePaneId: next.id,
      markdownMode: next.markdownMode,
    });
    noteStore.selectNote(next.noteId);
  },

  navHistory: [initialEntry],
  navIndex: 0,

  navigate: (entry) => {
    const { navHistory, navIndex } = get();
    const current = navHistory[navIndex];

    // Skip duplicate pushes — just apply the state change and return
    if (current && entriesAreEqual(current, entry)) {
      set({
        activeView: entry.view,
        selectedGrouping: entry.selectedGrouping,
      });
      useNoteStore.getState().selectNote(entry.selectedNoteId);
      return;
    }

    // Slice off forward history, push new entry, cap at max
    const trimmed = navHistory.slice(0, navIndex + 1);
    trimmed.push(entry);
    const capped = trimmed.length > MAX_HISTORY ? trimmed.slice(-MAX_HISTORY) : trimmed;

    set({
      activeView: entry.view,
      selectedGrouping: entry.selectedGrouping,
      navHistory: capped,
      navIndex: capped.length - 1,
    });
    useNoteStore.getState().selectNote(entry.selectedNoteId);
  },

  goBack: () => {
    const { navHistory, navIndex } = get();
    if (navIndex <= 0) return;
    const newIndex = navIndex - 1;
    const entry = navHistory[newIndex];
    set({
      navIndex: newIndex,
      activeView: entry.view,
      selectedGrouping: entry.selectedGrouping,
    });
    useNoteStore.getState().selectNote(entry.selectedNoteId);
  },

  goForward: () => {
    const { navHistory, navIndex } = get();
    if (navIndex >= navHistory.length - 1) return;
    const newIndex = navIndex + 1;
    const entry = navHistory[newIndex];
    set({
      navIndex: newIndex,
      activeView: entry.view,
      selectedGrouping: entry.selectedGrouping,
    });
    useNoteStore.getState().selectNote(entry.selectedNoteId);
  },
}));
