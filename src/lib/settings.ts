/**
 * Editor typography and layout preferences.
 * These settings affect the note editor and reading experience.
 */
export interface Settings {
  /** Font size in pixels (12–24) */
  fontSize: number;
  /** Line height as a unitless multiplier (1.2–2.2) */
  lineHeight: number;
  /** Show [[WikiLink]] autocomplete suggestions while typing */
  autocompleteWikiLinks: boolean;
  /** Debounced auto-save 1s after typing stops */
  autoSaveOnEdit: boolean;
  /** Pinned notes sort to the top of the note list */
  pinnedNotesFloat: boolean;
  /** Show note count badge on tags in the sidebar */
  showNoteCountOnTags: boolean;
}

/**
 * Default settings applied on app startup.
 */
export const DEFAULT_SETTINGS: Settings = {
  fontSize: 16,
  lineHeight: 1.7,
  autocompleteWikiLinks: true,
  autoSaveOnEdit: true,
  pinnedNotesFloat: true,
  showNoteCountOnTags: true,
};

/**
 * Apply settings globally by setting CSS custom properties on the root element.
 * Called on settings change and app startup to restore saved preferences.
 *
 * @param s - The settings to apply
 */
export function applySettings(s: Settings): void {
  const root = document.documentElement;
  root.style.setProperty("--editor-font-size", `${s.fontSize}px`);
  root.style.setProperty("--editor-line-height", String(s.lineHeight));
}
