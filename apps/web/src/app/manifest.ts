import type { MetadataRoute } from "next";

// Web app manifest (BL-0063, FR-100): served at /manifest.webmanifest. Colours are the Paper background of
// globals.css; the icons are the pixel bolt (scripts/generate-icons.mjs).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Polymath",
    short_name: "Polymath",
    description: "Adaptive practice with spaced retrieval, graded feedback and guided builds.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f1e6",
    theme_color: "#f5f1e6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
