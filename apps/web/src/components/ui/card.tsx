import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Card (new-york style).
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-4 rounded-xl border border-foreground/40 p-4", className)} {...props} />;
}
