import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import OpportunityCard, { OpportunityCardData } from "@/components/OpportunityCard";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: opportunitiesToday },
    { data: allOpenOpportunities },
    { count: activeDevices },
    { count: productsScanned },
    { data: recentOpportunities },
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .gte("detected_at", startOfToday.toISOString()),
    supabase
      .from("opportunities")
      .select("estimated_profit, roi_percent, recommended_quantity")
      .in("status", ["new", "watch", "buy", "approved"]),
    supabase.from("devices").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("opportunities")
      .select(
        `id, status, estimated_profit, roi_percent, confidence_score, recommended_quantity,
         retailer_listings ( current_price, retailers ( name ), stores ( name ), products ( title ) ),
         amazon_listings ( amazon_price, buy_box_price )`
      )
      .order("detected_at", { ascending: false })
      .limit(8),
  ]);

  const totalPotentialProfit =
    allOpenOpportunities?.reduce((sum, o) => sum + (o.estimated_profit ?? 0), 0) ?? 0;
  const avgRoi =
    allOpenOpportunities && allOpenOpportunities.length > 0
      ? allOpenOpportunities.reduce((sum, o) => sum + (o.roi_percent ?? 0), 0) /
        allOpenOpportunities.length
      : 0;
  const unitsRecommended =
    allOpenOpportunities?.reduce((sum, o) => sum + (o.recommended_quantity ?? 0), 0) ?? 0;

  const cards: OpportunityCardData[] = (recentOpportunities ?? []).map((o: any) => ({
    id: o.id,
    retailer: o.retailer_listings?.retailers?.name ?? "Unknown retailer",
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Retailer-to-FBA opportunity overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Opportunities today" value={String(opportunitiesToday ?? 0)} />
        <StatCard label="Potential profit" value={`$${totalPotentialProfit.toFixed(0)}`} />
        <StatCard label="Average ROI" value={`${avgRoi.toFixed(0)}%`} />
        <StatCard label="Units recommended" value={String(unitsRecommended)} />
        <StatCard label="Active phones" value={String(activeDevices ?? 0)} />
        <StatCard label="Products scanned" value={String(productsScanned ?? 0)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-100 mb-3">Recent opportunities</h2>
        <div className="space-y-3">
          {cards.length === 0 && (
            <div className="card text-sm text-muted">
              No opportunities yet — once a device posts an observation for a product that
              also has Amazon listing data, opportunities will appear here.
            </div>
          )}
          {cards.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
        </div>
      </div>
    </div>
  );
}
