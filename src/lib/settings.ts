export interface Settings {
  fontSize: number;
  lineHeight: number;
  autocompleteWikiLinks: boolean;
  autoSaveOnEdit: boolean;
  pinnedNotesFloat: boolean;
  showNoteCountOnTags: boolean;
  defaultNoteView: "editor" | "markdown";
  /** When true, skip the confirm dialog before deleting notes or folders. */
  skipDeleteConfirmation: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 16,
  lineHeight: 1.7,
  autocompleteWikiLinks: true,
  autoSaveOnEdit: true,
  pinnedNotesFloat: true,
  showNoteCountOnTags: true,
  defaultNoteView: "editor",
  skipDeleteConfirmation: false,
};

export function applySettings(s: Settings): void {
  const root = document.documentElement;
  root.style.setProperty("--editor-font-size", `${s.fontSize}px`);
  root.style.setProperty("--editor-line-height", String(s.lineHeight));
}
