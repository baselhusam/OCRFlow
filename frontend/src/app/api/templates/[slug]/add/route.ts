import { NextResponse } from "next/server";

import type { Pipeline } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import { getTemplateBySlug } from "@/lib/templates/catalog";

function errorResponse(error: unknown, status = 400) {
  const detail = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json({ detail }, { status });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const template = getTemplateBySlug(slug);

  if (!template) {
    return NextResponse.json({ detail: "Template not found" }, { status: 404 });
  }

  try {
    const { data, response } = await authenticatedApiFetch<Pipeline>(
      "/api/v1/pipelines",
      {
        method: "POST",
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          accent_color: template.accentColor,
          graph: template.graph,
        }),
      },
    );
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    return errorResponse(error);
  }
}
