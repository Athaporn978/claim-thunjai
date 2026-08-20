// Next.js 16 renamed "middleware" to "proxy" (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// This file replaces the old middleware.ts convention and defaults to the Node.js runtime.
//
// Gates every /api/* route behind a valid signed session cookie, except the
// public routes listed below (login, and the token-based customer inspection flow).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, isSuperAdmin, SESSION_COOKIE_NAME } from "@/lib/session";

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/inspect", // customer inspection flow — authenticated by URL token, not employee session
  "/api/inspection-validate", // called server-to-server from the inspection submit route
];

// Mirrors the restriction PortalLayout.tsx already applies to the matching UI pages
// (/admin/* and /parts-catalog/import) — enforced here server-side so it can't be bypassed.
const SUPER_ADMIN_ONLY_API_PATHS = [
  "/api/admin",
  "/api/parts-catalog/import",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/") || matchesPrefix(pathname, PUBLIC_API_PATHS)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized — กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });
  }

  if (matchesPrefix(pathname, SUPER_ADMIN_ONLY_API_PATHS) && !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden — เฉพาะผู้ดูแลระบบ (Super Admin) เท่านั้น" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
