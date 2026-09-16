import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streams in while a workspace page fetches from the gateway so navigation
 * gives immediate feedback instead of holding the previous page.
 */
export default function WorkspaceLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-11 md:px-12"
    >
      <Skeleton className="h-3 w-24 rounded-sm" />
      <Skeleton className="mt-5 h-10 w-64" />
      <Skeleton className="mt-4 h-4 w-[420px] max-w-full" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
