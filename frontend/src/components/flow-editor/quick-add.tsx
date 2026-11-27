"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { EngineMark } from "@/components/flow-editor/library/engine-mark";
import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import { useEditorUi } from "@/components/flow-editor/editor-ui-context";
import { isSpawnOnlyModel } from "@/components/flow-editor/node-capabilities";
import { wireColor, wireKindLabel } from "@/components/flow-editor/wire-colors";
import { getCompatibleDownstreamModels } from "@/lib/canvas/compatible-downstream-models";
import { getModelLabel, getModelWireTypes } from "@/lib/canvas/model-utils";
import type { ModelCatalogEntry } from "@/lib/canvas/types";
import { getModelWireKinds, getNodeWireKinds } from "@/lib/canvas/wire-types";
import { cn } from "@/lib/utils";

type QuickAddProps = {
  onAdd: (modelId: string, flow: { x: number; y: number }, from?: { nodeId: string; handleId?: string | null }) => void;
};

const MENU_WIDTH = 340;
const MENU_MAX_HEIGHT = 380;

/**
 * Spotlight-style "add a node here" menu. Opened by double-clicking empty
 * canvas, pressing A, or dropping a wire on empty space (then it only lists
 * nodes that can take that wire, and the new node is connected for you).
 */
export function QuickAdd({ onAdd }: QuickAddProps) {
  const ui = useEditorUi();
  const request = ui.quickAdd;
  if (!request || typeof document === "undefined") return null;
  // Remount per request so search and cursor start fresh.
  return (
    <QuickAddMenu
      key={`${request.screen.x}:${request.screen.y}:${request.fromNodeId ?? ""}`}
      request={request}
      onAdd={onAdd}
    />
  );
}

function QuickAddMenu({
  request,
  onAdd,
}: QuickAddProps & { request: NonNullable<ReturnType<typeof useEditorUi>["quickAdd"]> }) {
  const ui = useEditorUi();
  const graph = usePipelineGraphActions();
  const { getModelStatus } = useRuntimeAvailability();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sourceNode = request.fromNodeId
    ? graph.nodes.find((node) => node.id === request.fromNodeId)
    : null;

  const candidates = useMemo<ModelCatalogEntry[]>(() => {
    const base = sourceNode
      ? getCompatibleDownstreamModels(sourceNode.data, graph.modelCatalog, graph.categories).map(
          (entry) => entry.model,
        )
      : graph.modelCatalog;
    const addable = base.filter((model) => !isSpawnOnlyModel(model.id));
    const q = query.trim().toLowerCase();
    const filtered = q
      ? addable.filter((model) =>
          [getModelLabel(model), model.provider, model.category, model.notes ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : addable;
    // Online first, then by label.
    return [...filtered].sort((a, b) => {
      const ao = getModelStatus(a).offline ? 1 : 0;
      const bo = getModelStatus(b).offline ? 1 : 0;
      if (ao !== bo) return ao - bo;
      return getModelLabel(a).localeCompare(getModelLabel(b));
    });
  }, [sourceNode, graph.modelCatalog, graph.categories, query, getModelStatus]);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const add = (model: ModelCatalogEntry) => {
    onAdd(
      model.id,
      request.flow,
      request.fromNodeId ? { nodeId: request.fromNodeId, handleId: request.fromHandleId } : undefined,
    );
    ui.closeQuickAdd();
  };

  const left = Math.min(request.screen.x, window.innerWidth - MENU_WIDTH - 12);
  const top = Math.min(request.screen.y, window.innerHeight - MENU_MAX_HEIGHT - 12);
  const sourceKind = sourceNode ? getNodeWireKinds(sourceNode.data).output : null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[240]" onMouseDown={ui.closeQuickAdd} />
      <div
        role="dialog"
        aria-label="Add a node"
        className="fixed z-[241] flex flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-[0_24px_60px_-20px_rgba(20,18,37,0.45)] animate-in fade-in-0 zoom-in-95"
        style={{ left: Math.max(12, left), top: Math.max(12, top), width: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT }}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((value) => Math.min(value + 1, candidates.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((value) => Math.max(value - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const model = candidates[cursor];
                if (model) add(model);
              } else if (event.key === "Escape") {
                event.preventDefault();
                ui.closeQuickAdd();
              }
            }}
            placeholder={sourceNode ? `Add a step after ${sourceNode.data.label}…` : "Add a node…"}
            className="h-11 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        {sourceKind ? (
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 font-mono text-[10.5px] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: wireColor(sourceKind) }} />
            Nodes that accept {wireKindLabel(sourceKind)}
          </div>
        ) : null}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {candidates.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
              {sourceNode ? "Nothing can take this output yet." : "No nodes match."}
            </p>
          ) : (
            candidates.map((model, index) => {
              const offline = getModelStatus(model).offline;
              const wires = getModelWireTypes(model);
              const kinds = getModelWireKinds(model.id, wires.input, wires.output);
              return (
                <button
                  key={model.id}
                  type="button"
                  data-index={index}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => add(model)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
                    index === cursor && "bg-primary/[0.09]",
                    offline && "opacity-55",
                  )}
                >
                  <EngineMark provider={model.provider} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{getModelLabel(model)}</span>
                    <span className="flex items-center gap-1.5 truncate font-mono text-[10.5px] text-muted-foreground">
                      <span className="size-1.5 rounded-full" style={{ background: wireColor(kinds.output) }} />
                      {model.provider} → {wireKindLabel(kinds.output)}
                      {offline ? " · offline" : ""}
                    </span>
                  </span>
                  {index === cursor ? <Plus className="size-4 text-[var(--primary-text,var(--primary))]" /> : null}
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span>↑↓ move · ↵ add · esc close</span>
          <span>{candidates.length}</span>
        </div>
      </div>
    </>,
    document.body,
  );
}
