"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Setting {
  key: string;
  value: number;
  description: string | null;
}

const LABELS: Record<string, string> = {
  min_profit: "Minimum profit ($)",
  min_roi_percent: "Minimum ROI (%)",
  min_margin_percent: "Minimum margin (%)",
  min_confidence_score: "Minimum confidence score (0–100)",
};

export default function SettingsForm({ initialSettings }: { initialSettings: Setting[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  async function save(key: string, value: number) {
    setSaving(key);
    await supabase.from("app_settings").update({ value }).eq("key", key);
    setSaving(null);
  }

  return (
    <div className="card space-y-5 max-w-xl">
      {settings.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-100">{LABELS[s.key] ?? s.key}</div>
            {s.description && <div className="text-xs text-muted mt-0.5">{s.description}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              value={s.value}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSettings((prev) => prev.map((p) => (p.key === s.key ? { ...p, value } : p)));
              }}
              className="w-24 bg-surface2 border border-border rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => save(s.key, s.value)}
              disabled={saving === s.key}
              className="px-3 py-1.5 text-sm rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {saving === s.key ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
