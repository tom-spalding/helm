import { useVault } from "./hooks/useVault";
import { useNoteStore } from "./store/notes";
import { AppShell } from "./components/layout/AppShell";

export default function App() {
  const { loading, error, promptVaultSelection } = useVault();
  const vaultPath = useNoteStore((s) => s.vaultPath);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-[var(--color-text-muted)]">Loading vault...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={promptVaultSelection}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!vaultPath) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Welcome to Helm</h1>
        <p className="text-[var(--color-text-muted)]">Choose a folder to store your notes.</p>
        <button
          onClick={promptVaultSelection}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Select Vault Folder
        </button>
      </div>
    );
  }

  return <AppShell />;
}
