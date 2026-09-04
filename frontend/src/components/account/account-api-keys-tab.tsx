"use client";

import { useState } from "react";
import { Copy, KeyRound, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import type { ApiKey, ApiKeyCreated } from "@/lib/api/account";
import { createApiKey, revokeApiKey } from "@/lib/api/account";

type ApiKeysTabProps = { initialKeys: ApiKey[] };

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

export function AccountApiKeysTab({ initialKeys }: ApiKeysTabProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keyPendingRevocation, setKeyPendingRevocation] = useState<ApiKey | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const response = await createApiKey({ name });
      const body = (await response.json()) as ApiKeyCreated | { detail?: string };
      if (!response.ok || !("key" in body)) throw new Error("detail" in body ? body.detail : "Could not create API key");
      setCreated(body); setName(""); router.refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not create API key"); }
    finally { setBusy(false); }
  }

  async function revoke(key: ApiKey) {
    setBusy(true); setError(null);
    try {
      const response = await revokeApiKey(key.id);
      if (!response.ok) { const body = await response.json() as { detail?: string }; throw new Error(body.detail ?? "Could not revoke API key"); }
      setKeyPendingRevocation(null); router.refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not revoke API key"); }
    finally { setBusy(false); }
  }

  return <div className="mt-8 max-w-[900px] space-y-6">
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_32px_-24px_rgba(35,24,89,0.28)]">
      <div className="border-b border-border bg-[linear-gradient(120deg,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_45%)] px-6 py-5">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><KeyRound className="size-5" /></span><div><h2 className="font-bold">Developer API keys</h2><p className="mt-1 text-sm text-muted-foreground">Use a key to submit documents to your saved OCR pipelines.</p></div></div>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:flex-row"><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="e.g. Production invoice importer" aria-label="API key name" /><Button onClick={create} disabled={busy || !name.trim()}><Plus /> Create key</Button></div>
      {error ? <p className="mx-5 mb-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
    </section>
    {created ? <section className="rounded-2xl border border-amber-500/35 bg-amber-500/8 p-5"><div className="flex gap-3"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" /><div className="min-w-0"><h3 className="font-bold">Copy this secret now</h3><p className="mt-1 text-sm text-muted-foreground">For security, OCRFlow cannot show the full key again.</p><div className="mt-4 flex gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2 text-xs">{created.key}</code><Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(created.key)} aria-label="Copy API key"><Copy /></Button></div></div></div></section> : null}
    <section className="rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-6 py-4"><div><h2 className="font-bold">Your keys</h2><p className="mt-1 text-sm text-muted-foreground">Requests, documents, outcomes, and last activity are tracked per key.</p></div><span className="font-mono text-xs text-muted-foreground">{initialKeys.length} total</span></div>
      {initialKeys.length === 0 ? <p className="px-6 py-10 text-center text-sm text-muted-foreground">Create a key to start calling the OCRFlow API.</p> : <div className="divide-y divide-border">{initialKeys.map((key) => <div key={key.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{key.name}</h3><span className={key.is_active ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700" : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}>{key.is_active ? "Active" : "Revoked"}</span></div><p className="mt-1 font-mono text-xs text-muted-foreground">{key.key_prefix}•••••••• · last used {formatDate(key.last_used_at)}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{key.request_count} requests</span><span>{key.document_count} documents</span><span className="text-emerald-700">{key.successful_requests} API successes</span>{key.failed_requests ? <span className="text-destructive">{key.failed_requests} errors</span> : null}</div></div>{key.is_active ? <Button variant="ghost" size="sm" className="border border-transparent text-destructive transition-all duration-150 hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm focus-visible:border-destructive/35 focus-visible:bg-destructive/10" disabled={busy} onClick={() => setKeyPendingRevocation(key)}><Trash2 /> Revoke</Button> : null}</div>)}</div>}
    </section>
    <AlertDialog open={Boolean(keyPendingRevocation)} onOpenChange={(open) => { if (!open && !busy) { setKeyPendingRevocation(null); setError(null); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive"><Trash2 /></AlertDialogMedia>
          <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
          <AlertDialogDescription>Revoking <strong className="text-foreground">{keyPendingRevocation?.name}</strong> immediately stops every integration using it. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep key</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busy || !keyPendingRevocation} onClick={(event) => { event.preventDefault(); if (keyPendingRevocation) void revoke(keyPendingRevocation); }}>
            {busy ? "Revoking…" : "Revoke key"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
