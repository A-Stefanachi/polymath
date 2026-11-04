import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env.ts";

/** Supabase client for route handlers and server components; the session lives in cookies. */
export async function createSupabaseServerClient() {
  const store = await cookies();
  const { url, publishableKey } = supabaseEnv();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // A server component cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
