import { StatusPill, type StatusTone } from "@/components/app/status-pill";

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "brand" },
  succeeded: { label: "Succeeded", tone: "ok" },
  failed: { label: "Failed", tone: "danger" },
  partial: { label: "Partial", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function JobStatusBadge({ status }: { status: string }) {
  const entry = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <StatusPill tone={entry.tone} pulse={status === "running"}>
      {entry.label}
    </StatusPill>
  );
}
