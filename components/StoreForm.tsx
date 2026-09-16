"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Retailer {
  id: string;
  name: string;
}

export default function StoreForm() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [retailerId, setRetailerId] = useState("");
  const [name, setName] = useState("");
  const [retailerStoreId, setRetailerStoreId] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("retailers")
      .select("id, name")
      .order("name")
      .then(({ data }) => setRetailers(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: insertError } = await supabase.from("stores").insert({
      retailer_id: retailerId,
      name,
      retailer_store_id: retailerStoreId || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
    });

    setSaving(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "A store with that number already exists for this retailer."
          : insertError.message
      );
      return;
    }

    router.push("/stores");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 max-w-xl">
      {error && (
        <div className="text-xs text-pass bg-pass/10 border border-pass/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-gray-100">Retailer</label>
        <select
          required
          value={retailerId}
          onChange={(e) => setRetailerId(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="" disabled>
            Select a retailer
          </option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {retailers.length === 0 && (
          <div className="text-xs text-muted mt-1">
            No retailers yet — a retailer needs to exist before you can add one of its stores.
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-100">Store name</label>
        <div className="text-xs text-muted mb-1">e.g. "Target #5678" or a street-based label</div>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-100">Store number (optional)</label>
        <div className="text-xs text-muted mb-1">
          The retailer's own store number, if you know it — helps auto-matching when a phone reports it
        </div>
        <input
          type="text"
          value={retailerStoreId}
          onChange={(e) => setRetailerStoreId(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-sm text-gray-100">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-100">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-100">ZIP</label>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add store"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/stores")}
          className="px-3 py-2 text-sm rounded-md bg-surface2 text-muted hover:text-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}