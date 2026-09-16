import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CanvasShell } from "@/components/canvas/canvas-shell";
import {
  fetchModelCatalog,
  fetchModelCategories,
  fetchRuntimeAvailability,
} from "@/lib/api/models";
import type { Pipeline, User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";

type PipelineCanvasPageProps = {
  params: Promise<{ pipelineId: string }>;
};

export async function generateMetadata({ params }: PipelineCanvasPageProps): Promise<Metadata> {
  const { pipelineId } = await params;
  try {
    const { data } = await authenticatedApiFetch<Pipeline>(`/api/v1/pipelines/${pipelineId}`);
    return { title: `${data.name} · Pipeline canvas` };
  } catch {
    return { title: "Pipeline canvas" };
  }
}

export default async function PipelineCanvasPage({
  params,
}: PipelineCanvasPageProps) {
  const { pipelineId } = await params;

  let pipeline: Pipeline;
  let user: User;
  try {
    const [pipelineResponse, userResponse] = await Promise.all([
      authenticatedApiFetch<Pipeline>(`/api/v1/pipelines/${pipelineId}`),
      authenticatedApiFetch<User>("/api/v1/auth/me"),
    ]);
    pipeline = pipelineResponse.data;
    user = userResponse.data;
  } catch {
    notFound();
  }

  const [models, categories, runtime] = await Promise.all([
    fetchModelCatalog(),
    fetchModelCategories(),
    fetchRuntimeAvailability(),
  ]);

  return (
    <CanvasShell
      entity={{ kind: "pipeline", id: pipeline.id }}
      entityName={pipeline.name}
      entityUpdatedAt={pipeline.updated_at}
      initialGraph={pipeline.graph}
      models={models}
      categories={categories}
      runtime={runtime}
      readOnly={!canWrite(user)}
      preferredModelId={user.preferences?.default_ocr_model ?? null}
    />
  );
}
