"use client";

import { useEffect } from "react";

// Registers /sw.js (built by `serwist build`) in production only: in `next dev` the file does not exist and a
// worker would hide changes. Failure is silent for the learner; the app works without a worker.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
