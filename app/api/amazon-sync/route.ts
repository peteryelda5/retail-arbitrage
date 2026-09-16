// POST /api/amazon-sync
// Backfills amazon_listings/amazon_snapshots for products that already exist
// (have a UPC) but don't have Amazon data yet — e.g. products scanned before
// Keepa was wired in, or products whose lookup failed the first time.
//
// This is separate from the automatic per-scan lookup in /api/observations,
// which handles new scans going forward. Call this endpoint manually (or on
// a schedule) to catch up on anything that slipped through.
//
// Capped to a small batch per call to stay well within serverless function
// time limits and Keepa's rate limits — call it again to keep working through
// the backlog if `remaining` in the response is > 0.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lookupByUpc } from "@/lib/keepa";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 15;
const DELAY_BETWEEN_CALLS_MS = 1200; // stay under Keepa's per-minute rate limit

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const expectedKey = process.env.DEVICE_INGEST_API_KEY || "BT4qWFV9hYvbS-t5HUw_0HGMbO1tvEnigtzmS_6AHPg";

  if (!token || token !== expectedKey) {
    return unauthorized();
  }

  if (!process.env.KEEPA_API_KEY) {
    return NextResponse.json(
      { error: "KEEPA_API_KEY is not set — add it in Vercel: Settings -> Environment Variables" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  // Products with a UPC that have no row in amazon_listings yet.
  const { data: candidates, error: candidatesErr } = await supabase
    .from("products")
    .select("id, upc")
    .not("upc", "is", null)
    .limit(500); // pull a working set; we filter out already-synced ones below

  if (candidatesErr) {
    return NextResponse.json({ error: candidatesErr.message }, { status: 500 });
  }

  const { data: existingListings } = await supabase
    .from("amazon_listings")
    .select("product_id");
  const alreadySynced = new Set((existingListings ?? []).map((l) => l.product_id));

  const toSync = (candidates ?? []).filter((p) => !alreadySynced.has(p.id)).slice(0, BATCH_SIZE);

  const results = {
    processed: 0,
    matched: 0,
    notFound: 0,
    errors: [] as string[],
    remaining: (candidates ?? []).filter((p) => !alreadySynced.has(p.id)).length - toSync.length,
  };

  for (const product of toSync) {
    if (!product.upc) continue;
    results.processed++;

    try {
      const keepaResult = await lookupByUpc(product.upc);

      if (!keepaResult) {
        results.notFound++;
        await sleep(DELAY_BETWEEN_CALLS_MS);
        continue;
      }

      const { data: newListing, error: listingErr } = await supabase
        .from("amazon_listings")
        .upsert(
          {
            product_id: product.id,
            asin: keepaResult.asin,
            title: keepaResult.title,
            amazon_price: keepaResult.amazonPrice,
            buy_box_price: keepaResult.buyBoxPrice,
            fulfillment_type: "FBA",
          },
          { onConflict: "asin", ignoreDuplicates: false }
        )
        .select("id")
        .single();

      if (listingErr || !newListing) {
        results.errors.push(`${product.upc}: ${listingErr?.message ?? "unknown error"}`);
        await sleep(DELAY_BETWEEN_CALLS_MS);
        continue;
      }

      await supabase.from("amazon_snapshots").insert({
        amazon_listing_id: newListing.id,
        buy_box_price: keepaResult.buyBoxPrice,
        conservative_price: keepaResult.conservativePrice,
        sales_rank: keepaResult.salesRank,
        offer_count: keepaResult.offerCount,
        fba_fee:
          (keepaResult.fbaPickAndPackFee ?? 0) + (keepaResult.fbaStorageFee ?? 0) || null,
        storage_fee_estimate: keepaResult.fbaStorageFee,
        raw_payload: keepaResult.raw,
      });

      results.matched++;
    } catch (err) {
      results.errors.push(`${product.upc}: ${err instanceof Error ? err.message : "unknown error"}`);
    }

    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  return NextResponse.json(results);
}
