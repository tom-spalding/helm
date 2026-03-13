import { create } from "zustand";

export type View = "notes" | "dashboard" | "eisenhower" | "kanban" | "graph";

interface UIStore {
  activeView: View;
  setView: (view: View) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeView: "notes",
  setView: (view) => set({ activeView: view }),
}));
