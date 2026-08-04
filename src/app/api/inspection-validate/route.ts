import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";

type Img = { data: string; mediaType: string };
type Body = {
  angles?: Record<string, Img>;     // { front, "front-left", left, "rear-left", rear, "rear-right", right, "front-right" }
  docs?: { vin?: Img; registration?: Img };
};

type Flag = { severity: "error" | "warn" | "info"; message: string };

function toBlock(img: Img): Anthropic.ImageBlockParam {
  return { type: "image", source: { type: "base64", media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp", data: img.data } };
}

function stripJson(s: string): string {
  return s.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
}

const ANGLE_LIST = ["front", "front-left", "left", "rear-left", "rear", "rear-right", "right", "front-right"] as const;
const ANGLE_TH: Record<string, string> = { front: "ด้านหน้า", "front-left": "แนวทแยงหน้าซ้าย", left: "ด้านซ้าย", "rear-left": "แนวทแยงหลังซ้าย", rear: "ด้านหลัง", "rear-right": "แนวทแยงหลังขวา", right: "ด้านขวา", "front-right": "แนวทแยงหน้าขวา" };

// ── Check 1: are all 8 angle photos actual car photos, not blurry, correct angle? ──
async function checkAnglePhotos(angles: Record<string, Img>): Promise<{ flags: Flag[]; completenessFlags: Flag[] }> {
  const flags: Flag[] = [];
  const completenessFlags: Flag[] = [];

  // Check completeness (Rule 1)
  for (const angle of ANGLE_LIST) {
    if (!angles[angle]) {
      completenessFlags.push({ severity: "error", message: `ขาดรูปถ่ายมุม "${ANGLE_TH[angle]}"` });
    }
  }

  const ids = ANGLE_LIST.filter((k) => angles[k]);
  if (ids.length === 0) return { flags, completenessFlags };

  const content: Anthropic.ContentBlockParam[] = [];
  for (const id of ids) content.push(toBlock(angles[id]));
  const labelList = ids.map((id, i) => `Image ${i + 1}: expected angle "${id}" (${ANGLE_TH[id]})`).join("\n");
  content.push({
    type: "text",
    text: `You are validating car inspection photos. For EACH image (in order), decide:
- isCar: true only if the image clearly shows a car/vehicle (not a person, document, blurry blob, or unrelated object).
- angleOk: true if the visible angle roughly matches the expected angle listed below.
- isBlur: true if the image is too blurry, shaky, dark, or low quality to evaluate.
- reason (Thai, ≤80 chars) only if isCar=false OR angleOk=false OR isBlur=true.

Expected angles:
${labelList}

Return ONLY valid JSON with this shape:
{"items":[{"id":"front","isCar":true,"angleOk":true,"isBlur":false},{"id":"...","isCar":false,"angleOk":false,"isBlur":true,"reason":"..."}]}`,
  });

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content }],
    });
    const text = msg.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n").trim();
    const parsed = JSON.parse(stripJson(text)) as { items?: { id: string; isCar: boolean; angleOk: boolean; isBlur: boolean; reason?: string }[] };
    for (const it of parsed.items || []) {
      const th = ANGLE_TH[it.id] || it.id;
      if (!it.isCar) flags.push({ severity: "error", message: `รูป "${th}" ไม่ใช่ภาพรถ${it.reason ? ` — ${it.reason}` : ""}` });
      else if (it.isBlur) flags.push({ severity: "error", message: `รูป "${th}" ไม่ชัด/เบลอ${it.reason ? ` — ${it.reason}` : ""}` });
      else if (!it.angleOk) flags.push({ severity: "warn", message: `รูป "${th}" มุมไม่ตรง${it.reason ? ` — ${it.reason}` : ""}` });
    }
  } catch {
    flags.push({ severity: "warn", message: "ตรวจสอบรูปมุมรถไม่สำเร็จ (AI parse error)" });
  }
  return { flags, completenessFlags };
}

