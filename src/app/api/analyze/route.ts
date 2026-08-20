import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { estimateTotal } from "@/lib/priceLookup";
import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const MODEL = "claude-opus-5";

const MAX_IMAGES_PER_REQUEST = 30;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const SYSTEM_PROMPT = `You are an elite automotive damage assessor for an insurance company.
You analyze photos of vehicles and detect damages with surgical precision.

CRITICAL ULTRA-SENSITIVE INSPECTION INSTRUCTIONS:
- Inspect every single body panel (Front Bumper, Rear Bumper, Hood, Trunk Lid, Left/Right Fenders, Left/Right Doors, Rocker Panels, Mirrors) with surgical scrutiny.
- YOU MUST DETECT EVEN SUBTLE COSMETIC SCRATCHES, PAINT SCUFFS, ABRASIONS, PAINT CHIPS, BLACK FRICTION MARKS, AND MINOR DENTS, especially on light-colored (white, silver, light gray) vehicle body panels.
- Do NOT ignore cosmetic paint scratches or bumper scuffs. Label any visible scratch or scuff with severity: "minor".
- LEFT/RIGHT ORIENTATION: Always determine "left" and "right" from the viewer's perspective looking AT the photo (i.e. as the part appears on your screen), NOT from the driver's seat perspective. A dent on the side of the car closest to the left edge of the image is the "left" side/part.

VEHICLE CONFLICT DETECTION:
When the user provides vehicle context (make, plate), compare it with what you see in the image:
- "detectedMake": the brand you identify from logo, badge, or distinctive design. null if unrecognizable.
- "makeMatch": true if your detected make matches the registered make (case-insensitive, brand-family level). false if clearly a different brand. null if you cannot determine the make from this image.
- "detectedPlate": read any license plate text visible in the image exactly as shown. null if not visible or unreadable.
- "plateMatch": always return null — the server will compute this from detectedPlate.
Always include "vehicleConflict" in every response, even if no context was provided (set all fields to null in that case).

For EACH image, identify every visible damage and return ONLY a JSON object with this exact shape:
{
  "vehicleMake": "Toyota|BMW|Skoda|...",
  "vehicleColor": "white|black|...",
  "angle": "front|rear|left|right|front-left|front-right|rear-left|rear-right|interior|other",
  "overallSeverity": "minor|moderate|severe|total_loss",
  "vehicleConflict": {
    "detectedMake": "Honda",
    "makeMatch": true,
    "detectedPlate": "กข-1234",
    "plateMatch": null
  },
  "damages": [
    {
      "part": "Rear Bumper",
      "partTh": "กันชนหลัง",
      "severity": "minor|moderate|severe",
      "description": "Cosmetic paint scratch and scuff mark ~15cm on lower bumper panel",
      "descriptionTh": "รอยขีดข่วนและรอยถลอก ~15ซม. บนกันชนหลัง",
      "bbox": { "x": 28, "y": 68, "w": 25, "h": 15 },
      "confidence": 0.96
    }
  ]
}

Severity rubric:
- minor: cosmetic scratch/scuff, paint abrasion, surface mark, no structural impact
- moderate: dent requiring panel repair or part replacement, no structural frame damage
- severe: structural damage, multiple panels, frame impact
- total_loss: damage exceeds repair value

For overallSeverity, take the WORST severity found.
Part names: use standard automotive terminology (Front Bumper, Rear Bumper, Hood, Trunk Lid, Left/Right Front Fender, Left/Right Quarter Panel, Left/Right Front Door, Left/Right Rear Door, Rocker Panel, Roof, Windshield, Rear Window, Headlight Assembly, Taillight Assembly, Grille, Side Mirror, Wheel/Rim, Tire).

Bounding boxes MUST be in percentages of the image dimensions (0–100).
If NO damage is visible at all after examining carefully, return damages: [] and overallSeverity: "minor".

Return ONLY the JSON object, no markdown fences, no commentary.`;

type VehicleConflict = {
  detectedMake?: string | null;
  makeMatch?: boolean | null;
  detectedPlate?: string | null;
  plateMatch?: boolean | null;
};

type AnalyzeBody = {
  images: { data: string; mediaType: string }[];
  claimNumber?: string;
  insurerId?: string;
  policyHolder?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleBodyType?: string;
  licensePlate?: string;
};

