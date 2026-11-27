import { StatusPill, type StatusTone } from "@/components/app/status-pill";
import type { Project, ProjectStatus } from "@/lib/api/client";
import { getProjectDisplayStatus } from "@/lib/projects/status";

type ProjectStatusPillProps = {
  project: Project;
  className?: string;
};

const STATUS: Record<ProjectStatus, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "ok" },
  running: { label: "Running", tone: "warn" },
  failed: { label: "Failed", tone: "danger" },
  idle: { label: "Idle", tone: "neutral" },
  draft: { label: "Draft", tone: "brand" },
};

export function ProjectStatusPill({ project, className }: ProjectStatusPillProps) {
  if (project.is_archived) {
    return (
      <StatusPill tone="neutral" className={className}>
        Archived
      </StatusPill>
    );
  }
  const status = STATUS[getProjectDisplayStatus(project)] ?? STATUS.idle;
  return (
    <StatusPill
      tone={status.tone}
      pulse={status.label === "Running"}
      className={className}
    >
      {status.label}
    </StatusPill>
  );
}
