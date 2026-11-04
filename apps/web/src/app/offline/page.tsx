import { PixelIcon } from "@/components/pixel-icon";
import { ScreenTitle } from "@/components/ui/screen-title";
import { offlinePage } from "@/copy/strings";
import { RetryButton } from "./retry-button";

// Offline page (BL-0063, doc 09 section 8): the service worker answers a failed page load with this
// precached page instead of the browser's error. It is static and public (src/proxy.ts), with no learner data.
export default function OfflinePage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-4 py-8 outline-none">
      <ScreenTitle className="flex items-center gap-3">
        <PixelIcon name="micro" size={32} className="text-primary" />
        {offlinePage.title}
      </ScreenTitle>
      <p>{offlinePage.body}</p>
      <RetryButton />
    </main>
  );
}
