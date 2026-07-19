"use client";

import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";

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
import type { Project } from "@/lib/api/client";
import { RelativeTime } from "@/components/relative-time";
import { formatShortDateTime } from "@/lib/format-datetime";
import type { ProjectStats } from "@/lib/projects/stats";

type ProjectInfoDialogProps = {
  project: Project;
  stats: ProjectStats;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-right text-sm text-foreground">{value}</span>
    </div>
  );
}

export function ProjectInfoDialog({ project, stats }: ProjectInfoDialogProps) {
  const canvasHref = `/app/projects/${project.id}/canvas`;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-sm text-muted-foreground hover:text-foreground"
            aria-label={`View info for ${project.name}`}
          >
            <Info />
          </Button>
        }
      />
      <DialogContent className="rounded-sm sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
          <DialogDescription>
            {project.description?.trim() || "No description yet."}
          </DialogDescription>
        </DialogHeader>

        <div className="border border-border bg-secondary/20 px-4">
          <InfoRow label="Project ID" value={project.id} />
          <InfoRow
            label="Nodes"
            value={String(stats.nodeCount)}
          />
          <InfoRow
            label="Connections"
            value={String(stats.edgeCount)}
          />
          <InfoRow
            label="Models"
            value={String(stats.modelCount)}
          />
          <InfoRow
            label="Files"
            value={String(stats.fileCount)}
          />
          <InfoRow
            label="Last run"
            value={
              stats.lastRunAt ? (
                <RelativeTime value={stats.lastRunAt} />
              ) : (
                "Not run yet"
              )
            }
          />
          <InfoRow
            label="Created"
            value={formatShortDateTime(project.created_at)}
          />
          <InfoRow
            label="Updated"
            value={formatShortDateTime(project.updated_at)}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={canvasHref} />}
          >
            Open canvas
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
