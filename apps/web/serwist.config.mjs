import { readFileSync } from "node:fs";

// Serwist configurator mode (BL-0063; doc 03 section 4.1, CLAUDE.md section 5): `next build && serwist build`
// bundles src/sw/sw.ts into public/sw.js with this precache list. Nothing here depends on webpack.
// Precached: the build's static JS and CSS, the Latin font files (the only ones the pages load) and the
// offline page. Pages themselves need a signed-in request, so they are not precached.
const buildId = readFileSync(new URL(".next/BUILD_ID", import.meta.url), "utf8").trim();

const config = {
  swSrc: "src/sw/sw.ts",
  swDest: "public/sw.js",
  globDirectory: ".next",
  globPatterns: ["static/**/*.{js,css}", "static/media/*-latin-[0-9]*.woff2"],
  globIgnores: ["**/*.map", "**/_buildManifest.js", "**/_ssgManifest.js"],
  modifyURLPrefix: { "static/": "/_next/static/" },
  additionalPrecacheEntries: [{ url: "/offline", revision: buildId }],
  maximumFileSizeToCacheInBytes: 1024 * 1024,
};

export default config;
