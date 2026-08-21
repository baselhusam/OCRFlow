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
import { formatBytes, type DocumentBreakdownList } from "@/lib/api/analytics";

type DocumentsTableProps = {
  documents: DocumentBreakdownList;
};

export function DocumentsTable({ documents }: DocumentsTableProps) {
  if (documents.items.length === 0) {
    return (
      <p className="border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
        No uploaded documents yet. Upload a PDF or image on the canvas.
      </p>
    );
  }

  return (
    <div className="border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Format</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Uploaded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.items.map((document) => (
            <TableRow key={`${document.project_id}:${document.asset_id}`}>
              <TableCell className="max-w-[240px] truncate">{document.filename}</TableCell>
              <TableCell>
                <Link
                  href={`/app/projects/${document.project_id}/canvas`}
                  className="transition-colors hover:text-primary"
                >
                  {document.project_name}
                </Link>
              </TableCell>
              <TableCell className="uppercase">{document.format}</TableCell>
              <TableCell className="text-right">
                {formatBytes(document.size_bytes)}
              </TableCell>
              <TableCell>
                {document.uploaded_at ? (
                  <RelativeTime value={document.uploaded_at} />
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
