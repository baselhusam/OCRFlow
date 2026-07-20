import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained production server (.next/standalone) so the Docker
  // runtime image can ship just the server + its traced deps. See frontend/Dockerfile.
  output: "standalone",
};

export default nextConfig;
