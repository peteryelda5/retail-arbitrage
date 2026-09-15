import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

export const revalidate = 0;

export default async function InventoryPage() {
  const supabase = createClient();
  const { data: inventory } = await supabase
    .from("inventory")
    .select("id, quantity, unit_cost, status, actual_sale_price, actual_profit, products ( title )")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Inventory</h1>
        <p className="text-sm text-muted mt-1">
          Purchased units tracked from acquisition through Amazon sale
        </p>
      </div>
      <DataTable
        columns={[
          { key: "product", label: "Product", render: (r) => r.products?.title ?? "—" },
          { key: "quantity", label: "Qty" },
          { key: "unit_cost", label: "Unit cost", render: (r) => `$${Number(r.unit_cost ?? 0).toFixed(2)}` },
          {
            key: "status",
            label: "Status",
            render: (r) => <span className="badge bg-surface2 text-muted">{r.status}</span>,
          },
          {
            key: "actual_profit",
            label: "Actual profit",
            render: (r) => (r.actual_profit != null ? `$${Number(r.actual_profit).toFixed(2)}` : "—"),
          },
        ]}
        rows={inventory ?? []}
        emptyMessage="No inventory yet — this fills in once purchases move into prep/shipping."
      />
    </div>
  );
}
