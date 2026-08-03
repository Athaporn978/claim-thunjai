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
      return NextResponse.json({ error: "ไม่พบข้อมูลพนักงานที่จะนำเข้า" }, { status: 400 });
    }

    // Load existing branches, roles, and employees
    const [branches, roles, existingEmps] = await Promise.all([
      prisma.branch.findMany(),
      prisma.role.findMany(),
      prisma.employee.findMany(),
    ]);

    const branchMap = new Map<string, string>();
    branches.forEach((b) => {
      branchMap.set(b.code.trim().toLowerCase(), b.id);
      branchMap.set(b.name.trim().toLowerCase(), b.id);
    });

    const roleMap = new Map<string, string>();
    roles.forEach((r) => {
      roleMap.set(r.code.trim().toLowerCase(), r.id);
      roleMap.set(r.name.trim().toLowerCase(), r.id);
    });

    const existingCodes = new Set(existingEmps.map((e) => e.code.trim().toLowerCase()));
    const existingEmails = new Set(existingEmps.map((e) => e.email.trim().toLowerCase()));

    // Find highest numeric code for auto-running sequential code (e.g., EMP-001)
    let autoSeqIndex = existingEmps.length + 1;

    const validData: {
      code: string;
      name: string;
      email: string;
      username: string;
      password: string;
      phone: string | null;
      branchId: string | null;
      roleId: string | null;
      status: string;
    }[] = [];

    const errors: string[] = [];
    const inBatchCodes = new Set<string>();
    const inBatchEmails = new Set<string>();
    const inBatchUsernames = new Set<string>();
    const existingUsernames = new Set(existingEmps.map((e) => (e.username || "").trim().toLowerCase()).filter(Boolean));

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const lineNo = idx + 1;
      let code = String(r.code || "").trim();
      const name = String(r.name || "").trim();
      const email = String(r.email || "").trim();
      let username = String(r.username || "").trim();
      let password = String(r.password || "").trim() || "password123";
      const phone = String(r.phone || "").trim() || null;
      const branchInput = String(r.branch || "").trim();
      const roleInput = String(r.role || "").trim();
      const statusInput = String(r.status || "active").toLowerCase().includes("ระงับ") || String(r.status || "").toLowerCase() === "suspended" ? "suspended" : "active";

      // Auto-generate employee code if missing or empty
      if (!code) {
        let generated = `EMP-${String(autoSeqIndex).padStart(3, "0")}`;
        while (existingCodes.has(generated.toLowerCase()) || inBatchCodes.has(generated.toLowerCase())) {
          autoSeqIndex++;
          generated = `EMP-${String(autoSeqIndex).padStart(3, "0")}`;
        }
        code = generated;
        autoSeqIndex++;
      }

      if (!username) {
        username = email.split("@")[0] || code.toLowerCase().replace(/[^a-z0-9]/g, "");
      }

      if (!name || !email) {
        errors.push(`แถวที่ ${lineNo}: ข้อมูลไม่ครบ (ต้องมี ชื่อ-นามสกุล และ อีเมล)`);
        continue;
      }

      // Check branch requirement
      let branchId: string | null = null;
      if (branchInput) {
        branchId = branchMap.get(branchInput.toLowerCase()) || null;
        if (!branchId) {
          errors.push(`แถวที่ ${lineNo} (${name}): ไม่พบสาขา "${branchInput}" ในระบบ (กรุณาสร้างสาขาก่อน)`);
          continue;
        }
      } else {
        errors.push(`แถวที่ ${lineNo} (${name}): กรุณาระบุสาขาในไฟล์ Excel (ต้องสร้างและระบุสาขาก่อน)`);
        continue;
      }

      // Check role requirement
      let roleId: string | null = null;
      if (roleInput) {
        roleId = roleMap.get(roleInput.toLowerCase()) || null;
        if (!roleId) {
          errors.push(`แถวที่ ${lineNo} (${name}): ไม่พบบทบาท "${roleInput}" ในระบบ (กรุณาสร้างบทบาทก่อน)`);
          continue;
        }
      } else {
        errors.push(`แถวที่ ${lineNo} (${name}): กรุณาระบุบทบาทในไฟล์ Excel (ต้องสร้างและระบุบทบาทก่อน)`);
        continue;
      }

      // Check duplicates
      const codeLower = code.toLowerCase();
      const emailLower = email.toLowerCase();
      const usernameLower = username.toLowerCase();

      if (existingCodes.has(codeLower) || inBatchCodes.has(codeLower)) {
        errors.push(`แถวที่ ${lineNo}: รหัสพนักงาน "${code}" มีอยู่ในระบบแล้ว`);
        continue;
      }

      if (existingEmails.has(emailLower) || inBatchEmails.has(emailLower)) {
        errors.push(`แถวที่ ${lineNo}: อีเมล "${email}" มีอยู่ในระบบแล้ว`);
        continue;
      }

      if (existingUsernames.has(usernameLower) || inBatchUsernames.has(usernameLower)) {
        username = `${username}_${Math.floor(100 + Math.random() * 900)}`;
      }

      inBatchCodes.add(codeLower);
      inBatchEmails.add(emailLower);
      inBatchUsernames.add(username.toLowerCase());

      validData.push({
        code,
        name,
        email,
        username,
        password,
        phone,
        branchId,
        roleId,
        status: statusInput,
      });
    }

    if (validData.length > 0) {
      await prisma.employee.createMany({
        data: validData,
      });

      await logAudit({
        module: "EMPLOYEE",
        action: "IMPORT",
        entityName: `นำเข้าแบบ Bulk (${validData.length} พนักงาน)`,
        details: `นำเข้าข้อมูลพนักงานแบบ Bulk Excel สำเร็จจำนวน ${validData.length} รายการ`,
      });
    }

    return NextResponse.json({
      success: true,
      importedCount: validData.length,
      errors,
    });
  } catch (err) {
    console.error("Import employees error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการนำเข้าไฟล์" }, { status: 500 });
  }
}
