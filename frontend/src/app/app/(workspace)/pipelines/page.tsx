import { Suspense } from "react";
import Link from "next/link";

import { CreatePipelineDialog } from "@/components/pipelines/create-pipeline-dialog";
import { PipelineAddedToast } from "@/components/pipelines/pipeline-added-toast";
import { PipelinesView } from "@/components/pipelines/pipelines-view";
import type { PipelineList as PipelineListResponse, User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";

export default async function PipelinesPage() {
  const [{ data }, { data: user }] = await Promise.all([
    authenticatedApiFetch<PipelineListResponse>("/api/v1/pipelines"),
    authenticatedApiFetch<User>("/api/v1/auth/me"),
  ]);

  const writable = canWrite(user);

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-11 md:px-12">
      <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">
        Workspace
      </p>

      <div className="mt-3.5 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground">
            Pipelines
          </h1>
          <p className="mt-3.5 max-w-[560px] text-base leading-relaxed text-muted-foreground">
            Reusable component flows with defined inputs and outputs. Create
            them here or from a project canvas, then apply them to document
            batches from Jobs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/templates"
            className="inline-flex h-auto items-center rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground no-underline transition-colors hover:border-primary/40"
          >
            Browse templates
          </Link>
          {writable ? <CreatePipelineDialog /> : null}
        </div>
      </div>

      <div className="mt-9 h-px bg-[var(--landing-hairline)]" />

      <PipelinesView pipelines={data.items} canWrite={writable} />
      <Suspense fallback={null}>
        <PipelineAddedToast />
      </Suspense>
    </main>
  );
}
