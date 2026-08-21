import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Emit a self-contained production server (.next/standalone) so the Docker
  // runtime image can ship just the server + its traced deps. See frontend/Dockerfile.
  output: "standalone",
  // Allow both localhost and 127.0.0.1 in dev (Playwright/curl often use 127.0.0.1).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Silence multi-lockfile root inference when a parent package-lock exists.
  turbopack: {
    root: configDir,
  },
};

export default nextConfig;
