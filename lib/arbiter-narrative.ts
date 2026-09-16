// Calls Claude to generate a plain-English explanation of an already-computed
// opportunity. This NEVER computes or invents any dollar figures — every number
// it sees comes from the deterministic opportunity-engine, and it's told
// explicitly to only use those numbers, never make up its own.
//
// Per the Arbiter spec (section XXXII): deterministic code owns the math,
// LLMs own the qualitative interpretation. This file is the LLM side only.
//
// Requires ANTHROPIC_API_KEY (server-only env var, no default — a real,
// billed secret). Get one at https://console.anthropic.com

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are Arbiter, an underwriting assistant for a retail-arbitrage FBA business.
You are given an already-computed opportunity: real numbers from a deterministic
pricing/profit engine. You do NOT calculate anything and you do NOT invent any
number that isn't given to you. Your only job is to explain the opportunity in
plain English, using the exact figures provided.

Core principles you must follow:
- Evidence over guessing. Conservative framing over optimistic framing.
- If confidence or data quality is low, say so plainly rather than glossing over it.
- Never claim certainty the data doesn't support.
- A high ROI does not excuse ignoring risk factors you're given.
- Keep each section to 1-3 short sentences. No fluff, no hype.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{
  "whyLikes": "...",
  "whatCanGoWrong": "...",
  "whyQuantity": "..."
}`;

export interface NarrativeInput {
  productTitle: string;
  retailer: string;
  retailCost: number;
  amazonSalePrice: number;
  estimatedProfit: number;
  roiPercent: number;
  marginPercent: number;
  confidenceScore: number;
  recommendedQuantity: number;
  status: string;
}

export interface NarrativeResult {
  whyLikes: string;
  whatCanGoWrong: string;
  whyQuantity: string;
}

/**
 * Generates a narrative explanation for an opportunity. Returns null on any
 * failure (missing key, API error, bad response) — a missing narrative should
 * never block the opportunity itself from being saved and shown.
 */
export async function generateNarrative(input: NarrativeInput): Promise<NarrativeResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set — skipping narrative generation");
    return null;
  }

  const userMessage = `Here is the computed opportunity. Use ONLY these numbers \u2014 do not invent any figure.

Product: ${input.productTitle}
Retailer: ${input.retailer}
Retail cost: $${input.retailCost.toFixed(2)}
Amazon conservative selling price: $${input.amazonSalePrice.toFixed(2)}
Estimated profit per unit: $${input.estimatedProfit.toFixed(2)}
ROI: ${input.roiPercent.toFixed(1)}%
Margin: ${input.marginPercent.toFixed(1)}%
Match confidence: ${input.confidenceScore.toFixed(0)}/100
Recommended quantity: ${input.recommendedQuantity}
Status: ${input.status}`;

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (err) {
    console.error("Anthropic request failed:", err);
    return null;
  }

  if (!res.ok) {
    console.error(`Anthropic API returned ${res.status}`);
    return null;
  }

  try {
    const data = await res.json();
    const text = data?.content?.find((c: any) => c.type === "text")?.text;
    if (!text) return null;

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed.whyLikes !== "string" ||
      typeof parsed.whatCanGoWrong !== "string" ||
      typeof parsed.whyQuantity !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.error("Failed to parse Anthropic response:", err);
    return null;
  }
}
