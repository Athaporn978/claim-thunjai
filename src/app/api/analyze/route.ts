import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { estimateTotal } from "@/lib/priceLookup";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are an elite automotive damage assessor for an insurance company.
You analyze photos of vehicles and detect damages with surgical precision.

CRITICAL ULTRA-SENSITIVE INSPECTION INSTRUCTIONS:
- Inspect every single body panel (Front Bumper, Rear Bumper, Hood, Trunk Lid, Left/Right Fenders, Left/Right Doors, Rocker Panels, Mirrors) with surgical scrutiny.
- YOU MUST DETECT EVEN SUBTLE COSMETIC SCRATCHES, PAINT SCUFFS, ABRASIONS, PAINT CHIPS, BLACK FRICTION MARKS, AND MINOR DENTS, especially on light-colored (white, silver, light gray) vehicle body panels.
- Do NOT ignore cosmetic paint scratches or bumper scuffs. Label any visible scratch or scuff with severity: "minor".

For EACH image, identify every visible damage and return ONLY a JSON object with this exact shape:
{
  "vehicleMake": "Toyota|BMW|Skoda|...",
  "vehicleColor": "white|black|...",
  "angle": "front|rear|left|right|front-left|front-right|rear-left|rear-right|interior|other",
  "overallSeverity": "minor|moderate|severe|total_loss",
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

type AnalyzeBody = {
  images: { data: string; mediaType: string }[];
  claimNumber?: string;
  insurerId?: string;
  policyHolder?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  licensePlate?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    if (!body.images?.length) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const severityRank = { minor: 0, moderate: 1, severe: 2, total_loss: 3 } as const;

    async function analyzeOne(img: { data: string; mediaType: string }, index: number): Promise<Record<string, unknown>> {
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
                { type: "text", text: "Analyze this vehicle image for any damage or scratches. Return the JSON object only." },
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
          parsed = { overallSeverity: "minor", damages: [] };
        }

        const damages = (parsed.damages as Array<{ part: string; partTh?: string; severity: "minor" | "moderate" | "severe" }>) || [];
        if (damages.length > 0) {
          const est = await estimateTotal(damages, {
            make: body.vehicleMake || (parsed.vehicleMake as string | undefined),
            model: body.vehicleModel,
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
        };
      }
    }

    const results: Array<Record<string, unknown>> = await Promise.all(
      body.images.map((img, idx) => analyzeOne(img, idx))
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
