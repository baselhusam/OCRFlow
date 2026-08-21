import type { DocsSearchEntry, DocsSearchHit } from "@/lib/docs/types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function searchDocs(
  query: string,
  entries: DocsSearchEntry[],
  limit = 12,
): DocsSearchHit[] {
  const needle = normalize(query);
  if (needle.length < 2) return [];

  const hits: DocsSearchHit[] = [];

  for (const entry of entries) {
    const title = normalize(entry.title);
    const description = normalize(entry.description);
    const headings = entry.headings.map(normalize);
    const body = normalize(entry.body);

    let score = 0;
    let matchIn: DocsSearchHit["matchIn"] = "body";

    if (title === needle) {
      score = 100;
      matchIn = "title";
    } else if (title.startsWith(needle)) {
      score = 90;
      matchIn = "title";
    } else if (title.includes(needle)) {
      score = 80;
      matchIn = "title";
    } else if (headings.some((heading) => heading.includes(needle))) {
      score = 65;
      matchIn = "heading";
    } else if (description.includes(needle)) {
      score = 50;
      matchIn = "description";
    } else if (body.includes(needle)) {
      score = 30;
      matchIn = "body";
    }

    if (score > 0) {
      hits.push({ ...entry, score, matchIn });
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
