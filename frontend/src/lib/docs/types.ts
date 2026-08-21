export type DocsNavItem = {
  title: string;
  slug: string;
  file: string;
  description: string;
};

export type DocsNavSection = {
  title: string;
  items: DocsNavItem[];
};

export type DocsFrontmatter = {
  title: string;
  description: string;
};

export type DocsHeading = {
  id: string;
  title: string;
  depth: 2 | 3;
};

export type DocsPage = {
  slug: string;
  href: string;
  section: string;
  title: string;
  description: string;
  content: string;
  headings: DocsHeading[];
};

export type DocsSearchEntry = {
  slug: string;
  href: string;
  title: string;
  description: string;
  section: string;
  headings: string[];
  body: string;
};

export type DocsSearchHit = DocsSearchEntry & {
  score: number;
  matchIn: "title" | "heading" | "description" | "body";
};
