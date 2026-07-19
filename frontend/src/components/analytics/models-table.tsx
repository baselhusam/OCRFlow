import { RelativeTime } from "@/components/relative-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatBytes,
  formatSuccessRate,
  type ModelUsageList,
} from "@/lib/api/analytics";

type ModelsTableProps = {
  models: ModelUsageList;
};

export function ModelsTable({ models }: ModelsTableProps) {
  if (models.items.length === 0) {
    return (
      <p className="border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
        No model runs recorded yet. Test a node on the canvas to see usage here.
      </p>
    );
  }

  return (
    <div className="border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Runs</TableHead>
            <TableHead className="text-right">Avg latency</TableHead>
            <TableHead className="text-right">Success</TableHead>
            <TableHead>Last used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.items.map((model) => (
            <TableRow key={model.model_id}>
              <TableCell>
                <div>
                  <p className="font-medium">{model.display_name ?? model.model_id}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {model.model_id}
                  </p>
                </div>
              </TableCell>
              <TableCell>{model.category ?? "—"}</TableCell>
              <TableCell className="text-right">{model.run_count}</TableCell>
              <TableCell className="text-right">
                {model.avg_latency_ms !== null
                  ? `${model.avg_latency_ms.toFixed(0)} ms`
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                {formatSuccessRate(model.success_rate)}
              </TableCell>
              <TableCell>
                {model.last_used_at ? (
                  <RelativeTime value={model.last_used_at} />
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
