"use client";

import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useState } from "react";

import { refreshEngineStatus, useEngineStatus } from "@/hooks/use-engine-status";
import { cn } from "@/lib/utils";

function offlineReason(detail: string | null): string {
  if (!detail) return "Offline";
  if (detail.startsWith("unreachable")) return "Not running";
  return detail.length > 32 ? `${detail.slice(0, 31)}…` : detail;
}

/** Which OCR engine services the gateway can reach right now. */
export function EngineStatusCard({ manageHref }: { manageHref: string }) {
  const { status, engines, onlineCount } = useEngineStatus();
  const [refreshing, setRefreshing] = useState(false);
  const loading = status === "loading";

  async function handleRefresh() {
    setRefreshing(true);
    await refreshEngineStatus();
    setRefreshing(false);
  }

  return (
    <section
      aria-labelledby="engine-status-heading"
      className="rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div>
          <h2
            id="engine-status-heading"
            className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
          >
            OCR engines
          </h2>
          <p className="mt-1 text-[15px] font-bold tracking-[-0.01em] text-foreground">
            {loading
              ? "Checking…"
              : status === "error"
                ? "Status unavailable"
                : `${onlineCount} of ${engines.length} online`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing || loading}
          aria-label="Re-check engine status"
          title="Re-check"
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw
            className={cn("size-4", (refreshing || loading) && "animate-spin")}
            aria-hidden
          />
        </button>
      </div>

      <ul className="mt-3 divide-y divide-[var(--landing-hairline)] border-t border-[var(--landing-hairline)]">
        {engines.map((engine) => (
          <li
            key={engine.provider}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
            title={engine.detail ?? undefined}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  loading
                    ? "animate-pulse bg-muted-foreground/40"
                    : engine.online
                      ? "bg-[var(--status-ok)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-ok)_18%,transparent)]"
                      : "bg-muted-foreground/35",
                )}
                aria-hidden
              />
              <span className="truncate text-[13.5px] font-medium text-foreground">
                {engine.name}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 font-mono text-[10.5px]",
                engine.online
                  ? "text-[var(--status-ok)]"
                  : "text-muted-foreground",
              )}
            >
              {loading ? "…" : engine.online ? "Online" : offlineReason(engine.detail)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--landing-hairline)] px-4 py-3">
        <p className="text-[12px] leading-snug text-muted-foreground">
          {onlineCount === 0 && !loading
            ? "Start engines with make ocr-up."
            : "Offline engines are greyed out on the canvas."}
        </p>
        <Link
          href={manageHref}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
        >
          Details
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
