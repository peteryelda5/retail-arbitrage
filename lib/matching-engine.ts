// Matches a retail-observed product to an Amazon listing (product record),
// primarily by UPC/EAN, with a confidence score built from secondary signals.
//
// IMPORTANT: per the project spec, never recommend a purchase when pack count
// or variant is ambiguous — this engine surfaces that ambiguity as a hard cap
// on confidence rather than silently guessing.

export interface CandidateProduct {
  id: string;
  upc: string | null;
  ean: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  packQuantity: number | null;
  variant: string | null;
}

export interface ObservedItem {
  upc?: string | null;
  ean?: string | null;
  title: string;
  brand?: string | null;
  model?: string | null;
  packQuantity?: number | null;
  variant?: string | null;
}

export interface MatchResult {
  productId: string;
  confidenceScore: number; // 0-100
  isAmbiguous: boolean; // true if pack count or variant could not be confirmed
  reasons: string[]; // human-readable explanation, shown in the dashboard
}

export function matchProduct(
  observed: ObservedItem,
  candidates: CandidateProduct[]
): MatchResult | null {
  if (candidates.length === 0) return null;

  const scored = candidates.map((c) => scoreCandidate(observed, c));
  scored.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return scored[0];
}

function scoreCandidate(observed: ObservedItem, c: CandidateProduct): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // UPC/EAN exact match is the strongest signal by far.
  const upcMatch =
    !!observed.upc && !!c.upc && normalizeCode(observed.upc) === normalizeCode(c.upc);
  const eanMatch =
    !!observed.ean && !!c.ean && normalizeCode(observed.ean) === normalizeCode(c.ean);

  if (upcMatch || eanMatch) {
    score += 60;
    reasons.push(upcMatch ? "UPC exact match" : "EAN exact match");
  } else {
    reasons.push("No UPC/EAN match — matched on secondary signals only");
  }

  // Brand
  if (observed.brand && c.brand && normalizeText(observed.brand) === normalizeText(c.brand)) {
    score += 10;
    reasons.push("Brand match");
  }

  // Title similarity (simple token-overlap — swap for a trigram/embedding
  // similarity call against Postgres pg_trgm or an external service later).
  const titleSim = tokenOverlap(observed.title, c.title);
  score += Math.round(titleSim * 15);
  if (titleSim > 0.5) reasons.push(`Title similarity ${(titleSim * 100).toFixed(0)}%`);

  // Model number
  if (observed.model && c.model && normalizeText(observed.model) === normalizeText(c.model)) {
    score += 10;
    reasons.push("Model number match");
  }

  // --- Ambiguity checks: pack count & variant ---
  // These never ADD confidence — they can only cap it, because a wrong pack
  // count or variant match means buying the wrong item.
  let isAmbiguous = false;

  const observedPack = observed.packQuantity ?? 1;
  const candidatePack = c.packQuantity ?? 1;
  if (observedPack !== candidatePack) {
    isAmbiguous = true;
    reasons.push(
      `Pack quantity mismatch (observed ${observedPack}, candidate ${candidatePack})`
    );
  }

  if (observed.variant && c.variant && normalizeText(observed.variant) !== normalizeText(c.variant)) {
    isAmbiguous = true;
    reasons.push(`Variant mismatch (observed "${observed.variant}", candidate "${c.variant}")`);
  } else if ((observed.variant && !c.variant) || (!observed.variant && c.variant)) {
    // One side specifies a variant and the other doesn't — can't confirm they're the same SKU.
    isAmbiguous = true;
    reasons.push("Variant unconfirmed on one side of the match");
  }

  let confidenceScore = Math.max(0, Math.min(100, score));
  if (isAmbiguous) {
    confidenceScore = Math.min(confidenceScore, 59); // forced below the default min_confidence_score
  }

  return { productId: c.id, confidenceScore, isAmbiguous, reasons };
}

function normalizeCode(code: string): string {
  return code.replace(/\D/g, "").replace(/^0+/, "");
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeText(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}
