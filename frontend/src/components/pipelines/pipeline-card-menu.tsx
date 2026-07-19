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

import { PipelineSettingsDialog } from "@/components/pipelines/pipeline-settings-dialog";
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
import type { Pipeline } from "@/lib/api/client";
import { deletePipeline, updatePipeline } from "@/lib/api/pipelines";

type PipelineCardMenuProps = {
  pipeline: Pipeline;
};

export function PipelineCardMenu({ pipeline }: PipelineCardMenuProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasHref = `/app/pipelines/${pipeline.id}/canvas`;

  async function handleArchiveToggle() {
    setIsArchiving(true);
    setError(null);
    try {
      await updatePipeline(pipeline.id, {
        is_archived: !pipeline.is_archived,
      });
      router.refresh();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to update pipeline",
      );
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await deletePipeline(pipeline.id);
      setDeleteOpen(false);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete pipeline",
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
              aria-label={`Actions for ${pipeline.name}`}
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
            {pipeline.is_archived ? (
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

      <PipelineSettingsDialog
        pipeline={pipeline}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{pipeline.name}</strong> and its
              definition. Projects using this pipeline will lose the reference.
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
              {isDeleting ? "Deleting..." : "Delete pipeline"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
