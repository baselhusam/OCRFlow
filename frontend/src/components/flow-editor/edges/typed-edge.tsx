"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useNodesData,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { memo, useState } from "react";

import { useEditorUi } from "@/components/flow-editor/editor-ui-context";
import { wireColor, wireKindLabel } from "@/components/flow-editor/wire-colors";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { getNodeWireKinds } from "@/lib/canvas/wire-types";
import { cn } from "@/lib/utils";

/**
 * Wire coloured by the data it carries. Hover thickens it, click selects it
 * (halo + ✕ at the midpoint), Delete/Backspace or ✕ removes it. While the
 * target is running, dashes flow toward it.
 */
function TypedEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { deleteElements } = useReactFlow();
  const ui = useEditorUi();
  const sourceData = useNodesData(source)?.data as PipelineNodeData | undefined;
  const targetData = useNodesData(target)?.data as PipelineNodeData | undefined;

  const valid = data?.valid !== false;
  const kind = sourceData ? getNodeWireKinds(sourceData).output : null;
  const color = valid ? wireColor(kind) : "var(--muted-foreground)";
  const flowing =
    targetData?.runStatus === "running" || ui.fullRunNodeStates.get(target) === "running";
  const companion = Boolean(data?.companion);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  const width = selected ? 3 : hovered ? 2.75 : 2;

  return (
    <>
      {selected ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeOpacity={0.22}
          strokeWidth={10}
          strokeLinecap="round"
        />
      ) : null}
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={22}
        style={{
          stroke: color,
          strokeWidth: width,
          strokeDasharray: !valid ? "4 6" : companion ? "2 5" : flowing ? "7 7" : undefined,
          transition: "stroke-width 120ms ease",
        }}
        className={cn(flowing && valid && "flow-edge--flowing")}
      />
      {/* Invisible hit area for hover state (BaseEdge's interaction path has no handlers). */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ pointerEvents: "stroke" }}
      />
      <EdgeLabelRenderer>
        {(selected || !valid) && !companion ? (
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              // Short wires put the midpoint next to a node; lift the selected
              // wire's controls above nodes (selected nodes sit at 1000).
              zIndex: selected ? 1001 : undefined,
            }}
          >
            {selected && !ui.readOnly ? (
              <button
                type="button"
                aria-label="Remove connection"
                title="Remove connection (Del)"
                onClick={() => void deleteElements({ edges: [{ id }] })}
                className="flex size-6 items-center justify-center rounded-full border border-border bg-popover text-muted-foreground shadow-md transition-colors hover:border-destructive hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-md border border-border bg-popover px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap shadow-sm",
                selected && !ui.readOnly
                  ? "absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {valid ? (
                <>
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  {wireKindLabel(kind)}
                </>
              ) : (
                "incompatible"
              )}
            </span>
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}

export const TypedEdge = memo(TypedEdgeComponent);
