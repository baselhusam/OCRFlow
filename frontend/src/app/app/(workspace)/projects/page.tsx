import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/app/page-header";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectsView } from "@/components/projects/projects-view";
import type { ProjectList as ProjectListResponse, User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const [{ data }, { data: user }] = await Promise.all([
    authenticatedApiFetch<ProjectListResponse>("/api/v1/projects"),
    authenticatedApiFetch<User>("/api/v1/auth/me"),
  ]);

  const writable = canWrite(user);
  const hasProjects = data.items.length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Each project is a canvas where you wire loaders, OCR, and extraction models. Click any card to open it."
        actions={writable && hasProjects ? <CreateProjectDialog /> : null}
      />
      <div className="mt-8">
        <ProjectsView projects={data.items} canWrite={writable} />
      </div>
    </PageContainer>
  );
}
