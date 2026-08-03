import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { estimateTotal } from "@/lib/priceLookup";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-3-5-sonnet-latest";
const CONCURRENCY = 4;
const MAX_VISION_IMAGES = 6;

const DAMAGE_PROMPT = `You are an elite automotive damage assessor for an insurance company.
Inspect every body panel (Bumpers, Hood, Trunk Lid, Fenders, Doors, Mirrors) with surgical precision.
YOU MUST DETECT EVEN SUBTLE COSMETIC SCRATCHES, PAINT SCUFFS, ABRASIONS, PAINT CHIPS, BLACK FRICTION MARKS, AND MINOR DENTS, especially on light-colored (white, silver, light gray) vehicle body panels. Label any scratch/scuff with severity: "minor".

For EACH image, identify every visible damage and return ONLY this JSON object (no fences):
{
  "vehicleMake": "Toyota|BMW|Skoda|...", "angle": "front|rear|left|right|front-left|...",
  "overallSeverity": "minor|moderate|severe|total_loss",
  "damages": [{
    "part": "Rear Bumper", "partTh": "กันชนหลัง",
    "severity": "minor|moderate|severe",
    "description": "Cosmetic paint scratch ~15cm", "descriptionTh": "รอยขีดข่วนและรอยถลอก ~15ซม.",
    "bbox": { "x": 12, "y": 55, "w": 18, "h": 22 }, "confidence": 0.96
  }]
}
Severity: minor=cosmetic scratch/scuff; moderate=dent/panel; severe=structural/multi-panel; total_loss=beyond repair.
overallSeverity = worst found. bbox in % (0–100). If no damage: damages [] and overallSeverity "minor".
Use standard Thai part names (กันชนหน้า/หลัง, ฝากระโปรงหน้า/หลัง, บังโคลนหน้า/หลัง, ประตูหน้า/หลัง, กระจังหน้า, ไฟหน้า/ท้าย, กระจกบังลมหน้า/หลัง, กระจกมองข้าง, ขอบล้อ).`;

export type ImgInput = { data: string; mediaType: string };

async function optimizeImage(img: ImgInput): Promise<ImgInput> {
  try {
    if (img.mediaType === "application/pdf") return img;

    const buf = Buffer.from(img.data, "base64");
    if (buf.length < 150 * 1024) return img;

    const resized = await sharp(buf)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      data: resized.toString("base64"),
      mediaType: "image/jpeg",
    };
  } catch (e) {
    return img;
  }
}

export async function analyzeImages(
  images: ImgInput[],
  vehicle: { make?: string; model?: string } = {},
): Promise<{ results: Record<string, unknown>[]; overallSeverity: "minor" | "moderate" | "severe" | "total_loss" }> {
  const severityRank = { minor: 0, moderate: 1, severe: 2, total_loss: 3 } as const;
  const imageOnlyInputs = images.filter(i => i.mediaType !== "application/pdf");

  let targetImages = imageOnlyInputs;
  if (imageOnlyInputs.length > MAX_VISION_IMAGES) {
    const step = Math.floor(imageOnlyInputs.length / MAX_VISION_IMAGES);
    targetImages = [];
    for (let i = 0; i < imageOnlyInputs.length && targetImages.length < MAX_VISION_IMAGES; i += step) {
      targetImages.push(imageOnlyInputs[i]);
    }
  }

  const optimizedImages = await Promise.all(targetImages.map(optimizeImage));

  async function analyzeOne(img: ImgInput): Promise<Record<string, unknown>> {
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: DAMAGE_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp", data: img.data } },
            { type: "text", text: "Analyze this vehicle image. Return the JSON object only." },
          ],
        }],
      });
      const text = msg.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n").trim();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
      } catch {
        parsed = { error: "parse_failed", raw: text };
      }
      const damages = (parsed.damages as Array<{ part: string; partTh?: string; severity: "minor" | "moderate" | "severe" }>) || [];
      if (damages.length > 0) {
        const est = await estimateTotal(damages, { make: vehicle.make || (parsed.vehicleMake as string | undefined), model: vehicle.model });
        parsed.damages = damages.map((d, i) => ({ ...d, priceEstimate: est.items[i] }));
        parsed.totalEstimate = { low: est.totalLow, high: est.totalHigh, matchedCount: est.matchedCount, totalCount: est.totalCount };
      }
      return parsed;
    } catch (e) {
      console.warn("analyzeOne failed:", e instanceof Error ? e.message : e);
      return { overallSeverity: "minor", damages: [] };
    }
  }

  const results: Record<string, unknown>[] = new Array(optimizedImages.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < optimizedImages.length) {
      const i = cursor++;
      results[i] = await analyzeOne(optimizedImages[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, optimizedImages.length) }, worker));

  let overallSeverity: "minor" | "moderate" | "severe" | "total_loss" = "minor";
  for (const p of results) {
    const sev = (p?.overallSeverity as keyof typeof severityRank) || "minor";
    if (severityRank[sev] > severityRank[overallSeverity]) overallSeverity = sev;
  }
  return { results, overallSeverity };
}

