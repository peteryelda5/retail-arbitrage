"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Retailer {
  id: string;
  name: string;
}

export default function DeviceForm() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [deviceIdentifier, setDeviceIdentifier] = useState("");
  const [retailerId, setRetailerId] = useState("");
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

    const { error: insertError } = await supabase.from("devices").insert({
      device_name: deviceName,
      device_identifier: deviceIdentifier,
      retailer_id: retailerId || null,
      status: "active",
    });

    setSaving(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "A device with that identifier already exists — pick a unique one."
          : insertError.message
      );
      return;
    }

    router.push("/devices");
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
        <label className="text-sm text-gray-100">Device name</label>
        <div className="text-xs text-muted mb-1">
          Something readable for you, e.g. "Pixel 7 — Store A"
        </div>
        <input
          type="text"
          required
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-100">Device identifier</label>
        <div className="text-xs text-muted mb-1">
          A unique code you choose, e.g. "phone-001" — the phone sends this exact value with every scan
        </div>
        <input
          type="text"
          required
          value={deviceIdentifier}
          onChange={(e) => setDeviceIdentifier(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-gray-100">Assigned retailer (optional)</label>
        <div className="text-xs text-muted mb-1">
          Leave blank if this device scans multiple retailers
        </div>
        <select
          value={retailerId}
          onChange={(e) => setRetailerId(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">None</option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {retailers.length === 0 && (
          <div className="text-xs text-muted mt-1">
            No retailers yet — they're created automatically once a device sends its first scan for that retailer.
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Register device"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/devices")}
          className="px-3 py-2 text-sm rounded-md bg-surface2 text-muted hover:text-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}