import type { DocsNavSection } from "@/lib/docs/types";

export const DOCS_BASE_PATH = "/documentation";
export const DOCS_GITHUB_URL = "https://github.com/baselhusam/OCRFlow";

export const DOCS_NAV: DocsNavSection[] = [
  {
    title: "Get started",
    items: [
      {
        title: "Introduction",
        slug: "",
        file: "introduction.md",
        description: "What OCRFlow is and how these docs are organized.",
      },
      {
        title: "Quick start",
        slug: "quick-start",
        file: "quick-start.md",
        description: "Run the stack and open the canvas in a few commands.",
      },
      {
        title: "Installation",
        slug: "installation",
        file: "installation.md",
        description: "Docker, hybrid host, and manual Python/Node setups.",
      },
      {
        title: "GPU & accelerators",
        slug: "gpu",
        file: "gpu.md",
        description: "Detect NVIDIA, AMD, or Apple GPUs and start OCR engines.",
      },
      {
        title: "Air-gapped deploy",
        slug: "air-gapped",
        file: "air-gapped.md",
        description: "Package images and weights for on-prem, offline sites.",
      },
    ],
  },
  {
    title: "Concepts",
    items: [
      {
        title: "How OCRFlow works",
        slug: "concepts",
        file: "concepts.md",
        description: "Canvas, API parity, typed wires, and the control plane.",
      },
      {
        title: "Projects",
        slug: "projects",
        file: "projects.md",
        description: "Experiment on a free-form canvas with live assets.",
      },
      {
        title: "Pipelines",
        slug: "pipelines",
        file: "pipelines.md",
        description: "Reusable graphs with a validated input/output boundary.",
      },
      {
        title: "Jobs",
        slug: "jobs",
        file: "jobs.md",
        description: "Batch a ready pipeline across many documents.",
      },
      {
        title: "Nodes & wires",
        slug: "nodes",
        file: "nodes.md",
        description: "Node types, categories, and how connections validate.",
      },
      {
        title: "Layouts",
        slug: "layouts",
        file: "layouts.md",
        description: "Region detection, labels, and per-region branching.",
      },
      {
        title: "Input & output",
        slug: "input-output",
        file: "input-output.md",
        description: "Wire kinds, artifacts, and what each stage produces.",
      },
    ],
  },
  {
    title: "Models",
    items: [
      {
        title: "Model catalog",
        slug: "models",
        file: "models.md",
        description: "Runnable Docling, Surya, Paddle, and loader tasks.",
      },
      {
        title: "Connect OCR models",
        slug: "connect-models",
        file: "connect-models.md",
        description: "Start provider services and see them appear on the canvas.",
      },
      {
        title: "Docling",
        slug: "docling",
        file: "docling.md",
        description: "Layout, OCR, tables, figures, formulas, and convert.",
      },
      {
        title: "Surya",
        slug: "surya",
        file: "surya.md",
        description: "Detection, recognition, reading order, and tables.",
      },
      {
        title: "Paddle",
        slug: "paddle",
        file: "paddle.md",
        description: "DocLayout, OCR v6, and PP-Structure.",
      },
      {
        title: "Loaders",
        slug: "loaders",
        file: "loaders.md",
        description: "PDF, image, select-page, and page-branch nodes.",
      },
    ],
  },
  {
    title: "Guides",
    items: [
      {
        title: "Use the canvas",
        slug: "canvas",
        file: "canvas.md",
        description: "Palette, test runs, branches, and saving work.",
      },
      {
        title: "Connect nodes",
        slug: "connecting-nodes",
        file: "connecting-nodes.md",
        description: "Typed wires, compatibility, and region handles.",
      },
      {
        title: "Create a pipeline",
        slug: "create-pipeline",
        file: "create-pipeline.md",
        description: "Promote a canvas selection into a reusable pipeline.",
      },
      {
        title: "Run a job",
        slug: "running-jobs",
        file: "running-jobs.md",
        description: "Upload documents, trace per-file runs, and cancel.",
      },
      {
        title: "Analytics",
        slug: "analytics",
        file: "analytics.md",
        description: "KPIs, model usage, exports, and what you can filter.",
      },
      {
        title: "Admin",
        slug: "admin",
        file: "admin.md",
        description: "Roles, user management, and platform-wide analytics.",
      },
    ],
  },
  {
    title: "Reference",
    items: [
      {
        title: "Commands",
        slug: "commands",
        file: "commands.md",
        description: "Make targets for stack, OCR, GPU, and host development.",
      },
      {
        title: "Keyboard shortcuts",
        slug: "keyboard-shortcuts",
        file: "keyboard-shortcuts.md",
        description: "Navigate OCRFlow and work faster on the canvas.",
      },
      {
        title: "API",
        slug: "api",
        file: "api.md",
        description: "Auth, projects, pipelines, jobs, models, and analytics.",
      },
      {
        title: "Environment",
        slug: "environment",
        file: "environment.md",
        description: "Gateway, runner mode, secrets, and provider URLs.",
      },
    ],
  },
];

export function docsHref(slug: string): string {
  return slug ? `${DOCS_BASE_PATH}/${slug}` : DOCS_BASE_PATH;
}

export function flattenDocsNav() {
  return DOCS_NAV.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.title })),
  );
}

export function findDocsNavItem(slug: string) {
  return flattenDocsNav().find((item) => item.slug === slug) ?? null;
}

export function getAdjacentDocs(slug: string) {
  const items = flattenDocsNav();
  const index = items.findIndex((item) => item.slug === slug);
  if (index === -1) {
    return { previous: null, next: null };
  }
  return {
    previous: items[index - 1] ?? null,
    next: items[index + 1] ?? null,
  };
}
