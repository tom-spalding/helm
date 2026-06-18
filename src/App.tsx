import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { addVault } from "./hooks/useVault";
import { tauriCommands } from "./lib/tauri-commands";
import { AppShell } from "./components/layout/AppShell";
import { McpSetupModal } from "./components/McpSetupModal";
import { useVault } from "./hooks/useVault";
import { useThemeStore } from "./store/theme";
import { useSettingsStore } from "./store/settings";
import { useUIStore } from "./store/ui";
import { DEFAULT_SETTINGS } from "./lib/settings";

const FONT_MIN = 12;
const FONT_MAX = 24;

export default function App() {
  const { loading, error } = useVault();
  const [showMcpSetup, setShowMcpSetup] = useState(false);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      unlisteners.push(
        await listen("show-mcp-setup", () => setShowMcpSetup(true)),
      );

      unlisteners.push(
        await listen("open-settings", () =>
          useUIStore.getState().setSettingsOpen(true),
        ),
      );

      unlisteners.push(
        await listen("add-vault", async () => {
          try {
            const path = await tauriCommands.openFolderDialog();
            if (path) await addVault(path);
          } catch (e) {
            console.error("Failed to add vault:", e);
          }
        }),
      );

      unlisteners.push(
        await listen<string>("set-theme", (event) => {
          useThemeStore.getState().setTheme(event.payload);
        }),
      );

      unlisteners.push(
        await listen<string>("font-size-change", (event) => {
          const { settings, updateSettings } = useSettingsStore.getState();
          if (event.payload === "reset") {
            updateSettings({ fontSize: DEFAULT_SETTINGS.fontSize });
          } else if (event.payload === "increase") {
            updateSettings({ fontSize: Math.min(FONT_MAX, settings.fontSize + 1) });
          } else if (event.payload === "decrease") {
            updateSettings({ fontSize: Math.max(FONT_MIN, settings.fontSize - 1) });
          }
        }),
      );
    };

    setup();
    return () => unlisteners.forEach((fn) => fn());
  }, []);

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
      </div>
    );
  }

  return (
    <>
      <AppShell />
      {showMcpSetup && <McpSetupModal onClose={() => setShowMcpSetup(false)} />}
    </>
  );
}
