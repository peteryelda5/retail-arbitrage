import { createClient } from "@/lib/supabase/server";
import OpportunityCard, { OpportunityCardData } from "@/components/OpportunityCard";

export const revalidate = 0;

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const statusFilter = searchParams.status;

  let query = supabase
    .from("opportunities")
    .select(
      `id, status, estimated_profit, roi_percent, confidence_score, recommended_quantity,
       retailer_listings ( current_price, retailer_id, store_id, retailers ( name ), stores ( name ), products ( title ) ),
       amazon_listings ( amazon_price, buy_box_price )`
    )
    .order("detected_at", { ascending: false })
    .limit(100);

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: opportunities } = await query;

  const cards: OpportunityCardData[] = (opportunities ?? []).map((o: any) => ({
    id: o.id,
    retailer: o.retailer_listings?.retailers?.name ?? "Unknown retailer",
    retailerId: o.retailer_listings?.retailer_id ?? null,
    storeId: o.retailer_listings?.store_id ?? null,
    store: o.retailer_listings?.stores?.name ?? null,
    product: o.retailer_listings?.products?.title ?? "Unknown product",
    retailPrice: o.retailer_listings?.current_price ?? 0,
    amazonPrice: o.amazon_listings?.buy_box_price ?? o.amazon_listings?.amazon_price ?? 0,
    netProfit: o.estimated_profit ?? 0,
    roiPercent: o.roi_percent ?? 0,
    confidenceScore: o.confidence_score ?? 0,
    recommendedQuantity: o.recommended_quantity ?? 0,
    status: o.status,
  }));

  const filters = [
    { key: undefined, label: "All" },
    { key: "buy", label: "Buy" },
    { key: "watch", label: "Watch" },
    { key: "new", label: "New" },
    { key: "approved", label: "Approved" },
    { key: "purchased", label: "Purchased" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Opportunities</h1>
        <p className="text-sm text-muted mt-1">All detected retail-to-Amazon opportunities</p>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
     <a     
            key={f.label}
            href={f.key ? `/opportunities?status=${f.key}` : "/opportunities"}
            className={`badge ${
              statusFilter === f.key ? "bg-accent/20 text-accent" : "bg-surface2 text-muted"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {cards.length === 0 && <div className="card text-sm text-muted">No opportunities found.</div>}
        {cards.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>
    </div>
  );
}
