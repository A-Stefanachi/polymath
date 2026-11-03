import { NextResponse } from "next/server";
import { appUrl } from "@/lib/auth/origin";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The sign-in link in the email (supabase/templates). It carries the token hash; verifying on the
// server needs no stored PKCE verifier, so the link works in any browser. The redirect target is
// fixed: there is no `next` parameter to abuse as an open redirect.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  if (url.searchParams.get("type") !== "email" || !tokenHash || tokenHash.length > 200) {
    return NextResponse.redirect(appUrl(request, "/welcome?error=link"));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error || !data.session) {
    logger.info("auth.callback", { outcome: "rejected", code: error?.code ?? "no_session" });
    return NextResponse.redirect(appUrl(request, "/welcome?error=link"));
  }
  logger.info("auth.callback", { outcome: "signed_in" });
  return NextResponse.redirect(appUrl(request, "/"));
}
