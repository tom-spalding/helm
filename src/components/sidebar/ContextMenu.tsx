import { useEffect, useRef, useState } from "react";

export type ContextMenuItem =
  | { kind: "action"; label: string; danger?: boolean; onClick: () => void }
  | { kind: "separator" }
  | { kind: "submenu"; label: string; items: Array<{ label: string; onClick: () => void }> };

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const menuCls =
  "fixed z-50 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-xl";
const itemCls =
  "flex w-full items-center px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)]";

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={menuCls} style={{ left: x, top: y }}>
      {items.map((item, i) => {
        if (item.kind === "separator") {
          return <div key={i} className="my-1 border-t border-[var(--color-border)]" />;
        }
        if (item.kind === "submenu") {
          return (
            <div
              key={i}
              className="relative"
              onMouseEnter={() => setOpenSubmenu(i)}
              onMouseLeave={() => setOpenSubmenu(null)}
            >
              <div className={`${itemCls} justify-between cursor-default select-none`}>
                <span>{item.label}</span>
                <span className="ml-4 text-xs text-[var(--color-text-muted)]">▶</span>
              </div>
              {openSubmenu === i && (
                <div className={`absolute left-full top-0 ${menuCls}`}>
                  {item.items.map((sub, j) => (
                    <button
                      key={j}
                      className={itemCls}
                      onClick={() => { sub.onClick(); onClose(); }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <button
            key={i}
            className={`${itemCls} ${item.danger ? "text-red-400" : ""}`}
            onClick={() => { item.onClick(); onClose(); }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
