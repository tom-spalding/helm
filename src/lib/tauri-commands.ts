import { invoke } from "@tauri-apps/api/core";

export interface NoteFile {
  path: string;
  fileName: string;
  content: string;
}

export const tauriCommands = {
  getVaultPath: (): Promise<string | null> =>
    invoke("get_vault_path"),

  setVaultPath: (path: string): Promise<void> =>
    invoke("set_vault_path", { path }),

  listNotes: (vaultPath: string): Promise<NoteFile[]> =>
    invoke("list_notes", { vaultPath }),

  readNote: (filePath: string): Promise<string> =>
    invoke("read_note", { filePath }),

  writeNote: (filePath: string, content: string): Promise<void> =>
    invoke("write_note", { filePath, content }),

  deleteNote: (filePath: string): Promise<void> =>
    invoke("delete_note", { filePath }),

  renameNote: (oldPath: string, newPath: string): Promise<void> =>
    invoke("rename_note", { oldPath, newPath }),

  watchVault: (vaultPath: string): Promise<void> =>
    invoke("watch_vault", { vaultPath }),

  writeAsset: (vaultPath: string, filename: string, data: number[]): Promise<string> =>
    invoke("write_asset", { vaultPath, filename, data }),
};
