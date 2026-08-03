import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสาขาที่จะนำเข้า" }, { status: 400 });
    }

    const existingBranches = await prisma.branch.findMany();
    const existingCodes = new Set(existingBranches.map((b) => b.code.trim().toLowerCase()));
    const existingNames = new Set(existingBranches.map((b) => b.name.trim().toLowerCase()));

    let autoSeqIndex = existingBranches.length + 1;

    const validData: {
      code: string;
      name: string;
      address: string | null;
      phone: string | null;
      status: string;
    }[] = [];

    const errors: string[] = [];
    const inBatchCodes = new Set<string>();
    const inBatchNames = new Set<string>();

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const lineNo = idx + 1;
      let code = String(r.code || "").trim();
      const name = String(r.name || "").trim();
      const address = String(r.address || "").trim() || null;
      const phone = String(r.phone || "").trim() || null;
      const statusInput = String(r.status || "active").toLowerCase().includes("ปิด") || String(r.status || "").toLowerCase() === "inactive" ? "inactive" : "active";

      if (!name) {
        errors.push(`แถวที่ ${lineNo}: กรุณาระบุชื่อสาขา`);
        continue;
      }

      // Auto-generate branch code if missing
      if (!code) {
        let generated = `BR-${String(autoSeqIndex).padStart(2, "0")}`;
        while (existingCodes.has(generated.toLowerCase()) || inBatchCodes.has(generated.toLowerCase())) {
          autoSeqIndex++;
          generated = `BR-${String(autoSeqIndex).padStart(2, "0")}`;
        }
        code = generated;
        autoSeqIndex++;
      }

      const codeLower = code.toLowerCase();
      const nameLower = name.toLowerCase();

      if (existingCodes.has(codeLower) || inBatchCodes.has(codeLower)) {
        errors.push(`แถวที่ ${lineNo}: รหัสสาขา "${code}" มีอยู่ในระบบหรือซ้ำในไฟล์`);
        continue;
      }

      if (existingNames.has(nameLower) || inBatchNames.has(nameLower)) {
        errors.push(`แถวที่ ${lineNo}: ชื่อสาขา "${name}" มีอยู่ในระบบหรือซ้ำในไฟล์`);
        continue;
      }

      inBatchCodes.add(codeLower);
      inBatchNames.add(nameLower);

      validData.push({
        code,
        name,
        address,
        phone,
        status: statusInput,
      });
    }

    if (validData.length > 0) {
      await prisma.branch.createMany({
        data: validData,
      });

      await logAudit({
        module: "BRANCH",
        action: "IMPORT",
        entityName: `นำเข้าแบบ Bulk (${validData.length} สาขา)`,
        details: `นำเข้าข้อมูลสาขาแบบ Bulk Excel สำเร็จจำนวน ${validData.length} รายการ`,
      });
    }

    return NextResponse.json({
      success: true,
      importedCount: validData.length,
      errors,
    });
  } catch (err) {
    console.error("Import branches error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการนำเข้าไฟล์สาขา" }, { status: 500 });
  }
}
