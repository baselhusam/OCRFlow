import { describe, expect, it } from "vitest";

import {
  buildAnalyticsQuery,
  formatBytes,
  formatSuccessRate,
} from "@/lib/api/analytics";

describe("analytics helpers", () => {
  it("formats success rate as percentage", () => {
    expect(formatSuccessRate(null)).toBe("—");
    expect(formatSuccessRate(0.875)).toBe("88%");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("builds analytics query strings", () => {
    expect(buildAnalyticsQuery("/api/v1/analytics/overview", {})).toBe(
      "/api/v1/analytics/overview",
    );
    expect(
      buildAnalyticsQuery("/api/v1/analytics/overview", {
        project_id: "abc",
        limit: "10",
      }),
    ).toBe("/api/v1/analytics/overview?project_id=abc&limit=10");
  });
});
