import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FIRST_RELEASE_TAG,
  getLatestReleaseTag,
} from "@/lib/releases/latest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getLatestReleaseTag", () => {
  it("returns the latest GitHub release tag", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v0.2.0" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLatestReleaseTag()).resolves.toBe("v0.2.0");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/baselhusam/OCRFlow/releases/latest",
      expect.objectContaining({ next: { revalidate: 3600 } }),
    );
  });

  it("uses the first release tag when no release exists or GitHub is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(getLatestReleaseTag()).resolves.toBe(FIRST_RELEASE_TAG);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(getLatestReleaseTag()).resolves.toBe(FIRST_RELEASE_TAG);
  });
});
