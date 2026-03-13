import type { NoteFrontmatter, NoteState } from "../../types/note";
import { NOTE_STATES } from "../../lib/constants";

interface PropertyPanelProps {
  frontmatter: NoteFrontmatter;
  onChange: (updates: Partial<NoteFrontmatter>) => void;
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
      #{label}
    </span>
  );
}

export function PropertyPanel({ frontmatter, onChange }: PropertyPanelProps) {
  return (
    <div className="border-b border-[var(--color-border)] px-12 py-4 space-y-3">
      {/* Title */}
      <input
        className="w-full bg-transparent text-3xl font-bold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
        value={frontmatter.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Untitled"
      />

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {/* State */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-muted)]">State</span>
          <select
            className="rounded bg-[var(--color-surface)] px-2 py-0.5 text-[var(--color-text)] outline-none text-sm"
            value={frontmatter.state}
            onChange={(e) => onChange({ state: e.target.value as NoteState })}
          >
            {NOTE_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Urgent */}
        <label className="flex items-center gap-1.5 cursor-pointer text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={frontmatter.urgent}
            onChange={(e) => onChange({ urgent: e.target.checked })}
            className="rounded"
          />
          Urgent
        </label>

        {/* Important */}
        <label className="flex items-center gap-1.5 cursor-pointer text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={frontmatter.important}
            onChange={(e) => onChange({ important: e.target.checked })}
            className="rounded"
          />
          Important
        </label>

        {/* Blocked */}
        <label className="flex items-center gap-1.5 cursor-pointer text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={frontmatter.blocked}
            onChange={(e) => onChange({ blocked: e.target.checked })}
            className="rounded"
          />
          Blocked
        </label>

        {/* Deadline */}
        {frontmatter.deadline && (
          <span className="text-[var(--color-text-muted)]">
            Due: {frontmatter.deadline}
          </span>
        )}
      </div>

      {/* Tags */}
      {frontmatter.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {frontmatter.tags.map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      )}
    </div>
  );
}
