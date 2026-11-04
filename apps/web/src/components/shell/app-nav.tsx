import Link from "next/link";
import { PixelIcon, type PixelIconName } from "@/components/pixel-icon";
import { shell } from "@/copy/strings";
import { cn } from "@/lib/utils";

export type NavKey = "today" | "map" | "review" | "progress";

// Only Today exists so far. The other three say so (honest copy) instead of linking to nothing; they become
// links when their screens are built (doc 09 section 3).
const ITEMS: { key: NavKey; label: string; icon: PixelIconName; href: string | null }[] = [
  { key: "today", label: shell.navToday, icon: "today", href: "/" },
  { key: "map", label: shell.navMap, icon: "map", href: null },
  { key: "review", label: shell.navReview, icon: "review", href: null },
  { key: "progress", label: shell.navProgress, icon: "progress", href: null },
];

function NavItems({ current, rail }: { current: NavKey; rail: boolean }) {
  return (
    <ul className={rail ? "flex flex-col gap-3" : "grid grid-cols-4"}>
      {ITEMS.map((item) => {
        const active = item.key === current;
        const box = rail
          ? "flex items-center gap-3 border-[3px] px-3 py-2.5 text-[17px]"
          : "flex flex-col items-center gap-1 px-1 pt-2.5 pb-4 text-[13px]";
        return (
          <li key={item.key}>
            {item.href ? (
              <Link
                href={item.href}
                {...(active ? { "aria-current": "page" as const } : {})}
                className={cn(box, "min-h-12 font-semibold no-underline", rail && "border-ink", active ? "bg-ink text-bg" : "text-ink", rail && !active && "bg-surface shadow-px-sm")}
              >
                <PixelIcon name={item.icon} size={rail ? 24 : 26} />
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className={cn(box, "min-h-12 font-semibold text-muted", rail && "border-dashed border-muted")}>
                <PixelIcon name="locked" size={rail ? 24 : 26} />
                <span>
                  {item.label}
                  <span className="sr-only">{`, ${shell.unavailable}`}</span>
                  {rail ? <span className="block text-sm font-normal">{shell.unavailableVisible}</span> : null}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Phone navigation: four items fixed to the bottom edge (below 1024 px). */
export function BottomNav({ current = "today" }: { current?: NavKey }) {
  return (
    <nav aria-label={shell.navLabel} className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-ink bg-surface lg:hidden">
      <NavItems current={current} rail={false} />
    </nav>
  );
}

/** Desktop navigation: a rail on the left edge (1024 px and wider). */
export function SideRail({ current = "today" }: { current?: NavKey }) {
  return (
    <nav aria-label={shell.navLabel} className="fixed inset-y-0 left-0 z-10 hidden w-60 border-r-[3px] border-ink bg-surface p-4 pt-20 lg:block">
      <NavItems current={current} rail />
    </nav>
  );
}
