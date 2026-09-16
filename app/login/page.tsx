"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <div className="text-sm font-semibold text-gray-100">Retail Arbitrage</div>
          <div className="text-xs text-muted mt-1">Sign in to continue</div>
        </div>

        {error && (
          <div className="text-xs text-pass bg-pass/10 border border-pass/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-xs text-muted">
          Accounts are created by an admin in Supabase — there's no self-signup.
        </div>
      </form>
    </div>
  );
}
