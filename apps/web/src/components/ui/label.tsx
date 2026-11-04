import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Label (new-york style), as a plain label element.
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}
