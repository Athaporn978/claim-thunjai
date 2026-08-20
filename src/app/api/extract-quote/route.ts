import { NextRequest, NextResponse } from "next/server";
import { canonicalBrand, lookupLaborPrice } from "@/lib/priceLookup";
import { normalizePart } from "@/lib/partNameMap";
import type Anthropic from "@anthropic-ai/sdk";

// Guess repair-severity tier from keywords in the labor line-item name.
function detectSeverityTier(name: string): "minor" | "moderate" | "severe" | "replace" {
  if (name.includes("เปลี่ยน")) return "replace";
  if (name.includes("เคาะ")) return "severe";
  if (name.includes("พ่นสี") || name.includes("ประกอบ") || name.includes("ทำสี")) return "moderate";
  if (name.includes("ขัด") || name.includes("เบา")) return "minor";
  return "moderate";
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as any;
    const files = body.files ?? body.images ?? [];
    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    let parsedResult: any = {};
    let pdfTextExtracted = false;

    // 1. Try direct PDF text parsing via pdf-parse
    let pdfParse: any = null;
    try {
      pdfParse = require("pdf-parse/lib/pdf-parse.js");
    } catch (e) {
      console.warn("pdf-parse load notice:", e);
    }

    if (pdfParse) {
      for (const f of files) {
        if (f.data) {
          try {
            const buf = Buffer.from(f.data, "base64");
            const pdfRes = await pdfParse(buf);
            const text = pdfRes.text || "";

            if (text && text.trim().length > 10) {
              pdfTextExtracted = true;

              let customer =
                text.match(/(?:ผู้เอาประกันภัย|ผู้เอาประกัน|ชื.*อลูกค้า|นามผู้รับบริการ|ชื่อลูกค้า|ผู้ขอนำรถ|ลูกค้า|คุณ)\s*[:\s\t]*([^\r\n\t]+)/i)?.[1]?.trim() ||
                text.match(/((?:นาย|นาง|นางสาว|คุณ)\s*[ก-๙a-zA-Z]+(?:\s+[ก-๙a-zA-Z]+)+)/)?.[1]?.trim() || "";
              customer = customer.replace(/(?:เบอร์โทร|โทรศัพท์|โทร|ทะเบียน|เลขเคลม|ประกันภัย|ยี่ห้อ|รุ่น|ที่อยู่|เลขประจำตัว).*/i, "").trim();

              let plate = text.match(/(?:ทะเบียนรถ|ทะเบียน)\s*[:\s\t]*([^\r\n\t]+)/i)?.[1]?.trim() || "";
              plate = plate.replace(/(?:ยี่ห้อ|รุ่น|สี|ปี|เลขตัวถัง|เลขเครื่อง).*/i, "").trim();
              if (!plate) {
                plate = text.match(/([0-9]?[ก-ฮ]{1,3}\s*[-]?\s*[0-9]{1,4}(?:\s*กทม|\s*กรุงเทพมหานคร|\s*[ก-ฮ]{2,})?)/)?.[1] || "";
              }

              const brand = text.match(/HONDA|ฮอนด้า/i) ? "Honda" :
                            text.match(/NISSAN|นิสสัน/i) ? "Nissan" :
                            text.match(/TOYOTA|โตโยต้า/i) ? "Toyota" :
                            text.match(/ISUZU|อีซูซุ/i) ? "Isuzu" :
                            text.match(/MAZDA|มาสด้า/i) ? "Mazda" :
                            text.match(/MG|เอ็มจี/i) ? "MG" :
                            text.match(/BYD|บีวายดี/i) ? "BYD" :
                            text.match(/BENZ|MERCEDES|เบนซ์/i) ? "Mercedes-Benz" :
                            text.match(/BMW|บีเอ็ม/i) ? "BMW" :
                            text.match(/FORD|ฟอร์ด/i) ? "Ford" :
                            text.match(/MITSUBISHI|มิตซู/i) ? "Mitsubishi" : null;

              const model = text.match(/ALMERA|อัลเมร่า|BDYARG/i) ? "Almera" :
                             text.match(/CITY|ซิตี้/i) ? "City" :
                             text.match(/CIVIC|ซีวิค/i) ? "Civic" :
                             text.match(/D-MAX|ดีแมคซ์/i) ? "D-Max" :
                             text.match(/HILUX|REVO|รีโว่/i) ? "Hilux Revo" :
                             text.match(/CAMRY|แคมรี่/i) ? "Camry" :
                             text.match(/ALTIS|อัลติส/i) ? "Corolla Altis" :
                             text.match(/FORTUNER|ฟอร์จูนเนอร์/i) ? "Fortuner" :
                             text.match(/HR-V|เอชอาร์วี/i) ? "HR-V" :
                             text.match(/CR-V|ซีอาร์วี/i) ? "CR-V" :
                             text.match(/ATTO|แอคโต้/i) ? "Atto 3" : null;

              const mileageStr = text.match(/(?:เลขไมล์|กม\.)\s*[:\s\t]*([\d,]+)/i)?.[1];
              const mileage = mileageStr ? Number(mileageStr.replace(/,/g, "")) : null;

              let chassis = text.match(/(?:เลขตัวถัง|หมายเลขตัวถัง)\s*[:\s\t]*([^\r\n\t]+)/i)?.[1]?.trim() || "";
              chassis = chassis.replace(/(?:เลขไมล์|เลขเครื่อง|กม\.|สี).*/i, "").trim();
              if (!chassis) {
                chassis = text.match(/([A-Z0-9]{17})/)?.[1] || "";
              }

              const insurerMatch = text.match(/(?:บริษัท\s+[^\r\n\t]*ประกันภัย[^\r\n\t]*|ทิพยประกันภัย|ไทยวิวัฒน์|วิริยะประกันภัย|กรุงเทพประกันภัย|มิตรภาพสำรวจภัย)/i)?.[0]?.trim();

              let claim = text.match(/(?:เลขที.*เคลม|เลขเคลม|เลขรับแจ้ง|เลขที่ใบรับแจ้ง)\s*[:\s\t]*([^\r\n\t]+)/i)?.[1]?.trim() || "";
              claim = claim.replace(/(?:กรมธรรม์|เบอร์โทร|ประเภท).*/i, "").trim();
              if (!claim) {
                claim = text.match(/([A-Z][0-9]{4,}[A-Z0-9]*)/)?.[1] || "";
              }

              let policy = text.match(/(?:กรมธรรม์|เลขกรมธรรม์|กรมธรรม์เลขที่)\s*[:\s\t]*([^\r\n\t]+)/i)?.[1]?.trim() || "";
              policy = policy.replace(/(?:เบอร์โทร|ประเภท).*/i, "").trim();

              const center = text.match(/(บริษัท\s+[^\r\n\t]+จำกัด[^\r\n\t]*)/i)?.[1]?.trim();

              const IGNORE_KEYWORDS = [
                "บริษัท", "จำกัด", "โทรศัพท์", "โทรสาร", "โทร", "จังหวัด", "ตำบล", "อำเภอ", "แขวง", "เขต", "ถนน",
                "ยี่ห้อ", "รุ่น", "ปี", "เลขตัวถัง", "ทะเบียน", "ประกันภัย", "เลขที่", "ใบเสนอราคา", "รวมเป็นเงิน",
                "ส่วนลด", "ภาษี", "มูลค่ารวม", "จำนวนเงินรวม", "ผู้เอาประกัน", "ลูกค้า", "ผู้ขอนำรถ", "อนุมัติ",
                "ตาราง", "หน้า", "ลำดับ", "ราคา/หน่วย", "ยอดรวม"
              ];

              const lines = text.split("\n");
              const items: any[] = [];
              lines.forEach((l: string) => {
                const lineStr = l.trim();
                if (!lineStr) return;

                const isHeaderOrMeta = IGNORE_KEYWORDS.some((kw) => lineStr.includes(kw));
                if (isHeaderOrMeta) return;

                const priceMatch = lineStr.match(/([\d,]{2,}(?:\.\d{1,2})?)\s*$/);
                if (priceMatch) {
                  const rawPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
                  if (rawPrice >= 50) {
                    let namePart = lineStr.substring(0, priceMatch.index).trim();
                    namePart = namePart.replace(/^(?:\d+[\.\)]?\s*)+/, "").trim();
                    let qty = 1;
                    const qtyMatch = namePart.match(/\s+(\d+)\s*$/);
                    if (qtyMatch) {
                      qty = parseInt(qtyMatch[1]);
                      namePart = namePart.substring(0, qtyMatch.index).trim();
                    }
                    if (namePart.length >= 2) {
                      const isLabor = lineStr.includes("เคาะ") || lineStr.includes("พ่นสี") || lineStr.includes("ซ่อม") || lineStr.includes("ถอด") || lineStr.includes("ยก") || lineStr.includes("ค่าแรง") || lineStr.includes("เปลี่ยน");
                      items.push({ type: isLabor ? "labor" : "part", name: namePart, qty, unitPrice: rawPrice });
                    }
                  }
                }
              });

              parsedResult = {
                customerName: customer || null,
                licensePlate: plate || null,
                vehicleBrand: brand || null,
                vehicleModel: model || null,
                vehicleYear: 2026,
                chassisNo: chassis || null,
                color: text.match(/(?:สี|สีรถ)\s*[:\s\t]*([^\r\n\t]+)/i)?.[1]?.trim() || null,
                mileage: mileage,
                insurerName: insurerMatch || null,
                claimNo: claim || null,
                policyNo: policy || null,
                policyType: "ชั้น 1",
                centerName: center || null,
                items: items.length > 0 ? items : undefined,
              };
              break;
            }
          } catch (pdfErr) {
            console.warn("pdf-parse error:", pdfErr);
          }
        }
      }
    }

    // 2. Anthropic Claude Vision Extraction (if key set and model supported)
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (ANTHROPIC_KEY && (!parsedResult.items || parsedResult.items.length === 0)) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

        const contentParts: any[] = [];

        for (const f of files) {
          if (!f.data) continue;
          let rawMediaType = (f.mediaType || "application/pdf").toLowerCase();
          
          if (rawMediaType.includes("pdf")) {
            contentParts.push({
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: f.data,
              },
            });
          } else {
            let validImgMediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
            if (rawMediaType.includes("png")) validImgMediaType = "image/png";
            else if (rawMediaType.includes("webp")) validImgMediaType = "image/webp";
            else if (rawMediaType.includes("gif")) validImgMediaType = "image/gif";

            contentParts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: validImgMediaType,
                data: f.data,
              },
            });
          }
        }

        const promptText = `You are an expert Thai vehicle insurance claim & quotation document extractor.
Scan the uploaded vehicle repair quotation document and extract all repair line items and vehicle/insurance metadata into JSON.

Required JSON format:
{
  "customerName": "...",
  "licensePlate": "...",
  "vehicleBrand": "Nissan|Honda|Toyota|Isuzu|...",
  "vehicleModel": "...",
  "vehicleYear": 2026,
  "chassisNo": "...",
  "color": "...",
  "mileage": 10000,
  "insurerName": "...",
  "claimNo": "...",
  "policyNo": "...",
  "policyType": "ชั้น 1",
  "centerName": "...",
  "centerAddress": "...",
  "centerContact": "...",
  "discountPercent": 15,
  "discountAmount": 0,
  "items": [
    { "type": "labor"|"part", "name": "...", "unitPrice": 1200, "qty": 1 }
  ]
}
Return ONLY valid JSON. If the document is not a vehicle repair quotation, set items: [].`;

        contentParts.push({ type: "text", text: promptText });

        const response = await anthropic.messages.create(
          {
            model: "claude-sonnet-5",
            max_tokens: 4096,
            messages: [{ role: "user", content: contentParts }],
          },
          {
            headers: {
              "anthropic-beta": "pdfs-2024-09-25",
            },
          }
        );

        const respText = response.content
          .filter((c): c is Anthropic.TextBlock => c.type === "text")
          .map((c) => c.text)
          .join("\n");
        let aiParsed: any = null;
        const firstBrace = respText.indexOf("{");
        const lastBrace = respText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            aiParsed = JSON.parse(respText.substring(firstBrace, lastBrace + 1));
          } catch (pe) {
            console.warn("AI JSON parse notice:", pe);
          }
        }

        if (aiParsed) {
          parsedResult = {
            ...parsedResult,
            ...aiParsed,
          };
        }
      } catch (e) {
        console.warn("Anthropic Claude API Vision extraction notice:", e instanceof Error ? e.message : e);
      }
    }

    // 3. If neither pdf-parse nor AI could extract real repair items, fail explicitly.
    // Never fabricate placeholder customer/vehicle/item data — see AGENTS.md lesson log.
    if (!parsedResult.items || parsedResult.items.length === 0) {
      return NextResponse.json(
        { error: "ไม่สามารถอ่านรายการซ่อมจากเอกสารได้ กรุณาตรวจสอบคุณภาพไฟล์ หรือกรอกข้อมูลด้วยตนเอง" },
        { status: 422 }
      );
    }

    const rawItems = Array.isArray(parsedResult) ? parsedResult : parsedResult.items || [];

    const laborBrand = canonicalBrand(parsedResult.vehicleBrand);

    const cleanItems = await Promise.all(
      rawItems
        .filter((i: any) => i && i.name)
        .map(async (i: any) => {
          const uPrice = Number(i.unitPrice) || 0;
          const cleanName = String(i.name).trim();
          const itemType = i.type === "labor" ? "labor" : "part";

          let stdPrice: number | null = null;

          if (itemType === "labor") {
            try {
              const tier = detectSeverityTier(cleanName);

              // LaborPrice — real per-brand/per-model data. normalizePart() also
              // strips shop action-code prefixes (ซ/พ, ป/พ, ถอด-ใส่, ...) that would
              // otherwise pollute the keyword match. No match → stdPrice stays null,
              // never a guessed price from an unrelated brand/model/vehicleType.
              if (laborBrand) {
                const { standardName, position } = normalizePart(cleanName);
                if (standardName) {
                  const laborRow = await lookupLaborPrice({
                    brand: laborBrand, model: parsedResult.vehicleModel, partTh: standardName, position,
                  });
                  if (laborRow) {
                    const tierValue = (laborRow as unknown as Record<string, number | null>)[tier];
                    stdPrice = tierValue ?? laborRow.moderate ?? laborRow.minor ?? laborRow.severe ?? laborRow.replace ?? null;
                  }
                }
              }
            } catch {}
          }

          return {
            type: itemType,
            name: cleanName,
            unitPrice: uPrice,
            qty: Number(i.qty) || 1,
            // null when no standard price was matched — do NOT mirror the shop-quoted
            // price here, or the UI will look like a match happened when it didn't.
            standardPrice: stdPrice,
          };
        })
    );

    const metadata = {
      customerName: parsedResult.customerName || "",
      licensePlate: parsedResult.licensePlate || "",
      vehicleBrand: parsedResult.vehicleBrand || "",
      vehicleModel: parsedResult.vehicleModel || "",
      vehicleYear: parsedResult.vehicleYear || 2026,
      chassisNo: parsedResult.chassisNo || "",
      color: parsedResult.color || "",
      mileage: parsedResult.mileage || null,
      insurerName: parsedResult.insurerName || "",
      claimNo: parsedResult.claimNo || "",
      policyNo: parsedResult.policyNo || "",
      policyType: parsedResult.policyType || "ชั้น 1",
      centerName: parsedResult.centerName || "",
      centerAddress: parsedResult.centerAddress || "",
      centerContact: parsedResult.centerContact || "",
      discountPercent: parsedResult.discountPercent ?? 15,
      discountAmount: parsedResult.discountAmount ?? 0,
      includeVat: true,
    };

    return NextResponse.json({
      success: true,
      metadata,
      items: cleanItems,
    });
  } catch (err) {
    console.error("Extract quote error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown extraction error" },
      { status: 500 }
    );
  }
}
