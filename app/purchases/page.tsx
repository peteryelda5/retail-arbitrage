import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

export const revalidate = 0;

export default async function PurchasesPage() {
  const supabase = createClient();
  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, quantity, unit_cost, total_cost, status, purchase_method, purchased_at, retailers ( name ), stores ( name )")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Purchases</h1>
        <p className="text-sm text-muted mt-1">
          Human-approved purchases made against detected opportunities
        </p>
      </div>
      <DataTable
        columns={[
          { key: "retailer", label: "Retailer", render: (r) => r.retailers?.name ?? "—" },
          { key: "store", label: "Store", render: (r) => r.stores?.name ?? "—" },
          { key: "quantity", label: "Qty" },
          { key: "unit_cost", label: "Unit cost", render: (r) => `$${Number(r.unit_cost).toFixed(2)}` },
          { key: "total_cost", label: "Total", render: (r) => `$${Number(r.total_cost).toFixed(2)}` },
          { key: "purchase_method", label: "Method" },
          {
            key: "status",
            label: "Status",
            render: (r) => <span className="badge bg-surface2 text-muted">{r.status}</span>,
          },
        ]}
        rows={purchases ?? []}
        emptyMessage="No purchases yet. Purchases are created from an approved opportunity — always with human sign-off for now."
      />
    </div>
  );
}
