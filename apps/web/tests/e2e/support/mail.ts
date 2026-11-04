import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { localSupabase } from "./local-supabase";

const stack = localSupabase();

export function uniqueEmail(): string {
  return `bl0021-${Math.random().toString(36).slice(2, 10)}@example.test`;
}

type Mail = { code: string; link: string };

/** Newest sign-in email for an address, read from the Mailpit API. */
export async function readSignInMail(email: string, notBefore = 0): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(`${stack.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
        const list = (await search.json()) as { messages: { ID: string; Created: string }[] };
        const fresh = list.messages.filter((m) => Date.parse(m.Created) >= notBefore);
        if (fresh.length === 0) return false;
        const message = (await (await fetch(`${stack.mailpitUrl}/api/v1/message/${fresh[0]?.ID}`)).json()) as {
          Text: string;
          HTML: string;
        };
        const code = /\b(\d{6})\b/.exec(message.Text)?.[1];
        const href = /href="([^"]*\/auth\/callback\?[^"]*)"/.exec(message.HTML)?.[1];
        if (!code || !href) return false;
        found = { code, link: href.replaceAll("&amp;", "&") };
        return true;
      },
      { timeout: 15_000, message: "sign-in email with code and link" },
    )
    .toBe(true);
  if (!found) throw new Error("unreachable");
  return found;
}

/** Points the emailed link (built from the stack's SITE_URL) at the app under test. */
export function linkOnApp(link: string, baseURL: string): string {
  const url = new URL(link);
  return new URL(`${url.pathname}${url.search}`, baseURL).toString();
}

/** The signed-in learner's id and a client that acts as that learner, from the session cookie. */
export async function learnerFromCookies(page: Page) {
  const cookies = await page.context().cookies();
  const chunks = cookies
    .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (chunks.length === 0) return null;
  const joined = chunks.map((c) => c.value).join("");
  const json = Buffer.from(decodeURIComponent(joined).replace(/^base64-/, ""), "base64url").toString("utf8");
  const session = JSON.parse(json) as { access_token: string; user: { id: string } };
  const client = createClient(stack.url, stack.publishableKey, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false },
  });
  return { id: session.user.id, client };
}

export function adminClient() {
  return createClient(stack.url, stack.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Makes the address's outstanding sign-in code and link 16 minutes old (the limit is 15). */
export function ageSignInTokens(email: string): void {
  execFileSync(
    "psql",
    [
      stack.dbUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      `email=${email}`,
    ],
    {
      // psql substitutes :'email' (a safely quoted literal) in statements read from stdin, not in -c.
      input: "update auth.users set recovery_sent_at = now() - interval '16 minutes', confirmation_sent_at = now() - interval '16 minutes' where email = :'email';",
      stdio: ["pipe", "ignore", "inherit"],
    },
  );
}

export async function deleteUserByEmail(email: string): Promise<void> {
  const admin = adminClient();
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const user = data.users.find((u) => u.email === email);
    if (user) {
      await admin.auth.admin.deleteUser(user.id);
      return;
    }
    if (data.users.length < 1000) return;
  }
}
