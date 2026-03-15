/**
 * Graph view — interactive force-directed graph of note connections.
 * Shows all notes as nodes and wiki links as edges. Click any node to
 * open that note. Node size indicates number of outgoing links.
 */
import { useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useNoteStore } from "../store/notes";
import { useUIStore } from "../store/ui";
import { extractWikiLinks } from "../lib/note-parser";

/**
 * Graph view component.
 * Renders a force-directed layout of notes connected by wiki links.
 * - Nodes are sized by number of outgoing links
 * - Edges come from both saved frontmatter links and live content analysis
 * - Clicking a node selects and opens that note
 * - Labels appear when zoomed in
 *
 * @returns The graph visualization canvas
 */
export function GraphView() {
  const { notes, selectNote } = useNoteStore();
  const { setView } = useUIStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const titleToId = new Map(notes.map((n) => [n.frontmatter.title.toLowerCase(), n.id]));

  const graphData = {
    nodes: notes.map((n) => ({
      id: n.id,
      label: n.frontmatter.title,
      val: Math.max(1, (n.frontmatter.links?.length ?? 0) + 1),
    })),
    links: notes.flatMap((n) => {
      const savedLinks = (n.frontmatter.links ?? [])
        .filter((targetId) => notes.some((t) => t.id === targetId))
        .map((targetId) => ({ source: n.id, target: targetId }));

      const contentLinks = extractWikiLinks(n.content)
        .map((title) => titleToId.get(title.toLowerCase()))
        .filter((targetId): targetId is string =>
          targetId !== undefined &&
          targetId !== n.id &&
          !savedLinks.some((l) => l.target === targetId)
        )
        .map((targetId) => ({ source: n.id, target: targetId }));

      return [...savedLinks, ...contentLinks];
    }),
  };

  const handleNodeClick = useCallback(
    (node: { id?: string | number }) => {
      if (node.id) {
        selectNote(String(node.id));
        setView("notes");
      }
    },
    [selectNote, setView]
  );

  return (
    <div className="h-full w-full" style={{ background: "var(--color-bg)" }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="var(--color-bg)"
        nodeLabel="label"
        nodeColor={() => "var(--color-accent)"}
        linkColor={() => "#6e6e73"}
        nodeRelSize={5}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(
          node: { x?: number; y?: number; label?: string },
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ) => {
          const { x = 0, y = 0, label = "" } = node;
          const fontSize = 12 / globalScale;

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#0a84ff";
          ctx.fill();

          if (globalScale > 0.6) {
            ctx.font = `${fontSize}px -apple-system, sans-serif`;
            ctx.fillStyle = "#f2f2f7";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(label, x, y + 7);
          }
        }}
      />
    </div>
  );
}
