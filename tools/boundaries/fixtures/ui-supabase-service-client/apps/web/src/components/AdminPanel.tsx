// Violation (BL-0004 acceptance test 2): a component creating a Supabase service client.
import { createClient } from "@supabase/supabase-js";

const admin = createClient("https://example.supabase.co", "sb_secret_fake_for_fixture");

export function AdminPanel() {
  return <p>{String(Boolean(admin))}</p>;
}
