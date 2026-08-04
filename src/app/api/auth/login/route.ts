import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || body.username || "").trim();
    const password = String(body.password || "").trim();

    if (!email) {
      return NextResponse.json({ error: "กรุณาระบุอีเมลเข้าใช้งาน" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "กรุณาระบุรหัสผ่าน (Password)" }, { status: 400 });
    }

    // Find employee by email or code
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: email },
          { code: email },
        ],
      },
      include: { branch: true, role: true },
    });

    if (!employee) {
      // Demo credentials fallback for testing
      if (email === "admin@claimthunjai.com" || email === "athaporn@htechnology.com" || email === "admin@htechnology.com") {
        return NextResponse.json({
          success: true,
          user: {
            id: "admin-default",
            code: "EMP-001",
            name: "อรรถพล โชคชัย (Super Admin)",
            email: "athaporn@htechnology.com",
            roleName: "Super Administrator",
            branchName: "สำนักงานใหญ่ (กรุงเทพมหานคร)",
          },
        });
      }
      if (email === "somchai@htechnology.com") {
        return NextResponse.json({
          success: true,
          user: {
            id: "emp-somchai",
            code: "EMP-002",
            name: "สมชาย มีสุข (สาขาลาดพร้าว)",
            email: "somchai@htechnology.com",
            roleName: "เจ้าหน้าที่คุมราคา",
            branchName: "สาขาลาดพร้าว (กรุงเทพมหานคร)",
          },
        });
      }
      if (email === "kanya@htechnology.com") {
        return NextResponse.json({
          success: true,
          user: {
            id: "emp-kanya",
            code: "EMP-003",
            name: "กัญญา วงศ์ใหญ่ (สาขาเชียงใหม่)",
            email: "kanya@htechnology.com",
            roleName: "เจ้าหน้าที่คุมราคา",
            branchName: "สาขาเชียงใหม่",
          },
        });
      }
      if (email === "supervisor_latphrao@htechnology.com") {
        return NextResponse.json({
          success: true,
          user: {
            id: "emp-sup-latphrao",
            code: "EMP-005",
            name: "สมเกียรติ ยิ่งใหญ่ (หัวหน้าคุมราคา-ลาดพร้าว)",
            email: "supervisor_latphrao@htechnology.com",
            roleName: "หัวหน้าคุมราคา (Supervisor)",
            branchName: "สาขาลาดพร้าว (กรุงเทพมหานคร)",
          },
        });
      }
      if (email === "supervisor_chiangmai@htechnology.com") {
        return NextResponse.json({
          success: true,
          user: {
            id: "emp-sup-chiangmai",
            code: "EMP-006",
            name: "นภา สว่างจิต (หัวหน้าคุมราคา-เชียงใหม่)",
            email: "supervisor_chiangmai@htechnology.com",
            roleName: "หัวหน้าคุมราคา (Supervisor)",
            branchName: "สาขาเชียงใหม่",
          },
        });
      }
      return NextResponse.json({ error: "ไม่พบข้อมูลอีเมลนี้ในระบบ" }, { status: 401 });
    }

    if (employee.status !== "active") {
      return NextResponse.json({ error: "บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" }, { status: 403 });
    }

    if (employee.branch && employee.branch.status !== "active") {
      return NextResponse.json({ error: "สาขาที่บัญชีนี้สังกัดถูกปิดใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ" }, { status: 403 });
    }

    if (employee.role && employee.role.status !== "active") {
      return NextResponse.json({ error: "บทบาทหน้าที่ของบัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" }, { status: 403 });
    }

    // Verify password if set
    if (employee.password && employee.password !== password) {
      return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองอีกครั้ง" }, { status: 401 });
    }

    const performerName = `${employee.name} (${employee.role?.name || "พนักงาน"})`;

    await logAudit({
      module: "EMPLOYEE",
      action: "UPDATE",
      entityId: employee.id,
      entityName: employee.name,
      details: `พนักงานเข้าสู่ระบบ (Login) สำเร็จ: ${employee.name} [Email: ${employee.email}]`,
      performerName,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        code: employee.code,
        name: employee.name,
        email: employee.email,
        roleName: employee.role?.name || "พนักงาน",
        branchName: employee.branch?.name || "ไม่ระบุสาขา",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }, { status: 500 });
  }
}
