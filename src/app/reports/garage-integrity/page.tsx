"use client";
import { useState, useEffect, useMemo } from "react";
import { useLang } from "@/lib/LangContext";
import Link from "next/link";

type GarageMetric = {
  id: string;
  name: string;
  category: string;
  score: number;
  label: string;
  overchargeRate: number;
  totalClaims: number;
  totalQuoted: number;
  totalControlled: number;
  savingTotal: number;
  status: "excellent" | "fair" | "warning";
  branchName: string;
};

export default function GarageIntegrityReportPage() {
  const { lang } = useLang();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [rawQuotes, setRawQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date Filter States (Identical to Saving & SLA Reports)
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // User Role & Branch Context (Synchronously Initialized)
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("currentUser");
        if (stored) {
          const parsed = JSON.parse(stored);
          const role = (parsed.roleName || parsed.role?.name || parsed.role || "").toLowerCase();
          const email = (parsed.email || "").toLowerCase();
          return (
            email === "athaporn@htechnology.com" ||
            email === "admin@htechnology.com" ||
            role === "super administrator"
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    return false;
  });

  const [userBranch, setUserBranch] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("currentUser");
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.branchName || parsed.branch?.name || parsed.branch || "สาขากรุงเทพฯ (ลาดพร้าว)";
        }
      } catch (e) {
        console.error(e);
      }
    }
    return "สาขากรุงเทพฯ (ลาดพร้าว)";
  });

  // Load Data Function
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch("/api/quotations");
      if (res.ok) {
        const data = await res.json();
        setRawQuotes(data.quotations || []);
      }
    } catch (err) {
      console.error("Failed to load quotations for garage rating report:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // 1) Re-verify session in client side
    try {
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        const role = (parsed.roleName || parsed.role?.name || parsed.role || "").toLowerCase();
        const email = (parsed.email || "").toLowerCase();
        const isAdmin =
          email === "athaporn@htechnology.com" ||
          email === "admin@htechnology.com" ||
          role === "super administrator";

        setIsSuperAdmin(isAdmin);

        const bName = parsed.branchName || parsed.branch?.name || parsed.branch || "สาขากรุงเทพฯ (ลาดพร้าว)";
        setUserBranch(bName);

        if (!isAdmin) {
          setSelectedBranch(bName);
        }
      }
    } catch (e) {
      console.error(e);
    }

    loadData();
  }, []);

  // Compute Garages & Filtered Metrics
  const garages = useMemo(() => {
    // 1. Filter ONLY completed/approved quotations with identical RBAC & Date rules as Saving & SLA reports
    const completedQuotes = rawQuotes.filter((q) => {
      const isCompleted = q.status === "completed" || q.status === "approved" || q.status === "finalized";
      if (!isCompleted) return false;

      const qb = q.branch?.name || q.branchName || "";
      const isNotAdminCase = (q as any).createdByEmail !== "admin@htechnology.com";

      if (!isSuperAdmin) {
        const currentB = userBranch || "";
        const normUserB = currentB.replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const normRowB = qb.replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const isBranchMatch =
          qb === currentB ||
          (Boolean(normUserB) && Boolean(normRowB) && (normRowB.includes(normUserB) || normUserB.includes(normRowB)));
        if (!isBranchMatch || !isNotAdminCase) return false;
      } else if (selectedBranch !== "all") {
        const normSelB = selectedBranch.replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const normQB = qb.replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const matchSel =
          qb === selectedBranch ||
          (Boolean(normSelB) && Boolean(normQB) && (normQB.includes(normSelB) || normSelB.includes(normQB)));
        if (!matchSel) return false;
      }

      // Date Range Filter (Accurate Date Range Math)
      if (q.createdAt) {
        const qDate = new Date(q.createdAt);
        const now = new Date();

        if (datePreset === "today") {
          const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (qDate < startToday) return false;
        } else if (datePreset === "7days") {
          const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
          if (qDate < past) return false;
        } else if (datePreset === "30days") {
          const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
          if (qDate < past) return false;
        } else if (datePreset === "month") {
          const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (qDate < startMonth) return false;
        } else if (datePreset === "year") {
          const startYear = new Date(now.getFullYear(), 0, 1);
          if (qDate < startYear) return false;
        } else if (datePreset === "custom") {
          if (startDate && qDate < new Date(startDate + "T00:00:00")) return false;
          if (endDate && qDate > new Date(endDate + "T23:59:59")) return false;
        }
      }

      return true;
    });

    // Extract all unique branch names
    const branchSet = new Set<string>();
    completedQuotes.forEach((q) => {
      const b = q.branch?.name || q.branchName || (q.createdByName?.includes("เชียงใหม่") ? "สาขาเชียงใหม่" : "สาขากรุงเทพฯ (ลาดพร้าว)");
      branchSet.add(b);
    });
    const branchList = Array.from(branchSet);
    if (!branchList.includes("สาขากรุงเทพฯ (ลาดพร้าว)")) branchList.push("สาขากรุงเทพฯ (ลาดพร้าว)");
    if (!branchList.includes("สาขาเชียงใหม่")) branchList.push("สาขาเชียงใหม่");
    setAvailableBranches(branchList);

    // Group by centerName + branchName
    const grouped: Record<string, {
      name: string;
      branchName: string;
      totalClaims: number;
      totalQuoted: number;
      totalControlled: number;
    }> = {};

    for (const q of completedQuotes) {
      const center = (q.centerName || "ไม่ระบุศูนย์บริการ/อู่").trim();
      const bName = q.branch?.name || q.branchName || (q.createdByName?.includes("เชียงใหม่") ? "สาขาเชียงใหม่" : "สาขากรุงเทพฯ (ลาดพร้าว)");
      const key = `${center}___${bName}`;

      if (!grouped[key]) {
        grouped[key] = {
          name: center,
          branchName: bName,
          totalClaims: 0,
          totalQuoted: 0,
          totalControlled: 0,
        };
      }
      grouped[key].totalClaims += 1;
      grouped[key].totalQuoted += q.totalQuoted || 0;
      grouped[key].totalControlled += q.totalControlled || 0;
    }

    // Transform into GarageMetric list
    return Object.values(grouped).map((g, idx) => {
      const savingTotal = Math.max(0, g.totalQuoted - g.totalControlled);
      const overchargeRate = g.totalQuoted > 0 ? Number(((savingTotal / g.totalQuoted) * 100).toFixed(1)) : 0;
      const score = Math.max(0, Math.round(100 - overchargeRate));
      const status: "excellent" | "fair" | "warning" =
        score >= 80 ? "excellent" : score >= 55 ? "fair" : "warning";
      const label =
        score >= 80
          ? "ดีเยี่ยม (Excellent)"
          : score >= 55
          ? "ปานกลาง (Fair)"
          : "ต้องระวัง (High Risk)";

      const isCenterDealer =
        g.name.includes("ศูนย์") ||
        g.name.includes("บริษัท") ||
        g.name.includes("ฮอนด้า") ||
        g.name.includes("โตโยต้า") ||
        g.name.includes("นิสสัน");

      return {
        id: `G-${100 + idx + 1}`,
        name: g.name,
        category: isCenterDealer ? "ศูนย์บริการมาตรฐาน (Dealer)" : "อู่คู่สัญญามาตรฐาน A",
        score,
        label,
        overchargeRate,
        totalClaims: g.totalClaims,
        totalQuoted: g.totalQuoted,
        totalControlled: g.totalControlled,
        savingTotal,
        status,
        branchName: g.branchName,
      };
    });
  }, [rawQuotes, isSuperAdmin, userBranch, selectedBranch, datePreset, startDate, endDate]);

  // Search & Rating Status Filter
  const filtered = useMemo(() => {
    return garages.filter((g) => {
      const matchSearch =
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === "all" || g.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [garages, searchTerm, filterStatus]);

  const totalEvaluated = filtered.length;
  const avgScore = totalEvaluated > 0 ? Math.round(filtered.reduce((s, g) => s + g.score, 0) / totalEvaluated) : 100;
  const totalSavingAll = filtered.reduce((s, g) => s + g.savingTotal, 0);
  const totalCompletedClaims = filtered.reduce((s, g) => s + g.totalClaims, 0);

  return (
    <div className="p-6 md:p-8 text-[#1d1d1f] space-y-6 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Unified Search, Filters & Branch Header Panel (SLA Theme) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Row 1: Title, Branch Badge, Search Box & Back Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0071e3]"></span>
            <h1 className="text-xl font-extrabold text-[var(--navy-900)]">
              {lang === "th" ? "รายงานคะแนนอู่/ศูนย์" : "Garage & Service Center Rating Report"}
            </h1>
            {!isSuperAdmin && (
              <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-2xl flex items-center gap-1 shadow-2xs">
                🔒 {lang === "th" ? `${userBranch} (สังกัดของคุณ)` : `${userBranch} (Your Branch)`}
              </span>
            )}
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === "th" ? "ค้นหาด้วยชื่ออู่ หรือประเภทศูนย์บริการ..." : "Search..."}
                className="pl-10 pr-4 py-2 text-xs border border-slate-200 bg-slate-50 rounded-2xl focus:outline-none focus:border-[#0071e3] font-bold w-72 sm:w-80 md:w-96 transition-all focus:w-[420px] text-slate-800"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200"
              title={lang === "th" ? "รีเฟรชข้อมูล" : "Refresh"}
            >
              <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Back Button */}
            <Link
              href="/reports"
              className="px-4 py-2 rounded-2xl bg-[#0071e3] text-white font-extrabold text-xs shadow-md hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              ← {lang === "th" ? "กลับหน้ารวมรายงาน" : "Back to Reports"}
            </Link>
          </div>
        </div>

        {/* Row 2: Date Filter Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-400 mr-1">{lang === "th" ? "ช่วงเวลา:" : "Date Filter:"}</span>
            {[
              { id: "all", labelTh: "ทั้งหมด", labelEn: "All" },
              { id: "today", labelTh: "วันนี้", labelEn: "Today" },
              { id: "7days", labelTh: "7 วันล่าสุด", labelEn: "7 Days" },
              { id: "30days", labelTh: "30 วันล่าสุด", labelEn: "30 Days" },
              { id: "month", labelTh: "เดือนนี้", labelEn: "This Month" },
              { id: "year", labelTh: "ปีนี้", labelEn: "This Year" },
              { id: "custom", labelTh: "กำหนดช่วงวันเอง", labelEn: "Custom Date" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                  datePreset === p.id ? "bg-[#0071e3] text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {lang === "th" ? p.labelTh : p.labelEn}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {lang === "th" ? "ประมวลผลสถิติจริงเฉพาะเคสที่อนุมัติเสร็จสิ้นแล้ว (Completed) ในความดูแลของสาขา" : "Calculated from completed claims under branch management"}
          </div>
        </div>

        {/* Custom Date Inputs */}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 animate-fadeIn">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none focus:border-[#0071e3]"
            />
            <span className="text-xs font-bold text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none focus:border-[#0071e3]"
            />
          </div>
        )}

        {/* Row 3: Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-400 mr-1">{lang === "th" ? "ระดับความน่าเชื่อถือ:" : "Status Filter:"}</span>
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                filterStatus === "all" ? "bg-[#0071e3] text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {lang === "th" ? "ทั้งหมด" : "All Status"}
            </button>
            <button
              onClick={() => setFilterStatus("excellent")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                filterStatus === "excellent" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              🟢 {lang === "th" ? "ดีเยี่ยม (>= 80%)" : "Excellent (>= 80%)"}
            </button>
            <button
              onClick={() => setFilterStatus("fair")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                filterStatus === "fair" ? "bg-amber-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              🟡 {lang === "th" ? "ปานกลาง (55-79%)" : "Fair (55-79%)"}
            </button>
            <button
              onClick={() => setFilterStatus("warning")}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                filterStatus === "warning" ? "bg-rose-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              🔴 {lang === "th" ? "ต้องระวัง (< 55%)" : "Warning (< 55%)"}
            </button>
          </div>
        </div>
      </div>

      {/* Super Administrator Branch Selection Banner */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-[#0b132a] via-[#111c38] to-[#0b132a] text-white p-4 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3] flex items-center justify-center text-sm shadow-sm">
              👑
            </div>
            <div>
              <div className="text-xs font-extrabold text-white">
                {lang === "th" ? "สิทธิ์ Super Administrator (เลือกดูข้อมูลสาขา)" : "Super Administrator Access (Branch Selection)"}
              </div>
              <div className="text-[11px] text-blue-200 font-medium">
                {lang === "th" ? "คุณมีสิทธิ์ดูสถิติภาพรวมทุกสาขาทั่วประเทศ หรือเลือกสลับดูเฉพาะสาขาได้" : "View overall national stats or select specific branch to view metrics"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
            <span className="text-xs font-bold text-blue-200 pl-2">🏢 {lang === "th" ? "เลือกสาขา:" : "Branch:"}</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white text-slate-900 text-xs font-extrabold px-3 py-1.5 rounded-lg border-0 focus:outline-none cursor-pointer shadow-xs"
            >
              <option value="all">{lang === "th" ? "🌐 ทั้งหมด (ภาพรวมประเทศ)" : "🌐 All Branches (National)"}</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>
                  📍 {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">{lang === "th" ? "อู่/ศูนย์บริการที่อนุมัติแล้ว" : "Evaluated Garages"}</div>
          <div className="text-3xl font-extrabold text-slate-800 font-mono">{totalEvaluated} <span className="text-xs font-normal text-slate-400">แห่ง</span></div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 mb-1">{lang === "th" ? "เคสอนุมัติเสร็จสิ้นรวม (Completed)" : "Completed Claims"}</div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">{totalCompletedClaims} <span className="text-xs font-normal text-slate-400">เคส</span></div>
        </div>

        <div className="bg-sky-50/70 rounded-3xl p-5 border border-sky-200/80 shadow-xs">
          <div className="text-xs font-bold text-[#0071e3] mb-1">{lang === "th" ? "คะแนนความซื่อสัตย์เฉลี่ย" : "Overall Average Score"}</div>
          <div className="text-3xl font-extrabold text-[#0071e3] font-mono">{avgScore}% <span className="text-xs font-semibold text-emerald-600">(เกณฑ์อนุมัติ)</span></div>
        </div>

        <div className="bg-amber-50/60 rounded-3xl p-5 border border-amber-300/80 shadow-xs">
          <div className="text-xs font-bold text-amber-900 mb-1">{lang === "th" ? "ยอดประหยัดสะสมจากเคสอนุมัติ" : "Accumulated Approved Saving"}</div>
          <div className="text-3xl font-extrabold text-amber-700 font-mono">฿{totalSavingAll.toLocaleString("th-TH")}</div>
        </div>
      </div>

      {/* Garages Rating Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2"></div>
            <div>{lang === "th" ? "กำลังประมวลผลข้อมูลเคสอนุมัติจากระบบ…" : "Calculating completed claims data…"}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="text-3xl">📭</div>
            <div className="font-bold text-slate-600">
              {lang === "th"
                ? `ยังไม่มีเคสอนุมัติเสร็จสิ้น (Completed) สำหรับสาขาที่เลือก (${selectedBranch === "all" ? "ทุกสาขา" : selectedBranch})`
                : `No completed claims available for selected branch (${selectedBranch})`}
            </div>
            <div className="text-xs text-slate-400">
              {lang === "th" ? "เมื่อเคสในสาขานี้ถูกเปลี่ยนสถานะเป็น 'อนุมัติเสร็จสิ้น' ระบบจะนำมาประมวลผลคำนวณคะแนนให้อัตโนมัติ" : "Completed claims will be processed automatically."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="p-3.5">อู่ / ศูนย์บริการ</th>
                  <th className="p-3.5 text-center">สาขาผู้ดูแล</th>
                  <th className="p-3.5 text-center">ประเภทอู่</th>
                  <th className="p-3.5 text-center">คะแนนความซื่อสัตย์</th>
                  <th className="p-3.5 text-center">อัตราการตั้งราคาเกินจริง</th>
                  <th className="p-3.5 text-right">จำนวนเคสอนุมัติแล้ว</th>
                  <th className="p-3.5 text-right">ยอดรวมเสนอราคา</th>
                  <th className="p-3.5 text-right">ยอดรวมหลังคุม</th>
                  <th className="p-3.5 text-right">ยอดส่วนต่าง Saving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 text-sm">{g.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {g.id}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200">
                        📍 {g.branchName}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-semibold text-slate-600">{g.category}</td>
                    <td className="p-3.5 text-center">
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs border bg-slate-50"
                        style={{
                          color: g.score >= 80 ? "#059669" : g.score >= 55 ? "#d97706" : "#dc2626",
                          borderColor: g.score >= 80 ? "#a7f3d0" : g.score >= 55 ? "#fde68a" : "#fecaca",
                        }}
                      >
                        <span>{g.score >= 80 ? "🟢" : g.score >= 55 ? "🟡" : "🔴"}</span>
                        <span>{g.score}% ({g.label})</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-slate-700">{g.overchargeRate}%</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700 font-extrabold">{g.totalClaims} เคส</td>
                    <td className="p-3.5 text-right font-mono text-slate-700">฿{g.totalQuoted.toLocaleString("th-TH")}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700 font-bold">฿{g.totalControlled.toLocaleString("th-TH")}</td>
                    <td className="p-3.5 text-right font-mono text-amber-700 font-extrabold bg-amber-50/30">฿{g.savingTotal.toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
