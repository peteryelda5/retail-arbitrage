import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value, description")
    .order("key");

  const parsed = (settings ?? []).map((s) => ({
    key: s.key,
    value: Number(s.value),
    description: s.description,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Opportunity-engine thresholds — editable, not hard-coded
        </p>
      </div>
      <SettingsForm initialSettings={parsed} />
    </div>
  );
}
