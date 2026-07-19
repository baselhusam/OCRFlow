import Link from "next/link";

import { RelativeTime } from "@/components/relative-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectBreakdownList } from "@/lib/api/analytics";

type ProjectsTableProps = {
  projects: ProjectBreakdownList;
};

export function ProjectsTable({ projects }: ProjectsTableProps) {
  if (projects.items.length === 0) {
    return (
      <p className="border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
        No projects yet. Create one from the dashboard to start building pipelines.
      </p>
    );
  }

  return (
    <div className="border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead className="text-right">Nodes</TableHead>
            <TableHead className="text-right">Models</TableHead>
            <TableHead className="text-right">Files</TableHead>
            <TableHead className="text-right">Runs</TableHead>
            <TableHead>Last activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.items.map((project) => (
            <TableRow key={project.project_id}>
              <TableCell>
                <Link
                  href={`/app/projects/${project.project_id}/canvas`}
                  className="font-medium transition-colors hover:text-bronze"
                >
                  {project.name}
                </Link>
              </TableCell>
              <TableCell className="text-right">{project.node_count}</TableCell>
              <TableCell className="text-right">{project.model_count}</TableCell>
              <TableCell className="text-right">{project.file_count}</TableCell>
              <TableCell className="text-right">{project.run_count}</TableCell>
              <TableCell>
                {project.last_activity_at ? (
                  <RelativeTime value={project.last_activity_at} />
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
