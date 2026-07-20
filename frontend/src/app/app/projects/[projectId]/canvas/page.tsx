import { notFound } from "next/navigation";

import { CanvasShell } from "@/components/canvas/canvas-shell";
import {
  fetchModelCatalog,
  fetchModelCategories,
  fetchRuntimeAvailability,
} from "@/lib/api/models";
import type { PipelineList, Project, User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";

type CanvasPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function CanvasPage({ params }: CanvasPageProps) {
  const { projectId } = await params;

  let project: Project;
  let user: User;
  try {
    const [projectResponse, userResponse] = await Promise.all([
      authenticatedApiFetch<Project>(`/api/v1/projects/${projectId}`),
      authenticatedApiFetch<User>("/api/v1/auth/me"),
    ]);
    project = projectResponse.data;
    user = userResponse.data;
  } catch {
    notFound();
  }

  const [models, categories, runtime, pipelinesResponse] = await Promise.all([
    fetchModelCatalog(),
    fetchModelCategories(),
    fetchRuntimeAvailability(),
    authenticatedApiFetch<PipelineList>("/api/v1/pipelines"),
  ]);
  const pipelines = pipelinesResponse.data.items;

  return (
    <CanvasShell
      entity={{ kind: "project", id: project.id }}
      entityName={project.name}
      entityUpdatedAt={project.updated_at}
      initialGraph={project.graph}
      models={models}
      categories={categories}
      runtime={runtime}
      readOnly={!canWrite(user)}
      userPipelines={pipelines}
    />
  );
}
