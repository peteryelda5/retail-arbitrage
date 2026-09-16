import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

export const revalidate = 0;

export default async function StoresPage() {
  const supabase = createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, city, state, zip, retailers ( name )")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Stores</h1>
          <p className="text-sm text-muted mt-1">Individual store locations tracked per retailer</p>
        </div>
        <Link
          href="/stores/new"
          className="px-3 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent/90"
        >
          + Add Store
        </Link>
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Store" },
          { key: "retailer", label: "Retailer", render: (r) => r.retailers?.name ?? "—" },
          { key: "city", label: "City" },
          { key: "state", label: "State" },
          { key: "zip", label: "ZIP" },
        ]}
        rows={stores ?? []}
        emptyMessage="No stores yet. Click 'Add Store' above to register your first location."
      />
    </div>
  );
}
