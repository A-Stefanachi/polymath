import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Input (new-york style).
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border border-foreground bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
