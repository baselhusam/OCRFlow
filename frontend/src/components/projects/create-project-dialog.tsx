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
import { createProject } from "@/lib/api/projects";

type CreateProjectDialogProps = {
  /** Custom trigger element; defaults to the primary "New project" button. */
  trigger?: React.ReactElement;
  /** Controlled open state (for command palette / keyboard entry points). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateProjectDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreateProjectDialogProps = {}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setOpen = (next: boolean) => {
    if (next) {
      setIsSubmitting(false);
      setError(null);
    }
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const project = await createProject(
        name.trim(),
        description.trim() === "" ? undefined : description.trim(),
      );
      router.push(`/app/projects/${project.id}/canvas`);
      setOpen(false);
      setName("");
      setDescription("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create project",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined || trigger ? (
        <DialogTrigger
          render={
            trigger ?? (
              <Button className="h-10 gap-2 rounded-lg px-4 text-sm font-semibold shadow-[0_8px_22px_-12px_var(--accent)]">
                <Plus className="size-4" aria-hidden />
                New project
              </Button>
            )
          }
        />
      ) : null}
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Name it and you&apos;ll land on an empty canvas, ready for your
            first loader and model nodes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Invoice extraction"
              required
              maxLength={255}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this pipeline processes or extracts"
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
              {isSubmitting ? "Opening canvas…" : "Create & open canvas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
