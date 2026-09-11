import { useUIStore } from "../../store/ui";
import { DashboardView } from "../../views/DashboardView";
import { EisenhowerView } from "../../views/EisenhowerView";
import { GraphView } from "../../views/GraphView";
import { KanbanView } from "../../views/KanbanView";
import { NotePane } from "./NotePane";

export function MainPanel() {
  const { activeView, panes, activePaneId, splitDirection } = useUIStore();
  const isSplit = panes.length > 1;

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-w-0">
      {activeView === "notes" && (
        <div
          className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${
            splitDirection === "column" ? "flex-col" : "flex-row"
          }`}
        >
          {panes.map((pane, i) => (
            <NotePane
              key={pane.id}
              pane={pane}
              isActive={pane.id === activePaneId}
              isSplit={isSplit}
              borderClass={
                i === 0
                  ? ""
                  : splitDirection === "column"
                    ? "border-t border-[var(--color-border)]"
                    : "border-l border-[var(--color-border)]"
              }
            />
          ))}
        </div>
      )}
      {activeView === "graph" && <GraphView />}
      {activeView === "eisenhower" && <EisenhowerView />}
      {activeView === "kanban" && <KanbanView />}
      {activeView === "dashboard" && <DashboardView />}
    </div>
  );
}
