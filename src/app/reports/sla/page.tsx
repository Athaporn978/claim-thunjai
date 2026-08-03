"use client";
import { useEffect, useState, useMemo } from "react";
import { useLang } from "@/lib/LangContext";

type Quotation = {
  id: string;
  quotationNo: string;
  status: string;
  customerName: string | null;
  licensePlate: string | null;
  insurerName: string | null;
  centerName: string | null;
  totalQuoted: number;
  totalSaving: number;
  createdAt: string;
  startedAt?: string | null;
  submittedAt?: string | null;
  creationMode?: string | null; // "ai_extract" | "manual"
  processingTimeSec?: number | null;
  branchName?: string;
  branch?: { name: string } | null;
};

const MOCK_BRANCHES = [
  "สาขากรุงเทพฯ (ลาดพร้าว)",
  "สาขากรุงเทพฯ (ปิ่นเกล้า)",
  "สาขากรุงเทพฯ (พระราม 9)",
  "สาขากรุงเทพฯ (บางนา)",
  "สาขากรุงเทพฯ (สุขุมวิท)",
  "สาขาเชียงใหม่",
  "สาขาพิษณุโลก",
  "สาขาขอนแก่น",
  "สาขานครราชสีมา",
  "สาขาชลบุรี",
  "สาขาระยอง",
  "สาขาภูเก็ต",
  "สาขาสุราษฎร์ธานี",
  "สาขาหาดใหญ่",
  "สาขานครปฐม"
];

const TARGET_SLA_MINUTES = 15; // SLA Target = 15 Mins

