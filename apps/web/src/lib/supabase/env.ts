// Public Supabase settings (doc 03 section 9.1). Only the publishable key lives here; the secret
// key exists only under src/server/privileged (CLAUDE.md rule 2.6).

export type SupabaseEnv = { url: string; publishableKey: string };

export function supabaseEnv(env: Record<string, string | undefined> = process.env): SupabaseEnv {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  }
  return { url, publishableKey };
}
