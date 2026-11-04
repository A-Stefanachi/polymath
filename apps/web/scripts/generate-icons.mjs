// Renders the app icons (BL-0063) from the "micro" bolt of src/components/pixel-icon.tsx on the CRT
// background (#12131f) with the coin colour (#ffcd4b), both from globals.css. The PNGs are committed;
// run `pnpm --filter @polymath/web icons` only when the artwork changes. Uses the Chromium that
// Playwright already provides, so it adds no dependency.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const BOLT =
  "M9 0h2v1h-2zM8 1h3v1h-3zM7 2h3v1h-3zM6 3h3v1h-3zM5 4h3v1h-3zM4 5h9v1h-9zM3 6h9v1h-9zM8 7h3v1h-3zM7 8h3v1h-3zM6 9h3v1h-3zM5 10h3v1h-3zM4 11h3v1h-3zM3 12h2v1h-2z";
// The bolt spans x 3..13 and y 0..13: centre it on a 16 x 16 cell.
const BOLT_CENTRE = { x: 8, y: 6.5 };

/** `fill` is the share of the canvas the 16-cell grid covers (maskable icons keep a 80% safe zone). */
function svg(size, fill) {
  const scale = (size * fill) / 16;
  const tx = size / 2 - BOLT_CENTRE.x * scale;
  const ty = size / 2 - BOLT_CENTRE.y * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#12131f"/><g transform="translate(${tx} ${ty}) scale(${scale})"><path d="${BOLT}" fill="#ffcd4b"/></g></svg>`;
}

const TARGETS = [
  { file: "icon-192.png", size: 192, fill: 0.8 },
  { file: "icon-512.png", size: 512, fill: 0.8 },
  { file: "icon-maskable-512.png", size: 512, fill: 0.55 },
  { file: "apple-touch-icon.png", size: 180, fill: 0.8 },
];

const outDir = fileURLToPath(new URL("../public/icons/", import.meta.url));
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(process.env["CHROMIUM_PATH"] ? { executablePath: process.env["CHROMIUM_PATH"] } : {});
try {
  for (const { file, size, fill } of TARGETS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0">${svg(size, fill)}</body>`);
    await writeFile(outDir + file, await page.screenshot({ type: "png" }));
    await page.close();
  }
} finally {
  await browser.close();
}
