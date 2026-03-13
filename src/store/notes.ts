import { create } from "zustand";
import type { Note } from "../types/note";

export interface TagNode {
  notes: Note[];
  children: Record<string, TagNode>;
}

function buildTagTree(notes: Note[]): Record<string, TagNode> {
  const tree: Record<string, TagNode> = {};
  for (const note of notes) {
    for (const tag of note.frontmatter.tags ?? []) {
      if (!tree[tag]) tree[tag] = { notes: [], children: {} };
      tree[tag].notes.push(note);
    }
  }
  return tree;
}

interface NoteStore {
  notes: Note[];
  selectedNoteId: string | null;
  vaultPath: string | null;
  tagTree: Record<string, TagNode>;

  setNotes: (notes: Note[]) => void;
  setVaultPath: (path: string) => void;
  selectNote: (id: string | null) => void;
  updateNote: (note: Note) => void;
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  notes: [],
  selectedNoteId: null,
  vaultPath: null,
  tagTree: {},

  setNotes: (notes) => set({ notes, tagTree: buildTagTree(notes) }),
  setVaultPath: (path) => set({ vaultPath: path }),
  selectNote: (id) => set({ selectedNoteId: id }),
  updateNote: (updated) =>
    set((state) => {
      const notes = state.notes.map((n) => (n.id === updated.id ? updated : n));
      return { notes, tagTree: buildTagTree(notes) };
    }),
  addNote: (note) =>
    set((state) => {
      const notes = [...state.notes, note];
      return { notes, tagTree: buildTagTree(notes) };
    }),
  removeNote: (id) =>
    set((state) => {
      const notes = state.notes.filter((n) => n.id !== id);
      return { notes, tagTree: buildTagTree(notes) };
    }),
}));
