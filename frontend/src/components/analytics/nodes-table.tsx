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
import type { NodeBreakdownList } from "@/lib/api/analytics";

type NodesTableProps = {
  nodes: NodeBreakdownList;
};

export function NodesTable({ nodes }: NodesTableProps) {
  if (nodes.items.length === 0) {
    return (
      <p className="border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
        No pipeline nodes placed yet. Open a project canvas to add nodes.
      </p>
    );
  }

  return (
    <div className="border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last run</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.items.map((node) => (
            <TableRow key={`${node.project_id}:${node.node_id}`}>
              <TableCell>
                <Link
                  href={`/app/projects/${node.project_id}/canvas`}
                  className="transition-colors hover:text-primary"
                >
                  {node.project_name}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{node.node_id}</TableCell>
              <TableCell className="font-mono text-xs">{node.model_id}</TableCell>
              <TableCell>{node.category ?? "—"}</TableCell>
              <TableCell>{node.run_status ?? "—"}</TableCell>
              <TableCell>
                {node.last_run_at ? (
                  <RelativeTime value={node.last_run_at} />
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
