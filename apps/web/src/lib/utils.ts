import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// The class-name helper shadcn/ui components import from "@/lib/utils".
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
