import { useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useNoteStore } from "../store/notes";

export function GraphView() {
  const { notes, selectNote } = useNoteStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const graphData = {
    nodes: notes.map((n) => ({
      id: n.id,
      label: n.frontmatter.title,
      val: Math.max(1, (n.frontmatter.links?.length ?? 0) + 1),
    })),
    links: notes.flatMap((n) =>
      (n.frontmatter.links ?? [])
        .filter((targetId) => notes.some((t) => t.id === targetId))
        .map((targetId) => ({ source: n.id, target: targetId }))
    ),
  };

  const handleNodeClick = useCallback(
    (node: { id?: string | number }) => {
      if (node.id) selectNote(String(node.id));
    },
    [selectNote]
  );

  return (
    <div className="h-full w-full" style={{ background: "var(--color-bg)" }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="var(--color-bg)"
        nodeLabel="label"
        nodeColor={() => "var(--color-accent)"}
        linkColor={() => "var(--color-border)"}
        nodeRelSize={5}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(
          node: { x?: number; y?: number; label?: string },
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ) => {
          const { x = 0, y = 0, label = "" } = node;
          const fontSize = 12 / globalScale;

          // Draw node circle
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#0a84ff";
          ctx.fill();

          // Draw label when zoomed in enough
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