// ── Check 2: cross-check plate, VIN, color, and model ──
async function crossCheckIdentity(angles: Record<string, Img>, docs: { vin?: Img; registration?: Img }): Promise<Flag[]> {
  const flags: Flag[] = [];

  // Rule 1: Check registration book completeness
  if (!docs.registration) {
    flags.push({ severity: "error", message: "ขาดรูปถ่ายสมุดจดทะเบียนรถยนต์" });
  }

  const sources: { key: string; img: Img; role: string }[] = [];
  if (docs.vin) sources.push({ key: "vinPlate", img: docs.vin, role: "vin plate on vehicle body" });
  if (docs.registration) sources.push({ key: "regBook", img: docs.registration, role: "vehicle registration book (may show license plate, chassis no/VIN, brand/model, and color)" });
  if (angles.front) sources.push({ key: "frontPhoto", img: angles.front, role: "front of car (shows license plate, color, and vehicle model)" });
  if (angles.rear) sources.push({ key: "rearPhoto", img: angles.rear, role: "rear of car (shows license plate, color, and vehicle model)" });

  if (sources.length === 0) return flags;

  const content: Anthropic.ContentBlockParam[] = [];
  for (const s of sources) content.push(toBlock(s.img));
  const roleList = sources.map((s, i) => `Image ${i + 1} = ${s.key} (${s.role})`).join("\n");
  content.push({
    type: "text",
    text: `Extract fields visible in each image and return them.
    
Images:
${roleList}

Return ONLY valid JSON:
{
  "vinPlate": {"vin": "<VIN chars> or null"},
  "regBook": {
    "vin": "<Chassis/VIN number> or null",
    "licensePlate": "<plate as shown, keep Thai chars> or null",
    "brandModel": "<vehicle brand and model, e.g. Toyota Camry> or null",
    "color": "<vehicle color, e.g. ขาว, ดำ, เทา> or null"
  },
  "frontPhoto": {
    "licensePlate": "<plate> or null",
    "color": "<observed color> or null",
    "model": "<observed brand/model> or null"
  },
  "rearPhoto": {
    "licensePlate": "<plate> or null",
    "color": "<observed color> or null",
    "model": "<observed brand/model> or null"
  }
}
Only omit a key entirely if the corresponding image was not provided.
For VIN, use characters only (no spaces). For plate, keep it as-is including Thai characters.`,
  });

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content }],
    });
    const text = msg.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n").trim();
    const parsed = JSON.parse(stripJson(text)) as Record<string, { vin?: string | null; licensePlate?: string | null; brandModel?: string | null; color?: string | null; model?: string | null }>;

    const vinPlate = parsed.vinPlate?.vin?.trim().toUpperCase() || null;
    const regBookVin = parsed.regBook?.vin?.trim().toUpperCase() || null;
    const regBookPlate = parsed.regBook?.licensePlate?.replace(/\s+/g, "") || null;
    const regBookColor = parsed.regBook?.color?.trim() || null;
    const regBookBrandModel = parsed.regBook?.brandModel?.trim() || null;

    const frontPlate = parsed.frontPhoto?.licensePlate?.replace(/\s+/g, "") || null;
    const rearPlate = parsed.rearPhoto?.licensePlate?.replace(/\s+/g, "") || null;
    const frontColor = parsed.frontPhoto?.color?.trim() || null;
    const rearColor = parsed.rearPhoto?.color?.trim() || null;
    const frontModel = parsed.frontPhoto?.model?.trim() || null;
    const rearModel = parsed.rearPhoto?.model?.trim() || null;

    // VIN cross-check
    if (vinPlate && regBookVin) {
      if (vinPlate !== regBookVin) {
        flags.push({ severity: "error", message: `เลขตัวถังไม่ตรงกับเล่มทะเบียน — ป้ายตัวถัง: ${vinPlate}, เล่มทะเบียน: ${regBookVin}` });
      } else {
        flags.push({ severity: "info", message: `✓ เลขตัวถังตรงกับเล่มทะเบียน (${vinPlate})` });
      }
    }

    // Plate cross-check
    const carPlates = [frontPlate, rearPlate].filter(Boolean) as string[];
    if (regBookPlate && carPlates.length > 0) {
      const norm = (s: string) => s.replace(/[-\s]/g, "");
      const carPlateSet = new Set(carPlates.map(norm));
      if (!carPlateSet.has(norm(regBookPlate))) {
        flags.push({ severity: "error", message: `ทะเบียนรถไม่ตรงกับเล่มทะเบียน — รถ: ${[...carPlateSet].join(" / ")}, เล่ม: ${regBookPlate}` });
      } else {
        flags.push({ severity: "info", message: `✓ ทะเบียนรถตรงกับเล่มทะเบียน (${regBookPlate})` });
      }
    }

    // Color cross-check (Rule 5)
    const observedColors = [frontColor, rearColor].filter(Boolean) as string[];
    if (regBookColor && observedColors.length > 0) {
      const hasMatch = observedColors.some((c) => c.includes(regBookColor) || regBookColor.includes(c));
      if (!hasMatch) {
        flags.push({ severity: "error", message: `สีรถจากภาพจริงไม่ตรงกับเล่มทะเบียน — รถจริง: ${observedColors.join("/")}, เล่ม: ${regBookColor}` });
      } else {
        flags.push({ severity: "info", message: `✓ สีรถตรงกับเล่มทะเบียน (${regBookColor})` });
      }
    }

    // Model/Brand cross-check (Rule 5)
    const observedModels = [frontModel, rearModel].filter(Boolean) as string[];
    if (regBookBrandModel && observedModels.length > 0) {
      const hasMatch = observedModels.some((m) => {
        const normM = m.toLowerCase();
        const normReg = regBookBrandModel.toLowerCase();
        return normM.includes(normReg) || normReg.includes(normM) || normM.split(" ").some(part => normReg.includes(part));
      });
      if (!hasMatch) {
        flags.push({ severity: "warn", message: `รุ่นรถจากภาพจริงอาจไม่ตรงกับเล่มทะเบียน — รถจริง: ${observedModels.join("/")}, เล่ม: ${regBookBrandModel}` });
      } else {
        flags.push({ severity: "info", message: `✓ รุ่นรถตรงกับเล่มทะเบียน (${regBookBrandModel})` });
      }
    }
  } catch {
    flags.push({ severity: "warn", message: "ตรวจสอบข้อมูลเล่มทะเบียน / ตัวตนรถไม่สำเร็จ (AI parse error)" });
  }
  return flags;
}

