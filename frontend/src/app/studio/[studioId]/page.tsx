import { redirect } from "next/navigation";

type StudioRedirectProps = {
  params: Promise<{ studioId: string }>;
};

/**
 * Legacy `/studio/:id` URLs redirect to the project canvas.
 * Older bookmarks and logs still hit this path (which previously 404'd).
 */
export default async function StudioRedirectPage({ params }: StudioRedirectProps) {
  const { studioId } = await params;
  redirect(`/app/projects/${studioId}/canvas`);
}
