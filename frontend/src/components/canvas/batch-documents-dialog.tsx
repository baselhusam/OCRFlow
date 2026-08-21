"use client";

import { useCallback, useRef, useState } from "react";
import { Files, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  startProjectBatchRuns,
  uploadProjectAssetsBatch,
} from "@/lib/api/assets";

type BatchDocumentsDialogProps = {
  projectId: string;
  disabled?: boolean;
  /** True when the canvas has a PDF or Image loader the batch injector can target. */
  hasFileLoader?: boolean;
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function BatchDocumentsDialog({
  projectId,
  disabled,
  hasFileLoader = true,
}: BatchDocumentsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const onPick = useCallback((list: FileList | null) => {
    if (!list) return;
    setFiles(Array.from(list));
    setError(null);
    setResultMessage(null);
  }, []);

  const onSubmit = useCallback(async () => {
    if (!hasFileLoader) {
      setError(
        "Add a PDF or Image loader to the canvas before running a batch.",
      );
      return;
    }
    if (files.length === 0) {
      setError("Choose one or more PDF or image files");
      return;
    }
    setBusy(true);
    setError(null);
    setResultMessage(null);
    try {
      const uploaded = await uploadProjectAssetsBatch(projectId, files);
      const runs = await startProjectBatchRuns(
        projectId,
        uploaded.items.map((item) => item.asset_id),
      );
      setResultMessage(
        `Queued ${runs.items.length} run${runs.items.length === 1 ? "" : "s"} for ${uploaded.items.length} document${uploaded.items.length === 1 ? "" : "s"}.`,
      );
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setBusy(false);
    }
  }, [files, hasFileLoader, projectId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title={
              disabled
                ? "Unavailable while a run is in progress"
                : "Batch upload & run"
            }
            className="h-9 gap-1.5 rounded-lg text-[13px] font-semibold"
            onClick={() => {
              if (!disabled) setOpen(true);
            }}
          >
            <Files className="size-3.5" />
            <span className="hidden sm:inline">Batch</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch documents</DialogTitle>
          <DialogDescription>
            Upload many files and run this project graph once per document. The
            canvas needs at least one PDF or Image loader node.
          </DialogDescription>
        </DialogHeader>

        {!hasFileLoader ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            No file loader on this canvas yet. Drag a PDF or Image loader from
            the left sidebar, then come back here.
          </p>
        ) : null}

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => onPick(event.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Upload className="size-4" />
            Choose files
          </Button>
          {files.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className="truncate">
                  {file.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              PDF, PNG, JPEG, or WebP — up to 50 files.
            </p>
          )}
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
          {resultMessage ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {resultMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={busy || files.length === 0 || !hasFileLoader}
            className="gap-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Upload &amp; run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
