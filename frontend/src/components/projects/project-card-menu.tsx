"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  MoreHorizontal,
  Settings,
  Trash2,
} from "lucide-react";

import { ProjectSettingsDialog } from "@/components/projects/project-settings-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/lib/api/client";
import { deleteProject, updateProject } from "@/lib/api/projects";

type ProjectCardMenuProps = {
  project: Project;
};

export function ProjectCardMenu({ project }: ProjectCardMenuProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasHref = `/app/projects/${project.id}/canvas`;

  async function handleArchiveToggle() {
    setIsArchiving(true);
    setError(null);
    try {
      await updateProject(project.id, {
        is_archived: !project.is_archived,
      });
      router.refresh();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to update project",
      );
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteProject(project.id);
      setDeleteOpen(false);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete project",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${project.name}`}
              className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              onClick={(event) => event.preventDefault()}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" aria-hidden />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={canvasHref} />}>
            <ExternalLink className="size-4" aria-hidden />
            Open canvas
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isArchiving}
            onClick={() => void handleArchiveToggle()}
          >
            {project.is_archived ? (
              <>
                <ArchiveRestore className="size-4" aria-hidden />
                Restore
              </>
            ) : (
              <>
                <Archive className="size-4" aria-hidden />
                Archive
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectSettingsDialog
        project={project}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{project.name}</strong>, its
              canvas, and uploaded files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
