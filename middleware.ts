import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets and the API routes (devices
    // authenticate to those with their own device key, not a user session).
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
