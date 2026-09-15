import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

export const revalidate = 0;

export default async function RetailersPage() {
  const supabase = createClient();
  const { data: retailers } = await supabase
    .from("retailers")
    .select("id, name, website, app_name, active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Retailers</h1>
        <p className="text-sm text-muted mt-1">Retailers being scanned for arbitrage opportunities</p>
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "website", label: "Website" },
          { key: "app_name", label: "App" },
          {
            key: "active",
            label: "Status",
            render: (r) => (
              <span className={`badge ${r.active ? "badge-buy" : "badge-pass"}`}>
                {r.active ? "Active" : "Inactive"}
              </span>
            ),
          },
        ]}
        rows={retailers ?? []}
        emptyMessage="No retailers yet — the ingestion API creates these automatically as devices report observations."
      />
    </div>
  );
}
