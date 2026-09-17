"use client";

import { Eye, FileImage, FileText, Play } from "lucide-react";

import { requestPaletteAdd } from "@/lib/canvas/palette-add-bridge";
import { shortcutLabel } from "@/lib/keyboard-shortcuts";
import type { GraphEntityContext } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type CanvasEmptyStateProps = {
  entity: GraphEntityContext;
  readOnly?: boolean;
};

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-[10px] text-muted-foreground">
        {index}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[13px] font-medium leading-tight text-foreground">
          {title}
        </p>
        <div className="text-[12px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </li>
  );
}

/** Inline reference to a node-footer button. */
function Chip({
  icon: Icon,
  children,
}: {
  icon: typeof Play;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/60 px-1 align-[-2px] font-medium text-[11px] text-foreground">
      <Icon className="size-3" />
      {children}
    </span>
  );
}

function AddButton({
  icon: Icon,
  label,
  modelId,
  primary = false,
}: {
  icon: typeof FileImage;
  label: string;
  modelId: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card text-foreground hover:border-foreground/30",
      )}
      onClick={() => requestPaletteAdd(modelId)}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

/**
 * Shown when the graph has no nodes. Teaches the three-step loop and gets
 * the first node onto the canvas with one click.
 */
export function CanvasEmptyState({
  entity,
  readOnly = false,
}: CanvasEmptyStateProps) {
  const isPipeline = entity.kind === "pipeline";

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-card/95 p-6 shadow-[0_24px_60px_-24px_color-mix(in_srgb,var(--foreground)_25%,transparent)] backdrop-blur-sm">
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          {isPipeline ? "New pipeline" : "Empty canvas"}
        </p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
          {isPipeline ? "Compose a reusable pipeline" : "Build your first flow"}
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {isPipeline
            ? "Chain models into a single input → output flow, then save it to reuse as one node in any project."
            : "Load a document, wire it through models, run — every node shows its output right on the canvas."}
        </p>

        <ol className="mt-5 space-y-4">
          {isPipeline ? (
            <>
              <Step index={1} title="Add the first model">
                Pick a model from the library on the left. Pipelines take their
                input from whatever you connect them to later, so no loader is
                needed.
              </Step>
              <Step index={2} title="Wire a single path">
                Drag from a node&apos;s right handle to the next node&apos;s
                left handle. Keep exactly one input and one output.
              </Step>
              <Step index={3} title="Save">
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                  {shortcutLabel("Mod")}S
                </kbd>{" "}
                saves the pipeline once the boundary is valid.
              </Step>
            </>
          ) : (
            <>
              <Step index={1} title="Add a document">
                {readOnly ? (
                  "Start with an image or PDF loader."
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <AddButton
                      icon={FileImage}
                      label="Image loader"
                      modelId="loader/image"
                      primary
                    />
                    <AddButton
                      icon={FileText}
                      label="PDF loader"
                      modelId="loader/pdf"
                    />
                  </div>
                )}
              </Step>
              <Step index={2} title="Add models and connect them">
                Search the library on the left (
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                  {shortcutLabel("Mod")}⇧P
                </kbd>{" "}
                toggles it), click to add, then drag from a node&apos;s right
                handle to the next node&apos;s left handle.
              </Step>
              <Step index={3} title="Run and inspect">
                <Chip icon={Play}>Run</Chip> a single node or the whole flow,
                then hit <Chip icon={Eye}>Preview</Chip> on any node to see what
                it produced.
              </Step>
            </>
          )}
        </ol>
      </div>
    </div>
  );
}
