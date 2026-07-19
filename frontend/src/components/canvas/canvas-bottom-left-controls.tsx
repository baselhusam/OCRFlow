"use client";

import {
  ControlButton,
  Panel,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useCallback } from "react";

import { CanvasInteractionToolbar } from "@/components/canvas/canvas-interaction-toolbar";
import type { CanvasInteractionMode } from "@/lib/canvas/canvas-interaction-prefs";

type CanvasBottomLeftControlsProps = {
  mode: CanvasInteractionMode;
  onModeChange: (mode: CanvasInteractionMode) => void;
};

export function CanvasBottomLeftControls({
  mode,
  onModeChange,
}: CanvasBottomLeftControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const minZoomReached = useStore((state) => state.transform[2] <= state.minZoom);
  const maxZoomReached = useStore((state) => state.transform[2] >= state.maxZoom);

  const handleFitView = useCallback(() => {
    void fitView({ padding: 0.2 });
  }, [fitView]);

  return (
    <Panel position="bottom-left" className="!m-0 flex flex-col gap-2">
      <CanvasInteractionToolbar mode={mode} onModeChange={onModeChange} />
      <div
        className="react-flow__controls vertical"
        aria-label="Canvas zoom controls"
      >
        <ControlButton
          onClick={() => zoomIn()}
          className="react-flow__controls-zoomin"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={maxZoomReached}
        >
          <Plus className="size-4" />
        </ControlButton>
        <ControlButton
          onClick={() => zoomOut()}
          className="react-flow__controls-zoomout"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={minZoomReached}
        >
          <Minus className="size-4" />
        </ControlButton>
        <ControlButton
          onClick={handleFitView}
          className="react-flow__controls-fitview"
          aria-label="Fit view"
          title="Fit view"
        >
          <Maximize2 className="size-4" />
        </ControlButton>
      </div>
    </Panel>
  );
}
