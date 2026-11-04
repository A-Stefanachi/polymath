/// <reference lib="webworker" />
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

// Service worker source (BL-0063; doc 03 section 4.1, ADR-013). `serwist build` bundles it into
// public/sw.js and injects the precache list (serwist.config.mjs).
//
// What it caches, and what it never does:
//  - precache: the build's own static JS, CSS and Latin fonts, plus the offline page. These are public
//    files with no learner data.
//  - navigations: network only; if the network fails the offline page answers (doc 09 section 8).
//  - everything else, API responses included, goes straight to the network and is never stored: a
//    response with learner data or an answer key must not sit in a cache (CLAUDE.md rule 6). Offline
//    micro packs arrive with their own task.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [],
  disableDevLogs: true,
});

serwist.setDefaultHandler(new NetworkOnly());
// Only a failed page load gets the offline page; a failed API call stays a network error.
serwist.setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    const fallback = await serwist.matchPrecache("/offline");
    if (fallback) return fallback;
  }
  return Response.error();
});

serwist.addEventListeners();
