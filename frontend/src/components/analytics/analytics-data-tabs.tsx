"use client";

import { DocumentsTable } from "@/components/analytics/documents-table";
import { ModelsTable } from "@/components/analytics/models-table";
import { NodesTable } from "@/components/analytics/nodes-table";
import { ProjectsTable } from "@/components/analytics/projects-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import { cn } from "@/lib/utils";
import type {
  DocumentBreakdownList,
  ModelUsageList,
  NodeBreakdownList,
  ProjectBreakdownList,
} from "@/lib/api/analytics";

type AnalyticsDataTabsProps = {
  projects: ProjectBreakdownList;
  nodes: NodeBreakdownList;
  models: ModelUsageList;
  documents: DocumentBreakdownList;
};

export function AnalyticsDataTabs({
  projects,
  nodes,
  models,
  documents,
}: AnalyticsDataTabsProps) {
  return (
    <div className={cn(dashboardCardClassName, "p-8 transition-all duration-300 hover:shadow-lg")}>
      <Tabs defaultValue="projects" className="w-full">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-foreground">
              Data breakdown
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/40" />
              <p className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Granular entity analysis
              </p>
            </div>
          </div>
          
          <TabsList className="h-auto w-fit rounded-xl bg-secondary/50 p-1.5 ring-1 ring-border/50">
            <TabsTrigger
              value="projects"
              className="rounded-lg px-5 py-2 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="nodes"
              className="rounded-lg px-5 py-2 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50"
            >
              Nodes
            </TabsTrigger>
            <TabsTrigger
              value="models"
              className="rounded-lg px-5 py-2 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50"
            >
              Models
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-lg px-5 py-2 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50"
            >
              Documents
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="rounded-2xl border border-border/50 bg-secondary/5 p-1 overflow-hidden">
          <TabsContent value="projects" className="mt-0 outline-none">
            <ProjectsTable projects={projects} />
          </TabsContent>
          <TabsContent value="nodes" className="mt-0 outline-none">
            <NodesTable nodes={nodes} />
          </TabsContent>
          <TabsContent value="models" className="mt-0 outline-none">
            <ModelsTable models={models} />
          </TabsContent>
          <TabsContent value="documents" className="mt-0 outline-none">
            <DocumentsTable documents={documents} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