// Fallback Pattern Extractor to parse claim fields from Thai insurance text even if API key has issues
function fallbackExtract(emailBody: string): Record<string, string | null> {
  const text = emailBody || "";

  let customer: string | null = null;
  const custMatch = text.match(/(?:ชื่อลูกค้า|ลูกค้า|คุณ|นาย|นาง|นางสาว)\s*[:\s]*([ก-๙a-zA-Z\s]+?)(?=\s+(?:เบอร์|โทร|ประกัน|ทะเบียน|ยี่ห้อ|รุ่น|เลขที่|\n|$))/i);
  if (custMatch && custMatch[1].trim().length > 2) {
    customer = custMatch[1].trim();
  }

  let licensePlate: string | null = null;
  const plateMatch = text.match(/(?:ทะเบียนรถ|ทะเบียน)\s*[:\s]*([ก-๙a-zA-Z0-9\s-]+?)(?=\s+(?:ยี่ห้อ|รุ่น|ปี|สี|เลข|รถ|\n|$))/i) ||
                     text.match(/([ก-๙]{1,3}\s*[-–]?\s*\d{1,4}(?:\s+[ก-๙]+)?)/i);
  if (plateMatch) {
    licensePlate = plateMatch[1].trim();
  }

  let vehicleMake: string | null = null;
  const makeMatch = text.match(/(?:ยี่ห้อ\s*[:\s]*)?(ISUZU|Toyota|Honda|Nissan|Mazda|Ford|BMW|Benz|Mercedes-Benz|Mitsubishi|MG|GWM|BYD)/i);
  if (makeMatch) {
    vehicleMake = makeMatch[1].trim();
  }

  let vehicleModel: string | null = null;
  const modelMatch = text.match(/(?:รุ่น\s*[:\s]*)?(D-max|Dmax|Camry|Civic|Corolla|Fortuner|Ranger|City|HR-V|CR-V|Hilux|Revo|Vios|Yaris)/i);
  if (modelMatch) {
    vehicleModel = modelMatch[1].trim();
  }

  let vehicleYear: string | null = null;
  const yearMatch = text.match(/(?:ปี\s*[:\s]*)?(20\d{2}|25\d{2})/i);
  if (yearMatch) {
    vehicleYear = yearMatch[1].trim();
  }

  let claimNumber: string | null = null;
  const claimMatch = text.match(/(?:เลขที่เคลม|เลขเคลม|เคลมเลขที่|เคลม)\s*[:\s]*([A-Za-z0-9-]+)/i) ||
                     text.match(/([A-Z]\d{5,}[A-Z0-9]*|CLM-\d+-\d+)/i);
  if (claimMatch) {
    claimNumber = claimMatch[1].trim();
  }

  let policyNo: string | null = null;
  const policyMatch = text.match(/(?:กรมธรรม์|เลขที่กรมธรรม์)\s*[:\s]*([A-Za-z0-9-]+)/i);
  if (policyMatch) {
    policyNo = policyMatch[1].trim();
  }

  let centerName: string | null = null;
  const centerMatch = text.match(/(?:ศูนย์บริการ|ศูนย์|บริษัท|อู่)\s*[:\s]*([ก-๙a-zA-Z0-9\s]+?)(?=\s+(?:ขอส่ง|สาขา|โทร|\n|$))/i);
  if (centerMatch) {
    centerName = centerMatch[1].trim();
  }

  return {
    customer,
    licensePlate,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    claimNumber,
    policyNo,
    insurer: null,
    centerName,
    centerContact: null,
  };
}

export async function extractIntakeFields(
  emailBody: string,
  docs?: ImgInput[]
): Promise<Record<string, string | null>> {
  try {
    const content: Anthropic.ContentBlockParam[] = [];

    if (docs && docs.length > 0) {
      for (const doc of docs) {
        if (doc.mediaType === "application/pdf") {
          content.push({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: doc.data },
          });
        } else if (doc.mediaType.startsWith("image/")) {
          content.push({
            type: "image",
            source: { type: "base64", media_type: doc.mediaType as "image/jpeg" | "image/png" | "image/webp", data: doc.data },
          });
        }
      }
    }

    content.push({
      type: "text",
      text: `Email Text:\n"""${(emailBody || "").slice(0, 4000)}"""\n\nExtract structured fields from the email text and attached documents/PDFs. Return the JSON object only.`,
    });

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: `You extract structured fields from a Thai car-insurance email or PDF/image quotation sent by a repair shop. Return ONLY this JSON:
{"customer":null,"licensePlate":null,"vehicleMake":null,"vehicleModel":null,"vehicleYear":null,"claimNumber":null,"policyNo":null,"insurer":null,"centerName":null,"centerContact":null}
Fill a field only if clearly present; else null.`,
      messages: [{ role: "user", content }],
    });

    const text = msg.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n").trim();
    const parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    const fallback = fallbackExtract(emailBody);

    return {
      customer: parsed.customer || fallback.customer,
      licensePlate: parsed.licensePlate || fallback.licensePlate,
      vehicleMake: parsed.vehicleMake || fallback.vehicleMake,
      vehicleModel: parsed.vehicleModel || fallback.vehicleModel,
      vehicleYear: parsed.vehicleYear || fallback.vehicleYear,
      claimNumber: parsed.claimNumber || fallback.claimNumber,
      policyNo: parsed.policyNo || fallback.policyNo,
      insurer: parsed.insurer || fallback.insurer,
      centerName: parsed.centerName || fallback.centerName,
      centerContact: parsed.centerContact || fallback.centerContact,
    };
  } catch (err) {
    console.warn("AI extractIntakeFields failed (using pattern fallback):", err instanceof Error ? err.message : err);
    return fallbackExtract(emailBody);
  }
}
