import { NextResponse } from "next/server";
import { appUrl } from "@/lib/auth/origin";
import { parseEmail, signupEnabled, withMinimumDuration } from "@/lib/auth/validate";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Every outcome that depends on whether the address has an account takes at least this long and
// returns the same body (ST-AUTH-01, T-AUTH-1). Chosen above the usual SMTP hand-off time so a
// send to a known address cannot be told from the quick refusal for an unknown one.
const RESPONSE_FLOOR_MS = 1500;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const email = parseEmail(typeof body === "object" && body !== null ? (body as { email?: unknown }).email : null);
  if (!email) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  return withMinimumDuration(RESPONSE_FLOOR_MS, async () => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Where Supabase sends the browser after its own verify step: used by the default email
      // template (staging on the built-in mailer, which allows no custom template). Supabase only
      // honours it when the URL is on the project's redirect allow-list; otherwise it uses site_url.
      options: { shouldCreateUser: signupEnabled(), emailRedirectTo: appUrl(request, "/auth/callback").toString() },
    });
    // The address is never logged (rule 2.5): only the outcome class.
    if (!error) {
      logger.info("auth.send_code", { outcome: "sent" });
      return NextResponse.json({ status: "sent" });
    }
    const code = error.code ?? "";
    if (code === "over_request_rate_limit") {
      logger.warn("auth.send_code", { outcome: "rate_limited" });
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if ((error.status ?? 500) >= 500) {
      logger.error("auth.send_code", { outcome: "unavailable", code });
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    // Signup disabled for an unknown address, or the per-address send interval: both look like
    // success to the caller, so the response does not reveal whether an account exists.
    logger.info("auth.send_code", { outcome: "masked", code });
    return NextResponse.json({ status: "sent" });
  });
}
