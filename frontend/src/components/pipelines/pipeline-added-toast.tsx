"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AppToast } from "@/components/app-toast";

export function PipelineAddedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const added = searchParams.get("added");

  if (!added) return null;

  return (
    <AppToast
      variant="success"
      title="Template added"
      message={`${added} is now in your pipelines.`}
      toastKey={added}
      onDismiss={() => router.replace(pathname)}
    />
  );
}
