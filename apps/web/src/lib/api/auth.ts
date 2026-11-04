// Authentication for route handlers (doc 03 section 4.1): the browser's session cookie or
// `Authorization: Bearer <access token>`. user_id always comes from the verified claims, never
// from the request body.
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";
import { ApiError } from "./errors.ts";

export type Caller = { userId: string };
export type Authenticate = (request: Request) => Promise<Caller>;

export const authenticate: Authenticate = async (request) => {
  const { url, publishableKey } = supabaseEnv();
  const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get("cookie") ?? "").map((c) => ({ name: c.name, value: c.value ?? "" })),
      setAll: () => undefined, // the proxy refreshes the session cookie; handlers only read it
    },
  });
  const { data } = await supabase.auth.getClaims(bearer);
  const claims = data?.claims;
  // The publishable key is itself a JWT-shaped credential with role "anon" and no subject.
  if (!claims?.sub || claims.role !== "authenticated") throw new ApiError("unauthenticated");
  return { userId: claims.sub };
};
