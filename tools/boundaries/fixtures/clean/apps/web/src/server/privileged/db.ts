// Allowed: the privileged module itself may use a database client.
import { createClient } from "@supabase/supabase-js";

export const makeClient = createClient;
