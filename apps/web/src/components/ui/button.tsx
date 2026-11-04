import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Bench Arcade buttons (doc 09 section 10.2, 00a J7): 3 px ink border, square corners, hard 4 px shadow,
// sinks 3 px when pressed (.px-press in globals.css). Targets are at least 48 px; `lg` is 60 px.
export const buttonVariants = cva(
  "px-press inline-flex items-center justify-center gap-2 border-[3px] border-ink px-4 font-bold disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none",
  {
    variants: {
      variant: {
        // Pixelify Sans carries the primary action (Check, Start, Next).
        primary: "shadow-px bg-primary font-display text-button text-on-primary",
        secondary: "shadow-px bg-surface text-[16px] text-ink",
        inverse: "shadow-px bg-ink font-display text-button text-bg",
        // A text action such as Skip: no frame, still a 48 px target.
        link: "border-transparent bg-transparent px-1 text-[16px] text-primary underline underline-offset-4",
      },
      size: {
        md: "min-h-12",
        lg: "min-h-[60px]",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
