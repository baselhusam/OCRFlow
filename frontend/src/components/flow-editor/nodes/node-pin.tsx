"use client";

import { Handle, Position, useConnection } from "@xyflow/react";
import { memo } from "react";

import { useEditorUi } from "@/components/flow-editor/editor-ui-context";
import {
  wireColor,
  wireKindHint,
  wireKindLabel,
} from "@/components/flow-editor/wire-colors";
import { getNodeWireKinds, type WireKind } from "@/lib/canvas/wire-types";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type PinProps = {
  nodeId: string;
  side: "input" | "output";
  kind: WireKind;
  connected: boolean;
};

/**
 * A typed, coloured pin. While a wire is being dragged, input pins that can
 * accept it glow and say "Accepts X"; incompatible ones dim and say what they
 * need instead, so wire types are learnable without docs.
 */
function NodePinComponent({ nodeId, side, kind, connected }: PinProps) {
  const color = wireColor(kind);
  const { isValidConnection } = useEditorUi();
  const connection = useConnection((state) =>
    state.inProgress
      ? {
          fromNodeId: state.fromNode.id,
          fromHandleId: state.fromHandle.id ?? null,
          fromType: state.fromHandle.type,
          fromKind: getNodeWireKinds(state.fromNode.data as PipelineNodeData).output,
        }
      : null,
  );

  let hint: "accepts" | "rejects" | null = null;
  if (connection && side === "input" && connection.fromType === "source") {
    if (connection.fromNodeId !== nodeId) {
      hint = isValidConnection({
        source: connection.fromNodeId,
        sourceHandle: connection.fromHandleId,
        target: nodeId,
        targetHandle: "input",
      })
        ? "accepts"
        : "rejects";
    }
  }

  const isInput = side === "input";
  return (
    <Handle
      type={isInput ? "target" : "source"}
      position={isInput ? Position.Left : Position.Right}
      id={isInput ? "input" : "output"}
      className={cn(
        "flow-pin group/pin !h-3.5 !w-3.5 !rounded-full !border-2 !bg-card transition-[transform,box-shadow,opacity] duration-150",
        "hover:scale-125",
        hint === "accepts" && "scale-125 flow-pin--accepts",
        hint === "rejects" && "opacity-35",
      )}
      style={{
        borderColor: color,
        background: connected ? color : undefined,
        ["--pin-color" as string]: color,
      }}
      aria-label={`${isInput ? "Input" : "Output"}: ${wireKindLabel(kind)}`}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-left shadow-lg",
          "opacity-0 transition-opacity duration-150 group-hover/pin:opacity-100",
          hint && "opacity-100",
          isInput ? "right-5" : "left-5",
        )}
      >
        {hint === "accepts" ? (
          <span className="block font-mono text-[10px] font-medium" style={{ color }}>
            Accepts {wireKindLabel(kind)}
          </span>
        ) : hint === "rejects" ? (
          <span className="block font-mono text-[10px] text-destructive">
            Needs {wireKindLabel(kind)}
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium text-foreground">
              <span className="size-1.5 rounded-full" style={{ background: color }} />
              {isInput ? "In" : "Out"} · {wireKindLabel(kind)}
            </span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {wireKindHint(kind)}
            </span>
          </>
        )}
      </span>
    </Handle>
  );
}

export const NodePin = memo(NodePinComponent);
