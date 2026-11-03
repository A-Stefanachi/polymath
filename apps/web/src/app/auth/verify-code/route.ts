import { NextResponse } from "next/server";
import { nextPath } from "@/lib/auth/next-step";
import { parseCode, parseEmail } from "@/lib/auth/validate";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const fields = typeof body === "object" && body !== null ? (body as { email?: unknown; code?: unknown }) : {};
  const email = parseEmail(fields.email);
  const token = parseCode(fields.code);
  if (!email || !token) return NextResponse.json({ error: "code_invalid" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) {
    // A wrong, used or expired code all read the same; GoTrue's per-IP verification limit applies.
    logger.info("auth.verify_code", { outcome: "rejected", code: error?.code ?? "no_session" });
    return NextResponse.json({ error: "code_invalid" }, { status: error?.status === 429 ? 429 : 400 });
  }
  logger.info("auth.verify_code", { outcome: "signed_in" });
  return NextResponse.json({ status: "signed_in", redirect: await nextPath(supabase) });
}
