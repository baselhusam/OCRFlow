import type { Project, ProjectStatus } from "@/lib/api/client";

export type ProjectStatusStyles = {
  label: string;
  pillBg: string;
  pillColor: string;
  dotColor: string;
};

const STATUS_STYLES: Record<ProjectStatus, ProjectStatusStyles> = {
  live: {
    label: "Live",
    pillBg: "rgba(18,166,91,0.12)",
    pillColor: "#0E7C45",
    dotColor: "#12A65B",
  },
  running: {
    label: "Running",
    pillBg: "rgba(232,163,23,0.14)",
    pillColor: "#9A6B07",
    dotColor: "#E8A317",
  },
  failed: {
    label: "Failed",
    pillBg: "rgba(224,36,94,0.12)",
    pillColor: "#B5113F",
    dotColor: "#E0245E",
  },
  idle: {
    label: "Idle",
    pillBg: "#EDEBF2",
    pillColor: "#6F6C84",
    dotColor: "#9A95B5",
  },
  draft: {
    label: "Draft",
    pillBg: "var(--project-status-draft-bg, #EDE9FE)",
    pillColor: "var(--project-status-draft-fg, #5B2EEF)",
    dotColor: "var(--project-status-draft-dot, #5B2EEF)",
  },
};

export function getProjectStatusStyles(
  status: ProjectStatus,
  accentColor?: string,
): ProjectStatusStyles {
  if (status === "draft" && accentColor) {
    return {
      ...STATUS_STYLES.draft,
      pillBg: `${accentColor}1F`,
      pillColor: accentColor,
      dotColor: accentColor,
    };
  }
  return STATUS_STYLES[status] ?? STATUS_STYLES.idle;
}

export function getArchivedStatusStyles(): ProjectStatusStyles {
  return {
    label: "Archived",
    pillBg: "#EDEBF2",
    pillColor: "#6F6C84",
    dotColor: "#9A95B5",
  };
}

export function getProjectDisplayStatus(project: Project): ProjectStatus {
  if (
    project.status === "draft" ||
    project.status === "idle" ||
    project.status === "running" ||
    project.status === "live" ||
    project.status === "failed"
  ) {
    return project.status;
  }
  return "idle";
}

export function isActiveProject(project: Project): boolean {
  return !project.is_archived && (project.status === "live" || project.status === "running");
}
