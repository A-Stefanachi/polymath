// The email-link callback accepts the app template's token hash and, for Supabase's default
// template on staging, the PKCE code (BL-0021 follow-up). The Supabase client is mocked: the
// end-to-end path with a real stack is covered by tests/e2e/signin.spec.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));
vi.mock("@/lib/auth/next-step", () => ({ nextPath: async () => "/" }));

const { GET } = await import("./route.ts");

const session = { data: { session: { access_token: "t" } }, error: null };
const failed = { data: { session: null }, error: { code: "otp_expired" } };

function call(query: string): Promise<Response> {
  // A real request carries the Host header, which appUrl uses to build the redirect.
  return GET(
    new Request(`https://polymath-staging.vercel.app/auth/callback${query}`, {
      headers: { host: "polymath-staging.vercel.app", "x-forwarded-proto": "https" },
    }),
  );
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    verifyOtp.mockReset();
    exchangeCodeForSession.mockReset();
  });

  it("signs in with the token hash of the app's own template", async () => {
    verifyOtp.mockResolvedValue(session);
    const res = await call("?token_hash=abc&type=email");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "email" });
    expect(res.headers.get("location")).toBe("https://polymath-staging.vercel.app/");
  });

  it("signs in with the PKCE code Supabase's default template returns", async () => {
    exchangeCodeForSession.mockResolvedValue(session);
    const res = await call("?code=xyz");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://polymath-staging.vercel.app/");
  });

  it("sends a rejected code or token back to /welcome with an error", async () => {
    exchangeCodeForSession.mockResolvedValue(failed);
    expect((await call("?code=used")).headers.get("location")).toContain("/welcome?error=link");
    verifyOtp.mockResolvedValue(failed);
    expect((await call("?token_hash=used&type=email")).headers.get("location")).toContain("/welcome?error=link");
  });

  it("rejects a link with neither form, a wrong type, or an oversized value without calling Supabase", async () => {
    for (const q of ["", "?type=email", "?token_hash=abc", `?code=${"x".repeat(201)}`, "?code=a&token_hash=b"]) {
      expect((await call(q)).headers.get("location")).toContain("/welcome?error=link");
    }
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
