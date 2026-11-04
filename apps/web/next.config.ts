import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source (doc 03 section 13).
  transpilePackages: ["@polymath/grading-core", "@polymath/shared-types", "@polymath/content-schema"],
  async headers() {
    // The worker file must never be served from a stale HTTP cache, or an update would not reach installed apps.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
