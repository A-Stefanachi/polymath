import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// Self-hosted fonts (OFL-1.1, THIRD_PARTY_NOTICES.md): no third-party request at run time. Only the weights
// the design uses are loaded; the files are fetched by the browser only for the characters on the page.
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/600.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/atkinson-hyperlegible-mono/400.css";
import "@fontsource/atkinson-hyperlegible-mono/600.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/silkscreen/400.css";
import "./globals.css";
import { shell } from "@/copy/strings";

export const metadata: Metadata = {
  title: "Polymath",
  description: "Adaptive practice with spaced retrieval, graded feedback and guided builds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only z-50 border-[3px] border-ink bg-surface px-4 py-3 font-bold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {shell.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
