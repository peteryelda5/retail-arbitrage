// POST /api/chat
// Backend for the Arbiter chat interface. Calls the Claude API directly.
//
// This is intentionally a plain conversational assistant for now — it does
// NOT yet have access to live Supabase data, Keepa lookups, or any of the
// scoring/underwriting logic described in the Arbiter spec. Wiring it to
// real tools (querying opportunities, running the quantity/capital engines,
// etc.) is future work, done in phases, same as every other piece of this
// app so far.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Arbiter, the AI assistant embedded in a retail-arbitrage / Amazon FBA
opportunity-tracking dashboard. The person you're talking to is the operator of this
business — they scan retail products, match them to Amazon listings, and decide what to buy
and resell on Amazon FBA.

Right now you are a conversational assistant only. You do NOT have live access to their
Supabase database, Keepa data, or any calculated opportunities — that integration is planned
but not yet built. If asked about specific current opportunities, inventory, or numbers,
be upfront that you can't see live data yet and suggest they check the relevant dashboard
page instead. You can still help with strategy, general FBA/retail-arbitrage questions,
interpreting numbers they paste in, and planning.

Be direct, concise, and practical — this person is running a real business, not looking for
generic filler.`;

export async function POST(req: NextRequest) {
  // Require a logged-in dashboard user — this endpoint spends real API credits.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: ANTHROPIC_API_KEY not set" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body as { messages?: { role: string; content: string }[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to reach Claude API" }, { status: 502 });
  }

  if (!res.ok) {
    const errBody = await res.text();
    return NextResponse.json(
      { error: `Claude API error (${res.status}): ${errBody}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n");

  return NextResponse.json({ reply: text });
}
