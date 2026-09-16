import clsx from "clsx";
import OpportunityActions from "./OpportunityActions";
import NarrativeSection from "./NarrativeSection";

interface Narrative {
  whyLikes: string;
  whatCanGoWrong: string;
  whyQuantity: string;
}

export interface OpportunityCardData {
  id: string;
  retailer: string;
  retailerId: string | null;
  storeId: string | null;
  store: string | null;
  product: string;
  retailPrice: number;
  amazonPrice: number;
  netProfit: number;
  roiPercent: number;
  confidenceScore: number;
  recommendedQuantity: number;
  status: "new" | "watch" | "buy" | "approved" | "purchased" | "rejected" | "expired";
  aiNarrative: Narrative | null;
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  buy: { text: "BUY", className: "badge-buy" },
  approved: { text: "BUY", className: "badge-buy" },
  watch: { text: "WATCH", className: "badge-watch" },
  new: { text: "WATCH", className: "badge-watch" },
  rejected: { text: "PASS", className: "badge-pass" },
  expired: { text: "PASS", className: "badge-pass" },
  purchased: { text: "PURCHASED", className: "badge-buy" },
};

export default function OpportunityCard({ opp }: { opp: OpportunityCardData }) {
  const statusInfo = STATUS_LABEL[opp.status] ?? STATUS_LABEL.new;
  const isActionable = opp.status === "new" || opp.status === "watch" || opp.status === "buy";

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted">{opp.retailer}</span>
            {opp.store && <span className="text-xs text-muted">· {opp.store}</span>}
          </div>
          <div className="text-sm font-medium text-gray-100 truncate">{opp.product}</div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
            <span>Retail ${opp.retailPrice.toFixed(2)}</span>
            <span>→</span>
            <span>Amazon ${opp.amazonPrice.toFixed(2)}</span>
            <span>Confidence {opp.confidenceScore.toFixed(0)}%</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-semibold text-buy">
            +${opp.netProfit.toFixed(2)}
          </div>
          <div className="text-xs text-muted">{opp.roiPercent.toFixed(0)}% ROI</div>
        </div>

        <div className="text-right shrink-0 w-28">
          <span className={clsx("badge", statusInfo.className)}>{statusInfo.text}</span>
          {opp.recommendedQuantity > 0 && (
            <div className="text-xs text-muted mt-1">Buy {opp.recommendedQuantity}</div>
          )}
        </div>
      </div>

      {opp.aiNarrative && <NarrativeSection narrative={opp.aiNarrative} />}

      {isActionable && (
        <OpportunityActions
          opportunityId={opp.id}
          retailerId={opp.retailerId}
          storeId={opp.storeId}
          unitCost={opp.retailPrice}
          recommendedQuantity={opp.recommendedQuantity}
        />
      )}
    </div>
  );
}
