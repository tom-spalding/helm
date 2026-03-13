import { useEffect, useState } from "react";
import { tauriCommands } from "../lib/tauri-commands";
import { parseNote } from "../lib/note-parser";
import { useNoteStore } from "../store/notes";

export function useVault() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setNotes, setVaultPath } = useNoteStore();

  async function loadVault(path: string) {
    setLoading(true);
    try {
      const files = await tauriCommands.listNotes(path);
      const notes = files.map((f) => parseNote(f.content, f.path));
      setNotes(notes);
      setVaultPath(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function promptVaultSelection() {
    try {
      // Use Tauri dialog to pick a directory
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false, title: "Select your notes vault" });
      if (selected && typeof selected === "string") {
        await tauriCommands.setVaultPath(selected);
        await loadVault(selected);
      }
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const saved = await tauriCommands.getVaultPath();
        if (saved) {
          await loadVault(saved);
        } else {
          setLoading(false);
        }
      } catch (e) {
        setError(String(e));
        setLoading(false);
      }
    }
    init();
  }, []);

  return { loading, error, promptVaultSelection };
}
