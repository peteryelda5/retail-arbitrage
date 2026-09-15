// Server component / route handler client — reads the user's session from cookies,
// still respects RLS. URL/anon key default to the project's public values so this
// works without any Vercel dashboard configuration.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kciqrambmaaxvfawbytg.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjaXFyYW1ibWFheHZmYXdieXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MjQ0MDYsImV4cCI6MjEwNTAwMDQwNn0.64lJPuOcSMd_Bh4VdN3LgQkvyu7wx-k3ojmQfRfWrL4";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component — safe to ignore if you have middleware
          // refreshing sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // ignore, see above
        }
      },
    },
  });
}
