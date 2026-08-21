import { DocsHeader } from "@/components/docs/docs-header";
import { buildDocsSearchIndex } from "@/lib/docs/load";

type DocsShellProps = {
  children: React.ReactNode;
};

export function DocsShell({ children }: DocsShellProps) {
  const searchIndex = buildDocsSearchIndex();

  return (
    <div className="min-h-full bg-background text-foreground">
      <DocsHeader searchIndex={searchIndex} />
      {children}
    </div>
  );
}
