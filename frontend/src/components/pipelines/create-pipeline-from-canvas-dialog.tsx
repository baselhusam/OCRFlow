"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Edge, Node } from "@xyflow/react";
import { GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { createPipeline } from "@/lib/api/pipelines";
import { formatBoundaryErrors } from "@/lib/pipelines/boundary-labels";
import { graphFromCanvasSelection } from "@/lib/pipelines/selection-to-graph";

type CreatePipelineFromCanvasDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
};

export function CreatePipelineFromCanvasDialog({
  open,
  onOpenChange,
  nodes,
  edges,
}: CreatePipelineFromCanvasDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const draft = useMemo(
    () => graphFromCanvasSelection(nodes, edges),
    [nodes, edges],
  );

  const canSubmit = name.trim() !== "" && draft.boundary.valid && !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.boundary.valid) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const pipeline = await createPipeline(
        name.trim(),
        description.trim() === "" ? undefined : description.trim(),
        { graph: draft.graph },
      );
      onOpenChange(false);
      setName("");
      setDescription("");
      router.push(`/app/pipelines/${pipeline.id}/canvas`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create pipeline",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const sourceLabel = draft.usedFullCanvas
    ? "Using the full canvas (file loaders are omitted)."
    : `Using ${draft.selectedCount} selected node${draft.selectedCount === 1 ? "" : "s"}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create pipeline from canvas</DialogTitle>
          <DialogDescription>
            Save this experiment as a reusable pipeline, then apply it to a
            document batch from Jobs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {sourceLabel}
            {draft.strippedLoaderCount > 0
              ? ` Stripped ${draft.strippedLoaderCount} file loader${draft.strippedLoaderCount === 1 ? "" : "s"} — jobs supply documents at apply time.`
              : null}
          </p>

          {draft.boundary.valid ? (
            <p className="font-mono text-[11px] text-primary">
              {draft.boundary.inputLabel} → {draft.boundary.outputLabel}
            </p>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {formatBoundaryErrors(draft.boundary.errors)}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="from-canvas-pipeline-name">Name</Label>
            <Input
              id="from-canvas-pipeline-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Layout + OCR stack"
              required
              maxLength={255}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from-canvas-pipeline-description">Description</Label>
            <Input
              id="from-canvas-pipeline-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this pipeline does"
              maxLength={1024}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <GitBranch className="size-4" aria-hidden />
              {isSubmitting ? "Creating..." : "Create pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
