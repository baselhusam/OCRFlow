import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { docsHref } from "@/lib/docs/nav";

type AdjacentItem = {
  title: string;
  slug: string;
  section: string;
};

type DocsPagerProps = {
  previous: AdjacentItem | null;
  next: AdjacentItem | null;
};

export function DocsPager({ previous, next }: DocsPagerProps) {
  return (
    <div className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
      {previous ? (
        <Link
          href={docsHref(previous.slug)}
          className="group flex flex-col gap-1 rounded-[12px] border border-border px-4 py-3.5 transition-colors hover:border-primary/35"
        >
          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <ArrowLeft className="size-3" />
            Previous
          </span>
          <span className="text-[15px] font-semibold text-foreground group-hover:text-primary">
            {previous.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={docsHref(next.slug)}
          className="group flex flex-col items-end gap-1 rounded-[12px] border border-border px-4 py-3.5 text-right transition-colors hover:border-primary/35"
        >
          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Next
            <ArrowRight className="size-3" />
          </span>
          <span className="text-[15px] font-semibold text-foreground group-hover:text-primary">
            {next.title}
          </span>
        </Link>
      ) : null}
    </div>
  );
}
