"use client";

import { useEffect, useMemo, useState } from "react";

import { ProviderLogo } from "@/components/canvas/provider-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModelConnection } from "@/lib/api/model-connections";
import {
  getConnectedProtocol,
  isConnectedVisionModel,
} from "@/lib/canvas/connected-node-meta";

type ConnectionSelectFieldProps = {
  modelId: string;
  value: string | boolean | number | undefined;
  onChange: (connection: ModelConnection | null) => void;
};

export function ConnectionSelectField({
  modelId,
  value,
  onChange,
}: ConnectionSelectFieldProps) {
  const [connections, setConnections] = useState<ModelConnection[]>([]);
  const [failed, setFailed] = useState(false);
  const protocol = getConnectedProtocol(modelId);
  const vision = isConnectedVisionModel(modelId);

  useEffect(() => {
    let active = true;
    void fetch("/api/configuration/model-connections", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load provider connections");
        return response.json() as Promise<{ items?: ModelConnection[] }>;
      })
      .then((payload) => {
        if (active) setConnections(payload.items ?? []);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, []);

  const eligible = useMemo(
    () => connections.filter((connection) =>
      connection.enabled && connection.last_validation?.status === "ready" &&
      (!protocol || connection.protocol === protocol),
    ),
    [connections, protocol],
  );
  const selected = String(value ?? "");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase">
          {vision ? "Vision provider" : "Text provider"}
        </span>
        {protocol ? <ProviderLogo provider={protocol} size={14} /> : null}
      </div>
      <Select
        value={selected || "__unconfigured"}
        onValueChange={(next) => {
          const connection = eligible.find((item) => item.id === next) ?? null;
          onChange(connection);
        }}
      >
        <SelectTrigger className="h-8 w-full font-mono text-xs">
          <SelectValue placeholder="Choose a connection" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unconfigured">Choose a validated connection</SelectItem>
          {eligible.map((connection) => (
            <SelectItem key={connection.id} value={connection.id}>
              {connection.name} · {vision ? connection.vision_model ?? "vision model" : connection.text_model ?? "text model"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {eligible.length === 0 ? (
        <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
          {failed ? "Could not load connections." : `No validated ${protocol ?? "LLM"} connection. Add one in Configuration.`}
        </p>
      ) : null}
    </div>
  );
}
