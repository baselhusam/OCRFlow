"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime, formatShortDateTime } from "@/lib/format-datetime";

type RelativeTimeProps = {
  value: string | Date;
  refreshMs?: number;
};

export function RelativeTime({ value, refreshMs = 30_000 }: RelativeTimeProps) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setRelative(formatRelativeTime(value));
    update();

    if (refreshMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(update, refreshMs);
    return () => window.clearInterval(intervalId);
  }, [refreshMs, value]);

  return relative ?? formatShortDateTime(value);
}
