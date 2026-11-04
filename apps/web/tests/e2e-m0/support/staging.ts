import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// BL-0032 fixture access to the staging project, over HTTPS only (the Data API and the Auth admin
// API), because the cloud session and CI runners may have no TCP route to Postgres (infra/ACCOUNTS.md).
// The secret key is read from the environment and never printed (CLAUDE.md rule 2.5).
export const TEMPLATE_KEY = "tpl.elec.voltage-divider-vout";

export function stagingAdmin(env: Record<string, string | undefined> = process.env): SupabaseClient {
  const url = env.E2E_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.E2E_SUPABASE_SECRET_KEY ?? env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("e2e:m0 needs the staging Supabase URL and secret key (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)");
  }
  if (["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("e2e:m0 is the staging exit test; the local stack is covered by pnpm e2e:auth");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type PoolItem = { id: string; seed: number; reference: number; unit: string; skillKey: string; taskKind: string };

/** The verified, unretired pool items of the M0 template with their keys (read with the secret key). */
export async function verifiedPoolItems(admin: SupabaseClient): Promise<PoolItem[]> {
  const { data: tpl, error: tplError } = await admin
    .from("item_templates")
    .select("skill_key, task_kind")
    .eq("key", TEMPLATE_KEY)
    .eq("status", "verified")
    .single();
  if (tplError || !tpl) throw new Error(`template ${TEMPLATE_KEY} is not verified on staging`);
  const { data, error } = await admin
    .from("items")
    .select("id, seed, item_secrets(answer_key)")
    .eq("template_key", TEMPLATE_KEY)
    .eq("status", "verified")
    .is("user_id", null)
    .is("retired_at", null)
    .order("seed");
  if (error) throw new Error(`reading items failed: ${error.message}`);
  return (data ?? []).map((row) => {
    const secrets = row.item_secrets as unknown as { answer_key: { reference: number; answer_spec: { unit: string } } } | null;
    if (!secrets) throw new Error(`item seed ${String(row.seed)} has no answer key`);
    return {
      id: row.id as string,
      seed: row.seed as number,
      reference: secrets.answer_key.reference,
      unit: secrets.answer_key.answer_spec.unit,
      skillKey: tpl.skill_key as string,
      taskKind: tpl.task_kind as string,
    };
  });
}

/**
 * One micro session with one task for `item`, as the session builder would leave it. The newest open
 * task is what /demo-item shows (BL-0027), so each call makes the next item the current one.
 */
export async function queueTask(admin: SupabaseClient, userId: string, item: PoolItem): Promise<string> {
  const { data: session, error } = await admin
    .from("sessions")
    .insert({ user_id: userId, session_type: "micro", context: "phone", planned_min: 10, available_minutes: 10 })
    .select("id")
    .single();
  if (error || !session) throw new Error(`creating the session failed: ${error?.message ?? "no row"}`);
  const { data: task, error: taskError } = await admin
    .from("session_tasks")
    .insert({ session_id: session.id, position: 1, task_kind: item.taskKind, skill_key: item.skillKey, item_id: item.id, user_id: userId })
    .select("id")
    .single();
  if (taskError || !task) throw new Error(`creating the task failed: ${taskError?.message ?? "no row"}`);
  return task.id as string;
}

/** Removes every row the scenario made for its throwaway learner, children first, then the account. */
export async function deleteLearner(admin: SupabaseClient, userId: string): Promise<void> {
  for (const table of ["events", "attempts", "session_tasks", "sessions", "review_log", "skill_state"]) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`cleanup of ${table} failed: ${error.message}`);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`deleting the learner failed: ${error.message}`);
}
