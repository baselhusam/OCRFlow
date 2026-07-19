import { GitBranch, Layers, Network, Workflow } from "lucide-react";

import {
  AdminSectionHeading,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/analytics/admin-analytics-primitives";
import { AdminPipelinesTable } from "@/components/admin/analytics/admin-pipelines-table";
import { PipelineCompositionChart } from "@/components/analytics/pipeline-composition-chart";
import type { PipelineBreakdownList, PipelineLibraryStats } from "@/lib/api/analytics";

type AdminAnalyticsPipelinesProps = {
  pipelineLibrary: PipelineLibraryStats;
  pipelines: PipelineBreakdownList;
};

export function AdminAnalyticsPipelines({
  pipelineLibrary,
  pipelines,
}: AdminAnalyticsPipelinesProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="admin-pipeline-stats">
        <AdminSectionHeading
          title="Pipeline library"
          subtitle="platform-wide reusable pipeline definitions"
        />
        <AdminStatGrid columns={3}>
          <AdminStatCard
            label="Total pipelines"
            value={pipelineLibrary.total_pipelines}
            icon={Workflow}
          />
          <AdminStatCard
            label="Active"
            value={pipelineLibrary.active_pipelines}
            icon={GitBranch}
            hint={
              pipelineLibrary.archived_pipelines > 0
                ? `${pipelineLibrary.archived_pipelines} archived`
                : undefined
            }
          />
          <AdminStatCard
            label="Unique I/O types"
            value={pipelineLibrary.unique_io_types}
            icon={Network}
          />
          <AdminStatCard
            label="Avg nodes"
            value={pipelineLibrary.avg_nodes.toFixed(1)}
            icon={Layers}
          />
          <AdminStatCard
            label="Avg models"
            value={pipelineLibrary.avg_models.toFixed(1)}
            icon={GitBranch}
          />
          <AdminStatCard
            label="Avg edges"
            value={pipelineLibrary.avg_edges.toFixed(1)}
            icon={Network}
          />
        </AdminStatGrid>
      </section>

      <div className="h-px bg-[var(--landing-hairline)]" />

      <section aria-labelledby="admin-pipeline-composition">
        <AdminSectionHeading
          title="Composition"
          subtitle="input and output type distribution"
        />
        <PipelineCompositionChart pipelines={pipelines} />
      </section>

      <div className="h-px bg-[var(--landing-hairline)]" />

      <section aria-labelledby="admin-pipeline-table">
        <AdminSectionHeading
          title="All pipelines"
          subtitle="definitions across all workspaces"
        />
        <AdminPipelinesTable pipelines={pipelines} />
      </section>
    </div>
  );
}
