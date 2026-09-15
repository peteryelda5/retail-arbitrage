import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

export const revalidate = 0;

export default async function DevicesPage() {
  const supabase = createClient();
  const { data: devices } = await supabase
    .from("devices")
    .select("id, device_name, device_identifier, status, last_seen_at, app_version, retailers ( name ), stores ( name )")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Devices</h1>
        <p className="text-sm text-muted mt-1">Android collector phones in the field</p>
      </div>
      <DataTable
        columns={[
          { key: "device_name", label: "Device" },
          { key: "device_identifier", label: "Identifier" },
          { key: "retailer", label: "Retailer", render: (r) => r.retailers?.name ?? "—" },
          { key: "store", label: "Store", render: (r) => r.stores?.name ?? "—" },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <span className={`badge ${r.status === "active" ? "badge-buy" : "badge-pass"}`}>
                {r.status}
              </span>
            ),
          },
          {
            key: "last_seen_at",
            label: "Last seen",
            render: (r) => (r.last_seen_at ? new Date(r.last_seen_at).toLocaleString() : "Never"),
          },
        ]}
        rows={devices ?? []}
        emptyMessage="No devices registered yet. Insert a row into `devices` with a device_identifier to onboard your first phone."
      />
    </div>
  );
}
