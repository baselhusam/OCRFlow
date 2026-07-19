"use client";

import { memo } from "react";
import {
  EdgeText,
  getBezierPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

import {
  PIPELINE_EDGE_INVALID,
  PIPELINE_EDGE_PULSE,
} from "@/lib/canvas/edge-styles";
import { cn } from "@/lib/utils";

const ARROW_INSET = 14;
const ARROW_SIZE = 8;

function insetTowardSource(
  x: number,
  y: number,
  position: Position,
  inset: number,
) {
  switch (position) {
    case Position.Left:
      return { x: x - inset, y };
    case Position.Right:
      return { x: x + inset, y };
    case Position.Top:
      return { x, y: y - inset };
    case Position.Bottom:
      return { x, y: y + inset };
    default:
      return { x, y };
  }
}

function arrowHeadPoints(
  tipX: number,
  tipY: number,
  position: Position,
  size = ARROW_SIZE,
) {
  const spread = size * 0.55;

  switch (position) {
    case Position.Left:
      return `${tipX},${tipY} ${tipX - size},${tipY - spread} ${tipX - size},${tipY + spread}`;
    case Position.Right:
      return `${tipX},${tipY} ${tipX + size},${tipY - spread} ${tipX + size},${tipY + spread}`;
    case Position.Top:
      return `${tipX},${tipY} ${tipX - spread},${tipY - size} ${tipX + spread},${tipY - size}`;
    case Position.Bottom:
      return `${tipX},${tipY} ${tipX - spread},${tipY + size} ${tipX + spread},${tipY + size}`;
    default:
      return `${tipX},${tipY} ${tipX - size},${tipY - spread} ${tipX - size},${tipY + spread}`;
  }
}

function PipelineFlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition = Position.Left,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
  selected,
}: EdgeProps) {
  const valid = data?.valid !== false;
  const arrowColor = valid ? PIPELINE_EDGE_PULSE : PIPELINE_EDGE_INVALID;
  const sourceAnchor = insetTowardSource(
    sourceX,
    sourceY,
    sourcePosition,
    ARROW_INSET,
  );
  const targetAnchor = insetTowardSource(
    targetX,
    targetY,
    targetPosition,
    ARROW_INSET,
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sourceAnchor.x,
    sourceY: sourceAnchor.y,
    sourcePosition,
    targetX: targetAnchor.x,
    targetY: targetAnchor.y,
    targetPosition,
  });

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        className={cn(
          "ocrflow-flow-edge-track",
          valid ? "ocrflow-flow-edge-track-valid" : "ocrflow-flow-edge-track-invalid",
        )}
      />
      <path
        id={id}
        d={edgePath}
        fill="none"
        className={cn(
          "ocrflow-flow-edge-stream",
          valid ? "ocrflow-flow-edge-stream-valid" : "ocrflow-flow-edge-stream-invalid",
          selected && "ocrflow-flow-edge-stream-selected",
          selected && valid && "ocrflow-flow-edge-stream-active",
        )}
      />
      <polygon
        points={arrowHeadPoints(targetAnchor.x, targetAnchor.y, targetPosition)}
        className="ocrflow-flow-edge-arrow"
        fill={arrowColor}
      />
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {label && labelX != null && labelY != null ? (
        <EdgeText
          x={labelX}
          y={labelY}
          label={label}
          labelStyle={labelStyle}
          labelBgStyle={labelBgStyle}
          labelBgPadding={labelBgPadding}
          labelBgBorderRadius={labelBgBorderRadius}
        />
      ) : null}
    </>
  );
}

export const PipelineFlowEdge = memo(PipelineFlowEdgeComponent);
