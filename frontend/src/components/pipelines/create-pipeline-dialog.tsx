"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPipeline } from "@/lib/api/pipelines";

export function CreatePipelineDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const pipeline = await createPipeline(
        name.trim(),
        description.trim() === "" ? undefined : description.trim(),
      );
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-auto gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-10px_var(--accent)]">
            <Plus className="size-4" aria-hidden />
            New pipeline
          </Button>
        }
      />
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create pipeline</DialogTitle>
          <DialogDescription>
            Define a reusable flow of components with a single input and output.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pipeline-name">Name</Label>
            <Input
              id="pipeline-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Layout + OCR stack"
              required
              maxLength={255}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pipeline-description">Description</Label>
            <Input
              id="pipeline-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this pipeline does"
              maxLength={1024}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || name.trim() === ""}>
              {isSubmitting ? "Creating..." : "Create pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
