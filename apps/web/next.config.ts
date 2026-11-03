import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source (doc 03 section 13).
  transpilePackages: ["@polymath/grading-core", "@polymath/shared-types", "@polymath/content-schema"],
};

export default nextConfig;
