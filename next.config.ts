import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./clyde/dist/**/*"],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
