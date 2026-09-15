// Core profitability math for the Opportunity Engine.
// Kept pure/framework-free so it's trivially unit-testable and reusable
// from the ingestion API, a cron/refresh job, or the dashboard.

export interface OpportunityInputs {
  retailCost: number; // acquisition cost per unit
  amazonSalePrice: number; // current buy box / expected sale price
  referralFeePercent?: number; // Amazon category referral fee, e.g. 0.15 for 15%
  fbaFee: number; // flat FBA fulfillment fee for this size/weight tier
  inboundShippingEstimate?: number; // per-unit estimate to ship retail->Amazon
  prepCostEstimate?: number; // per-unit poly-bagging/labeling/prep
  storageFeeEstimate?: number; // per-unit monthly storage estimate
  taxRatePercent?: number; // sales tax paid at acquisition, e.g. 0.06 for 6%
}

export interface OpportunityResult {
  referralFee: number;
  fbaFee: number;
  inboundShippingEstimate: number;
  prepCostEstimate: number;
  storageFeeEstimate: number;
  taxEstimate: number;
  totalCost: number;
  estimatedProfit: number;
  roiPercent: number;
  marginPercent: number;
}

export function calculateOpportunity(inputs: OpportunityInputs): OpportunityResult {
  const {
    retailCost,
    amazonSalePrice,
    referralFeePercent = 0.15,
    fbaFee,
    inboundShippingEstimate = 0,
    prepCostEstimate = 0,
    storageFeeEstimate = 0,
    taxRatePercent = 0,
  } = inputs;

  const referralFee = round2(amazonSalePrice * referralFeePercent);
  const taxEstimate = round2(retailCost * taxRatePercent);

  const totalCost = round2(
    retailCost +
      referralFee +
      fbaFee +
      inboundShippingEstimate +
      prepCostEstimate +
      storageFeeEstimate +
      taxEstimate
  );

  const estimatedProfit = round2(amazonSalePrice - totalCost);
  const roiPercent = retailCost > 0 ? round2((estimatedProfit / retailCost) * 100) : 0;
  const marginPercent =
    amazonSalePrice > 0 ? round2((estimatedProfit / amazonSalePrice) * 100) : 0;

  return {
    referralFee,
    fbaFee: round2(fbaFee),
    inboundShippingEstimate: round2(inboundShippingEstimate),
    prepCostEstimate: round2(prepCostEstimate),
    storageFeeEstimate: round2(storageFeeEstimate),
    taxEstimate,
    totalCost,
    estimatedProfit,
    roiPercent,
    marginPercent,
  };
}

export interface OpportunityThresholds {
  minProfit: number;
  minRoiPercent: number;
  minMarginPercent: number;
  minConfidenceScore: number;
}

export const DEFAULT_THRESHOLDS: OpportunityThresholds = {
  minProfit: 8,
  minRoiPercent: 30,
  minMarginPercent: 15,
  minConfidenceScore: 80,
};

export type OpportunityDecision = "buy" | "watch" | "pass";

// Decides BUY / WATCH / PASS from a calculated result + match confidence,
// against the current (editable) thresholds from app_settings.
export function decideOpportunity(
  result: OpportunityResult,
  confidenceScore: number,
  thresholds: OpportunityThresholds = DEFAULT_THRESHOLDS
): OpportunityDecision {
  const meetsProfit = result.estimatedProfit >= thresholds.minProfit;
  const meetsRoi = result.roiPercent >= thresholds.minRoiPercent;
  const meetsMargin = result.marginPercent >= thresholds.minMarginPercent;
  const meetsConfidence = confidenceScore >= thresholds.minConfidenceScore;

  if (meetsProfit && meetsRoi && meetsMargin && meetsConfidence) return "buy";

  // Close-but-not-quite: still profitable and reasonably confident -> watch it.
  if (result.estimatedProfit > 0 && confidenceScore >= 60) return "watch";

  return "pass";
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
