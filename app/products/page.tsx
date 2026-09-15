import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

export const revalidate = 0;

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, brand, upc, category, pack_quantity")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Products</h1>
        <p className="text-sm text-muted mt-1">Matched product catalog (UPC/EAN-keyed)</p>
      </div>
      <DataTable
        columns={[
          { key: "title", label: "Title" },
          { key: "brand", label: "Brand" },
          { key: "upc", label: "UPC" },
          { key: "category", label: "Category" },
          { key: "pack_quantity", label: "Pack Qty" },
        ]}
        rows={products ?? []}
        emptyMessage="No products yet."
      />
    </div>
  );
}
