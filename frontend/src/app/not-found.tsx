import Link from "next/link";

import { SegmentMark } from "@/components/brand/segment-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center text-foreground">
      <SegmentMark className="h-14 w-14 text-foreground" />
      <p className="mt-8 font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
        404 — Not found
      </p>
      <h1 className="mt-3.5 text-[36px] font-extrabold tracking-[-0.03em]">
        This page doesn’t exist
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The link may be out of date, or the project, pipeline, or job it pointed
        to has been removed.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/app"
          className={cn(buttonVariants(), "h-auto rounded-lg px-5 py-3 text-sm font-semibold no-underline")}
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto rounded-lg px-5 py-3 text-sm font-semibold no-underline",
          )}
        >
          Home
        </Link>
      </div>
    </main>
  );
}
