import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectsView } from "@/components/projects/projects-view";
import type { ProjectList as ProjectListResponse, User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";

export default async function ProjectsPage() {
  const [{ data }, { data: user }] = await Promise.all([
    authenticatedApiFetch<ProjectListResponse>("/api/v1/projects"),
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
            Projects
          </h1>
          <p className="mt-3.5 max-w-[560px] text-base leading-relaxed text-muted-foreground">
            Every pipeline in your workspace. Open a canvas, duplicate a flow,
            or start something new.
          </p>
        </div>
        {writable ? <CreateProjectDialog /> : null}
      </div>

      <div className="mt-9 h-px bg-[var(--landing-hairline)]" />

      <ProjectsView projects={data.items} canWrite={writable} />
    </main>
  );
}
