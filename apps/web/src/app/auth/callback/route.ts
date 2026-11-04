import { NextResponse } from "next/server";
import { nextPath } from "@/lib/auth/next-step";
import { appUrl } from "@/lib/auth/origin";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The sign-in link in the email. Two forms reach this route:
// - `?token_hash=...&type=email` from the app's own template (supabase/templates): verified on the
//   server with no stored PKCE verifier, so it works in any browser;
// - `?code=...` after Supabase's own verify step, from its default template (staging on the
//   built-in mailer, which allows no custom template): exchanged with the PKCE verifier cookie set
//   when the code was requested, so it works in the browser that asked for it.
// The redirect target is fixed: there is no `next` parameter to abuse as an open redirect.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  let signedIn = false;
  let reason = "bad_link";
  if (url.searchParams.get("type") === "email" && tokenHash && tokenHash.length <= 200) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    signedIn = !error && Boolean(data.session);
    reason = error?.code ?? "no_session";
  } else if (code && code.length <= 200 && !tokenHash) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    signedIn = !error && Boolean(data.session);
    reason = error?.code ?? "no_session";
  }
  if (!signedIn) {
    logger.info("auth.callback", { outcome: "rejected", code: reason });
    return NextResponse.redirect(appUrl(request, "/welcome?error=link"));
  }
  logger.info("auth.callback", { outcome: "signed_in" });
  return NextResponse.redirect(appUrl(request, await nextPath(supabase)));
}
