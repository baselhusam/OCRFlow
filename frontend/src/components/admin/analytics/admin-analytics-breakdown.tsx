"use client";

import { useState } from "react";

import { AdminDocumentsTable } from "@/components/admin/analytics/admin-documents-table";
import { AdminModelsTable } from "@/components/admin/analytics/admin-models-table";
import { AdminNodesTable } from "@/components/admin/analytics/admin-nodes-table";
import { AdminProjectsTable } from "@/components/admin/analytics/admin-projects-table";
import { AdminSectionHeading } from "@/components/admin/analytics/admin-analytics-primitives";
import { AdminUsersTable } from "@/components/admin/analytics/admin-users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  DocumentBreakdownList,
  ModelUsageList,
  NodeBreakdownList,
  ProjectBreakdownList,
} from "@/lib/api/analytics";
import type { UserLeaderboardList } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

type AdminAnalyticsBreakdownProps = {
  projects: ProjectBreakdownList;
  nodes: NodeBreakdownList;
  models: ModelUsageList;
  documents: DocumentBreakdownList;
  userLeaderboard: UserLeaderboardList;
};

const BREAKDOWN_TABS = [
  { value: "projects", label: "Projects", count: (p: AdminAnalyticsBreakdownProps) => p.projects.items.length },
  { value: "nodes", label: "Nodes", count: (p: AdminAnalyticsBreakdownProps) => p.nodes.items.length },
  { value: "models", label: "Models", count: (p: AdminAnalyticsBreakdownProps) => p.models.items.length },
  { value: "documents", label: "Documents", count: (p: AdminAnalyticsBreakdownProps) => p.documents.items.length },
  { value: "users", label: "Users", count: (p: AdminAnalyticsBreakdownProps) => p.userLeaderboard.items.length },
] as const;

export function AdminAnalyticsBreakdown(props: AdminAnalyticsBreakdownProps) {
  const [activeTab, setActiveTab] = useState<string>("projects");

  return (
    <section aria-labelledby="admin-breakdown-heading">
      <AdminSectionHeading
        title="Platform breakdown"
        subtitle="projects, nodes, models, documents, and users"
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          variant="line"
          className="mb-5 w-full justify-start gap-7 rounded-none border-b border-border bg-transparent p-0"
        >
          {BREAKDOWN_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "rounded-none border-0 bg-transparent px-0 pb-3.5 text-sm font-semibold shadow-none",
                "data-active:bg-transparent data-active:text-foreground data-active:shadow-none",
                "after:bottom-0 after:h-0.5 after:bg-primary",
              )}
            >
              {tab.label}
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                ({tab.count(props)})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="projects">
          <AdminProjectsTable projects={props.projects} />
        </TabsContent>
        <TabsContent value="nodes">
          <AdminNodesTable nodes={props.nodes} />
        </TabsContent>
        <TabsContent value="models">
          <AdminModelsTable models={props.models} />
        </TabsContent>
        <TabsContent value="documents">
          <AdminDocumentsTable documents={props.documents} />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsersTable users={props.userLeaderboard} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
