"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext";
import { useLang } from "@/lib/LangContext";

// Separate component so it can read the sidebar context that PortalLayout provides.
function PortalShell({ children }: { children: React.ReactNode }) {
  const { isMobileOpen, openMobile, closeMobile, isCollapsed, toggleSidebar } = useSidebar();
  const { lang } = useLang();
  const router = useRouter();
  const [portalUser, setPortalUser] = useState<{ name: string; branchName: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        const u = JSON.parse(stored);
        setPortalUser({
          name: u.name || "ผู้ใช้งาน",
          branchName: u.branchName || u.branch?.name || u.roleName || "",
        });
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("currentUser");
    localStorage.removeItem("claim_user_profile");
    router.push("/login");
  };

  return (
    <div className="h-screen max-h-screen flex bg-[#f0f4fd] overflow-hidden print:h-auto print:max-h-none print:bg-white print:block print:overflow-visible">
      <Sidebar />

      {/* Backdrop for the mobile drawer — sits under the sidebar (z-50), over content */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          aria-hidden="true"
          className="lg:hidden fixed inset-0 z-40 bg-black/50 no-print"
        />
      )}

      <main className="flex-1 min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-[#f0f4fd] print:h-auto print:max-h-none print:bg-white print:overflow-visible">
        {/* Top bar — always below lg (the only way to reach the nav there), and on
            desktop only while the sidebar is hidden, so there is always a way back. */}
        <div
          className={`${isCollapsed ? "" : "lg:hidden"} sticky top-0 z-20 flex items-center gap-3 bg-[#0b132a] text-white px-4 py-2.5 border-b border-[#152243] no-print`}
        >
          {/* Below lg the button opens the drawer; on desktop it restores the sidebar. */}
          <button
            onClick={openMobile}
            aria-label={lang === "th" ? "เปิดเมนู" : "Open menu"}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-200 hover:text-white hover:bg-[#1b2b52] transition cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={toggleSidebar}
            aria-label={lang === "th" ? "แสดงแถบเมนู" : "Show sidebar"}
            title={lang === "th" ? "แสดงแถบเมนู" : "Show sidebar"}
            className="hidden lg:block p-2 -ml-1 rounded-xl text-slate-200 hover:text-white hover:bg-[#1b2b52] transition cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <img src="/logo/Htech_logo.webp" alt="H Technology" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold tracking-tight truncate">ClaimThunJai</span>

          {/* User info + Logout — right side of top bar */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {portalUser && (
              <>
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-xs font-bold text-white truncate max-w-[140px]">{portalUser.name}</span>
                  {portalUser.branchName && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{portalUser.branchName}</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title={lang === "th" ? "ออกจากระบบ" : "Logout"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b2b52] hover:bg-red-600/80 text-slate-200 hover:text-white transition active:scale-95 cursor-pointer text-xs font-bold"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  <span className="hidden sm:inline">{lang === "th" ? "ออก" : "Logout"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 print:p-0 print:m-0">{children}</div>
      </main>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isPortal =
    pathname?.startsWith("/dashboard") ||
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
      <PortalShell>{children}</PortalShell>
    </SidebarProvider>
  );
}
