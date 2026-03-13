import { useState } from "react";

export function LeftColumn() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex w-10 flex-col border-r border-[var(--color-border)]">
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          title="Expand sidebar"
        >
          →
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border-r border-[var(--color-border)]"
      style={{ width: "var(--sidebar-width)", minWidth: "var(--sidebar-width)" }}
    >
      {/* Search — will be wired in Task 16 */}
      <div className="border-b border-[var(--color-border)] p-3">
        <input
          placeholder="Search..."
          className="w-full rounded-md bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none"
          readOnly
        />
      </div>

      {/* Named views + tag tree — will be filled in Tasks 9 and 10 */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2 py-1 text-xs text-[var(--color-text-muted)]">
          Views and tags will appear here
        </p>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(true)}
        className="border-t border-[var(--color-border)] p-2 text-left text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        ← Collapse
      </button>
    </div>
  );
}
