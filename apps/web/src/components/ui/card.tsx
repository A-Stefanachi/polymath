import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// A framed surface: 3 px ink border, square corners. `hero` adds the 6 px hard shadow for the one
// card a screen is about.
export function Card({ className, hero, ...props }: HTMLAttributes<HTMLDivElement> & { hero?: boolean }) {
  return <div className={cn("flex flex-col gap-4 border-[3px] border-ink bg-surface p-4 text-ink", hero && "shadow-px-hero", className)} {...props} />;
}
