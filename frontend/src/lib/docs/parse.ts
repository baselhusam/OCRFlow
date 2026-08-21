import type { DocsFrontmatter, DocsHeading } from "@/lib/docs/types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function parseFrontmatter(raw: string): {
  data: DocsFrontmatter;
  content: string;
} {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    throw new Error("Documentation files must start with YAML frontmatter.");
  }

  const data: DocsFrontmatter = { title: "", description: "" };
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "title" || key === "description") {
      data[key] = value;
    }
  }

  if (!data.title) {
    throw new Error("Documentation frontmatter is missing a title.");
  }

  return { data, content: raw.slice(match[0].length).trimStart() };
}

export function extractHeadings(markdown: string): DocsHeading[] {
  const headings: DocsHeading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!match) continue;

    const depth = match[1].length as 2 | 3;
    const title = match[2].replace(/[*_`]/g, "").trim();
    headings.push({ id: slugify(title), title, depth });
  }

  return headings;
}

export function flattenText(markdown: string): string {
  return markdown
    .replace(FRONTMATTER_RE, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
