import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ulid } from "ulid";
import { tauriCommands } from "../lib/tauri-commands";
import { parseNote, serializeNote } from "../lib/note-parser";
import { useNoteStore } from "../store/notes";
import type { VaultConfig, Note } from "../types/note";

/**
 * Repair missing required frontmatter fields in all notes in a vault.
 * Only writes files that actually need changes.
 */
async function repairVaultFrontmatter(vaultPath: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  let files;
  try {
    files = await tauriCommands.listNotes(vaultPath);
  } catch {
    return;
  }

  for (const f of files) {
    const note = parseNote(f.content, f.path);
    let dirty = false;
    const fm = { ...note.frontmatter };

    if (!fm.id) {
      fm.id = ulid();
      dirty = true;
    }
    if (!fm.title) {
      const base = f.path.split("/").pop()?.replace(/\.md$/i, "") ?? "Untitled";
      fm.title = base
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      dirty = true;
    }
    if (!fm.created) {
      fm.created = today;
      dirty = true;
    }
    if (!fm.updated) {
      fm.updated = today;
      dirty = true;
    }

    if (dirty) {
      const patched: Note = { ...note, id: fm.id, frontmatter: fm };
      try {
        await tauriCommands.writeNote(f.path, serializeNote(patched));
      } catch {
        // Non-fatal — skip unwritable files
      }
    }
  }
}

/**
 * Load all notes from a single vault and add them to the store.
 */
async function loadVault(vault: VaultConfig): Promise<void> {
  const files = await tauriCommands.listNotes(vault.path);
  const notes: Note[] = files.map((f) => ({
    ...parseNote(f.content, f.path),
    vaultId: vault.id,
  }));
  useNoteStore.getState().appendNotes(notes);
  await tauriCommands.watchVault(vault.path);
}

/**
 * Refresh the known folder list across all vaults in the store.
 */
async function refreshFolders(vaults: VaultConfig[]): Promise<void> {
  const results = await Promise.all(
    vaults.map((v) => tauriCommands.listFolders(v.path).catch(() => [] as string[]))
  );
  const allPaths = results.flat();
  useNoteStore.getState().setKnownFolderPaths(allPaths);
}

/**
 * Add a new vault: repair its frontmatter, persist config, load notes, start watcher.
 */
export async function addVault(path: string): Promise<void> {
  await repairVaultFrontmatter(path);

  const name = path.split("/").pop() ?? "vault";
  const vault: VaultConfig = { id: ulid(), name, path };
  const store = useNoteStore.getState();
  const updatedVaults = [...store.vaults, vault];

  store.addVaultConfig(vault);
  await tauriCommands.setVaults(updatedVaults);
  await loadVault(vault);
}

/**
 * Remove a vault from the store and config. Files on disk are untouched.
 */
export async function removeVault(id: string): Promise<void> {
  const store = useNoteStore.getState();
  const updatedVaults = store.vaults.filter((v) => v.id !== id);

  store.removeVaultConfig(id);
  // Remove all notes belonging to this vault
  const toRemove = store.notes.filter((n) => n.vaultId === id);
  for (const note of toRemove) {
    store.removeNote(note.id);
  }
  if (store.activeVaultId === id) {
    store.setActiveVaultId(null);
  }
  await tauriCommands.setVaults(updatedVaults);
}

/**
 * Hook that initializes the vault system on app startup.
 * Handles migration from single-vault to multi-vault config.
 * Only call this once at the top level (App.tsx).
 */
export function useVault() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unlistenChanged: (() => void) | undefined;
    let unlistenDeleted: (() => void) | undefined;
    let unlistenDirs: (() => void) | undefined;

    async function init() {
      try {
        let vaults = await tauriCommands.getVaults();

        // Migration: single-vault → multi-vault
        if (vaults.length === 0) {
          const legacyPath = await tauriCommands.getVaultPath();
          if (legacyPath) {
            const name = legacyPath.split("/").pop() ?? "vault";
            const migrated: VaultConfig = { id: ulid(), name, path: legacyPath };
            vaults = [migrated];
            await tauriCommands.setVaults(vaults);
          }
        }

        useNoteStore.getState().setVaults(vaults);
        if (vaults.length > 0) {
          await Promise.all(vaults.map(loadVault));
          await refreshFolders(vaults);
        }

        // Listen for file creates/modifications
        unlistenChanged = await listen<string[]>("vault-changed", async (event) => {
          const changedPaths = event.payload;
          const store = useNoteStore.getState();

          for (const filePath of changedPaths) {
            const vault = store.vaults.find((v) => filePath.startsWith(v.path));
            try {
              const content = await tauriCommands.readNote(filePath);
              const note: Note = {
                ...parseNote(content, filePath),
                vaultId: vault?.id ?? "",
              };
              const existing = store.notes.find((n) => n.filePath === filePath);
              if (existing) {
                store.updateNote(note);
              } else {
                store.addNote(note);
              }
            } catch {
              // Transient read error (race with write) — ignore
            }
          }
        });

        // Listen for directory create/remove events — refresh the folder list
        unlistenDirs = await listen<string>("vault-dirs-changed", () => {
          const { vaults: currentVaults } = useNoteStore.getState();
          refreshFolders(currentVaults);
        });

        // Listen for confirmed file deletions
        unlistenDeleted = await listen<string[]>("vault-note-deleted", (event) => {
          const deletedPaths = event.payload;
          const store = useNoteStore.getState();
          for (const filePath of deletedPaths) {
            const existing = store.notes.find((n) => n.filePath === filePath);
            if (existing) {
              store.removeNote(existing.id);
            }
          }
        });
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      unlistenChanged?.();
      unlistenDeleted?.();
      unlistenDirs?.();
    };
  }, []);

  return { loading, error };
}
