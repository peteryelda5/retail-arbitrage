"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  opportunityId: string;
  retailerId: string | null;
  storeId: string | null;
  unitCost: number;
  recommendedQuantity: number;
}

export default function OpportunityActions({
  opportunityId,
  retailerId,
  storeId,
  unitCost,
  recommendedQuantity,
}: Props) {
  const [mode, setMode] = useState<"idle" | "confirming" | "saving">("idle");
  const [quantity, setQuantity] = useState(recommendedQuantity > 0 ? recommendedQuantity : 1);
  const [cost, setCost] = useState(unitCost);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleConfirmPurchase() {
    if (!retailerId) {
      setError("This opportunity has no retailer on file \u2014 can't log a purchase for it.");
      return;
    }

    setMode("saving");
    setError(null);

    const { error: purchaseErr } = await supabase.from("purchases").insert({
      opportunity_id: opportunityId,
      retailer_id: retailerId,
      store_id: storeId,
      quantity,
      unit_cost: cost,
      total_cost: Math.round(quantity * cost * 100) / 100,
      purchase_method: "in_store",
      status: "ordered",
    });

    if (purchaseErr) {
      setError(purchaseErr.message);
      setMode("confirming");
      return;
    }

    const { error: updateErr } = await supabase
      .from("opportunities")
      .update({ status: "purchased" })
      .eq("id", opportunityId);

    if (updateErr) {
      setError(updateErr.message);
      setMode("confirming");
      return;
    }

    router.refresh();
  }

  async function handlePass() {
    setMode("saving");
    setError(null);

    const { error: updateErr } = await supabase
      .from("opportunities")
      .update({ status: "rejected" })
      .eq("id", opportunityId);

    if (updateErr) {
      setError(updateErr.message);
      setMode("idle");
      return;
    }

    router.refresh();
  }

  if (mode === "confirming") {
    return (
      <div className="mt-2 flex items-center gap-2 flex-wrap justify-end">
        {error && <div className="text-xs text-pass w-full text-right">{error}</div>}
        <label className="text-xs text-muted">Qty</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-16 bg-surface2 border border-border rounded-md px-2 py-1 text-xs text-gray-100"
        />
        <label className="text-xs text-muted">Unit cost $</label>
        <input
          type="number"
          step="0.01"
          min={0}
          value={cost}
          onChange={(e) => setCost(Math.max(0, Number(e.target.value)))}
          className="w-20 bg-surface2 border border-border rounded-md px-2 py-1 text-xs text-gray-100"
        />
        <button
          onClick={handleConfirmPurchase}
          className="px-2 py-1 text-xs rounded-md bg-buy text-white hover:bg-buy/90"
        >
          Confirm Purchase
        </button>
        <button
          onClick={() => setMode("idle")}
          className="px-2 py-1 text-xs rounded-md bg-surface2 text-muted hover:text-gray-100"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 justify-end">
      <button
        onClick={() => setMode("confirming")}
        disabled={mode === "saving"}
        className="px-2 py-1 text-xs rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={handlePass}
        disabled={mode === "saving"}
        className="px-2 py-1 text-xs rounded-md bg-surface2 text-muted hover:text-pass disabled:opacity-50"
      >
        Pass
      </button>
    </div>
  );
}
