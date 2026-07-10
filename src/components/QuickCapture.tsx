import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import { buildCaptureNote } from "../lib/capture";
import { tauriCommands } from "../lib/tauri-commands";
import type { VaultConfig } from "../types/note";

/**
 * Quick-capture window content. Opened by the global shortcut
 * (⌘⇧Space); Enter saves the text as a new note in the first vault and hides
 * the window, Shift+Enter inserts a newline, Escape dismisses (keeping the
 * draft). The main window picks the new file up through the vault watcher.
 */
export function QuickCapture() {
  const [text, setText] = useState("");
  const [vault, setVault] = useState<VaultConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    tauriCommands
      .getVaults()
      .then((vaults) => setVault(vaults[0] ?? null))
      .catch(() => setVault(null));
    textareaRef.current?.focus();
  }, []);

  async function save() {
    if (!vault) return;
    const capture = buildCaptureNote(text, vault.path, Date.now());
    if (!capture) return;
    try {
      await tauriCommands.writeNote(capture.filePath, capture.raw);
      setText("");
      setError(null);
      void getCurrentWindow().hide();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      void getCurrentWindow().hide();
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--color-bg)] p-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Capture a thought…"
        spellCheck={false}
        className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        {error ? (
          <span className="text-red-400">Failed to save: {error}</span>
        ) : vault ? (
          <span>
            Saving to <strong>{vault.name}</strong>
          </span>
        ) : (
          <span>No vault configured — open Helm and add one first</span>
        )}
        <span>Enter to save · Shift+Enter for newline · Esc to dismiss</span>
      </div>
    </div>
  );
}
