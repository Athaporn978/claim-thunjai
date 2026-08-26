"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { useSidebar } from "@/lib/SidebarContext";

type MenuItem = {
  href: string;
  labelTh: string;
  labelEn: string;
  icon: React.ReactNode;
};

type MenuGroup = {
  groupTh?: string;
  groupEn?: string;
  items: MenuItem[];
};

export function Sidebar() {
  const { lang, setLang } = useLang();
  const { isCollapsed, toggleSidebar, isMobileOpen, closeMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  // Below lg the sidebar is an overlay drawer that always shows full labels, so the
  // desktop "collapsed to icons" mode must not apply while it's open. isMobileOpen can
  // only be set from the lg:hidden hamburger, so on desktop this is just isCollapsed.
  const showCollapsed = isCollapsed && !isMobileOpen;

  // Current User Session State
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    roleName: string;
    branchName: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.name || parsed.email)) {
          setCurrentUser({
            name: parsed.name || "ผู้ใช้งาน",
            email: parsed.email || "",
            roleName: parsed.roleName || parsed.role || "เจ้าหน้าที่คุมราคา",
            branchName: parsed.branchName || parsed.branch || "",
          });
        }
      }
    } catch (e) {
      console.error("Error parsing currentUser in Sidebar", e);
    }
  }, [pathname]);

  // Tapping a menu item navigates but leaves the drawer covering the page it just
  // opened, so dismiss it whenever the route changes.
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const isSuperAdmin =
    Boolean(currentUser) &&
    ((currentUser?.roleName || "").toLowerCase().includes("super administrator") ||
      (currentUser?.roleName || "").toLowerCase() === "super admin" ||
      (currentUser?.email || "").toLowerCase().includes("athaporn@htechnology.com") ||
      (currentUser?.email || "").toLowerCase().includes("admin@htechnology.com"));

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("claim_user_profile");
    }
    router.push("/login");
  };

  // Accordion state for collapsible menu groups
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  const toggleGroup = (gIdx: number) => {
    setOpenGroups((prev) => ({ ...prev, [gIdx]: !prev[gIdx] }));
  };

  // Re-grouped menu items according to user request
  const menuGroups: MenuGroup[] = [
    {
      groupTh: "ระบบคุมราคา",
      groupEn: "PRICE CONTROL SYSTEM",
      items: [
        {
          href: "/quotations",
          labelTh: "คุมราคา",
          labelEn: "Price Control",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTh: "ระบบวิเคราะห์ความเสียหาย",
      groupEn: "AI DETECTION SYSTEM",
      items: [
        {
          href: "/analyze",
          labelTh: "วิเคราะห์ความเสียหาย AI",
          labelEn: "AI Damage Detection",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
        {
          href: "/dashboard",
          labelTh: "รวมเคสวิเคราะห์ความเสียหาย",
          labelEn: "Damage Cases Overview",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTh: "ระบบราคากลาง",
      groupEn: "STANDARD PRICE CATALOG",
      items: [
        {
          href: "/catalog",
          labelTh: "ราคาค่าแรง",
          labelEn: "Labor Price Catalog",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          href: "/parts-catalog",
          labelTh: "ราคาค่าอะไหล่",
          labelEn: "Parts Price Catalog",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
        {
          href: "/parts-catalog/import",
          labelTh: "อัปเดตราคากลาง (Bulk Excel)",
          labelEn: "Bulk Price Update",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTh: "ตั้งค่า & การจัดการผู้ใช้",
      groupEn: "SETTINGS & USER MANAGEMENT",
      items: [
        {
          href: "/admin/branches",
          labelTh: "สาขา",
          labelEn: "Branches",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4" />
            </svg>
          ),
        },
        {
          href: "/admin/roles",
          labelTh: "บทบาท",
          labelEn: "Roles",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          ),
        },
        {
          href: "/admin/users",
          labelTh: "พนักงาน",
          labelEn: "Employees",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          href: "/admin/workflow",
          labelTh: "ตั้งค่า Workflow",
          labelEn: "Workflow Settings",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTh: "ระบบรายงาน",
      groupEn: "REPORTS & ANALYTICS",
      items: [
        {
          href: "/reports",
          labelTh: "รายงานสรุปยอด Saving",
          labelEn: "Saving Reports",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          href: "/reports/sla",
          labelTh: "รายงาน SLA",
          labelEn: "SLA Performance Report",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          href: "/reports/garage-integrity",
          labelTh: "คะแนนอู่/ศูนย์",
          labelEn: "Garage Rating",
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#0b132a] text-white flex flex-col h-screen max-h-screen border-r border-[#152243] font-sans transition-all duration-300 ease-in-out overflow-hidden no-print
        fixed inset-y-0 left-0 z-50 w-64 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:sticky lg:top-0 lg:z-30 lg:shrink-0 lg:translate-x-0 ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
    >
      {/* Brand Header & Toggle */}
      <div className="p-4 border-b border-[#152243] flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 truncate">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-600/30 shrink-0">
            <img src="/logo/Htech_logo.webp" alt="H Technology" className="w-full h-full object-cover" />
          </div>
          {!showCollapsed && (
            <div className="flex flex-col leading-tight truncate">
              <span className="font-extrabold text-base tracking-tight text-white">ClaimThunJai</span>
              <span className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">B2B CLAIMS PORTAL</span>
            </div>
          )}
        </div>

        {/* Collapse Toggle — desktop only; below lg the sidebar is a drawer, not a rail */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:block p-1.5 rounded-xl bg-[#111c38] text-slate-300 hover:text-white hover:bg-[#1b2b52] border border-[#1b2b52] transition cursor-pointer shrink-0"
          title={isCollapsed ? (lang === "th" ? "ขยายแถบเมนู" : "Expand Sidebar") : (lang === "th" ? "ย่อแถบเมนู" : "Collapse Sidebar")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>

        {/* Close Drawer — mobile only */}
        <button
          onClick={closeMobile}
          className="lg:hidden p-1.5 rounded-xl bg-[#111c38] text-slate-300 hover:text-white hover:bg-[#1b2b52] border border-[#1b2b52] transition cursor-pointer shrink-0"
          aria-label={lang === "th" ? "ปิดเมนู" : "Close menu"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation List with Groups */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        {menuGroups
          .map((group) => {
            if (
              !isSuperAdmin &&
              (group.groupTh === "ตั้งค่า & การจัดการผู้ใช้" || group.groupTh === "ระบบราคากลาง")
            ) {
              return null;
            }
            const filteredItems = group.items.filter((item) => {
              if (!isSuperAdmin && item.href === "/parts-catalog/import") {
                return false;
              }
              return true;
            });
            if (filteredItems.length === 0) return null;
            return { ...group, items: filteredItems };
          })
          .filter((g): g is MenuGroup => g !== null)
          .map((group, gIdx) => {
            const isOpen = openGroups[gIdx] ?? true;
            return (
              <div key={gIdx} className="space-y-1">
                {group.groupTh && !showCollapsed && (
                  <button
                    onClick={() => toggleGroup(gIdx)}
                    className="w-full mt-3.5 mb-1 px-3 py-2 rounded-xl bg-[#111c38] hover:bg-[#16264d] border border-[#1b2d58] flex items-center justify-between gap-2.5 text-sm font-extrabold text-blue-300 shadow-2xs transition cursor-pointer select-none"
                    title={isOpen ? (lang === "th" ? "คลิกเพื่อย่อหมวดหมู่นี้" : "Collapse group") : (lang === "th" ? "คลิกเพื่อขยายหมวดหมู่นี้" : "Expand group")}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-[#0071e3] shadow-xs shadow-blue-500/80 shrink-0"></span>
                      <span className="tracking-wide text-sm font-extrabold truncate">{lang === "th" ? group.groupTh : group.groupEn}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-blue-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {(isOpen || showCollapsed || !group.groupTh) && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" &&
                          item.href !== "/reports" &&
                          item.href !== "/parts-catalog" &&
                          pathname?.startsWith(item.href + "/"));
                      const label = lang === "th" ? item.labelTh : item.labelEn;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={showCollapsed ? label : undefined}
                          className={`flex items-center ${
                            showCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                          } rounded-2xl text-sm transition duration-200 ${
                            isActive
                              ? "bg-[#2563eb] text-white font-extrabold shadow-lg shadow-blue-600/30"
                              : "text-slate-300 font-semibold hover:bg-[#152243] hover:text-white"
                          }`}
                        >
                          <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
                          {!showCollapsed && <span className="truncate">{label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Bottom User Profile & Lang & Logout */}
      <div className="p-3 border-t border-[#152243] bg-[#070d1e] space-y-3">
        {/* User Profile Pill */}
        {!showCollapsed ? (
          <div className="flex items-center justify-between bg-[#111c38] p-2.5 rounded-2xl border border-[#1b2b52]">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md">
                {currentUser?.name ? currentUser.name.trim().substring(0, 2).toUpperCase() : "US"}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-white truncate">
                  {currentUser?.name || "ผู้ใช้งานระบบ"}
                </span>
                <span className="text-[10px] text-blue-300 font-medium truncate">
                  {currentUser?.branchName || currentUser?.roleName || "สาขาลาดพร้าว"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-9 h-9 rounded-full bg-[#0071e3] text-white font-extrabold text-xs flex items-center justify-center shadow-md cursor-pointer"
              title={`${currentUser?.name || "ผู้ใช้งาน"} (${currentUser?.email || ""})`}
            >
              {currentUser?.name ? currentUser.name.trim().substring(0, 2).toUpperCase() : "US"}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className={`flex items-center ${showCollapsed ? "flex-col gap-2" : "justify-between"} pt-1`}>
          <div className="flex items-center text-xs font-bold bg-[#111c38] rounded-xl p-0.5 border border-[#1b2b52]">
            <button
              onClick={() => setLang("th")}
              className={`px-2.5 py-1 rounded-lg transition ${
                lang === "th" ? "bg-[#2563eb] text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              TH
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-lg transition ${
                lang === "en" ? "bg-[#2563eb] text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
            title="ออกจากระบบ"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!showCollapsed && <span>{lang === "th" ? "ออก" : "Logout"}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
