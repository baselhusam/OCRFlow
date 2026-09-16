import type { Project } from "@/lib/api/client";
import {
  getArchivedStatusStyles,
  getProjectDisplayStatus,
  getProjectStatusStyles,
} from "@/lib/projects/status";

type ProjectStatusPillProps = {
  project: Project;
};

export function ProjectStatusPill({ project }: ProjectStatusPillProps) {
  const styles = project.is_archived
    ? getArchivedStatusStyles()
    : getProjectStatusStyles(
        getProjectDisplayStatus(project),
        project.color,
      );

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: styles.pillBg,
        color: styles.pillColor,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: styles.dotColor }}
        aria-hidden
      />
      {styles.label}
    </span>
  );
}
