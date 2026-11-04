import { cn } from "@/lib/utils";

// 16x16 grid pixel icons, drawn for Polymath (Tokens mockup, 00a J7). Each path is a set of one-pixel-high
// rectangles, so the shapes stay sharp when scaled by whole pixels.
const PATHS = {
  today:
    "M7 0h2v1h-2zM6 1h4v1h-4zM5 2h6v1h-6zM4 3h8v1h-8zM3 4h10v1h-10zM2 5h12v1h-12zM1 6h14v1h-14zM3 7h10v1h-10zM3 8h3v1h-3zM10 8h3v1h-3zM3 9h3v1h-3zM10 9h3v1h-3zM3 10h3v1h-3zM10 10h3v1h-3zM3 11h3v1h-3zM10 11h3v1h-3zM3 12h3v1h-3zM10 12h3v1h-3zM3 13h10v1h-10z",
  map: "M1 1h5v1h-5zM1 2h1v1h-1zM5 2h5v1h-5zM1 3h1v1h-1zM5 3h1v1h-1zM9 3h5v1h-5zM1 4h1v1h-1zM5 4h1v1h-1zM9 4h1v1h-1zM13 4h1v1h-1zM1 5h1v1h-1zM3 5h1v1h-1zM5 5h1v1h-1zM9 5h1v1h-1zM13 5h1v1h-1zM1 6h1v1h-1zM5 6h1v1h-1zM7 6h1v1h-1zM9 6h1v1h-1zM13 6h1v1h-1zM1 7h1v1h-1zM5 7h1v1h-1zM9 7h1v1h-1zM11 7h1v1h-1zM13 7h1v1h-1zM1 8h1v1h-1zM5 8h1v1h-1zM9 8h1v1h-1zM13 8h1v1h-1zM1 9h5v1h-5zM9 9h1v1h-1zM13 9h1v1h-1zM5 10h5v1h-5zM13 10h1v1h-1zM9 11h5v1h-5z",
  review:
    "M3 1h10v1h-10zM3 2h1v1h-1zM12 2h1v1h-1zM1 3h10v1h-10zM12 3h1v1h-1zM1 4h1v1h-1zM10 4h1v1h-1zM12 4h1v1h-1zM1 5h1v1h-1zM3 5h6v1h-6zM10 5h1v1h-1zM12 5h1v1h-1zM1 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM1 7h1v1h-1zM3 7h4v1h-4zM10 7h1v1h-1zM12 7h1v1h-1zM1 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM1 9h1v1h-1zM10 9h3v1h-3zM1 10h10v1h-10z",
  progress:
    "M13 1h2v1h-2zM13 2h2v1h-2zM9 3h2v1h-2zM13 3h2v1h-2zM9 4h2v1h-2zM13 4h2v1h-2zM5 5h2v1h-2zM9 5h2v1h-2zM13 5h2v1h-2zM5 6h2v1h-2zM9 6h2v1h-2zM13 6h2v1h-2zM1 7h2v1h-2zM5 7h2v1h-2zM9 7h2v1h-2zM13 7h2v1h-2zM1 8h2v1h-2zM5 8h2v1h-2zM9 8h2v1h-2zM13 8h2v1h-2zM1 9h2v1h-2zM5 9h2v1h-2zM9 9h2v1h-2zM13 9h2v1h-2zM1 10h14v1h-14z",
  micro:
    "M9 0h2v1h-2zM8 1h3v1h-3zM7 2h3v1h-3zM6 3h3v1h-3zM5 4h3v1h-3zM4 5h9v1h-9zM3 6h9v1h-9zM8 7h3v1h-3zM7 8h3v1h-3zM6 9h3v1h-3zM5 10h3v1h-3zM4 11h3v1h-3zM3 12h2v1h-2z",
  time: "M5 1h6v1h-6zM4 2h1v1h-1zM11 2h1v1h-1zM3 3h1v1h-1zM7 3h2v1h-2zM12 3h1v1h-1zM2 4h1v1h-1zM7 4h2v1h-2zM13 4h1v1h-1zM2 5h1v1h-1zM7 5h2v1h-2zM13 5h1v1h-1zM2 6h1v1h-1zM7 6h4v1h-4zM13 6h1v1h-1zM2 7h1v1h-1zM13 7h1v1h-1zM3 8h1v1h-1zM12 8h1v1h-1zM4 9h1v1h-1zM11 9h1v1h-1zM5 10h6v1h-6z",
  correct:
    "M13 2h2v1h-2zM12 3h3v1h-3zM11 4h3v1h-3zM2 5h2v1h-2zM10 5h3v1h-3zM2 6h3v1h-3zM9 6h3v1h-3zM3 7h3v1h-3zM8 7h3v1h-3zM4 8h6v1h-6zM5 9h4v1h-4zM6 10h2v1h-2z",
  "not-quite": "M7 1h2v1h-2zM6 2h4v1h-4zM6 3h4v1h-4zM6 4h4v1h-4zM6 5h4v1h-4zM7 6h2v1h-2zM7 7h2v1h-2zM7 9h2v1h-2zM7 10h2v1h-2z",
  saved:
    "M1 1h11v1h-11zM1 2h1v1h-1zM4 2h5v1h-5zM11 2h2v1h-2zM1 3h1v1h-1zM4 3h5v1h-5zM12 3h2v1h-2zM1 4h1v1h-1zM4 4h5v1h-5zM13 4h1v1h-1zM1 5h1v1h-1zM13 5h1v1h-1zM1 6h1v1h-1zM3 6h9v1h-9zM13 6h1v1h-1zM1 7h1v1h-1zM3 7h1v1h-1zM11 7h1v1h-1zM13 7h1v1h-1zM1 8h1v1h-1zM3 8h1v1h-1zM5 8h5v1h-5zM11 8h1v1h-1zM13 8h1v1h-1zM1 9h1v1h-1zM3 9h1v1h-1zM11 9h1v1h-1zM13 9h1v1h-1zM1 10h13v1h-13z",
  elec: "M3 1h1v1h-1zM5 1h1v1h-1zM7 1h1v1h-1zM9 1h1v1h-1zM11 1h1v1h-1zM2 2h10v1h-10zM2 3h1v1h-1zM11 3h1v1h-1zM1 4h2v1h-2zM4 4h2v1h-2zM8 4h2v1h-2zM11 4h2v1h-2zM2 5h1v1h-1zM11 5h1v1h-1zM1 6h2v1h-2zM4 6h2v1h-2zM8 6h2v1h-2zM11 6h2v1h-2zM2 7h1v1h-1zM11 7h1v1h-1zM2 8h10v1h-10zM3 9h1v1h-1zM5 9h1v1h-1zM7 9h1v1h-1zM9 9h1v1h-1zM11 9h1v1h-1z",
  locked:
    "M5 1h4v1h-4zM4 2h1v1h-1zM9 2h1v1h-1zM4 3h1v1h-1zM9 3h1v1h-1zM3 4h8v1h-8zM3 5h1v1h-1zM10 5h1v1h-1zM3 6h1v1h-1zM6 6h2v1h-2zM10 6h1v1h-1zM3 7h1v1h-1zM6 7h2v1h-2zM10 7h1v1h-1zM3 8h1v1h-1zM10 8h1v1h-1zM3 9h8v1h-8z",
} as const;

export type PixelIconName = keyof typeof PATHS;
export const PIXEL_ICON_NAMES = Object.keys(PATHS) as PixelIconName[];

/**
 * Decorative by default (aria-hidden): an icon always sits next to a word and never carries meaning alone.
 * Pass `label` only for the rare icon that stands alone.
 */
export function PixelIcon({ name, size = 24, label, className }: { name: PixelIconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cn("shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path fill="currentColor" d={PATHS[name]} />
    </svg>
  );
}
