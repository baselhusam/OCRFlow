import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { classifyRunError, getErrorDiagnosticMeta } from "@/lib/canvas/run-errors";
import { middleware } from "@/middleware";

function jwt(exp: number) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ exp })}.signature`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("expired authentication", () => {
  it("redirects app routes and clears expired JWT cookies", () => {
    const request = new NextRequest("http://localhost:3000/app/projects", {
      headers: {
        cookie: `ocrflow_token=${jwt(Math.floor(Date.now() / 1000) - 60)}`,
      },
    });

    const response = middleware(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fapp%2Fprojects",
    );
    expect(response.cookies.get("ocrflow_token")?.value).toBe("");
  });

  it("preserves backend status on API request errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject<
      Partial<ApiRequestError>
    >({
      name: "ApiRequestError",
      status: 401,
      message: "Not authenticated",
    });
  });

  it("classifies session expiry separately from model failures", () => {
    expect(classifyRunError(new Error("Not authenticated"))).toBe(
      "authentication",
    );
    expect(getErrorDiagnosticMeta("authentication").label).toBe(
      "Session expired",
    );
  });
});
