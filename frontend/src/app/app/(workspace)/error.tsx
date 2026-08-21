"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WorkspaceError({ error, reset }: WorkspaceErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">
        Workspace
      </p>
      <h1 className="mt-3.5 text-3xl font-extrabold tracking-[-0.03em] text-foreground">
        This page couldn’t load
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {error.message || "An unexpected error occurred. Try again, or go back to the dashboard."}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          className="h-auto rounded-lg px-5 py-3 text-sm font-semibold"
          onClick={() => reset()}
        >
          Try again
        </Button>
        <Link
          href="/app"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto rounded-lg px-5 py-3 text-sm font-semibold",
          )}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
