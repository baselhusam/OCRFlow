import { NewJobComposer } from "@/components/jobs/new-job-composer";
import type { PipelineList as PipelineListResponse } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";

type NewJobPageProps = {
  searchParams: Promise<{ pipeline?: string }>;
};

export default async function NewJobPage({ searchParams }: NewJobPageProps) {
  const { pipeline: initialPipelineId } = await searchParams;
  const { data } = await authenticatedApiFetch<PipelineListResponse>(
    "/api/v1/pipelines",
  );

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-11 md:px-12">
      <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">
        Workspace
      </p>
      <h1 className="mt-3.5 text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground">
        Apply pipeline
      </h1>
      <p className="mt-3.5 max-w-[560px] text-base leading-relaxed text-muted-foreground">
        Choose the pipeline, upload the documents, and apply. Tracing opens as
        soon as the job is queued.
      </p>
      <div className="mt-9 h-px bg-[var(--landing-hairline)]" />
      <NewJobComposer
        pipelines={data.items}
        initialPipelineId={initialPipelineId ?? null}
      />
    </main>
  );
}
