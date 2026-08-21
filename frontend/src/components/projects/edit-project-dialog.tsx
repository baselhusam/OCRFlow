"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

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
import type { Project } from "@/lib/api/client";
import { updateProject } from "@/lib/api/projects";
import { cn } from "@/lib/utils";

type EditProjectDialogProps = {
  project: Project;
};

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(project.name);
      setDescription(project.description ?? "");
      setError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
      });
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update project",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-sm text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${project.name}`}
          >
            <Pencil />
          </Button>
        }
      />
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update the project name and description shown in your workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-project-name-${project.id}`}>Name</Label>
            <Input
              id={`edit-project-name-${project.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={255}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-project-description-${project.id}`}>
              Description
            </Label>
            <textarea
              id={`edit-project-description-${project.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this pipeline processes or extracts"
              maxLength={1024}
              rows={3}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
              )}
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
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
