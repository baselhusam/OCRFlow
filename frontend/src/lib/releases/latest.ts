const REPOSITORY = "baselhusam/OCRFlow";

export const FIRST_RELEASE_TAG = "v0.0.1";
export const RELEASES_URL = `https://github.com/${REPOSITORY}/releases`;

type LatestReleaseResponse = {
  tag_name?: unknown;
};

function releaseTagFrom(payload: LatestReleaseResponse): string | null {
  if (typeof payload.tag_name !== "string") return null;

  const tag = payload.tag_name.trim();
  return tag.length > 0 ? tag : null;
}

export async function getLatestReleaseTag(): Promise<string> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPOSITORY}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "OCRFlow-release-badge",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) return FIRST_RELEASE_TAG;

    const tag = releaseTagFrom(
      (await response.json()) as LatestReleaseResponse,
    );
    return tag ?? FIRST_RELEASE_TAG;
  } catch {
    return FIRST_RELEASE_TAG;
  }
}
