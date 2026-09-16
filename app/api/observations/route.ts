// POST /api/observations
// Authenticated endpoint Android collector devices send price/inventory
// observations to. Uses the service-role Supabase client (bypasses RLS),
// since devices authenticate with a shared API key rather than Supabase Auth.
//
// Flow (per project spec):
// 1. authenticate the device
// 2. validate the payload
// 3. upsert the retailer/store/product
// 4. save the raw observation
// 5. match the UPC to Amazon (best-effort; matching against Amazon data
//    that hasn't been ingested yet is a no-op until an amazon_listings row exists)
// 6. update Amazon data (left to a separate Amazon-side sync job/route — stubbed here)
// 7. calculate profitability
// 8. create/update an opportunity

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateOpportunity, decideOpportunity, DEFAULT_THRESHOLDS } from "@/lib/opportunity-engine";
import { matchProduct } from "@/lib/matching-engine";
import { lookupByUpc } from "@/lib/keepa";
import { generateNarrative } from "@/lib/arbiter-narrative";

export const runtime = "nodejs";

const ObservationSchema = z.object({
  device_id: z.string().min(1),
  retailer: z.string().min(1),
  store_id: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  upc: z.string().min(1).optional(),
  ean: z.string().min(1).optional(),
  title: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  pack_quantity: z.number().int().positive().optional(),
  variant: z.string().optional(),
  price: z.number().nonnegative(),
  regular_price: z.number().nonnegative().optional(),
  inventory_quantity: z.number().int().nonnegative().optional(),
  availability: z
    .enum(["in_stock", "limited", "out_of_stock", "discontinued", "unknown"])
    .optional(),
  observed_at: z.string().datetime({ offset: true }).optional(),
});

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function POST(req: NextRequest) {
  // 1. Authenticate the device via shared bearer token.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  // Falls back to a generated default so this works without Vercel dashboard
  // configuration; override with your own DEVICE_INGEST_API_KEY env var any time.
  const expectedKey = process.env.DEVICE_INGEST_API_KEY || "BT4qWFV9hYvbS-t5HUw_0HGMbO1tvEnigtzmS_6AHPg";

  if (!token || token !== expectedKey) {
    return unauthorized();
  }

  // 2. Validate the payload.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ObservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const obs = parsed.data;
  const observedAt = obs.observed_at ?? new Date().toISOString();

  const supabase = createAdminClient();

  // Confirm the device is registered and active; update last_seen_at.
  const { data: device, error: deviceErr } = await supabase
    .from("devices")
    .select("id, retailer_id, assigned_store_id, status")
    .eq("device_identifier", obs.device_id)
    .maybeSingle();

  if (deviceErr) {
    return NextResponse.json({ error: deviceErr.message }, { status: 500 });
  }
  if (!device) {
    return NextResponse.json({ error: "Unknown device_id — register the device first" }, { status: 404 });
  }

  await supabase
    .from("devices")
    .update({ last_seen_at: observedAt })
    .eq("id", device.id);

  // 3a. Upsert retailer (by name).
  const { data: retailer, error: retailerErr } = await supabase
    .from("retailers")
    .upsert({ name: obs.retailer }, { onConflict: "name", ignoreDuplicates: false })
    .select("id")
    .single();
  if (retailerErr) {
    return NextResponse.json({ error: retailerErr.message }, { status: 500 });
  }

  // 3b. Upsert store (by retailer_id + retailer_store_id) if provided.
  let storeId: string | null = null;
  if (obs.store_id) {
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .upsert(
        {
          retailer_id: retailer.id,
          retailer_store_id: obs.store_id,
          name: `${obs.retailer} #${obs.store_id}`,
        },
        { onConflict: "retailer_id,retailer_store_id", ignoreDuplicates: false }
      )
      .select("id")
      .single();
    if (storeErr) {
      return NextResponse.json({ error: storeErr.message }, { status: 500 });
    }
    storeId = store.id;
  }

  // 3c. Upsert product — match by UPC first, else EAN, else create new.
  let productId: string | null = null;
  if (obs.upc || obs.ean) {
    const orFilters = [
      obs.upc ? `upc.eq.${obs.upc}` : null,
      obs.ean ? `ean.eq.${obs.ean}` : null,
    ]
      .filter(Boolean)
      .join(",");

    const { data: existingProducts } = await supabase
      .from("products")
      .select("id, upc, ean, title, brand, model, pack_quantity, variant")
      .or(orFilters)
      .limit(5);

    if (existingProducts && existingProducts.length > 0) {
      const match = matchProduct(
        {
          upc: obs.upc,
          ean: obs.ean,
          title: obs.title,
          brand: obs.brand,
          model: obs.model,
          packQuantity: obs.pack_quantity,
          variant: obs.variant,
        },
        existingProducts.map((p) => ({
          id: p.id,
          upc: p.upc,
          ean: p.ean,
          title: p.title,
          brand: p.brand,
          model: p.model,
          packQuantity: p.pack_quantity,
          variant: p.variant,
        }))
      );
      if (match) productId = match.productId;
    }
  }

  if (!productId) {
    const { data: newProduct, error: productErr } = await supabase
      .from("products")
      .insert({
        upc: obs.upc ?? null,
        ean: obs.ean ?? null,
        title: obs.title,
        brand: obs.brand ?? null,
        model: obs.model ?? null,
        pack_quantity: obs.pack_quantity ?? 1,
        variant: obs.variant ?? null,
      })
      .select("id")
      .single();
    if (productErr) {
      return NextResponse.json({ error: productErr.message }, { status: 500 });
    }
    productId = newProduct.id;
  }

  // 4. Save the raw observation (append-only log).
  const { error: obsErr } = await supabase.from("retail_observations").insert({
    device_id: device.id,
    retailer_id: retailer.id,
    store_id: storeId,
    product_id: productId,
    retailer_sku: obs.sku ?? null,
    observed_price: obs.price,
    regular_price: obs.regular_price ?? null,
    inventory_quantity: obs.inventory_quantity ?? null,
    availability_status: obs.availability ?? "unknown",
    raw_payload: obs,
    observed_at: observedAt,
  });
  if (obsErr) {
    return NextResponse.json({ error: obsErr.message }, { status: 500 });
  }

  // 3d. Upsert the current retailer_listing snapshot.
  const { data: listing, error: listingErr } = await supabase
    .from("retailer_listings")
    .upsert(
      {
        retailer_id: retailer.id,
        store_id: storeId,
        product_id: productId,
        retailer_sku: obs.sku ?? null,
        regular_price: obs.regular_price ?? null,
        current_price: obs.price,
        inventory_quantity: obs.inventory_quantity ?? null,
        availability_status: obs.availability ?? "unknown",
        last_observed_at: observedAt,
      },
      { onConflict: "retailer_id,store_id,retailer_sku", ignoreDuplicates: false }
    )
    .select("id")
    .single();
  if (listingErr) {
    return NextResponse.json({ error: listingErr.message }, { status: 500 });
  }

  // 5/6/7/8. If we already have Amazon data for this product, calculate
  // profitability and upsert an opportunity. If not, we still return success —
  // the product/observation is stored, ready for an Amazon-side sync job to
  // pick up and complete the loop (see Amazon sync route — not yet built).
  let { data: amazonListing } = await supabase
    .from("amazon_listings")
    .select("id, buy_box_price, amazon_price, fulfillment_type")
    .eq("product_id", productId)
    .maybeSingle();

  // No Amazon data yet for this product — try to pull it from Keepa now (best-effort;
  // a missing/failed lookup should never break the observation itself).
  if (!amazonListing && obs.upc) {
    const keepaResult = await lookupByUpc(obs.upc);
    if (keepaResult) {
      const { data: newListing, error: listingInsertErr } = await supabase
        .from("amazon_listings")
        .upsert(
          {
            product_id: productId,
            asin: keepaResult.asin,
            title: keepaResult.title,
            amazon_price: keepaResult.amazonPrice,
            buy_box_price: keepaResult.buyBoxPrice,
            fulfillment_type: "FBA",
          },
          { onConflict: "asin", ignoreDuplicates: false }
        )
        .select("id, buy_box_price, amazon_price, fulfillment_type")
        .single();

      if (!listingInsertErr && newListing) {
        amazonListing = newListing;

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
      }
    }
  }

  let opportunity = null;
  if (amazonListing) {
    const { data: latestSnapshot } = await supabase
      .from("amazon_snapshots")
      .select("*")
      .eq("amazon_listing_id", amazonListing.id)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: settingsRows } = await supabase.from("app_settings").select("key, value");
    const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));
    const thresholds = {
      minProfit: Number(settings.min_profit ?? DEFAULT_THRESHOLDS.minProfit),
      minRoiPercent: Number(settings.min_roi_percent ?? DEFAULT_THRESHOLDS.minRoiPercent),
      minMarginPercent: Number(settings.min_margin_percent ?? DEFAULT_THRESHOLDS.minMarginPercent),
      minConfidenceScore: Number(
        settings.min_confidence_score ?? DEFAULT_THRESHOLDS.minConfidenceScore
      ),
    };

    // Use the Conservative Expected Selling Price (min of 30/90/180-day medians)
    // rather than today's Buy Box, so a temporary price spike doesn't make a
    // bad deal look good. Falls back to the current price when no history exists.
    const amazonSalePrice =
      latestSnapshot?.conservative_price ??
      latestSnapshot?.buy_box_price ??
      amazonListing.buy_box_price ??
      amazonListing.amazon_price;

    if (amazonSalePrice) {
      const calc = calculateOpportunity({
        retailCost: obs.price,
        amazonSalePrice,
        fbaFee: latestSnapshot?.fba_fee ?? 0,
        inboundShippingEstimate: 0.75,
        prepCostEstimate: 0.5,
        storageFeeEstimate: latestSnapshot?.storage_fee_estimate ?? 0,
      });

      // Confidence here reflects listing-match confidence, not price confidence.
      // A full implementation stores the matching_engine result alongside the
      // product upsert above; defaulting to 90 for an existing exact-product match.
      const confidenceScore = 90;
      const decision = decideOpportunity(calc, confidenceScore, thresholds);

      const { data: oppRow, error: oppErr } = await supabase
        .from("opportunities")
        .upsert(
          {
            retailer_listing_id: listing.id,
            amazon_listing_id: amazonListing.id,
            retail_cost: obs.price,
            amazon_sale_price: amazonSalePrice,
            referral_fee: calc.referralFee,
            fba_fee: calc.fbaFee,
            inbound_shipping_estimate: calc.inboundShippingEstimate,
            prep_cost_estimate: calc.prepCostEstimate,
            tax_estimate: calc.taxEstimate,
            total_cost: calc.totalCost,
            estimated_profit: calc.estimatedProfit,
            roi_percent: calc.roiPercent,
            margin_percent: calc.marginPercent,
            confidence_score: confidenceScore,
            recommended_quantity: decision === "buy" ? Math.min(obs.inventory_quantity ?? 4, 10) : 0,
            status: decision === "buy" ? "buy" : decision === "watch" ? "watch" : "new",
            detected_at: observedAt,
          },
          { onConflict: "retailer_listing_id,amazon_listing_id", ignoreDuplicates: false }
        )
        .select("id, status, estimated_profit, roi_percent")
        .single();

      if (oppErr) {
        return NextResponse.json({ error: oppErr.message }, { status: 500 });
      }
      opportunity = oppRow;

      // Generate an AI narrative for BUY/WATCH opportunities only, to control
      // cost \u2014 a rejected/passed opportunity doesn't need an explanation.
      // Never blocks the response: a failed narrative just means no narrative.
      if (oppRow.status === "buy" || oppRow.status === "watch") {
        const narrative = await generateNarrative({
          productTitle: obs.title,
          retailer: obs.retailer,
          retailCost: obs.price,
          amazonSalePrice,
          estimatedProfit: calc.estimatedProfit,
          roiPercent: calc.roiPercent,
          marginPercent: calc.marginPercent,
          confidenceScore,
          recommendedQuantity: decision === "buy" ? Math.min(obs.inventory_quantity ?? 4, 10) : 0,
          status: oppRow.status,
        });

        if (narrative) {
          await supabase
            .from("opportunities")
            .update({ ai_narrative: narrative })
            .eq("id", oppRow.id);
        }
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      product_id: productId,
      retailer_listing_id: listing.id,
      opportunity,
    },
    { status: 201 }
  );
}
