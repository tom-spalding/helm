import { LeftColumn } from "./LeftColumn";
import { MainPanel } from "./MainPanel";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <LeftColumn />
      <MainPanel />
    </div>
  );
}
