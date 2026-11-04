import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Screen title: Pixelify Sans 700 at 30/36 (00a J7). Level 1 by default. */
export function ScreenTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("font-display text-title font-bold", className)} {...props} />;
}
