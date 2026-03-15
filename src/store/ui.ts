/**
 * UI state store — manages active view selection.
 * Controls which main view is displayed (Dashboard, Eisenhower, Kanban, Graph, or Notes).
 */
import { create } from "zustand";

/** Available top-level views in the application */
export type View = "notes" | "dashboard" | "eisenhower" | "kanban" | "graph";

/**
 * UI store state and actions.
 */
interface UIStore {
  /** Currently active view */
  activeView: View;
  /** Switch to a different view */
  setView: (view: View) => void;
}

/**
 * Global UI store using Zustand.
 * Manages which view is currently displayed.
 */
export const useUIStore = create<UIStore>((set) => ({
  activeView: "dashboard",
  setView: (view) => set({ activeView: view }),
}));
