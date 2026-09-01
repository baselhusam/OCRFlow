"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleOff,
  CircleX,
  KeyRound,
  LoaderCircle,
  Network,
  PlugZap,
  RefreshCw,
  ServerCog,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProviderLogo } from "@/components/canvas/provider-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  EngineAuthType,
  EngineInput,
  EngineProvider,
  EngineStatus,
  EngineValidation,
  OcrEngine,
  OcrEngineList,
} from "@/lib/api/ocr-engines";
import type { RuntimeAvailability } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

const PROVIDERS: {
  value: EngineProvider;
  label: string;
  port: string;
  detail: string;
}[] = [
  {
    value: "surya",
    label: "Surya",
    port: "8101",
    detail: "Layout, text, reading order & tables",
  },
  {
    value: "docling",
    label: "Docling",
    port: "8102",
    detail: "OCR, layout, document intelligence & VLM",
  },
  {
    value: "paddle",
    label: "PaddleOCR",
    port: "8103",
    detail: "Document layout, OCR & PP-Structure",
  },
];

const EMPTY_FORM: EngineInput = {
  name: "",
  provider: "surya",
  base_url: "",
  auth_type: "none",
  api_key: "",
  enabled: true,
};

const STATUS_META: Record<
  EngineStatus,
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  ready: {
    label: "Ready",
    icon: CircleCheck,
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  partial: {
    label: "Partial",
    icon: CircleAlert,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  authentication_required: {
    label: "Credentials needed",
    icon: KeyRound,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  incompatible: {
    label: "Incompatible",
    icon: CircleX,
    className: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  unreachable: {
    label: "Offline",
    icon: CircleOff,
    className: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

function statusMeta(status: EngineStatus | undefined) {
  return STATUS_META[status ?? "unreachable"];
}

function StatusBadge({ status }: { status: EngineStatus | undefined }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", meta.className)}>
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Not checked yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function providerInfo(provider: EngineProvider) {
  return PROVIDERS.find((item) => item.value === provider) ?? PROVIDERS[0];
}

export function EngineConfiguration() {
  const [engines, setEngines] = useState<OcrEngine[]>([]);
  const [runtime, setRuntime] = useState<RuntimeAvailability | null>(null);
  const [form, setForm] = useState<EngineInput>(EMPTY_FORM);
  const [validation, setValidation] = useState<EngineValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadEngines() {
    setLoading(true);
    try {
      const [response, runtimeResponse] = await Promise.all([
        fetch("/api/configuration/engines", { cache: "no-store" }),
        fetch("/api/models/runtime", { cache: "no-store" }),
      ]);
      const body = (await response.json()) as OcrEngineList | { detail?: string };
      if (!response.ok) throw new Error("detail" in body ? body.detail : "Could not load engines");
      setEngines((body as OcrEngineList).items);
      if (runtimeResponse.ok) {
        setRuntime((await runtimeResponse.json()) as RuntimeAvailability);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load engines");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEngines();
  }, []);

  function setField<Key extends keyof EngineInput>(key: Key, value: EngineInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidation(null);
  }

  async function validateConnection() {
    setError(null);
    setProbing(true);
    try {
      const response = await fetch("/api/configuration/engines/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await response.json()) as EngineValidation | { detail?: string };
      if (!response.ok) throw new Error("detail" in body ? body.detail : "Validation failed");
      setValidation(body as EngineValidation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Validation failed");
    } finally {
      setProbing(false);
    }
  }

  async function saveConnection() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/configuration/engines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await response.json()) as OcrEngine | { detail?: string };
      if (!response.ok) throw new Error("detail" in body ? body.detail : "Could not save engine");
      setEngines((current) => [body as OcrEngine, ...current]);
      setForm(EMPTY_FORM);
      setValidation(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save engine");
    } finally {
      setSaving(false);
    }
  }

  async function revalidate(engineId: string) {
    setError(null);
    setBusyId(engineId);
    try {
      const response = await fetch(`/api/configuration/engines/${engineId}/validate`, { method: "POST" });
      const body = (await response.json()) as OcrEngine | { detail?: string };
      if (!response.ok) throw new Error("detail" in body ? body.detail : "Validation failed");
      setEngines((current) => current.map((engine) => engine.id === engineId ? body as OcrEngine : engine));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Validation failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEngine(engine: OcrEngine, enabled: boolean) {
    setBusyId(engine.id);
    try {
      const response = await fetch(`/api/configuration/engines/${engine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const body = (await response.json()) as OcrEngine | { detail?: string };
      if (!response.ok) throw new Error("detail" in body ? body.detail : "Could not update engine");
      setEngines((current) => current.map((item) => item.id === engine.id ? body as OcrEngine : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update engine");
    } finally {
      setBusyId(null);
    }
  }

  async function removeEngine(engineId: string) {
    if (!window.confirm("Remove this engine connection? Its stored API key will be deleted.")) return;
    setBusyId(engineId);
    try {
      const response = await fetch(`/api/configuration/engines/${engineId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Could not remove engine");
      }
      setEngines((current) => current.filter((engine) => engine.id !== engineId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove engine");
    } finally {
      setBusyId(null);
    }
  }

  const canSave = validation?.status === "ready" || validation?.status === "partial";

  return (
    <div className="space-y-9 pb-12">
      <header className="max-w-3xl space-y-3.5">
        <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Configuration / engines</p>
        <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.04em] text-foreground">OCR engine control room</h1>
        <p className="max-w-2xl text-[15px] leading-6 text-muted-foreground">
          Register OCRFlow-compatible Surya, Docling, or PaddleOCR services from any reachable host. Every connection is checked for liveness, credentials, protocol version, and the model APIs the canvas needs.
        </p>
      </header>

      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {runtime ? <RuntimeStrip runtime={runtime} /> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_14px_40px_rgba(31,20,76,0.05)]">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-base font-bold tracking-[-0.02em]">Connected engines</h2>
              <p className="mt-1 text-sm text-muted-foreground">Only ready capabilities are eligible for execution.</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Network className="size-5" /></div>
          </div>
          <div className="divide-y divide-border">
            {loading ? <div className="flex items-center gap-3 px-6 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading engine registry…</div> : null}
            {!loading && engines.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <ServerCog className="mx-auto size-7 text-muted-foreground/55" />
                <p className="mt-3 font-semibold">No external engines connected</p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-muted-foreground">Add a provider service to see which OCR models are actually ready to use.</p>
              </div>
            ) : null}
            {engines.map((engine) => <EngineRow key={engine.id} engine={engine} busy={busyId === engine.id} onRevalidate={() => void revalidate(engine.id)} onToggle={(enabled) => void toggleEngine(engine, enabled)} onRemove={() => void removeEngine(engine.id)} />)}
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-[0_14px_40px_rgba(31,20,76,0.05)]">
          <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><PlugZap className="size-4" /></span><div><h2 className="font-bold tracking-[-0.02em]">Connect an engine</h2><p className="text-xs text-muted-foreground">Run a compatibility check first.</p></div></div>
          <div className="mt-6 space-y-4">
            <Field label="Connection name"><Input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Production Surya" /></Field>
            <Field label="OCR provider">
              <ProviderPicker
                provider={form.provider}
                onChange={(provider) => setField("provider", provider)}
              />
            </Field>
            <Field label="Engine URL"><Input value={form.base_url} onChange={(event) => setField("base_url", event.target.value)} placeholder="http://10.0.0.15:8101" inputMode="url" /></Field>
            <Field label="Authentication"><select value={form.auth_type} onChange={(event) => setField("auth_type", event.target.value as EngineAuthType)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"><option value="none">No API key</option><option value="bearer">Bearer token</option><option value="x-api-key">X-API-Key header</option></select></Field>
            {form.auth_type !== "none" ? <Field label="API key"><Input type="password" value={form.api_key} onChange={(event) => setField("api_key", event.target.value)} placeholder="Stored encrypted" autoComplete="new-password" /></Field> : null}
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-muted/55 px-3.5 py-3"><span><span className="block text-sm font-semibold">Enable after saving</span><span className="block text-xs text-muted-foreground">Allow this engine’s passing capabilities.</span></span><Switch checked={form.enabled} onCheckedChange={(checked) => setField("enabled", checked)} /></label>
            <Button type="button" variant="outline" className="w-full" onClick={() => void validateConnection()} disabled={probing || !form.base_url || !form.provider}>{probing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Validate connection</Button>
            <Button type="button" className="w-full" onClick={() => void saveConnection()} disabled={saving || !canSave}>{saving ? <LoaderCircle className="animate-spin" /> : <Check />} Save verified engine</Button>
          </div>
          <ProbeResult validation={validation} />
        </aside>
      </section>

      <section className="rounded-2xl border border-border bg-[linear-gradient(120deg,rgba(91,46,239,.10),transparent_45%)] px-6 py-5">
        <h2 className="font-bold tracking-[-0.02em]">What the check verifies</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><CheckItem label="Reachability" text="The configured IP and port serve an OCRFlow engine." /><CheckItem label="Access" text="Detects when credentials are required or rejected." /><CheckItem label="Capability contract" text="Requires protocol v1 and tests each supported model API." /></div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><Label className="text-xs font-semibold text-foreground">{label}</Label>{children}</label>; }
function CheckItem({ label, text }: { label: string; text: string }) { return <div className="rounded-xl border border-border/80 bg-card/80 p-3.5"><p className="font-semibold">{label}</p><p className="mt-1 leading-5 text-muted-foreground">{text}</p></div>; }

function ProviderPicker({
  provider,
  onChange,
}: {
  provider: EngineProvider;
  onChange: (provider: EngineProvider) => void;
}) {
  const selected = providerInfo(provider);
  return (
    <Select value={provider} onValueChange={(value) => onChange(value as EngineProvider)}>
      <SelectTrigger className="h-12! w-full rounded-xl border-border bg-muted/30 px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.6)] hover:bg-muted/55">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
            <ProviderLogo provider={selected.value} size={19} />
          </span>
          <span className="flex min-w-0 flex-col">
            <SelectValue className="font-semibold tracking-[-0.01em]">
              {selected.label}
            </SelectValue>
            <span className="truncate font-mono text-[10px] font-normal text-muted-foreground">
              default port {selected.port}
            </span>
          </span>
        </span>
      </SelectTrigger>
      <SelectContent className="min-w-[330px] rounded-2xl border-border bg-card p-1.5 shadow-[0_18px_48px_rgba(31,20,76,.18)]">
        <SelectLabel className="px-2.5 py-2 font-mono text-[10px] tracking-[0.12em] uppercase">
          Supported providers
        </SelectLabel>
        <SelectGroup className="space-y-1 p-0">
          {PROVIDERS.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="min-h-15 rounded-xl px-2.5 py-2.5 pr-9 data-highlighted:bg-primary/9 data-highlighted:text-foreground"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
                  <ProviderLogo provider={item.value} size={23} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold tracking-[-0.01em]">{item.label}</span>
                  <span className="truncate text-[11px] font-normal text-muted-foreground">
                    {item.detail}
                  </span>
                  <span className="font-mono text-[10px] font-normal text-primary/75">
                    default port {item.port}
                  </span>
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function RuntimeStrip({ runtime }: { runtime: RuntimeAvailability }) {
  const online = runtime.providers.filter((provider) => provider.running);
  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_36px_rgba(31,20,76,0.04)]"><div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"><div><p className="font-mono text-[10px] tracking-[0.14em] text-primary uppercase">Built-in runtime</p><h2 className="mt-1 text-sm font-bold">{online.length} provider service{online.length === 1 ? "" : "s"} running</h2></div><span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] text-muted-foreground">{runtime.mode} mode</span></div><div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">{runtime.providers.filter((provider) => provider.provider !== "ollama").map((provider) => <div key={provider.provider} className="p-4"><div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/35"><ProviderLogo provider={provider.provider} size={21} /></span><span className="capitalize text-sm font-semibold">{provider.provider}</span></span><span className={provider.running ? "text-emerald-600" : "text-muted-foreground"}>{provider.running ? "●" : "○"}</span></div><p className="mt-2 text-xs text-muted-foreground">{provider.running ? `${provider.models?.length ?? 0} model APIs advertised` : provider.detail ?? "Offline"}</p>{provider.running && provider.models?.length ? <p className="mt-2 line-clamp-2 font-mono text-[10px] leading-4 text-muted-foreground">{provider.models.join(" · ")}</p> : null}</div>)}</div></section>;
}

function ProbeResult({ validation }: { validation: EngineValidation | null }) {
  if (!validation) return <div className="mt-5 rounded-xl border border-dashed border-border px-3.5 py-4 text-xs leading-5 text-muted-foreground">Validation results will show the detected protocol, model APIs, and any reason an engine cannot be used.</div>;
  return <div className="mt-5 rounded-xl border border-border bg-muted/35 p-3.5"><div className="flex items-center justify-between gap-3"><StatusBadge status={validation.status} /><span className="font-mono text-[10px] text-muted-foreground">API v{validation.api_version ?? "—"}</span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{validation.detail}</p>{validation.model_checks.length ? <details className="mt-3"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold">{validation.model_checks.filter((item) => item.available).length}/{validation.model_checks.length} model APIs passed<ChevronDown className="size-3.5" /></summary><div className="mt-2 space-y-1.5 border-t border-border pt-2">{validation.model_checks.map((check) => <div key={check.model_id} className="flex items-center gap-2 text-[11px]"><span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-card"><ProviderLogo provider={check.model_id.split("/", 1)[0]} size={12} /></span><span className={check.available ? "text-emerald-600" : "text-destructive"}>●</span><span className="font-mono">{check.model_id}</span>{check.message ? <span className="text-muted-foreground">— {check.message}</span> : null}</div>)}</div></details> : null}</div>;
}

function EngineRow({ engine, busy, onRevalidate, onToggle, onRemove }: { engine: OcrEngine; busy: boolean; onRevalidate: () => void; onToggle: (enabled: boolean) => void; onRemove: () => void }) {
  const validation = engine.last_validation;
  const supported = validation?.model_checks.filter((check) => check.available).length ?? 0;
  const total = validation?.model_checks.length ?? 0;
  return <div className={cn("px-6 py-5", !engine.enabled && "opacity-60")}><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/35 shadow-sm"><ProviderLogo provider={engine.provider} size={23} /></span><h3 className="font-semibold tracking-[-0.01em]">{engine.name}</h3><StatusBadge status={validation?.status} />{!engine.enabled ? <span className="text-xs font-medium text-muted-foreground">Disabled</span> : null}</div><p className="mt-2 truncate font-mono text-xs text-muted-foreground">{engine.base_url}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="capitalize">{engine.provider}</span><span>{engine.has_api_key ? "API key stored" : "No API key"}</span><span>Checked {formatTimestamp(engine.last_checked_at)}</span>{total ? <span>{supported}/{total} model APIs available</span> : null}</div>{validation?.detail ? <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">{validation.detail}</p> : null}</div><div className="flex items-center gap-1"><Switch aria-label={`Enable ${engine.name}`} checked={engine.enabled} disabled={busy} onCheckedChange={onToggle} /><Button type="button" size="icon-sm" variant="ghost" aria-label={`Revalidate ${engine.name}`} disabled={busy} onClick={onRevalidate}>{busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}</Button><Button type="button" size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${engine.name}`} disabled={busy} onClick={onRemove}><Trash2 /></Button></div></div></div>;
}
