"use client";

import { ArrowRight } from "lucide-react";

import { ParamField } from "@/components/canvas/node-detail/param-field";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useEditorUi } from "@/components/flow-editor/editor-ui-context";
import { resolveParamValue, type ParamFieldDef } from "@/lib/canvas/node-param-schema";
import type { PipelineNodeData } from "@/lib/canvas/types";

export function QuickSettings({
  nodeId,
  data,
  fields,
}: {
  nodeId: string;
  data: PipelineNodeData;
  fields: ParamFieldDef[];
}) {
  const { updateNodeConfig } = usePipelineGraphActions();
  const ui = useEditorUi();

  return (
    <div className="nodrag nowheel flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Quick settings
        </p>
        <p className="max-w-[150px] truncate text-[11px] font-medium text-foreground/80">{data.label}</p>
      </div>
      <div className="flex flex-col gap-3.5 px-3.5 py-3.5">
        {fields.map((field) => (
          <ParamField
            key={field.key}
            field={field}
            value={resolveParamValue(data.modelId, data.params, field)}
            onChange={(value) => updateNodeConfig(nodeId, { [field.key]: value })}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          ui.setQuickSettingsNodeId(null);
          ui.openInspector(nodeId, "parameters");
        }}
        className="flex items-center justify-between border-t border-border px-3.5 py-2.5 text-[12px] font-medium text-[var(--primary-text,var(--primary))] transition-colors hover:bg-primary/[0.06]"
      >
        All settings
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
