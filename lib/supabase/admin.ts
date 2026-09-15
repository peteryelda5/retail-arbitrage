// Service-role client — BYPASSES RLS ENTIRELY. Server-only.
// SUPABASE_SERVICE_ROLE_KEY has NO safe default — unlike the anon key, this is a
// genuine secret that only the project owner can retrieve (Supabase dashboard ->
// Project Settings -> API -> service_role). It must be set as a Vercel env var.
// Never import this from a Client Component.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kciqrambmaaxvfawbytg.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY env var — set it in Vercel: Settings -> Environment Variables. " +
        "Get the value from Supabase dashboard -> Project Settings -> API -> service_role key."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
