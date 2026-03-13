import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useNoteStore } from "../store/notes";
import { NOTE_STATES } from "../lib/constants";
import { getQuadrant } from "../types/note";

const CHART_COLORS = [
  "#0a84ff",
  "#30d158",
  "#ff453a",
  "#ff9f0a",
  "#bf5af2",
  "#64d2ff",
  "#ffd60a",
  "#ff6961",
];

function SummaryChip({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${color}`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

export function DashboardView() {
  const { notes } = useNoteStore();

  // Tag distribution
  const tagCounts: Record<string, number> = {};
  for (const note of notes) {
    for (const tag of note.frontmatter.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const tagData = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // State distribution
  const stateData = NOTE_STATES.map((state) => ({
    name: state,
    value: notes.filter((n) => n.frontmatter.state === state).length,
  })).filter((d) => d.value > 0);

  // Summary stats
  const urgentAndImportant = notes.filter((n) => getQuadrant(n) === "do").length;
  const schedule = notes.filter((n) => getQuadrant(n) === "schedule").length;
  const blocked = notes.filter((n) => n.frontmatter.blocked).length;

  const tooltipStyle = {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    color: "var(--color-text)",
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="mb-2 text-xl font-bold text-[var(--color-text)]">
        Dashboard
      </h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        {notes.length} notes in vault
      </p>

      {/* Summary chips */}
      <div className="mb-8 flex flex-wrap gap-3">
        <SummaryChip
          value={urgentAndImportant}
          label="Urgent & Important"
          color="border-red-500/20 bg-red-500/10 text-red-400"
        />
        <SummaryChip
          value={schedule}
          label="Schedule"
          color="border-blue-500/20 bg-blue-500/10 text-blue-400"
        />
        <SummaryChip
          value={blocked}
          label="Blocked"
          color="border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
        />
        <SummaryChip
          value={notes.length}
          label="Total Notes"
          color="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
        />
      </div>

      {/* Charts */}
      {notes.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          {/* Tag distribution */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="mb-4 font-semibold text-[var(--color-text)]">
              Tag Distribution
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={tagData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {tagData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle as React.CSSProperties} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* State distribution */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="mb-4 font-semibold text-[var(--color-text)]">
              State Distribution
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {stateData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle as React.CSSProperties} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12">
          <p className="text-[var(--color-text-muted)]">
            No notes yet. Create some notes to see your dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