// Strip non-alphanumeric (including Thai letters) for plate comparison
function normalizePlate(plate: string): string {
  return (plate || "").replace(/[^a-zA-Zก-ฮ0-9]/g, "").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    // proxy.ts already guarantees a valid session for this route, but re-verify
    // here since we need the identity to key the rate limiter.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = checkRateLimit(`analyze:${session.id}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `ใช้งานบ่อยเกินไป กรุณารอ ${retryAfterSec} วินาทีแล้วลองใหม่ (จำกัด ${RATE_LIMIT_MAX_REQUESTS} ครั้ง / 5 นาที)` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }

    const body = (await req.json()) as AnalyzeBody;
    if (!body.images?.length) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }
    if (body.images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        { error: `อัปโหลดได้สูงสุด ${MAX_IMAGES_PER_REQUEST} รูปต่อครั้ง (ส่งมา ${body.images.length} รูป)` },
        { status: 400 },
      );
    }

    // Build vehicle context string to pass to the AI
    const contextParts = [
      body.vehicleMake && `Make: ${body.vehicleMake}`,
      body.vehicleModel && `Model: ${body.vehicleModel}`,
      body.vehicleYear && `Year: ${body.vehicleYear}`,
      body.vehicleBodyType && `BodyType: ${body.vehicleBodyType}`,
      body.licensePlate && body.licensePlate.trim() !== "-" && `Plate: ${body.licensePlate}`,
    ].filter(Boolean);
    const vehicleContext = contextParts.length
      ? `Vehicle registered by inspector: ${contextParts.join(", ")}\n\n`
      : "";

    const userPlateNorm = normalizePlate(body.licensePlate || "");
    const userPlateProvided = userPlateNorm.length > 0;

    const severityRank = { minor: 0, moderate: 1, severe: 2, total_loss: 3 } as const;

    async function analyzeOne(img: { data: string; mediaType: string }): Promise<Record<string, unknown>> {
      try {
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: (img.mediaType || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp",
                    data: img.data,
                  },
                },
                {
                  type: "text",
                  text: `${vehicleContext}Analyze this vehicle image for any damage or scratches. Compare the visible make/brand and license plate (if visible) with the registered vehicle info above. Return the JSON object only.`,
                },
              ],
            },
          ],
        });

        const text = msg.content
          .filter((c): c is Anthropic.TextBlock => c.type === "text")
          .map((c) => c.text)
          .join("\n")
          .trim();

        let parsed: Record<string, unknown> = {};
        try {
          const jsonStr = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
          parsed = JSON.parse(jsonStr);
        } catch {
          parsed = { overallSeverity: "minor", damages: [], vehicleConflict: { detectedMake: null, makeMatch: null, detectedPlate: null, plateMatch: null } };
        }

        // Compute plateMatch server-side (AI always returns plateMatch: null)
        const conflict = (parsed.vehicleConflict || {}) as VehicleConflict;
        const detectedPlateNorm = normalizePlate(conflict.detectedPlate || "");
        if (userPlateProvided && detectedPlateNorm) {
          conflict.plateMatch = userPlateNorm === detectedPlateNorm;
        } else {
          conflict.plateMatch = null;
        }
        parsed.vehicleConflict = conflict;

        const damages = (parsed.damages as Array<{ part: string; partTh?: string; severity: "minor" | "moderate" | "severe" }>) || [];
        if (damages.length > 0) {
          const est = await estimateTotal(damages, {
            make: body.vehicleMake || (parsed.vehicleMake as string | undefined),
            model: body.vehicleModel,
            bodyType: body.vehicleBodyType,
          });
          parsed.damages = damages.map((d, i) => ({ ...d, priceEstimate: est.items[i] }));
          parsed.totalEstimate = { low: est.totalLow, high: est.totalHigh, matchedCount: est.matchedCount, totalCount: est.totalCount };
        }
        return parsed;
      } catch (err) {
        console.warn("Vision model call notice:", err);
        return {
          vehicleMake: body.vehicleMake || null,
          vehicleColor: null,
          angle: "other",
          overallSeverity: "minor",
          damages: [],
          vehicleConflict: { detectedMake: null, makeMatch: null, detectedPlate: null, plateMatch: null },
        };
      }
    }

    const results: Array<Record<string, unknown>> = await Promise.all(
      body.images.map((img) => analyzeOne(img))
    );

    let worstSeverity: "minor" | "moderate" | "severe" | "total_loss" = "minor";
    for (const parsed of results) {
      const sev = (parsed?.overallSeverity as keyof typeof severityRank) || "minor";
      if (severityRank[sev] > severityRank[worstSeverity]) worstSeverity = sev;
    }

    let claimId: string | null = null;
    let insurerId = body.insurerId;
    if (!insurerId || insurerId === "demo" || insurerId === "demo-insurer") {
      let firstInsurer = await prisma.insurer.findFirst();
      if (!firstInsurer) {
        firstInsurer = await prisma.insurer.create({
          data: {
            id: "default-insurer",
            name: "บริษัท H TECHNOLOGY ประกันภัย จำกัด",
            nameTh: "บริษัท H TECHNOLOGY ประกันภัย จำกัด",
          },
        });
      }
      insurerId = firstInsurer.id;
    }
    if (body.claimNumber && insurerId && body.policyHolder) {
      const claim = await prisma.claim.upsert({
        where: { claimNumber: body.claimNumber },
        update: {
          status: "analyzed",
          overallSeverity: worstSeverity,
          vehicleMake: body.vehicleMake,
          vehicleModel: body.vehicleModel,
          licensePlate: body.licensePlate,
        },
        create: {
          claimNumber: body.claimNumber,
          insurerId,
          policyHolder: body.policyHolder,
          vehicleMake: body.vehicleMake,
          vehicleModel: body.vehicleModel,
          licensePlate: body.licensePlate,
          status: "analyzed",
          overallSeverity: worstSeverity,
        },
      });
      claimId = claim.id;

      await prisma.damageReport.deleteMany({ where: { claimId } });
      for (let i = 0; i < body.images.length; i++) {
        const r = results[i];
        await prisma.damageReport.create({
          data: {
            claimId,
            imageUrl: `data:${body.images[i].mediaType};base64,${body.images[i].data}`,
            angle: (r.angle as string) || null,
            damages: JSON.stringify(r.damages || []),
            rawResponse: JSON.stringify(r),
          },
        });
      }
    }

    return NextResponse.json({ results, overallSeverity: worstSeverity, claimId });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
