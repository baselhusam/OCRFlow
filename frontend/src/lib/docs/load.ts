import fs from "node:fs";
import path from "node:path";

import { docsHref, flattenDocsNav } from "@/lib/docs/nav";
import { extractHeadings, flattenText, parseFrontmatter } from "@/lib/docs/parse";
import type { DocsPage, DocsSearchEntry } from "@/lib/docs/types";

const CONTENT_DIR = path.join(process.cwd(), "src/content/docs");

export function loadDocsPage(slug: string): DocsPage | null {
  const navItem = flattenDocsNav().find((item) => item.slug === slug);
  if (!navItem) return null;

  const filePath = path.join(CONTENT_DIR, navItem.file);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseFrontmatter(raw);

  return {
    slug: navItem.slug,
    href: docsHref(navItem.slug),
    section: navItem.section,
    title: data.title,
    description: data.description || navItem.description,
    content,
    headings: extractHeadings(content),
  };
}

export function loadAllDocsPages(): DocsPage[] {
  return flattenDocsNav()
    .map((item) => loadDocsPage(item.slug))
    .filter((page): page is DocsPage => page !== null);
}

export function buildDocsSearchIndex(): DocsSearchEntry[] {
  return loadAllDocsPages().map((page) => ({
    slug: page.slug,
    href: page.href,
    title: page.title,
    description: page.description,
    section: page.section,
    headings: page.headings.map((heading) => heading.title),
    body: flattenText(page.content).slice(0, 4000),
  }));
}
