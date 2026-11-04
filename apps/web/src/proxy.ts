import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/auth/origin";
import { supabaseEnv } from "@/lib/supabase/env";

// Request gate (doc 03 section 4.1): refreshes the session cookie and sends signed-out visitors
// to /welcome. It is a convenience; every route handler authenticates itself.
const PUBLIC_PREFIXES = ["/welcome", "/auth/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

  if (!signedIn && !isPublic) {
    const redirect = NextResponse.redirect(appUrl(request, "/welcome"));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  if (signedIn && pathname === "/welcome") return NextResponse.redirect(appUrl(request, "/"));
  return response;
}

export const config = {
  // API routes answer 401 themselves (doc 03 section 11); static files and the service worker
  // must load while signed out.
  matcher: ["/((?!api/|_next/|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|svg|jpg|ico|webp|txt)$).*)"],
};
