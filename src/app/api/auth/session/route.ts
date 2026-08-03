import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { branch: true, role: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้นี้ในระบบ" }, { status: 404 });
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
