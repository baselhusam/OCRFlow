import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JobTraceView } from "@/components/jobs/job-trace-view";
import type { PipelineJob } from "@/lib/api/jobs";
import type { User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata({ params }: JobDetailPageProps): Promise<Metadata> {
  const { jobId } = await params;
  try {
    const { data } = await authenticatedApiFetch<PipelineJob>(`/api/v1/jobs/${jobId}`);
    return { title: `${data.pipeline_name ?? "Job"} · Job` };
  } catch {
    return { title: "Job" };
  }
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { jobId } = await params;

  let job: PipelineJob;
  let user: User;
  try {
    const [jobResponse, userResponse] = await Promise.all([
      authenticatedApiFetch<PipelineJob>(`/api/v1/jobs/${jobId}`),
      authenticatedApiFetch<User>("/api/v1/auth/me"),
    ]);
    job = jobResponse.data;
    user = userResponse.data;
  } catch {
    notFound();
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <JobTraceView initialJob={job} canWrite={canWrite(user)} />
    </main>
  );
}