// ── Check 3: Detect damage in the 8 angle photos (Rule 6 & 7) ──
type DamageItem = {
  angle: string;
  partTh: string;
  severity: "minor" | "moderate" | "severe" | "replace";
  description: string;
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  price?: { minor: number | null; moderate: number | null; severe: number | null; replace: number | null } | null;
};

async function detectDamages(angles: Record<string, Img>): Promise<{ flags: Flag[]; damages: DamageItem[] }> {
  const flags: Flag[] = [];
  const damages: DamageItem[] = [];
  const ids = ANGLE_LIST.filter((k) => angles[k]);
  if (ids.length === 0) return { flags, damages };

  const content: Anthropic.ContentBlockParam[] = [];
  for (const id of ids) content.push(toBlock(angles[id]));
  const labelList = ids.map((id, i) => `Image ${i + 1} = angle "${id}"`).join("\n");

  content.push({
    type: "text",
    text: `You are an AI auto-claims damage inspector. Analyze these car images for any pre-existing exterior damage (scratches, dents, cracks, rust, deformation, broken lights/glass, detached parts).
    
Images:
${labelList}

For each damage found, extract:
- angle: matching angle key (e.g. "front")
- partTh: canonical Thai part name. MUST BE one of these exact terms from the price catalog:
  "กันชนหน้า", "กันชนหลัง", "แก้มหน้า", "แก้มหลัง", "ฝากระโปรงหน้า", "ฝากระโปรงท้าย", "ฝาปิดท้าย", "บังลมหน้า", "บังลมหลัง", "หลังคา", "ประตูหน้า", "ประตูหลัง", "สเกิร์ตข้าง", "ไฟหน้า", "ไฟท้าย", "กระจกมองข้าง", "ล้อแม็ก"
- severity: "minor" (ซ่อมเบา/ทำสีแผลเล็ก), "moderate" (ซ่อมกลาง/บุบต้องเคาะ), "severe" (ซ่อมหนัก/แผลใหญ่ยับ), "replace" (ต้องเปลี่ยนชิ้นส่วน)
- description: brief description in Thai (e.g. "รอยขูดขีดยาวลึกบริเวณขวา")
- bbox: [ymin, xmin, ymax, xmax] as integers (0 to 100) relative to that image's dimensions.

Return ONLY valid JSON shape:
{"damages":[{"angle":"front","partTh":"กันชนหน้า","severity":"minor","description":"รอยขูดขีดกันชนหน้าซ้าย","bbox":[40,15,65,45]}]}`,
  });

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content }],
    });
    const text = msg.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n").trim();
    const parsed = JSON.parse(stripJson(text)) as { damages?: Omit<DamageItem, "price">[] };

    if (parsed.damages && parsed.damages.length > 0) {
      flags.push({ severity: "warn", message: `AI ตรวจพบความเสียหายพรีเอ็กซิสติ้งบนตัวรถจำนวน ${parsed.damages.length} จุด` });
      
      // Fetch prices from database to match
      const dbPrices = await prisma.repairPrice.findMany();

      for (const dmg of parsed.damages) {
        // Try to match partTh with DB entries
        const matched = dbPrices.find((p) => p.partTh === dmg.partTh);
        const item: DamageItem = {
          angle: dmg.angle,
          partTh: dmg.partTh,
          severity: dmg.severity,
          description: dmg.description,
          bbox: dmg.bbox,
          price: matched ? {
            minor: matched.minor,
            moderate: matched.moderate,
            severe: matched.severe,
            replace: matched.replace
          } : null
        };
        damages.push(item);
      }
    } else {
      flags.push({ severity: "info", message: "✓ ไม่พบความเสียหายในภาพถ่ายรอบคัน" });
    }
  } catch (e) {
    console.error("Damage detection parse error:", e);
    flags.push({ severity: "warn", message: "ไม่สามารถสแกนหาความเสียหายได้ (AI parser error)" });
  }

  return { flags, damages };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const angles = body.angles || {};
    const docs = body.docs || {};

    const [angleResult, identityFlags, damageResult] = await Promise.all([
      checkAnglePhotos(angles),
      crossCheckIdentity(angles, docs),
      detectDamages(angles),
    ]);

    const flags = [
      ...angleResult.completenessFlags,
      ...angleResult.flags,
      ...identityFlags,
      ...damageResult.flags
    ];

    const hasBlocking = flags.some((f) => f.severity === "error");
    // If any error exists OR pre-existing damage was detected, flag as review required.
    const status = hasBlocking || damageResult.damages.length > 0 ? "review" : "passed";

    return NextResponse.json({
      status,
      flags,
      damages: damageResult.damages
    });
  } catch (err) {
    console.error("Inspection validate error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
