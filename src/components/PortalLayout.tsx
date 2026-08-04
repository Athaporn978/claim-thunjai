"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/lib/SidebarContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isPortal =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/intake") ||
    pathname?.startsWith("/analyze") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/catalog") ||
    pathname?.startsWith("/parts-catalog") ||
    pathname?.startsWith("/quotation") ||
    pathname?.startsWith("/reports") ||
    pathname?.startsWith("/docs");

  useEffect(() => {
    if (!isPortal) return;
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/login");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      const roleName = (user?.roleName || user?.role || "").toLowerCase();
      const email = (user?.email || "").toLowerCase();
      const isSuperAdmin =
        roleName.includes("super") ||
        roleName.includes("admin") ||
        email.includes("athaporn@htechnology.com") ||
        email.includes("admin@htechnology.com");

      // Route Protection Guard: Restrict /admin/* and /parts-catalog/import to Super Admin only
      const isRestrictedPath = pathname?.startsWith("/admin") || pathname?.startsWith("/parts-catalog/import");
      if (isRestrictedPath && !isSuperAdmin) {
        router.push("/quotations");
        return;
      }

      if (user && user.id && user.id !== "admin-default") {
        fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              alert(data.error || "เซสชันของคุณหมดอายุ หรือสิทธิ์การใช้งานถูกระงับ");
              localStorage.removeItem("currentUser");
              router.push("/login");
            }
          })
          .catch((err) => {
            console.error("Session check fail:", err);
          });
      }
    } catch (e) {
      localStorage.removeItem("currentUser");
      router.push("/login");
    }
  }, [isPortal, pathname, router]);

  if (!isPortal) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="h-screen max-h-screen flex bg-[#f0f4fd] overflow-hidden print:h-auto print:max-h-none print:bg-white print:block print:overflow-visible">
        <Sidebar />
        <main className="flex-1 min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-[#f0f4fd] p-4 sm:p-6 lg:p-8 print:h-auto print:max-h-none print:bg-white print:p-0 print:m-0 print:overflow-visible">{children}</main>
      </div>
    </SidebarProvider>
  );
}
