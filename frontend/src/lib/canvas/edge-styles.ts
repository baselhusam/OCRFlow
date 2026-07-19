import { MarkerType } from "@xyflow/react";

/** SVG markers need explicit colors — CSS variables are unreliable in marker defs. */
export const PIPELINE_EDGE_PULSE = "#5B2EEF";
export const PIPELINE_EDGE_INVALID = "#767A85";

export const PIPELINE_FLOW_EDGE_TYPE = "pipelineFlow" as const;

export function pipelineEdgeMarker(valid: boolean, selected = false) {
  return {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
    color: valid ? PIPELINE_EDGE_PULSE : PIPELINE_EDGE_INVALID,
  };
}

/** @deprecated Use PIPELINE_EDGE_PULSE */
export const PIPELINE_EDGE_BRONZE = PIPELINE_EDGE_PULSE;
/** @deprecated Use PIPELINE_EDGE_INVALID */
export const PIPELINE_EDGE_MUTED = PIPELINE_EDGE_INVALID;
