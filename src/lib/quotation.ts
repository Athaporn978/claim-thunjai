// Shared types + helpers for the repair-quotation feature.

export type ItemType = "labor" | "part";

export type QuotationPhoto = { url: string; caption?: string };

export type QuotationItemInput = {
  id?: string;
  type: ItemType;
  name: string;
  quotedUnit: number;
  quotedQty: number;
  controlledUnit: number;
  controlledQty: number;
  standardPrice?: number | null;
  agreeWithStandard?: boolean;
  note?: string | null;
  sortOrder?: number;
};

export type QuotationInput = {
  id?: string;
  quotationNo?: string;
  status?: string;
  // customer
  customerName?: string | null;
  licensePlate?: string | null;
  vehicleCategory?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  chassisNo?: string | null;
  color?: string | null;
  mileage?: number | null;
  // insurance
  insurerName?: string | null;
  claimNo?: string | null;
  insVehicleType?: string | null;
  policyNo?: string | null;
  policyType?: string | null;
  sumInsured?: number | null;
  coverageStart?: string | null;
  coverageEnd?: string | null;
  deductible?: number | null;
  // center
  centerName?: string | null;
  centerAddress?: string | null;
  centerContact?: string | null;
  // discount & vat
  discountPercent?: number;
  discountAmount?: number;
  includeVat?: boolean;
  // ctx
  vehicleSize?: string;
  photos?: QuotationPhoto[];
  items: QuotationItemInput[];
};

export const lineQuoted = (i: { quotedUnit: number; quotedQty: number }) =>
  (Number(i.quotedUnit) || 0) * (Number(i.quotedQty) || 0);
export const lineControlled = (i: { controlledUnit: number; controlledQty: number }) =>
  (Number(i.controlledUnit) || 0) * (Number(i.controlledQty) || 0);
export const lineSaving = (i: {
  quotedUnit: number; quotedQty: number; controlledUnit: number; controlledQty: number;
}) => lineQuoted(i) - lineControlled(i);

export function totals(items: QuotationItemInput[]) {
  const totalQuoted = items.reduce((s, i) => s + lineQuoted(i), 0);
  const totalControlled = items.reduce((s, i) => s + lineControlled(i), 0);
  const totalSaving = totalQuoted - totalControlled;
  const savingPct = totalQuoted > 0 ? (totalSaving / totalQuoted) * 100 : 0;
  return { totalQuoted, totalControlled, totalSaving, savingPct };
}

export function sectionTotals(items: QuotationItemInput[], type: ItemType) {
  return totals(items.filter((i) => i.type === type));
}

export const fmtBaht = (n: number, lang: "th" | "en" = "th") =>
  (Number(n) || 0).toLocaleString(lang === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function genQuotationNo() {
  const y = new Date().getFullYear();
  const rand = String(Date.now()).slice(-5);
  return `QT-${y}-${rand}`;
}
