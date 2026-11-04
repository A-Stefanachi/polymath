import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Text input: 3 px ink border, at least 16 px text (prevents iOS zoom), 56 px high.
export function Input({ className, mono, ...props }: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      className={cn(
        "h-14 w-full min-w-0 border-[3px] border-ink bg-field px-3.5 text-[17px] text-ink read-only:bg-control disabled:opacity-60",
        mono ? "font-mono text-[22px]" : "font-sans",
        className,
      )}
      {...props}
    />
  );
}
