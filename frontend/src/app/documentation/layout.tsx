import { DocsShell } from "@/components/docs/docs-shell";

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsShell>{children}</DocsShell>;
}
