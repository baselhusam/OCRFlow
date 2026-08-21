import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

import { DocsCopyCode } from "@/components/docs/docs-copy-code";
import { slugify } from "@/lib/docs/parse";
import { cn } from "@/lib/utils";

function flattenChildren(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenChildren).join("");
  }
  if (node && typeof node === "object" && "props" in node) {
    return flattenChildren(
      (node as { props: { children?: ReactNode } }).props.children,
    );
  }
  return "";
}

function headingId(children: ReactNode): string {
  return slugify(flattenChildren(children));
}

function Callout({ children }: { children: ReactNode }) {
  const text = flattenChildren(children).trim();
  const kind = text.startsWith("Warning")
    ? "warning"
    : text.startsWith("Tip")
      ? "tip"
      : text.startsWith("Important")
        ? "important"
        : "note";

  const styles = {
    note: "border-primary/25 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
    tip: "border-[var(--status-ok)]/25 bg-[color-mix(in_srgb,var(--status-ok)_8%,transparent)]",
    warning: "border-[#E8A317]/30 bg-[color-mix(in_srgb,#E8A317_10%,transparent)]",
    important: "border-destructive/25 bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)]",
  } as const;

  return (
    <blockquote
      data-callout={kind}
      className={cn(
        "my-6 rounded-[12px] border px-4 py-3 text-[15px] leading-[1.6] text-foreground not-italic",
        styles[kind],
      )}
    >
      {children}
    </blockquote>
  );
}

const components: Components = {
  h2: ({ children }) => (
    <h2
      id={headingId(children)}
      className="scroll-mt-28 mt-12 mb-3 text-[22px] font-bold tracking-[-0.02em] text-foreground first:mt-0"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      id={headingId(children)}
      className="scroll-mt-28 mt-8 mb-2 text-[16px] font-semibold tracking-[-0.01em] text-foreground"
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-4 text-[16px] leading-[1.65] text-[var(--subtle-foreground)]">
      {children}
    </p>
  ),
  a: ({ href, children }) => {
    const url = href ?? "";
    const external = /^https?:\/\//.test(url);
    const className =
      "font-medium text-primary underline decoration-primary/25 underline-offset-[3px] transition-colors hover:decoration-primary";
    if (!external && url.startsWith("/")) {
      return (
        <Link href={url} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={url}
        className={className}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-1.5 pl-5 text-[16px] leading-[1.65] text-[var(--subtle-foreground)] marker:text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-1.5 pl-5 text-[16px] leading-[1.65] text-[var(--subtle-foreground)] marker:font-mono marker:text-xs marker:text-primary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-10 border-border" />,
  blockquote: ({ children }) => <Callout>{children}</Callout>,
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-[12px] border border-border">
      <table className="w-full min-w-[32rem] border-collapse text-left text-[14px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[color-mix(in_srgb,var(--muted)_65%,transparent)]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-3.5 py-2.5 font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3.5 py-2.5 align-top text-[var(--subtle-foreground)] last:border-b-0">
      {children}
    </td>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-") || className?.startsWith("language"));
    if (isBlock) {
      return (
        <code className={cn("font-mono text-[13px] leading-[1.65]", className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-[5px] border border-border bg-muted/70 px-[6px] py-[1px] font-mono text-[12.5px] font-medium text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    const code = flattenChildren(children).replace(/\n$/, "");
    return (
      <div className="group relative my-6 overflow-hidden rounded-[12px] border border-[var(--docs-code-border)] bg-[var(--docs-code-bg)]">
        <DocsCopyCode code={code} />
        <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-[1.7] text-[#e7e5f0]">
          {children}
        </pre>
      </div>
    );
  },
};

type DocsMarkdownProps = {
  content: string;
};

export function DocsMarkdown({ content }: DocsMarkdownProps) {
  return (
    <div className="ocrflow-docs-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
