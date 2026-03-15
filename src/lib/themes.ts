/**
 * Theme definition and application utilities.
 * Provides a collection of curated color themes and functions to apply
 * them globally via CSS custom properties.
 */

/**
 * Represents a complete UI theme with all semantic color variables.
 */
export interface Theme {
  /** Unique theme identifier (e.g., "midnight", "light") */
  id: string;
  /** Human-readable theme name */
  name: string;
  /** Background color (page background) */
  bg: string;
  /** Surface color (cards, panels) */
  surface: string;
  /** Border color (dividers, outlines) */
  border: string;
  /** Primary text color */
  text: string;
  /** Secondary/muted text color */
  textMuted: string;
  /** Accent color (highlights, interactive elements) */
  accent: string;
  /** Color shown in theme picker dot */
  swatch: string;
}

/**
 * All available themes. Each theme is self-contained and can be applied globally.
 */
export const THEMES: Theme[] = [
  {
    id: "midnight",
    name: "Midnight",
    bg: "#1c1c1e",
    surface: "#2c2c2e",
    border: "#3a3a3c",
    text: "#f2f2f7",
    textMuted: "#8e8e93",
    accent: "#0a84ff",
    swatch: "#0a84ff",
  },
  {
    id: "light",
    name: "Light",
    bg: "#f5f5f7",
    surface: "#ffffff",
    border: "#d1d1d6",
    text: "#1c1c1e",
    textMuted: "#6e6e73",
    accent: "#007aff",
    swatch: "#007aff",
  },
  {
    id: "dracula",
    name: "Dracula",
    bg: "#282a36",
    surface: "#44475a",
    border: "#6272a4",
    text: "#f8f8f2",
    textMuted: "#6272a4",
    accent: "#ff79c6",
    swatch: "#ff79c6",
  },
  {
    id: "nord",
    name: "Nord",
    bg: "#2e3440",
    surface: "#3b4252",
    border: "#434c5e",
    text: "#eceff4",
    textMuted: "#7b88a1",
    accent: "#88c0d0",
    swatch: "#88c0d0",
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    bg: "#1e1e2e",
    surface: "#313244",
    border: "#45475a",
    text: "#cdd6f4",
    textMuted: "#a6adc8",
    accent: "#cba6f7",
    swatch: "#cba6f7",
  },
  {
    id: "tokyo",
    name: "Tokyo Night",
    bg: "#1a1b2e",
    surface: "#24283b",
    border: "#414868",
    text: "#c0caf5",
    textMuted: "#565f89",
    accent: "#7aa2f7",
    swatch: "#7aa2f7",
  },
];

/**
 * Apply a theme globally by setting CSS custom properties on the root element.
 * Called on theme selection and on app startup to restore the saved theme.
 *
 * @param theme - The theme to apply
 * @example
 * applyTheme(THEMES.find(t => t.id === "midnight"))
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty("--color-bg", theme.bg);
  root.style.setProperty("--color-surface", theme.surface);
  root.style.setProperty("--color-border", theme.border);
  root.style.setProperty("--color-text", theme.text);
  root.style.setProperty("--color-text-muted", theme.textMuted);
  root.style.setProperty("--color-accent", theme.accent);
}
