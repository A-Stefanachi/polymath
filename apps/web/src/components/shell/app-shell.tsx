import type { ReactNode } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { BottomNav, SideRail, type NavKey } from "@/components/shell/app-nav";
import { shell } from "@/copy/strings";

/**
 * Layout shell for signed-in screens (doc 09 section 3): banner, main, and one navigation per breakpoint
 * (bottom bar on a phone, rail from 1024 px). The skip link lives in the root layout and targets #main.
 * Focused screens such as a session omit the shell and keep their own top bar.
 */
export function AppShell({ children, current = "today", aside }: { children: ReactNode; current?: NavKey; aside?: ReactNode }) {
  return (
    <>
      <div className="min-h-dvh lg:pl-60">
        <header className="flex items-center justify-between gap-3 px-4 pt-5 pb-3 lg:px-8">
          <div className="flex items-center gap-2.5">
            <PixelIcon name="micro" size={28} className="text-primary" />
            <span className="font-label text-lg tracking-[0.06em] uppercase">{shell.brand}</span>
          </div>
          {aside}
        </header>
        <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-2 pb-32 outline-none lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav current={current} />
      <SideRail current={current} />
    </>
  );
}
