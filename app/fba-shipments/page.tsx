import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

export const revalidate = 0;

export default async function FbaShipmentsPage() {
  const supabase = createClient();
  const { data: shipments } = await supabase
    .from("fba_shipments")
    .select("id, amazon_shipment_id, status, units, shipping_cost, tracking_number, shipped_at, received_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">FBA Shipments</h1>
        <p className="text-sm text-muted mt-1">Shipments of prepped inventory into Amazon FBA</p>
      </div>
      <DataTable
        columns={[
          { key: "amazon_shipment_id", label: "Amazon Shipment ID" },
          {
            key: "status",
            label: "Status",
            render: (r) => <span className="badge bg-surface2 text-muted">{r.status}</span>,
          },
          { key: "units", label: "Units" },
          {
            key: "shipping_cost",
            label: "Shipping cost",
            render: (r) => (r.shipping_cost != null ? `$${Number(r.shipping_cost).toFixed(2)}` : "—"),
          },
          { key: "tracking_number", label: "Tracking #" },
        ]}
        rows={shipments ?? []}
        emptyMessage="No FBA shipments yet."
      />
    </div>
  );
}
