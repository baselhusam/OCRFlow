import type { Metadata } from "next";

import { PageContainer } from "@/components/app/page-header";
import { OpenRouterModelsManager } from "@/components/configuration/openrouter-models-manager";

export const metadata: Metadata = {
  title: "OpenRouter models",
};

export default async function OpenRouterModelsPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  return (
    <PageContainer width="narrow">
      <OpenRouterModelsManager connectionId={connectionId} />
    </PageContainer>
  );
}
