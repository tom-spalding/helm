import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
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
      await tauriCommands.watchVault(path);
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
    let unlisten: (() => void) | undefined;

    async function init() {
      try {
        const saved = await tauriCommands.getVaultPath();
        if (saved) {
          await loadVault(saved);
        } else {
          setLoading(false);
        }

        // Listen for file changes emitted by the Rust watcher
        unlisten = await listen<string[]>("vault-changed", async (event) => {
          const changedPaths = event.payload;
          const store = useNoteStore.getState();

          for (const filePath of changedPaths) {
            try {
              const content = await tauriCommands.readNote(filePath);
              const note = parseNote(content, filePath);

              const existing = store.notes.find((n) => n.filePath === filePath);
              if (existing) {
                store.updateNote(note);
              } else {
                store.addNote(note);
              }
            } catch {
              // File was deleted or unreadable
              const existing = store.notes.find((n) => n.filePath === filePath);
              if (existing) {
                store.removeNote(existing.id);
              }
            }
          }
        });
      } catch (e) {
        setError(String(e));
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return { loading, error, promptVaultSelection };
}
