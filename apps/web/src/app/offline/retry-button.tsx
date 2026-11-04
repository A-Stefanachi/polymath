"use client";

import { Button } from "@/components/ui/button";
import { offlinePage } from "@/copy/strings";

// A full reload, not a client-side navigation: offline, the browser asks the service worker again and the
// page appears as soon as the connection is back.
export function RetryButton() {
  return (
    <Button className="w-fit" onClick={() => window.location.reload()}>
      {offlinePage.retry}
    </Button>
  );
}
