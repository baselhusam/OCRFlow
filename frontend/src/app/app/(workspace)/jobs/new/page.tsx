import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/app/page-header";
import { NewJobComposer } from "@/components/jobs/new-job-composer";
import type { PipelineList as PipelineListResponse } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";

export const metadata: Metadata = {
  title: "Apply pipeline",
};

type NewJobPageProps = {
  searchParams: Promise<{ pipeline?: string }>;
};

export default async function NewJobPage({ searchParams }: NewJobPageProps) {
  const { pipeline: initialPipelineId } = await searchParams;
  const { data } = await authenticatedApiFetch<PipelineListResponse>(
    "/api/v1/pipelines",
  );

  return (
    <PageContainer>
      <Link
        href="/app/jobs"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Jobs
      </Link>
      <PageHeader
        title="Apply pipeline"
        description="Choose the pipeline, upload the documents, and apply. Tracing opens as soon as the job is queued."
      />
      <div className="mt-8">
        <NewJobComposer
          pipelines={data.items}
          initialPipelineId={initialPipelineId ?? null}
        />
      </div>
    </PageContainer>
  );
}
