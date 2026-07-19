"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/lib/api/client";

type AnalyticsProjectFilterProps = {
  projects: Project[];
  selectedProjectId: string | null;
};

export function AnalyticsProjectFilter({
  projects,
  selectedProjectId,
}: AnalyticsProjectFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("project");
    } else {
      params.set("project", value);
    }
    const query = params.toString();
    router.push(query ? `/app/analytics?${query}` : "/app/analytics");
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <label
        htmlFor="analytics-project-filter"
        className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
      >
        Project
      </label>
      <Select
        value={selectedProjectId ?? "all"}
        onValueChange={handleChange}
      >
        <SelectTrigger
          id="analytics-project-filter"
          className="h-10 w-full min-w-[180px] rounded-lg border-border/80 bg-card sm:w-56"
        >
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
