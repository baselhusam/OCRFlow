"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
import type { Project } from "@/lib/api/client";
import { updateProject } from "@/lib/api/projects";
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  getProjectColorTint,
  getProjectIconComponent,
  isProjectColor,
  isProjectIconKey,
  PROJECT_COLORS,
  PROJECT_ICON_OPTIONS,
  type ProjectColor,
  type ProjectIconKey,
} from "@/lib/projects/appearance";
import { cn } from "@/lib/utils";

type ProjectSettingsDialogProps = {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
}: ProjectSettingsDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [icon, setIcon] = useState<ProjectIconKey>(
    isProjectIconKey(project.icon) ? project.icon : DEFAULT_PROJECT_ICON,
  );
  const [color, setColor] = useState<ProjectColor>(
    isProjectColor(project.color) ? project.color : DEFAULT_PROJECT_COLOR,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (nextOpen) {
      setName(project.name);
      setDescription(project.description ?? "");
      setIcon(
        isProjectIconKey(project.icon) ? project.icon : DEFAULT_PROJECT_ICON,
      );
      setColor(
        isProjectColor(project.color) ? project.color : DEFAULT_PROJECT_COLOR,
      );
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
        icon,
        color,
      });
      onOpenChange(false);
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

  const PreviewIcon = getProjectIconComponent(icon);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Project settings</DialogTitle>
          <DialogDescription>
            Update how this project appears in your workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3.5 rounded-lg border border-border bg-secondary/20 px-4 py-3">
            <span
              className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px]"
              style={{
                backgroundColor: getProjectColorTint(color),
                color,
              }}
            >
              <PreviewIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold tracking-tight">{name || project.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {description.trim() || "No description yet."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`settings-name-${project.id}`}>Name</Label>
            <Input
              id={`settings-name-${project.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={255}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`settings-description-${project.id}`}>
              Description
            </Label>
            <textarea
              id={`settings-description-${project.id}`}
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

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-5 gap-2">
              {PROJECT_ICON_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                const selected = icon === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={selected}
                    onClick={() => setIcon(option.key)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    <OptionIcon className="size-4" aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((option) => {
                const selected = color === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-label={`Color ${option}`}
                    aria-pressed={selected}
                    onClick={() => setColor(option)}
                    className={cn(
                      "size-8 rounded-full border-2 transition-transform",
                      selected
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: option }}
                  />
                );
              })}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
