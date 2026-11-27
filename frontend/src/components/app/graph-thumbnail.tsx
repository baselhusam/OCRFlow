import { Plus } from "lucide-react";

import { parsePipelineGraph } from "@/lib/canvas/graph-utils";
import { cn } from "@/lib/utils";

type GraphThumbnailProps = {
  graph: Record<string, unknown>;
  /** Accent used for node bars and wires (project / pipeline colour). */
  accent?: string;
  className?: string;
  emptyLabel?: string;
};

const NODE_W = 240;
const NODE_H = 76;
const PAD = 48;
const MAX_NODES = 24;

function nodeLabel(modelId: string): { title: string; provider: string } {
  const [provider = "", rest = modelId] = modelId.split("/");
  return {
    title: rest.replace(/[-_]+/g, " "),
    provider: provider.replace(/[-_]+/g, " "),
  };
}

/**
 * A read-only miniature of a canvas graph: nodes at their saved positions,
 * wires as curves. Pure SVG, so it is cheap to render in lists.
 */
export function GraphThumbnail({
  graph,
  accent = "#5b2eef",
  className,
  emptyLabel = "Empty canvas",
}: GraphThumbnailProps) {
  const parsed = parsePipelineGraph(graph);
  const nodes = parsed.nodes.slice(0, MAX_NODES);

  if (nodes.length === 0) {
    return (
      <div
        className={cn(
          "graph-thumbnail relative flex items-center justify-center overflow-hidden",
          className,
        )}
      >
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--landing-ghost-border)] bg-[var(--landing-ghost-bg)] px-3.5 py-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
          <Plus className="size-3" aria-hidden />
          {emptyLabel}
        </div>
      </div>
    );
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const xs = nodes.map((node) => node.position?.x ?? 0);
  const ys = nodes.map((node) => node.position?.y ?? 0);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const maxX = Math.max(...xs) + NODE_W + PAD;
  const maxY = Math.max(...ys) + NODE_H + PAD;
  // Keep a sensible minimum frame so one or two nodes don't fill the card.
  const width = Math.max(maxX - minX, 680);
  const height = Math.max(maxY - minY, 250);
  const offsetX = minX - (width - (maxX - minX)) / 2;
  const offsetY = minY - (height - (maxY - minY)) / 2;
  const showLabels = nodes.length <= 8;

  return (
    <div
      className={cn("graph-thumbnail relative overflow-hidden", className)}
      aria-hidden
    >
      <svg
        viewBox={`${offsetX} ${offsetY} ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full"
      >
        {parsed.edges.map((edge) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return null;
          const x1 = (source.position?.x ?? 0) + NODE_W;
          const y1 = (source.position?.y ?? 0) + NODE_H / 2;
          const x2 = target.position?.x ?? 0;
          const y2 = (target.position?.y ?? 0) + NODE_H / 2;
          const dx = Math.max(40, Math.abs(x2 - x1) / 2);
          return (
            <path
              key={edge.id}
              d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={accent}
              strokeOpacity={0.55}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
        {nodes.map((node) => {
          const x = node.position?.x ?? 0;
          const y = node.position?.y ?? 0;
          const label = nodeLabel(node.modelId);
          return (
            <g key={node.id}>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={14}
                className="fill-card stroke-[var(--landing-node-border)]"
                strokeWidth={2.5}
              />
              <rect
                x={x + 16}
                y={y + 18}
                width={40}
                height={40}
                rx={10}
                fill={accent}
                fillOpacity={0.16}
              />
              <circle cx={x + 36} cy={y + 38} r={7} fill={accent} />
              {showLabels ? (
                <>
                  <text
                    x={x + 70}
                    y={y + 34}
                    className="fill-muted-foreground font-mono"
                    fontSize={15}
                    letterSpacing={1.5}
                  >
                    {label.provider.toUpperCase().slice(0, 18)}
                  </text>
                  <text
                    x={x + 70}
                    y={y + 58}
                    className="fill-foreground"
                    fontSize={21}
                    fontWeight={700}
                  >
                    {label.title.length > 15
                      ? `${label.title.slice(0, 14)}…`
                      : label.title}
                  </text>
                </>
              ) : (
                <rect
                  x={x + 70}
                  y={y + 32}
                  width={120}
                  height={12}
                  rx={6}
                  className="fill-muted"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Illustrative graph for empty states (not saved anywhere). */
export const SAMPLE_GRAPH: Record<string, unknown> = {
  nodes: [
    { id: "a", modelId: "loader/pdf", position: { x: 0, y: 60 } },
    { id: "b", modelId: "docling/layout", position: { x: 320, y: 0 } },
    { id: "c", modelId: "surya/text-ocr", position: { x: 320, y: 150 } },
    { id: "d", modelId: "export/markdown", position: { x: 640, y: 60 } },
  ],
  edges: [
    { id: "ab", source: "a", target: "b" },
    { id: "ac", source: "a", target: "c" },
    { id: "bd", source: "b", target: "d" },
    { id: "cd", source: "c", target: "d" },
  ],
};
