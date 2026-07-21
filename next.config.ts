import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./clyde/dist/**/*"],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "lucide-react"],
  },
};

export default nextConfig;
