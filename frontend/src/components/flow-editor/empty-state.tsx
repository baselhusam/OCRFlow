"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileUp, MousePointerClick, Sparkles } from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { EngineMark } from "@/components/flow-editor/library/engine-mark";
import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import type { ModelCatalogEntry } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export type Recipe = {
  id: string;
  title: string;
  blurb: string;
  steps: string[];
};

/**
 * Starter flows. Each one is only offered when every model it needs is in the
 * catalog; engines that are offline still work but show a warning.
 */
export const RECIPES: Recipe[] = [
  {
    id: "invoice-json",
    title: "Invoice → JSON",
    blurb: "Read every line, then let a local LLM fill the fields you define.",
    steps: ["loader/pdf", "surya/layout", "surya/text-detection", "surya/text-recognition", "ollama/structured-extract"],
  },
  {
    id: "scan-text",
    title: "Scan → text",
    blurb: "Find the layout, locate every text line and recognise it.",
    steps: ["loader/pdf", "surya/layout", "surya/text-detection", "surya/text-recognition"],
  },
  {
    id: "doc-markdown",
    title: "PDF → Markdown",
    blurb: "Convert a whole document with Docling in one step.",
    steps: ["loader/pdf", "docling/convert-pipeline"],
  },
  {
    id: "layout",
    title: "Find layout",
    blurb: "Detect headings, paragraphs, tables and figures.",
    steps: ["loader/pdf", "surya/layout"],
  },
  {
    id: "ask-image",
    title: "Ask about an image",
    blurb: "Prompt a small local vision model about a photo or scan.",
    steps: ["loader/image", "ollama/vision-prompt"],
  },
];

type EmptyStateProps = {
  readOnly: boolean;
  onRecipe: (recipe: Recipe) => void;
  onChooseFile: () => void;
  onOpenQuickAdd: () => void;
};

export function EmptyState({ readOnly, onRecipe, onChooseFile, onOpenQuickAdd }: EmptyStateProps) {
  const { modelCatalog } = usePipelineGraphActions();
  const { getModelStatus } = useRuntimeAvailability();
  const byId = new Map(modelCatalog.map((model) => [model.id, model]));
  const recipes = RECIPES.filter((recipe) => recipe.steps.every((step) => byId.has(step)));

  if (readOnly) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <p className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          This canvas is empty.
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto w-full max-w-[640px]"
      >
        <p className="text-center font-mono text-[10.5px] tracking-[0.18em] text-[var(--primary-text,var(--primary))] uppercase">
          New flow
        </p>
        <h2 className="mt-2 text-center text-[26px] font-bold tracking-[-0.03em] text-foreground">
          What do you want to get out of your documents?
        </h2>
        <p className="mx-auto mt-2 max-w-[460px] text-center text-[13.5px] leading-relaxed text-muted-foreground">
          Start from a recipe, or drop a PDF or image anywhere on the canvas.
        </p>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {recipes.map((recipe, index) => {
            const models = recipe.steps
              .map((step) => byId.get(step))
              .filter((model): model is ModelCatalogEntry => Boolean(model));
            const offline = models.some((model) => getModelStatus(model).offline);
            return (
              <motion.button
                key={recipe.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04 }}
                onClick={() => onRecipe(recipe)}
                className={cn(
                  "group flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-left shadow-sm transition-[border-color,box-shadow,transform]",
                  "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_14px_30px_-18px_var(--primary)]",
                  index === 0 && "sm:col-span-2",
                )}
              >
                <div className="flex items-center gap-2">
                  {index === 0 ? <Sparkles className="size-3.5 text-[var(--primary-text,var(--primary))]" /> : null}
                  <span className="text-[14px] font-semibold tracking-[-0.01em]">{recipe.title}</span>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <p className="text-[12.5px] leading-snug text-muted-foreground">{recipe.blurb}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  {models.map((model, step) => (
                    <span key={model.id} className="flex items-center gap-1">
                      {step > 0 ? <span className="h-px w-2.5 bg-border" /> : null}
                      <span title={model.display_name ?? model.id} className="inline-flex">
                        <EngineMark provider={model.provider} size={24} />
                      </span>
                    </span>
                  ))}
                  {offline ? (
                    <span className="ml-auto font-mono text-[10px] text-[var(--status-warn)]">
                      needs an engine
                    </span>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onChooseFile}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-[13px] font-medium transition-colors hover:border-foreground/20"
          >
            <FileUp className="size-4" /> Upload a document
          </button>
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <MousePointerClick className="size-4" /> Start blank
            <kbd className="rounded border border-border px-1.5 font-mono text-[10px]">A</kbd>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
