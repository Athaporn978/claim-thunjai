import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function mapExcelRowToPartCatalog(row: Record<string, any>) {
  const getVal = (...keys: string[]) => {
    for (const key of Object.keys(row)) {
      const kClean = key.trim().toLowerCase();
      for (const target of keys) {
        if (kClean === target.toLowerCase() || kClean.includes(target.toLowerCase())) {
          return row[key];
        }
      }
    }
    return undefined;
  };

  const brand = getVal("brand", "ยี่ห้อ", "ยี่ห้อรถยนต์", "ยี่ห้อรถ", "make") || "ทั่วไป";
  const model = getVal("model", "รุ่น", "รุ่นรถยนต์", "รุ่นรถ") || "ทุกรุ่น";
  const yearRange = getVal("yearrange", "year", "ปี", "ปีรถ", "ช่วงปี") || "2018-2024";
  const category = getVal("category", "ประเภท", "กลุ่มรถ") || "sedan_asia";
  const partTh = getVal("partth", "part", "partname", "name", "description", "รายการ", "ชื่ออะไหล่", "รายการชิ้นส่วน", "รายการอะไหล่", "ชิ้นส่วน", "อะไหล่", "ชื่อรายการ", "คำอธิบาย") || "";
  const partEn = getVal("parten", "partnameen", "englishname", "ชื่ออังกฤษ") || "";
  const oemPriceRaw = getVal("oemprice", "oem", "ราคาแท้", "ราคาศูนย์", "ราคาเบิกศูนย์", "ราคาห้าง", "แท้ศูนย์", "แท้", "ราคา");
  const oemPrice = Number(oemPriceRaw || 0);
  const aftermarketPrice = getVal("aftermarketprice", "aftermarket", "ราคาเทียบ", "ราคาเทียบแท้", "ราคาอู่", "เทียบแท้", "เทียบ");
  const usedPrice = getVal("usedprice", "used", "ราคามือสอง", "ราคาเชียงกง", "มือสอง", "เชียงกง");
  const note = getVal("note", "หมายเหตุ", "remark") || "";

  return {
    brand: String(brand).trim(),
    model: String(model).trim(),
    yearRange: String(yearRange).trim(),
    category: String(category).trim(),
    partTh: String(partTh).trim(),
    partEn: partEn ? String(partEn).trim() : null,
    oemPrice: isNaN(oemPrice) ? 0 : oemPrice,
    aftermarketPrice: aftermarketPrice ? Number(aftermarketPrice) : null,
    usedPrice: usedPrice ? Number(usedPrice) : null,
    note: note ? String(note).trim() : null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      importType, // "labor" | "parts"
      filename,
      items,
      performerName,
      performerEmail,
      performerRole,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลรายการราคาในไฟล์ที่อัปโหลด" }, { status: 400 });
    }

    // Role Validation Check: Must be Super Admin
    const roleLower = (performerRole || "").toLowerCase();
    const emailLower = (performerEmail || "").toLowerCase();
    const isSuperAdmin =
      roleLower.includes("super") ||
      roleLower.includes("admin") ||
      emailLower.includes("admin@htechnology.com") ||
      emailLower.includes("athaporn@htechnology.com");

    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "ไม่มีสิทธิ์ดำเนินการ: เฉพาะ Super Administrator เท่านั้นที่สามารถอัปเดตราคากลางแบบ Bulk ได้",
        },
        { status: 403 }
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const CHUNK_SIZE = 1000;

    if (importType === "labor") {
      // Disabled — RepairPrice (the generic vehicleType+size labor price table this
      // wrote to) has been replaced by LaborPrice (real per-brand/per-model data
      // imported from the 21-sheet labor-code Excel, see scripts/import-labor-prices.ts).
      // Writing here would silently go to a table nothing reads anymore.
      return NextResponse.json(
        {
          success: false,
          error: "ฟีเจอร์นี้ปิดใช้งานชั่วคราว — ระบบเปลี่ยนไปใช้ข้อมูลราคาค่าแรงชุดใหม่ (LaborPrice) แล้ว กรุณาติดต่อผู้ดูแลระบบหากต้องการอัปเดตราคาค่าแรง",
        },
        { status: 410 },
      );
    } else {
      // Process Spare Part Prices (PartCatalogPrice) with Strict Validation
      const validItems: any[] = [];
      for (const rawItem of items) {
        const item = mapExcelRowToPartCatalog(rawItem);
        // Strict Check: Must have partTh AND at least one valid part price > 0
        const hasPrice = (item.oemPrice && item.oemPrice > 0) ||
                         (item.aftermarketPrice && item.aftermarketPrice > 0) ||
                         (item.usedPrice && item.usedPrice > 0);

        if (!item.partTh || item.partTh.length < 2 || !hasPrice) {
          failedCount++;
          continue;
        }
        validItems.push({
          brand: item.brand || "ทั่วไป",
          model: item.model || "ทุกรุ่น",
          yearRange: item.yearRange || "2018-2024",
          category: item.category || "sedan_asia",
          partTh: item.partTh,
          partEn: item.partEn,
          oemPrice: item.oemPrice || 0,
          aftermarketPrice: item.aftermarketPrice,
          usedPrice: item.usedPrice,
          note: item.note,
        });
      }

      if (validItems.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "⚠️ ไม่พบรายการราคาค่าอะไหล่ที่สมบูรณ์ในไฟล์นี้ กรุณาตรวจสอบหัวตารางให้ตรงกับ Template หรือตรวจสอบว่าอัปโหลดตรงกล่องหรือไม่",
          },
          { status: 400 }
        );
      }

      for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
        const chunk = validItems.slice(i, i + CHUNK_SIZE);
        try {
          await prisma.partCatalogPrice.createMany({
            data: chunk,
          });
          successCount += chunk.length;
        } catch {
          for (const item of chunk) {
            try {
              await prisma.partCatalogPrice.upsert({
                where: { brand_model_partTh: { brand: item.brand, model: item.model, partTh: item.partTh } },
                update: { yearRange: item.yearRange, category: item.category, partEn: item.partEn, oemPrice: item.oemPrice, aftermarketPrice: item.aftermarketPrice, usedPrice: item.usedPrice, note: item.note },
                create: item,
              });
              successCount++;
            } catch {
              failedCount++;
            }
          }
        }
      }
    }

    // Record Audit Log into SystemAuditLog
    const performerInfo = `${performerName || "อรรถ ทดสอบ"} [${performerRole || "Super Administrator"}]`;
    const detailsJson = JSON.stringify({
      filename: filename || "bulk_price_import.xlsx",
      importType: importType === "labor" ? "ราคาค่าแรง" : "ราคาค่าอะไหล่",
      totalUploaded: items.length,
      successCount,
      failedCount,
    });

    await prisma.systemAuditLog.create({
      data: {
        module: "PRICE_CATALOG",
        action: "BULK_IMPORT",
        entityId: importType,
        entityName: filename || "bulk_price_import.xlsx",
        details: detailsJson,
        performerName: performerInfo,
      },
    });

    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลแบบ Bulk พร้อม Smart Auto-Mapping สำเร็จ ${successCount} รายการ (ล้มเหลว/ข้าม ${failedCount} รายการ)`,
      totalCount: items.length,
      successCount,
      failedCount,
    });
  } catch (error: any) {
    console.error("Bulk price import failed:", error);
    return NextResponse.json({ success: false, error: error.message || "เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel" }, { status: 500 });
  }
}
