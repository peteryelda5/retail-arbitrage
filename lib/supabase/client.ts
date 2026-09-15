// Browser client — uses the public anon key, respects RLS (authenticated-user policies).
// URL/anon key are public-by-design (that's what "anon key" means), so they're baked in
// as defaults here and don't require Vercel dashboard configuration to work.
"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kciqrambmaaxvfawbytg.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjaXFyYW1ibWFheHZmYXdieXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MjQ0MDYsImV4cCI6MjEwNTAwMDQwNn0.64lJPuOcSMd_Bh4VdN3LgQkvyu7wx-k3ojmQfRfWrL4";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
