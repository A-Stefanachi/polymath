"use client";

import { useCallback, useEffect, useState } from "react";

export type Loaded<T> = { status: "loading" } | { status: "error"; offline: boolean } | { status: "ready"; data: T };

/** GET a JSON document of the app's own API (same origin, session cookie). Throws on any non-2xx answer. */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GET ${path} answered ${String(response.status)}`);
  return (await response.json()) as T;
}

/**
 * Runs `loader` on mount and again on `reload`. `loader` must be a stable function (module level or memoised),
 * because a new identity re-runs it.
 */
export function useLoad<T>(loader: () => Promise<T>): [Loaded<T>, () => void] {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    loader().then(
      (data) => {
        if (live) setState({ status: "ready", data });
      },
      () => {
        if (live) setState({ status: "error", offline: typeof navigator !== "undefined" && !navigator.onLine });
      },
    );
    return () => {
      live = false;
    };
  }, [loader, round]);
  const reload = useCallback(() => {
    setState({ status: "loading" });
    setRound((r) => r + 1);
  }, []);
  return [state, reload];
}
