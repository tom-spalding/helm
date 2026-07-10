import { useEffect, useRef } from "react";

/**
 * Inline rename text field. Auto-focuses and selects its contents on mount.
 * Commits on Enter or blur; cancels on Escape. Shared by every sidebar surface
 * that supports inline renaming (folder tree, note list) so the commit/cancel
 * behavior lives in exactly one place.
 *
 * Styling is caller-controlled via `className` because each surface sits in a
 * different layout (flex row vs. block); the interaction is what's shared.
 */
export function RenameInput({
  initial,
  onCommit,
  onCancel,
  className = "w-full rounded bg-[var(--color-bg)] px-1 text-sm text-[var(--color-text)] outline outline-1 outline-[var(--color-accent)]",
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const committed = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      defaultValue={initial}
      className={className}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          committed.current = true;
          onCommit((e.target as HTMLInputElement).value.trim());
        }
        if (e.key === "Escape") {
          committed.current = true;
          onCancel();
        }
        e.stopPropagation();
      }}
      onBlur={(e) => {
        if (!committed.current) onCommit(e.target.value.trim());
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
