import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } from "@/lib/session";
import { verifyPassword, hashPassword, isBcryptHash } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function withSessionCookie(
  res: NextResponse,
  user: { id: string; email: string; roleName: string; branchName: string; name: string; permissions: string[] },
) {
  const token = createSessionToken(user);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

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
    if (employee.password) {
      const ok = await verifyPassword(password, employee.password);
      if (!ok) {
        return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองอีกครั้ง" }, { status: 401 });
      }
      // Lazy-migrate legacy plaintext passwords to a bcrypt hash on successful login.
      if (!isBcryptHash(employee.password)) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { password: await hashPassword(password) },
        });
      }
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

    const user = {
      id: employee.id,
      code: employee.code,
      name: employee.name,
      email: employee.email,
      roleName: employee.role?.name || "พนักงาน",
      branchName: employee.branch?.name || "ไม่ระบุสาขา",
      permissions: parsePermissions(employee.role?.permissions),
    };
    return withSessionCookie(NextResponse.json({ success: true, user }), user);
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }, { status: 500 });
  }
}
