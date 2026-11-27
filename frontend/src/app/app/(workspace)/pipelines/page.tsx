import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LayoutTemplate } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/app/page-header";
import { CreatePipelineDialog } from "@/components/pipelines/create-pipeline-dialog";
import { PipelineAddedToast } from "@/components/pipelines/pipeline-added-toast";
import { PipelinesView } from "@/components/pipelines/pipelines-view";
import { buttonVariants } from "@/components/ui/button";
import type { PipelineList as PipelineListResponse, User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pipelines",
};

export default async function PipelinesPage() {
  const [{ data }, { data: user }] = await Promise.all([
    authenticatedApiFetch<PipelineListResponse>("/api/v1/pipelines"),
    authenticatedApiFetch<User>("/api/v1/auth/me"),
  ]);

  const writable = canWrite(user);
  const hasPipelines = data.items.length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Pipelines"
        description="Reusable flows with one input and one output. Build them here or save them from a project canvas, then apply them to document batches from Jobs."
        actions={
          hasPipelines ? (
            <>
              <Link
                href="/templates"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-10 gap-2 rounded-lg px-4 text-sm font-semibold",
                )}
              >
                <LayoutTemplate className="size-4" aria-hidden />
                Templates
              </Link>
              {writable ? <CreatePipelineDialog /> : null}
            </>
          ) : null
        }
      />
      <div className="mt-8">
        <PipelinesView pipelines={data.items} canWrite={writable} />
      </div>
      <Suspense fallback={null}>
        <PipelineAddedToast />
      </Suspense>
    </PageContainer>
  );
}
