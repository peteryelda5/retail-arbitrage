// Keepa API client — looks up Amazon listing data (price, fees, sales rank) by UPC.
// Docs: https://keepa.com/api-docs/
//
// Requires KEEPA_API_KEY (server-only env var, no default — this is a real, billed
// secret tied to your Keepa subscription, unlike the other keys baked into this app).
// Get a key at https://keepa.com/#!api

const KEEPA_BASE_URL = "https://api.keepa.com";
const AMAZON_COM_DOMAIN_ID = 1;

export interface KeepaLookupResult {
  asin: string;
  title: string | null;
  amazonPrice: number | null; // dollars — Amazon's own current price
  buyBoxPrice: number | null; // dollars — current Buy Box price
  conservativePrice: number | null; // dollars — min(30/90/180-day median), used for profit calc
  priceHistory: {
    avg30: number | null;
    avg90: number | null;
    avg180: number | null;
  };
  salesRank: number | null;
  offerCount: number | null;
  fbaPickAndPackFee: number | null; // dollars
  fbaStorageFee: number | null; // dollars
  raw: unknown; // full Keepa product object, kept for debugging/refinement
}

/**
 * Looks up a product on Amazon.com by UPC via Keepa.
 * Returns null if Keepa has no product for that code, or on any API error
 * (never throws — a missing Amazon match should not break the ingestion pipeline).
 */
export async function lookupByUpc(upc: string): Promise<KeepaLookupResult | null> {
  const apiKey = process.env.KEEPA_API_KEY;
  if (!apiKey) {
    console.error("KEEPA_API_KEY is not set — skipping Amazon lookup");
    return null;
  }

  const url = new URL(`${KEEPA_BASE_URL}/product`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("domain", String(AMAZON_COM_DOMAIN_ID));
  url.searchParams.set("code", upc);
  url.searchParams.set("stats", "180"); // ask Keepa for up to 180 days of stats

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: "GET" });
  } catch (err) {
    console.error("Keepa request failed:", err);
    return null;
  }

  if (!res.ok) {
    console.error(`Keepa API returned ${res.status}`);
    return null;
  }

  const data = await res.json();
  const product = data?.products?.[0];
  if (!product || !product.asin) return null;

  // Prices from Keepa are in cents, with -1 meaning "no current offer".
  const cents = (n: unknown): number | null =>
    typeof n === "number" && n >= 0 ? n / 100 : null;

  const stats = product.stats ?? {};
  // stats.current is an array; index 0 = Amazon price, index 1 = New (3rd-party) price.
  // Keepa also exposes a buyBoxPrice shortcut on stats when available.
  const amazonPrice = cents(stats.current?.[0]);
  const buyBoxPrice = cents(stats.buyBoxPrice ?? stats.current?.[1] ?? stats.current?.[0]);

  // stats.avg30 / avg90 / avg180 mirror stats.current's index layout when Keepa
  // is asked for historical stats (the "stats=180" param above). We approximate
  // the historical Buy Box the same way we approximate the current one: prefer
  // the New/3rd-party average, fall back to the Amazon average.
  const avg30 = cents(stats.avg30?.[1] ?? stats.avg30?.[0]);
  const avg90 = cents(stats.avg90?.[1] ?? stats.avg90?.[0]);
  const avg180 = cents(stats.avg180?.[1] ?? stats.avg180?.[0]);

  // Conservative Expected Selling Price (Arbiter spec section XIII):
  // min(30-day median, 90-day median, 180-day median), falling back to
  // whatever history is actually available, and finally to the current
  // price if there's no history at all (e.g. a brand-new listing).
  const historyValues = [avg30, avg90, avg180].filter(
    (v): v is number => v !== null
  );
  const conservativePrice =
    historyValues.length > 0
      ? Math.min(...historyValues)
      : buyBoxPrice ?? amazonPrice;

  const fbaFees = product.fbaFees ?? {};

  return {
    asin: product.asin,
    title: product.title ?? null,
    amazonPrice,
    buyBoxPrice,
    conservativePrice,
    priceHistory: { avg30, avg90, avg180 },
    salesRank: typeof stats.current?.[3] === "number" && stats.current[3] >= 0 ? stats.current[3] : null,
    offerCount: typeof stats.offerCountFBA === "number" ? stats.offerCountFBA : null,
    fbaPickAndPackFee: cents(fbaFees.pickAndPackFee),
    fbaStorageFee: cents(fbaFees.storageFee),
    raw: product,
  };
}