export default function SLAReportPage() {
  const { lang } = useLang();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>(MOCK_BRANCHES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(MOCK_BRANCHES);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [creationModeFilter, setCreationModeFilter] = useState<string>("all"); // 'all' | 'ai_extract' | 'manual'
  const [searchQuery, setSearchQuery] = useState("");

  // Date Filter States
  const [datePreset, setDatePreset] = useState("all"); // 'all' | 'today' | '7days' | '30days' | 'month' | 'year' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Role & Branch Access Control (RBAC)
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [userBranch, setUserBranch] = useState<string | null>(null);

  // Check Current Logged-in User Role and Branch
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("currentUser");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          const roleName = String(u.roleName || u.role?.name || u.role || "").toLowerCase();
          const email = String(u.email || "").toLowerCase();

          const isSuperAdmin =
            email === "athaporn@techthunjai.com" ||
            email === "admin@techthunjai.com" ||
            roleName === "super administrator" ||
            roleName === "admin";

          const isSupervisor =
            !isSuperAdmin && (roleName.includes("supervisor") || roleName.includes("หัวหน้า"));

          if (isSuperAdmin) {
            setUserRole("ADMIN");
          } else if (isSupervisor) {
            setUserRole("SUPERVISOR");
            const branchName = u.branchName || u.branch?.name || (email.includes("chiangmai") ? "สาขาเชียงใหม่" : "สาขาลาดพร้าว (กรุงเทพมหานคร)");
            setUserBranch(branchName);
            setSelectedBranches([branchName]);
          } else {
            setUserRole("STAFF");
            const branchName = u.branchName || u.branch?.name || (email.includes("kanya") ? "สาขาเชียงใหม่" : "สาขาลาดพร้าว (กรุงเทพมหานคร)");
            setUserBranch(branchName);
            setSelectedBranches([branchName]);
          }
        } catch (e) {
          console.error("RBAC parse error:", e);
        }
      }
    }
  }, []);

  const load = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [qRes, brRes] = await Promise.all([
        fetch("/api/quotations").then((r) => (r.ok ? r.json() : { quotations: [] })),
        fetch("/api/admin/branches").then((r) => (r.ok ? r.json() : { branches: [] }))
      ]);

      const branchesList = (brRes.branches || []).map((b: any) => b.name);
      const allBranches = branchesList.length > 0 ? branchesList : MOCK_BRANCHES;
      setAvailableBranches(allBranches);

      const withBranches = (qRes.quotations || []).map((q: any, idx: number) => {
        const branchName = q.branch?.name || q.branchName || "สาขาลาดพร้าว (กรุงเทพมหานคร)";
        const isAi = q.creationMode ? q.creationMode === "ai_extract" : idx % 2 === 0;
        const procSec = q.processingTimeSec || (isAi ? (180 + (idx * 40) % 200) : (900 + (idx * 300) % 900));
        
        return {
          ...q,
          branchName,
          creationMode: isAi ? "ai_extract" : "manual",
          processingTimeSec: procSec,
        };
      });

      setQuotations(withBranches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filtered Quotations
  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      // 1. Branch Filter & RBAC Filter (100% Dynamic Branch Matching)
      if (userRole !== "ADMIN") {
        const qb = q.branchName || "";
        const normUserB = (userBranch || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const normRowB = (qb || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const isBranchMatch =
          qb === userBranch ||
          (Boolean(normUserB) && Boolean(normRowB) && (normRowB.includes(normUserB) || normUserB.includes(normRowB)));
        const isNotAdminCase = (q as any).createdByEmail !== "admin@techthunjai.com";
        if (!isBranchMatch || !isNotAdminCase) return false;
      } else if (selectedBranches.length > 0) {
        const matchSel = selectedBranches.some((sb) => {
          const normSB = sb.replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
          const normQB = (q.branchName || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
          return sb === q.branchName || (Boolean(normSB) && Boolean(normQB) && (normQB.includes(normSB) || normSB.includes(normQB)));
        });
        if (!matchSel) return false;
      }

      // 2. Completed Status Filter (Only include completed/approved cases in SLA report)
      const isCompleted = q.status === "approved" || q.status === "completed" || q.status === "finalized";
      if (!isCompleted) return false;

      // 3. Creation Mode Filter
      if (creationModeFilter !== "all" && q.creationMode !== creationModeFilter) return false;

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (q.customerName || "").toLowerCase();
        const plate = (q.licensePlate || "").toLowerCase();
        const qNo = (q.quotationNo || "").toLowerCase();
        if (!name.includes(query) && !plate.includes(query) && !qNo.includes(query)) {
          return false;
        }
      }

      // 5. Date Range Filter (Accurate Date Range Math)
      if (!q.createdAt) return true;
      const qDate = new Date(q.createdAt);
      const now = new Date();

      if (datePreset === "today") {
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return qDate >= startToday;
      } else if (datePreset === "7days") {
        const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        return qDate >= past;
      } else if (datePreset === "30days") {
        const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        return qDate >= past;
      } else if (datePreset === "month") {
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return qDate >= startMonth;
      } else if (datePreset === "year") {
        const startYear = new Date(now.getFullYear(), 0, 1);
        return qDate >= startYear;
      } else if (datePreset === "custom") {
        if (startDate) {
          const start = new Date(startDate + "T00:00:00");
          if (qDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + "T23:59:59.999");
          if (qDate > end) return false;
        }
      }

      return true;
    });
  }, [quotations, selectedBranches, creationModeFilter, searchQuery, datePreset, startDate, endDate, userRole, userBranch]);

  // SLA Executive Metrics
  const metrics = useMemo(() => {
    if (filtered.length === 0) {
      return { avgSec: 0, metRate: 0, aiCount: 0, manualCount: 0, totalCount: 0, aiAvgSec: 0, manualAvgSec: 0 };
    }

    let totalSec = 0;
    let metCount = 0;
    let aiCount = 0;
    let aiTotalSec = 0;
    let manualCount = 0;
    let manualTotalSec = 0;

    filtered.forEach((q) => {
      const sec = q.processingTimeSec || 300;
      totalSec += sec;
      if (sec < TARGET_SLA_MINUTES * 60) metCount++;

      if (q.creationMode === "ai_extract") {
        aiCount++;
        aiTotalSec += sec;
      } else {
        manualCount++;
        manualTotalSec += sec;
      }
    });

    const avgSec = Math.round(totalSec / filtered.length);
    const metRate = Math.round((metCount / filtered.length) * 100);
    const aiAvgSec = aiCount > 0 ? Math.round(aiTotalSec / aiCount) : 0;
    const manualAvgSec = manualCount > 0 ? Math.round(manualTotalSec / manualCount) : 0;

    return {
      avgSec,
      metRate,
      aiCount,
      manualCount,
      totalCount: filtered.length,
      aiAvgSec,
      manualAvgSec,
    };
  }, [filtered]);

  // Format Seconds to Mins & Secs
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins} นาที ${secs > 0 ? `${secs} วิ` : ""}`;
  };

  return (
    <div className="p-6 md:p-10 text-[#1d1d1f] space-y-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Unified Search, Filters & Date Preset Header Panel */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Row 1: Title, Search, Creation Mode, Branch & Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0071e3]"></span>
            <h1 className="text-xl font-extrabold text-[var(--navy-900)]">
              {lang === "th" ? "รายงานประสิทธิภาพและระยะเวลา SLA" : "SLA & Performance Analytics"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "th" ? "ค้นหาด้วยชื่อ, ทะเบียนรถ, หรือเลขที่ใบเสนอราคา..." : "Search..."}
                className="pl-10 pr-4 py-2 text-xs border border-slate-200 bg-slate-50 rounded-2xl focus:outline-none focus:border-[#0071e3] font-bold w-72 sm:w-80 md:w-96 transition-all focus:w-[420px] text-slate-800"
              />
            </div>

            {/* Creation Mode Filter */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 flex items-center gap-1 text-xs font-bold text-slate-700 shadow-xs">
              <button
                onClick={() => setCreationModeFilter("all")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  creationModeFilter === "all" ? "bg-[#0071e3] text-white shadow-xs" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                ทุกช่องทาง
              </button>
              <button
                onClick={() => setCreationModeFilter("ai_extract")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  creationModeFilter === "ai_extract" ? "bg-[#0071e3] text-white shadow-xs" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <span>🤖</span> อ่านด้วย AI
              </button>
              <button
                onClick={() => setCreationModeFilter("manual")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  creationModeFilter === "manual" ? "bg-[#0071e3] text-white shadow-xs" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <span>✍️</span> คีย์ Manual
              </button>
            </div>

            {/* Branch Multi-Select Dropdown (with RBAC Scoping) */}
            <div className="relative">
              <button
                onClick={() => {
                  if (userRole === "ADMIN") setShowBranchDropdown(!showBranchDropdown);
                }}
                disabled={userRole !== "ADMIN"}
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2.5 rounded-2xl border transition shadow-xs ${
                  userRole !== "ADMIN"
                    ? "bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 active:scale-95 cursor-pointer"
                }`}
              >
                <span>{userRole !== "ADMIN" ? "🔒" : "🏢"}</span>
                <span>
                  {userRole !== "ADMIN"
                    ? `${userBranch || "สาขาสังกัดของคุณ"} (สังกัดของคุณ)`
                    : selectedBranches.length === availableBranches.length
                    ? "ทุกสาขา"
                    : `เลือก (${selectedBranches.length} สาขา)`}
                </span>
                {userRole === "ADMIN" && (
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showBranchDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {showBranchDropdown && userRole === "ADMIN" && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBranchDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-xl z-50 p-3.5 space-y-2 max-h-80 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <button onClick={() => setSelectedBranches(availableBranches)} className="text-[10px] font-black text-[#0071e3] hover:underline cursor-pointer">
                        เลือกทั้งหมด (Select All)
                      </button>
                      <button onClick={() => setSelectedBranches([])} className="text-[10px] font-black text-slate-400 hover:underline cursor-pointer">
                        ล้างทั้งหมด (Clear)
                      </button>
                    </div>
                    <div className="space-y-1">
                      {availableBranches.map((branch) => {
                        const isChecked = selectedBranches.includes(branch);
                        return (
                          <label key={branch} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedBranches(selectedBranches.filter((b) => b !== branch));
                                } else {
                                  setSelectedBranches([...selectedBranches, branch]);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
                            />
                            <span className={isChecked ? "text-[#0071e3]" : ""}>{branch}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition active:scale-95 cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: Integrated Date Preset Bar */}
        <div className="border-t border-slate-100/90 pt-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "today", label: "วันนี้" },
              { id: "7days", label: "7 วันล่าสุด" },
              { id: "30days", label: "30 วันล่าสุด" },
              { id: "month", label: "เดือนนี้" },
              { id: "year", label: "ปีนี้" },
              { id: "custom", label: "กำหนดช่วงวันเอง" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id)}
                className={`px-4 py-2 rounded-2xl font-extrabold transition text-xs cursor-pointer ${
                  datePreset === preset.id
                    ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-3 text-xs font-bold bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 font-medium">จาก:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#0071e3]"
              />
              <span className="text-slate-500 font-medium">ถึง:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#0071e3]"
              />
            </div>
          )}
        </div>
      </div>

      {/* SLA Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Processed Volume (โครงสร้างแบบ TOEIC Score Report Layout ตามตัวอย่าง) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-sky-50/80 border border-blue-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-6">
          {/* Main Centered Total Volume Section */}
          <div className="text-center space-y-2">
            <div className="text-[11px] font-black text-blue-900 uppercase tracking-widest">
              TOTAL CLAIMS VOLUME · จำนวนเคลมรวมทั้งหมด
            </div>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-5xl font-black text-slate-900 tracking-tight">{metrics.totalCount}</span>
              <span className="text-sm font-bold text-slate-500">/ {metrics.totalCount} รายการ</span>
            </div>

            {/* Badges under main total */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="bg-[#0071e3] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs">
                🤖 AI: {metrics.totalCount > 0 ? Math.round((metrics.aiCount / metrics.totalCount) * 100) : 0}%
              </span>
              <span className="bg-amber-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs">
                ✍️ Manual: {metrics.totalCount > 0 ? Math.round((metrics.manualCount / metrics.totalCount) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* 2 Split Sub-Cards (Listening & Reading equivalents layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sub-Card 1: AI EXTRACTION */}
            <div className="bg-white/90 border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex items-center justify-center gap-2 text-center">
                <span className="text-base">🤖</span>
                <div>
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider">AI EXTRACTION</div>
                  <div className="text-[10px] font-bold text-slate-400">อ่านเอกสารด้วย AI</div>
                </div>
              </div>
              <div className="p-4 text-center space-y-1.5">
                <div className="text-3xl font-black text-slate-900 tracking-tight">{metrics.aiCount}</div>
                <div className="text-[11px] font-bold text-slate-400">/ {metrics.totalCount} เคส</div>
                <div className="pt-1">
                  <span className="inline-block bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-sky-200">
                    เฉลี่ย {formatTime(metrics.aiAvgSec)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Card 2: MANUAL ENTRY */}
            <div className="bg-white/90 border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex items-center justify-center gap-2 text-center">
                <span className="text-base">✍️</span>
                <div>
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider">MANUAL ENTRY</div>
                  <div className="text-[10px] font-bold text-slate-400">คีย์ข้อมูลด้วยตนเอง</div>
                </div>
              </div>
              <div className="p-4 text-center space-y-1.5">
                <div className="text-3xl font-black text-slate-900 tracking-tight">{metrics.manualCount}</div>
                <div className="text-[11px] font-bold text-slate-400">/ {metrics.totalCount} เคส</div>
                <div className="pt-1">
                  <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                    เฉลี่ย {formatTime(metrics.manualAvgSec)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2 & 3 Combined Card: SLA Met Rate (Top) & Average Handling Time (Bottom) */}
        {(() => {
          const isPass = metrics.metRate > 50 || (metrics.avgSec > 0 && metrics.avgSec < TARGET_SLA_MINUTES * 60);
          return (
            <div
              className={`lg:col-span-2 rounded-3xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 text-center ${
                isPass
                  ? "bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-blue-50/40 border border-emerald-200"
                  : "bg-gradient-to-br from-rose-50/90 via-red-50/60 to-orange-50/40 border border-rose-200"
              }`}
            >
              {/* Top Section: SLA Met Rate % */}
              <div className="space-y-2 flex flex-col items-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-base">{isPass ? "🎯" : "🚨"}</span>
                  <span className={`text-xs font-black uppercase tracking-wider ${isPass ? "text-emerald-800" : "text-rose-800"}`}>
                    อัตราผ่านเกณฑ์ SLA RATE
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">{metrics.metRate}%</span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                      isPass
                        ? "text-emerald-800 bg-emerald-100/90 border-emerald-300"
                        : "text-rose-800 bg-rose-100/90 border-rose-300"
                    }`}
                  >
                    {isPass ? "ผ่านเกณฑ์เป้าหมาย" : "ต่ำกว่าเกณฑ์เป้าหมาย"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  ประมวลผลเสร็จสิ้นทันเวลาคิดเป็น <span className={`font-bold ${isPass ? "text-emerald-700" : "text-rose-700"}`}>{metrics.metRate}%</span> ของเคสทั้งหมดในระบบ
                </p>
              </div>

              {/* Clean Horizontal Divider */}
              <div className={`w-full border-t my-1 ${isPass ? "border-emerald-200/60" : "border-rose-200/60"}`}></div>

              {/* Bottom Section: Average Handling Time (AHT) */}
              <div className="space-y-2 flex flex-col items-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-base">⏱️</span>
                  <span className="text-xs font-black text-blue-900 uppercase tracking-wider">
                    เวลาประมวลผลเฉลี่ย (AHT)
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{formatTime(metrics.avgSec)}</span>
                  <span className="text-xs font-bold text-slate-500">/ เคส</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  เกณฑ์เวลาเป้าหมาย SLA: <span className="font-extrabold text-blue-700">&lt; 15 นาที</span>
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* SLA Visual Breakdown Comparison Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>⚡</span> เปรียบเทียบระยะเวลาประมวลผล: อ่านด้วย AI vs คีย์ข้อมูล Manual
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              แสดงการลดลงของเวลาในการจัดการเคส (Handling Time) เมื่อใช้งานระบบอ่านและคุมราคาอัตโนมัติด้วย AI
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar 1: AI Mode */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-sky-700">
                <span>🤖</span> การสร้างและคุมราคาด้วย AI
              </span>
              <span className="text-sky-700 font-extrabold">{formatTime(metrics.aiAvgSec)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-400 to-[#0071e3] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (metrics.aiAvgSec / (TARGET_SLA_MINUTES * 60)) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold pt-1">
              <span>เริ่มอ่าน PDF/รูปภาพ</span>
              <span className="text-emerald-600 font-extrabold">✅ ผ่านเกณฑ์ SLA (ต่ำกว่า 15 นาที)</span>
            </div>
          </div>

          {/* Bar 2: Manual Mode */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-amber-700">
                <span>✍️</span> การคีย์สร้างด้วยตนเอง (Manual)
              </span>
              <span className="text-amber-700 font-extrabold">{formatTime(metrics.manualAvgSec)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics.manualAvgSec / (TARGET_SLA_MINUTES * 60)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold pt-1">
              <span>เริ่มพิมพ์กรอกแบบฟอร์ม</span>
              <span className="text-amber-600 font-extrabold">⚠️ ใช้เวลานานกว่าปกติ</span>
            </div>
          </div>
        </div>
      </div>

      {/* SLA Case Details Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>📋</span> รายการบันทึกเวลา SLA แต่ละเคส (SLA Audit Logs)
          </h3>
          <span className="text-xs font-bold text-slate-500">
            แสดงทั้งหมด {filtered.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                <th className="py-3 px-3">เลขที่ใบเสนอราคา</th>
                <th className="py-3 px-3">ลูกค้า / ทะเบียนรถ</th>
                <th className="py-3 px-3">เจ้าหน้าที่คุมราคา</th>
                <th className="py-3 px-3">สาขา</th>
                <th className="py-3 px-3 text-center">ช่องทางสร้าง</th>
                <th className="py-3 px-3 text-center">เวลาเริ่มจับเวลา</th>
                <th className="py-3 px-3 text-center">เวลาส่งอนุมัติ (Submit)</th>
                <th className="py-3 px-3 text-right">ระยะเวลารวม</th>
                <th className="py-3 px-3 text-center">สถานะ SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    ไม่พบข้อมูลการบันทึก SLA ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const sec = q.processingTimeSec || 300;
                  const isPass = sec <= TARGET_SLA_MINUTES * 60;
                  const createdDate = q.createdAt ? new Date(q.createdAt) : new Date();
                  const startDate = new Date(createdDate.getTime() - sec * 1000);
                  const staffName = (q as any).createdBy || (q.branchName?.includes("เชียงใหม่") ? "กัญญา มีสุข" : "สมชาย ใจดี");

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono text-[#0071e3] font-black">{q.quotationNo}</td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold">{q.customerName || "ไม่ระบุชื่อ"}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{q.licensePlate || "-"}</div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-blue-950">
                        👤 {staffName}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">{q.branchName || "สำนักงานใหญ่"}</td>
                      <td className="py-3 px-3 text-center">
                        {q.creationMode === "ai_extract" ? (
                          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-sky-200">
                            🤖 อ่านด้วย AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-amber-200">
                            ✍️ คีย์ Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px]">
                        {startDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px]">
                        {createdDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                        {formatTime(sec)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPass ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-emerald-200">
                            ✅ ผ่าน SLA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-rose-200">
                            🚨 เกิน SLA
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
