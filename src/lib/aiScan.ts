import { BRANDS } from "@/lib/carCatalog";
import { compressImageToBase64 } from "@/lib/imageCompress";
import type { QuotationInput, QuotationItemInput, QuotationPhoto, ItemType } from "@/lib/quotation";

/** Cases per scan run. One slot may hold several files (pages of one quote). */
export const MAX_SCAN_CASES = 5;

export type ScanPayload = { data: string; mediaType: string; name: string };

export async function fileToScanPayload(file: File): Promise<ScanPayload> {
  // Images are resized/re-encoded client-side before ever becoming base64 —
  // uncompressed phone photos (3-8MB each) were blowing past the request
  // body-size cap once a case had several of them, silently corrupting the
  // save. PDFs pass through untouched (can't canvas-compress a PDF).
  if (file.type.startsWith("image/")) {
    const { data, mediaType } = await compressImageToBase64(file);
    return { data, mediaType, name: file.name };
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(",")[1] || res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return {
    data: base64,
    mediaType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
    name: file.name,
  };
}

/** Maps one extraction result onto the quotation form shape. */
export function buildFormFromExtraction(meta: any, items: any[], files: ScanPayload[]): QuotationInput {
  let matchedBrandName = meta.vehicleBrand || "";
  let matchedModelName = meta.vehicleModel || "";
  let category = "sedan_asia";
  let size = "B";

  if (matchedBrandName) {
    const brandObj = BRANDS.find(
      (b) =>
        b.name.toLowerCase().includes((matchedBrandName || "").toLowerCase()) ||
        (matchedBrandName || "").toLowerCase().includes(b.name.toLowerCase())
    );
    if (brandObj) {
      matchedBrandName = brandObj.name;
      const modelObj = brandObj.models.find(
        (m) =>
          m.name.toLowerCase().includes((matchedModelName || "").toLowerCase()) ||
          (matchedModelName || "").toLowerCase().includes(m.name.toLowerCase())
      );
      if (modelObj) {
        matchedModelName = modelObj.name;
        category = modelObj.vehicleType || category;
        size = modelObj.size || size;
      } else if (brandObj.models.length > 0) {
        matchedModelName = brandObj.models[0].name;
        category = brandObj.models[0].vehicleType || category;
        size = brandObj.models[0].size || size;
      }
    }
  }

  const photos: QuotationPhoto[] = files
    .filter((f) => f.mediaType.startsWith("image/"))
    .map((f) => ({
      url: `data:${f.mediaType};base64,${f.data}`,
      caption: `ใบเสนอราคา (${f.name})`,
    }));

  const formattedItems: QuotationItemInput[] = items.map((i: any, index: number) => {
    const quoted = Number(i.unitPrice) || 0;
    const std = i.standardPrice != null ? Number(i.standardPrice) : null;
    // std === 0 means "no standard price found" (see extract-quote/route.ts),
    // not a genuine zero price — must not be treated as cheaper than quoted,
    // or the controlled price would incorrectly collapse to ฿0.
    const controlled = (std != null && std > 0 && std < quoted) ? std : quoted;
    return {
      type: (i.type === "labor" ? "labor" : "part") as ItemType,
      name: i.name,
      quotedUnit: quoted,
      quotedQty: Number(i.qty) || 1,
      controlledUnit: controlled,
      controlledQty: Number(i.qty) || 1,
      standardPrice: std ?? 0,
      sortOrder: index,
    };
  });

  return {
    status: "draft",
    customerName: meta.customerName || "",
    licensePlate: meta.licensePlate || "",
    vehicleCategory: category || "sedan_asia",
    vehicleBrand: matchedBrandName || meta.vehicleBrand || "",
    vehicleModel: matchedModelName || meta.vehicleModel || "",
    vehicleYear: meta.vehicleYear || 2026,
    vehicleSize: size || "B",
    chassisNo: meta.chassisNo || "",
    color: meta.color || "",
    mileage: meta.mileage || null,
    insurerName: meta.insurerName || "",
    claimNo: meta.claimNo || "",
    policyNo: meta.policyNo || "",
    policyType: meta.policyType || "ชั้น 1",
    centerName: meta.centerName || "",
    centerAddress: meta.centerAddress || "",
    centerContact: meta.centerContact || "",
    discountPercent: meta.discountPercent ?? 15,
    discountAmount: (meta.discountAmount && Number(meta.discountAmount) > 0) ? Number(meta.discountAmount) : 0,
    includeVat: meta.includeVat ?? true,
    photos,
    items: formattedItems,
  };
}

export type ScanCaseResult = {
  quotationId: string;
  quotationNo: string;
  customerName: string;
  itemCount: number;
};

/**
 * Scans one case (all its files together form a single quote) and saves it as
 * a draft. Throws with a user-facing Thai message on failure so the caller can
 * show it against that case slot.
 */
export async function scanAndSaveCase(files: File[]): Promise<ScanCaseResult> {
  const payloads: ScanPayload[] = [];
  for (const f of files) payloads.push(await fileToScanPayload(f));

  const res = await fetch("/api/extract-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: payloads, mode: "batch" }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "อ่านเอกสารไม่สำเร็จ");

  const draft = buildFormFromExtraction(data.metadata || {}, data.items || [], payloads);
  const saveRes = await fetch("/api/quotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...draft,
      creationMode: "ai_extract",
      usageLogId: typeof data.usageLogId === "number" ? data.usageLogId : null,
      uploadLogId: typeof data.uploadLogId === "number" ? data.uploadLogId : null,
    }),
  });
  const saved = await saveRes.json();
  if (!saveRes.ok || !saved.quotation?.id) throw new Error(saved.error || "บันทึกเคสไม่สำเร็จ");

  return {
    quotationId: saved.quotation.id,
    quotationNo: saved.quotation.quotationNo,
    customerName: draft.customerName || "",
    itemCount: draft.items?.length || 0,
  };
}
