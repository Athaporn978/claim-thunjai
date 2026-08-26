"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLang } from "@/lib/LangContext";

type Quotation = {
  id: string;
  quotationNo: string;
  status: string;
  customerName: string | null;
  licensePlate: string | null;
  insurerName: string | null;
  centerName: string | null;
  vehicleBrand: string | null;
  totalQuoted: number;
  totalControlled: number;
  totalSaving: number;
  createdAt: string;
  branchName?: string;
  partsSaving?: number;
  laborSaving?: number;
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

export default function ReportsPageLuxury() {
  const { lang } = useLang();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>(MOCK_BRANCHES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>(MOCK_BRANCHES);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
            email === "athaporn@htechnology.com" ||
            email === "admin@htechnology.com" ||
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

  // Chart Group States
  const [chartGroupMode, setChartGroupMode] = useState<"daily" | "monthly">("daily");

  // Hover states for the remaining hand-built visuals (radial gauge, progress rows).
  // The line/donut/bar charts no longer need these — Recharts owns their tooltips.
  const [hoveredRadial, setHoveredRadial] = useState<boolean>(false);
  const [hoveredProgressItem, setHoveredProgressItem] = useState<number | null>(null);

  const [tablePage, setTablePage] = useState(1);

  // Date range filter
  const [datePreset, setDatePreset] = useState("all"); // 'all' | 'today' | '7days' | '30days' | 'month' | 'year' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Automatically toggle chart grouping based on date preset
  useEffect(() => {
    if (datePreset === "all" || datePreset === "year") {
      setChartGroupMode("monthly");
    } else {
      setChartGroupMode("daily");
    }
  }, [datePreset]);

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

      const withBranches = (qRes.quotations || []).map((q: any) => {
        const branchName = q.branch?.name || q.branchName || "สาขาลาดพร้าว (กรุงเทพมหานคร)";
        return {
          ...q,
          branchName
        };
      });

      setQuotations(withBranches);
      setLastUpdated(new Date().toLocaleTimeString("th-TH"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Quotations
  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      // 1. Branch Multi-select & RBAC Filter (100% Dynamic Branch Matching)
      if (userRole !== "ADMIN") {
        const qb = q.branchName || "";
        const normUserB = (userBranch || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const normRowB = (qb || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
        const isBranchMatch =
          qb === userBranch ||
          (Boolean(normUserB) && Boolean(normRowB) && (normRowB.includes(normUserB) || normUserB.includes(normRowB)));
        const isNotAdminCase = (q as any).createdByEmail !== "admin@htechnology.com";
        if (!isBranchMatch || !isNotAdminCase) return false;
      } else if (selectedBranches.length > 0) {
        const matchSel = selectedBranches.some((sb) => {
          const normSB = sb.replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
          const normQB = (q.branchName || "").replace(/(?:สาขา|บริษัท|\(.*\))/g, "").trim().toLowerCase();
          return sb === q.branchName || (Boolean(normSB) && Boolean(normQB) && (normQB.includes(normSB) || normSB.includes(normQB)));
        });
        if (!matchSel) return false;
      }

      // 2. Completed Status Filter (Only include completed/approved cases in reports)
      const isCompleted = q.status === "approved" || q.status === "completed" || q.status === "finalized";
      if (!isCompleted) return false;

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (q.customerName || "").toLowerCase();
        const qNo = (q.quotationNo || "").toLowerCase();
        // Plates are written inconsistently ("2ขณ 2963 กทม" vs "2ขณ2963กทม"), so
        // compare them with spaces stripped from both sides — typing the plate with
        // or without spaces finds the same car either way. Name and quotation number
        // keep exact matching, since names legitimately contain spaces.
        const plateNoSpace = (q.licensePlate || "").toLowerCase().replace(/\s+/g, "");
        const queryNoSpace = query.replace(/\s+/g, "");
        if (!name.includes(query) && !plateNoSpace.includes(queryNoSpace) && !qNo.includes(query)) {
          return false;
        }
      }

      // 4. Date Range Filter (Accurate Date Range Math)
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
  }, [quotations, selectedBranches, searchQuery, datePreset, startDate, endDate, userRole, userBranch]);

  // Executive KPI Metrics
  const metrics = useMemo(() => {
    const totalQuoted = filtered.reduce((acc, q) => acc + (q.totalQuoted || 0), 0);
    const totalControlled = filtered.reduce((acc, q) => acc + (q.totalControlled || 0), 0);
    const totalSaving = filtered.reduce((acc, q) => acc + (q.totalSaving || 0), 0);
    const savingPercent = totalQuoted > 0 ? (totalSaving / totalQuoted) * 100 : 0;
    const avgSaving = filtered.length > 0 ? totalSaving / filtered.length : 0;

    return {
      count: filtered.length,
      totalQuoted,
      totalControlled,
      totalSaving,
      savingPercent,
      avgSaving,
    };
  }, [filtered]);


  // Parts vs Labor Savings Breakdown
  const partsVsLabor = useMemo(() => {
    let partsSaving = 0;
    let laborSaving = 0;

    filtered.forEach((q) => {
      // Real split computed server-side from the line items. The old 70/30
      // estimate below only survives for rows that predate it or have no items.
      if (q.partsSaving != null || q.laborSaving != null) {
        partsSaving += q.partsSaving || 0;
        laborSaving += q.laborSaving || 0;
      } else {
        const s = q.totalSaving || 0;
        partsSaving += s * 0.70;
        laborSaving += s * 0.30;
      }
    });

    const total = partsSaving + laborSaving || 1;
    return {
      partsSaving: Math.round(partsSaving),
      laborSaving: Math.round(laborSaving),
      partsPercent: Math.round((partsSaving / total) * 100),
      laborPercent: Math.round((laborSaving / total) * 100),
    };
  }, [filtered]);

  // Calendar calculations for current month
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString(lang === "th" ? "th-TH" : "en-US", { month: "long" });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === now.getDate();
      cells.push({ day: d, isToday });
    }
    return { cells, monthName, year: year + (lang === "th" ? 543 : 0) };
  }, [lang]);

  // Group quotations by Day (daily) or Month (monthly) depending on preset/selection
  const groupedChartData = useMemo(() => {
    let labels: string[] = [];
    let currentMap: Record<string, number> = {};

    const now = new Date();

    if (chartGroupMode === "daily") {
      if (datePreset === "today") {
        labels = ["Today"];
        const key = now.toDateString();
        currentMap[key] = 0;
        filtered.forEach(q => {
          if (new Date(q.createdAt).toDateString() === key) {
            currentMap[key] += 1;
          }
        });

        return {
          labels,
          currentCount: [currentMap[key]],
        };
      } else if (datePreset === "7days" || datePreset === "30days") {
        const daysCount = datePreset === "7days" ? 7 : 30;
        const currentDates: Date[] = [];

        for (let i = daysCount - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          currentDates.push(d);

          const dayLabel = d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short" });
          labels.push(dayLabel);
        }

        const currentCount: number[] = Array(daysCount).fill(0);

        currentDates.forEach((date, index) => {
          const dateStr = date.toDateString();
          filtered.forEach(q => {
            if (new Date(q.createdAt).toDateString() === dateStr) {
              currentCount[index] += 1;
            }
          });
        });

        return {
          labels,
          currentCount,
        };
      } else if (datePreset === "month" || datePreset === "custom") {
        const daysCount = datePreset === "month" ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : 15;
        labels = Array.from({ length: daysCount }, (_, i) => String(i + 1));

        const currentCount = Array(daysCount).fill(0);

        filtered.forEach(q => {
          const dayIdx = new Date(q.createdAt).getDate() - 1;
          if (dayIdx >= 0 && dayIdx < daysCount) {
            currentCount[dayIdx] += 1;
          }
        });

        return {
          labels,
          currentCount,
        };
      }
    } else {
      // Monthly grouping
      const monthsTh = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      labels = lang === "th" ? monthsTh : monthsEn;

      const currentCount = Array(12).fill(0);

      filtered.forEach(q => {
        const mIdx = new Date(q.createdAt).getMonth();
        currentCount[mIdx] += 1;
      });

      return {
        labels,
        currentCount,
      };
    }

    return {
      labels: [],
      currentCount: [],
    };
  }, [filtered, chartGroupMode, datePreset, lang]);

  // Recharts consumes the same buckets groupedChartData already produces; the old
  // hand-built bezier path memo below is what it replaces.
  // Which vehicles the current search actually matched — surfaced beside the box so
  // it is obvious whether the right car was found before trusting the figures. A
  // partial term like "2963" can match several plates at once.
  const matchedPlates = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const seen = new Set<string>();
    for (const q of filtered) {
      const p = (q.licensePlate || "").trim();
      if (p) seen.add(p);
    }
    return Array.from(seen);
  }, [filtered, searchQuery]);

  const rechartsSeries = useMemo(
    () =>
      (groupedChartData.labels || []).map((label: string, i: number) => ({
        label,
        count: groupedChartData.currentCount[i] ?? 0,
      })),
    [groupedChartData]
  );

  // Smooth Bezier path builders

  // Sparkline wave paths for top header trend card (Widget 4)

  // Donut SVG params for Parts vs Labor
  const donutStrokeParams = useMemo(() => {
    const radius = 35;
    const circ = 2 * Math.PI * radius; // ~219.9
    const partsVal = Math.round(partsVsLabor.partsPercent) || 70;
    const laborVal = 100 - partsVal;

    const partsOffset = circ - (partsVal / 100) * circ;
    const laborOffset = circ - (laborVal / 100) * circ;

    return { circ, radius, partsVal, laborVal, partsOffset, laborOffset };
  }, [partsVsLabor]);

  // Monthly columns mapping with REAL Database Aggregation (Widget 9)
  const barChartCols = useMemo(() => {
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsTh = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mIdx = d.getMonth();
      const year = d.getFullYear();
      const mEn = monthsEn[mIdx];
      const mTh = monthsTh[mIdx];

      let totalSavingInMonth = 0;
      let countInMonth = 0;

      filtered.forEach((q) => {
        const qDate = new Date(q.createdAt);
        if (qDate.getMonth() === mIdx && qDate.getFullYear() === year) {
          totalSavingInMonth += q.totalSaving || 0;
          countInMonth += 1;
        }
      });

      list.push({
        month: mEn,
        fullMonth: `${mTh} ${year + 543}`,
        saving: totalSavingInMonth,
        count: countInMonth,
      });
    }

    const maxSaving = Math.max(...list.map((item) => item.saving), 1);

    return list.map((item) => {
      const heightPct = item.saving > 0 ? Math.max(25, Math.round((item.saving / maxSaving) * 90)) : 12;
      return {
        ...item,
        heightPct,
      };
    });
  }, [filtered, lang]);

  // Real statistics calculator for Workflow Progress (Completed vs In Review vs Pending)
  const workflowStats = useMemo(() => {
    let completedCount = 0;
    let reviewCount = 0;
    let pendingCount = 0;

    filtered.forEach((q) => {
      const status = q.status;
      if (status === "approved") {
        completedCount++;
      } else if (status === "pending_review" || status === "pending_approval") {
        reviewCount++;
      } else {
        // draft or rejected or any other status
        pendingCount++;
      }
    });

    const total = filtered.length;
    if (total === 0) {
      return {
        completedCount: 0,
        completedPct: 0,
        reviewCount: 0,
        reviewPct: 0,
        pendingCount: 0,
        pendingPct: 0,
        totalCount: 0,
      };
    }

    const completedPct = Math.round((completedCount / total) * 100);
    const reviewPct = Math.round((reviewCount / total) * 100);
    const pendingPct = Math.max(0, 100 - completedPct - reviewPct); // Ensure exactly 100% total

    return {
      completedCount,
      completedPct,
      reviewCount,
      reviewPct,
      pendingCount,
      pendingPct,
      totalCount: total,
    };
  }, [filtered]);

  return (
    <div className="p-6 md:p-8 text-[#1d1d1f] space-y-6 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Unified Search, Filters & Date Preset Header Panel */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
        {/* Row 1: Title, Search, Branch, Refresh & Export */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0071e3]"></span>
            <h1 className="text-xl font-extrabold text-[var(--navy-900)]">
              {lang === "th" ? "รายงานสรุปวิเคราะห์ระบบคุมราคา" : "Claims Analytics Report Suite"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 min-w-0">
            {/* Quick Search — fixed width on purpose: it used to grow on focus,
                which pushed this whole control group onto a new line mid-typing. */}
            <div className="relative w-full sm:w-auto">
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
                className="pl-10 pr-4 py-2 text-xs border border-slate-200 bg-slate-50 rounded-2xl focus:outline-none focus:border-[#0071e3] font-bold w-full sm:w-80 md:w-96 text-slate-800"
              />
            </div>

            {searchQuery.trim() && (
              <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                {matchedPlates.length === 0 ? (
                  <span className="text-[11px] font-bold text-slate-400">
                    {lang === "th" ? "ไม่พบทะเบียนที่ตรงกัน" : "No matching plate"}
                  </span>
                ) : (
                  <>
                    <span className="text-[11px] font-bold text-slate-400">
                      {lang === "th" ? "ตรงกับ:" : "Matched:"}
                    </span>
                    {matchedPlates.slice(0, 4).map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0071e3] bg-[#eef6ff] border border-[#cce5ff] rounded-lg px-2 py-0.5 whitespace-nowrap"
                      >
                        🚗 {p}
                      </span>
                    ))}
                    {matchedPlates.length > 4 && (
                      <span className="text-[11px] font-bold text-slate-400">
                        +{matchedPlates.length - 4}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Branch Multi-Select Dropdown (with RBAC Scoping) */}
            <div className="relative">
              <button
                onClick={() => {
                  if (userRole === "ADMIN") setShowBranchDropdown(!showBranchDropdown);
                }}
                disabled={userRole !== "ADMIN"}
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-2xl border transition shadow-xs ${
                  userRole !== "ADMIN"
                    ? "bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 active:scale-95 cursor-pointer"
                }`}
              >
                <span>{userRole !== "ADMIN" ? "🔒" : "🏢"}</span>
                <span>
                  {userRole !== "ADMIN"
                    ? `${userBranch || "สาขาสังกัดของคุณ"} (${lang === "th" ? "สังกัดของคุณ" : "Your Branch"})`
                    : selectedBranches.length === availableBranches.length
                    ? (lang === "th" ? "ทุกสาขา" : "All Branches")
                    : `${lang === "th" ? "เลือก" : "Selected"} (${selectedBranches.length} ${lang === "th" ? "สาขา" : "Branches"})`}
                </span>
                {userRole === "ADMIN" && (
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showBranchDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {showBranchDropdown && userRole === "ADMIN" && (
                <>
                  {/* Backdrop to close click */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowBranchDropdown(false)} />
                  
                  {/* Popover */}
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-xl z-50 p-3.5 space-y-2 max-h-80 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <button
                        onClick={() => setSelectedBranches(availableBranches)}
                        className="text-[10px] font-black text-[#0071e3] hover:underline cursor-pointer"
                      >
                        เลือกทั้งหมด (Select All)
                      </button>
                      <button
                        onClick={() => setSelectedBranches([])}
                        className="text-[10px] font-black text-slate-400 hover:underline cursor-pointer"
                      >
                        ล้างทั้งหมด (Clear)
                      </button>
                    </div>

                    <div className="space-y-1">
                      {availableBranches.map((branch) => {
                        const isChecked = selectedBranches.includes(branch);
                        return (
                          <label
                            key={branch}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 select-none"
                          >
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

            {/* Print / Export Button */}
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl bg-[#0071e3] hover:bg-blue-600 text-white text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>{lang === "th" ? "ส่งออกรายงาน" : "Export Report"}</span>
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

      {/* Row 1 Grid: KPI Cards Layout matching 4-card structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Processed Volume */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-56 relative overflow-hidden text-center">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Processed Volume</span>
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">ปริมาณรายการที่ดำเนินการ</h3>
          </div>
          <div className="my-auto flex flex-col justify-center items-center">
            <div className="text-4xl sm:text-5xl font-black text-[#0071e3] tracking-tight">
              {metrics.count.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-1">ใบเสนอราคาคุมราคาเสร็จสมบูรณ์</div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>อัปเดตเรียลไทม์ {lastUpdated || "—"}</span>
          </div>
        </div>

        {/* Card 2: Total Saving (NEW!) */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-56 relative overflow-hidden text-center ring-2 ring-orange-400/40">
          <div className="space-y-1">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block">Total Optimization</span>
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">ยอด Saving รวมสุทธิ</h3>
          </div>
          <div className="my-auto flex flex-col justify-center items-center">
            <div className="text-3xl sm:text-4xl font-black text-orange-600 tracking-tight">
              ฿{metrics.totalSaving.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-1">ประหยัดได้รวมทั้งหมด</div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span>คำนวณจากใบเสนอราคาที่คุมแล้ว</span>
          </div>
        </div>

        {/* Card 3: Average Savings */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-56 relative overflow-hidden text-center">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Average Optimization</span>
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">ยอด Saving เฉลี่ย/รายการ</h3>
          </div>
          <div className="my-auto flex flex-col justify-center items-center">
            <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
              ฿{metrics.avgSaving.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-1">ยอดเงิน Saving เฉลี่ยต่อใบ</div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ค่าเฉลี่ยสุทธิต่อรายการ</span>
          </div>
        </div>

        {/* Card 6: Circular Progress Widget (Saving Rate / Radial Ring) - Prominent at the top */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-56 relative overflow-hidden text-center">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Saving Rate</span>
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">อัตราส่วนลดคุมราคาเฉลี่ย</h3>
          </div>
          <div className="my-auto flex flex-col justify-center items-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#0071e3"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (Math.min(metrics.savingPercent, 100) / 100) * 251.2}
                  strokeLinecap="round"
                  className="transition-all duration-1000 cursor-pointer hover:stroke-[12px]"
                  onMouseEnter={() => setHoveredRadial(true)}
                  onMouseLeave={() => setHoveredRadial(false)}
                />
              </svg>
              {/* Central Value */}
              <div className="absolute text-center pointer-events-none">
                {hoveredRadial ? (
                  <>
                    <span className="text-xs font-black text-[#0071e3] tracking-tight">฿{metrics.totalSaving.toLocaleString()}</span>
                    <div className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Saving</div>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-[var(--navy-900)] tracking-tight">{metrics.savingPercent.toFixed(1)}%</span>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Saving Rate</div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2.5 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>เป้าหมายยอด Saving เฉลี่ย {lang === "th" ? "สำเร็จ" : "Achieved"}</span>
          </div>
        </div>

      </div>

      {/* Row 2 Grid: Large Area Chart & Workflow Progress Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 5: Large single-line area chart (Claim Volume Current Period) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[300px]">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3.5 mb-4 gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[var(--navy-900)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]"></span>
                <span>ปริมาณรายงานที่ดำเนินการ ({chartGroupMode === "daily" ? "รายวัน" : "รายเดือน"})</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">แสดงผลปริมาณรายงาน/เคสเคลมที่ดำเนินการจริงตามการกรองข้อมูล</p>
            </div>
          </div>

          {/* Legends Indicator */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded bg-[#0071e3]"></span>
              <span className="text-[#0071e3]">จำนวนรายงาน (Reports Count)</span>
            </div>
          </div>

          <div className="flex-1 w-full h-52 py-1">
            {rechartsSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rechartsSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rptArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071e3" stopOpacity={0.30} />
                      <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={34} allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }}
                    formatter={(v) => [`${Number(v) || 0} ${lang === "th" ? "รายการ" : "reports"}`, ""]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#0071e3" strokeWidth={2.5} fill="url(#rptArea)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold text-center">
                ไม่มีข้อมูลเพียงพอสำหรับการพล็อตกราฟตามเงื่อนไขที่เลือก
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Workflow Progress (Redesigned to min-h-[300px] to align with Card 5) */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[300px]">
          <div className="border-b border-slate-100 pb-3.5 mb-2">
            <h2 className="text-base font-extrabold text-[var(--navy-900)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              <span>สถานะการคุมราคา</span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">ความคืบหน้าของเอกสารใบเสนอราคาในเวิร์กโฟลว์</p>
          </div>
          <div className="space-y-4 my-auto">
            {/* Progress Bar 1 */}
            <div
              className="space-y-1.5 cursor-pointer group"
              onMouseEnter={() => setHoveredProgressItem(1)}
              onMouseLeave={() => setHoveredProgressItem(null)}
            >
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 transition-colors group-hover:text-[#0071e3]">
                  เสร็จสมบูรณ์ (Completed)
                  {hoveredProgressItem === 1 && ` • ${workflowStats.completedCount} เคส`}
                </span>
                <span className="text-[#0071e3] font-black">{workflowStats.completedPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5">
                <div className="bg-gradient-to-r from-[#0071e3] to-blue-500 h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${workflowStats.completedPct}%` }}></div>
              </div>
            </div>
            {/* Progress Bar 2 */}
            <div
              className="space-y-1.5 cursor-pointer group"
              onMouseEnter={() => setHoveredProgressItem(2)}
              onMouseLeave={() => setHoveredProgressItem(null)}
            >
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 transition-colors group-hover:text-amber-500">
                  กำลังตรวจทาน (In Review)
                  {hoveredProgressItem === 2 && ` • ${workflowStats.reviewCount} เคส`}
                </span>
                <span className="text-amber-500 font-black">{workflowStats.reviewPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5">
                <div className="bg-amber-400 h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${workflowStats.reviewPct}%` }}></div>
              </div>
            </div>
            {/* Progress Bar 3 */}
            <div
              className="space-y-1.5 cursor-pointer group"
              onMouseEnter={() => setHoveredProgressItem(3)}
              onMouseLeave={() => setHoveredProgressItem(null)}
            >
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 transition-colors group-hover:text-slate-500">
                  รอดำเนินการ (Pending)
                  {hoveredProgressItem === 3 && ` • ${workflowStats.pendingCount} เคส`}
                </span>
                <span className="text-slate-400 font-black">{workflowStats.pendingPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5">
                <div className="bg-slate-300 h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${workflowStats.pendingPct}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 Grid: Horizontal Progress, Donut Chart, and Columns Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 7: Horizontal progress segmented list (Delenit augue reference) */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-64">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">สัดส่วนการเคลมแยกคลาสงาน</h3>
            <p className="text-[10px] text-slate-500 font-medium">โครงสร้างค่าใช้จ่ายจำแนกตามประเภทอะไหล่และค่าบริการ</p>
          </div>
          <div className="space-y-4 my-2.5">
            {/* Item 1 */}
            <div
              className="space-y-1 cursor-pointer group"
              onMouseEnter={() => setHoveredProgressItem(1)}
              onMouseLeave={() => setHoveredProgressItem(null)}
            >
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-600 transition-colors group-hover:text-blue-600">ชิ้นส่วนอะไหล่ OEM / แหล่งจำหน่ายตรง</span>
                <span className="text-blue-600 font-black">
                  {hoveredProgressItem === 1 ? `฿${partsVsLabor.partsSaving.toLocaleString()}` : `${donutStrokeParams.partsVal}%`}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 flex">
                <div className="bg-[#0071e3] h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${donutStrokeParams.partsVal}%` }}></div>
              </div>
            </div>
            {/* Item 2 */}
            <div
              className="space-y-1 cursor-pointer group"
              onMouseEnter={() => setHoveredProgressItem(2)}
              onMouseLeave={() => setHoveredProgressItem(null)}
            >
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-600 transition-colors group-hover:text-purple-600">ชิ้นส่วนอะไหล่เทียบ / มือสองคุณภาพสูง</span>
                <span className="text-purple-600 font-black">
                  {hoveredProgressItem === 2 ? `฿${Math.round(partsVsLabor.partsSaving * 0.2).toLocaleString()}` : "20%"}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 flex">
                <div className="bg-purple-600 h-full rounded-full transition-all group-hover:brightness-110" style={{ width: "20%" }}></div>
              </div>
            </div>
            {/* Item 3 */}
            <div
              className="space-y-1 cursor-pointer group"
              onMouseEnter={() => setHoveredProgressItem(3)}
              onMouseLeave={() => setHoveredProgressItem(null)}
            >
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-600 transition-colors group-hover:text-amber-600">ค่าแรง พ่นสี และเคาะถอดประกอบ</span>
                <span className="text-amber-650 font-black">
                  {hoveredProgressItem === 3 ? `฿${partsVsLabor.laborSaving.toLocaleString()}` : `${donutStrokeParams.laborVal}%`}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 flex">
                <div className="bg-amber-400 h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${donutStrokeParams.laborVal}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 8: Donut Chart (Consectetuer 70/30) */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-64">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">สัดส่วนมูลค่า Saving สะสม</h3>
            <p className="text-[10px] text-slate-500 font-medium">ความต่างของเงินที่ Saving ได้ระหว่าง อะไหล่ และ ค่าแรง</p>
          </div>
          <div className="flex-1 flex items-center justify-around py-3">
            <div className="relative w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "อะไหล่", value: partsVsLabor.partsSaving },
                      { name: "ค่าแรง", value: partsVsLabor.laborSaving },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="72%"
                    outerRadius="100%"
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    <Cell fill="#0071e3" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip
                    // The centre "SAVING / Breakdown" label sits over the ring, so the
                    // tooltip has to paint above it or the two overlap unreadably.
                    wrapperStyle={{ zIndex: 20 }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }}
                    formatter={(v) => `฿${(Number(v) || 0).toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Saving</span>
                <span className="text-[10px] font-black text-slate-800">Breakdown</span>
              </div>
            </div>
            
            <div className="space-y-2 text-[10px] font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#0071e3]"></span>
                <span>ค่าอะไหล่ ({donutStrokeParams.partsVal}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#10b981]"></span>
                <span>ค่าแรงซ่อม ({donutStrokeParams.laborVal}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 9: Column / Bar Chart (Real Monthly Saving Data + Interactive Tooltip) */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-64 relative">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--navy-900)]">ยอด Saving รวมรายเดือน</h3>
              <p className="text-[10px] text-slate-500 font-medium">ภาพรวมเงินที่ Saving ได้เปรียบเทียบในรอบ 7 เดือนล่าสุด</p>
            </div>
            <span className="text-[10px] font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              {lang === "th" ? "ดึงข้อมูลจริง" : "Live Data"}
            </span>
          </div>

          <div className="flex-1 h-36 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartCols} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  cursor={{ fill: "rgba(0,113,227,.06)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }}
                  labelFormatter={(_l, pl) => (pl && pl[0] ? (pl[0].payload as { fullMonth: string }).fullMonth : "")}
                  formatter={(v) => [`฿${(Number(v) || 0).toLocaleString()}`, lang === "th" ? "ยอด Saving" : "Saving"]}
                />
                {/* borderRadius 4 in the reference mockup */}
                <Bar dataKey="saving" fill="#0071e3" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Gradient KPI cards — the reference mockup's colour block, in system colours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { title: lang === "th" ? "ยอดประหยัดรวม" : "Total Saving", value: "฿" + metrics.totalSaving.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), grad: "from-[#0071e3] to-[#005bb5]" },
          { title: lang === "th" ? "อัตราประหยัดเฉลี่ย" : "Saving Rate", value: metrics.savingPercent.toFixed(1) + "%", grad: "from-blue-700 to-indigo-800" },
          { title: lang === "th" ? "ค่าอะไหล่ที่ประหยัดได้" : "Parts Saving", value: "฿" + partsVsLabor.partsSaving.toLocaleString(), grad: "from-[#ff7a1a] to-[#e8650a]" },
          { title: lang === "th" ? "ค่าแรงที่ประหยัดได้" : "Labour Saving", value: "฿" + partsVsLabor.laborSaving.toLocaleString(), grad: "from-emerald-500 to-teal-600" },
        ].map((c) => (
          <div
            key={c.title}
            className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${c.grad} shadow-[0_8px_20px_rgba(0,0,0,0.08)] min-h-[104px] flex flex-col justify-center gap-1`}
          >
            <div className="text-xs font-bold opacity-90">{c.title}</div>
            <div className="text-2xl font-black font-mono tracking-tight truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Recent activity + latest cases, mirroring the reference's 1fr : 2fr bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <h3 className="text-sm font-extrabold text-[var(--navy-900)] mb-4">
            {lang === "th" ? "ความเคลื่อนไหวล่าสุด" : "Recent Activity"}
          </h3>
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold py-6 text-center">
              {lang === "th" ? "ไม่มีข้อมูลตามตัวกรอง" : "No data for this filter"}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.slice(0, 5).map((q, i, arr) => (
                <div key={q.id} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="w-9 h-9 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-sm shadow-sm">🚗</span>
                    {i < arr.length - 1 && <span className="flex-1 w-px bg-slate-200 mt-1" />}
                  </div>
                  <div className="min-w-0 pb-1">
                    <a href={`/quotations/${q.id}`} className="text-sm font-extrabold text-[#0071e3] hover:underline font-mono">
                      {q.quotationNo}
                    </a>
                    <div className="text-xs text-slate-600 font-semibold truncate">
                      {q.customerName || "—"} · {q.licensePlate || "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {new Date(q.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                      {q.branchName ? ` · ${q.branchName}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">
              {lang === "th" ? "รายการเคสล่าสุด" : "Latest Cases"}
            </h3>
            <a href="/quotations" className="text-xs font-bold text-[#0071e3] hover:underline">
              {lang === "th" ? "ดูทั้งหมด →" : "View all →"}
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="text-white">
                  <th className="bg-[#0b132a] px-3 py-2.5 font-extrabold text-left rounded-l-xl whitespace-nowrap">{lang === "th" ? "เลขที่" : "No."}</th>
                  <th className="bg-[#0b132a] px-3 py-2.5 font-extrabold text-left whitespace-nowrap">{lang === "th" ? "ลูกค้า / ทะเบียน" : "Customer / Plate"}</th>
                  <th className="bg-[#0b132a] px-3 py-2.5 font-extrabold text-right whitespace-nowrap">{lang === "th" ? "ราคาเสนอ" : "Quoted"}</th>
                  <th className="bg-[#0b132a] px-3 py-2.5 font-extrabold text-right rounded-r-xl whitespace-nowrap">Saving</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((tablePage - 1) * 6, tablePage * 6).map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                    <td className="px-3 py-3">
                      <a href={`/quotations/${q.id}`} className="font-mono font-extrabold text-[#0071e3] hover:underline">{q.quotationNo}</a>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-800 truncate max-w-[170px]">{q.customerName || "—"}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{q.licensePlate || "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-700 whitespace-nowrap">฿{(q.totalQuoted || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono font-extrabold text-orange-600 whitespace-nowrap">฿{(q.totalSaving || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-slate-400 py-8 font-semibold">{lang === "th" ? "ไม่พบข้อมูล" : "No data"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-auto border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold">
              {lang === "th"
                ? `แสดง ${filtered.length === 0 ? 0 : (tablePage - 1) * 6 + 1}–${Math.min(tablePage * 6, filtered.length)} จาก ${filtered.length}`
                : `Showing ${filtered.length === 0 ? 0 : (tablePage - 1) * 6 + 1}–${Math.min(tablePage * 6, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={tablePage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 hover:border-[#0071e3] hover:text-[#0071e3] transition cursor-pointer disabled:cursor-not-allowed"
              >←</button>
              <span className="text-xs font-extrabold text-slate-600 px-1">
                {tablePage} / {Math.max(1, Math.ceil(filtered.length / 6))}
              </span>
              <button
                onClick={() => setTablePage((p) => Math.min(Math.max(1, Math.ceil(filtered.length / 6)), p + 1))}
                disabled={tablePage >= Math.ceil(filtered.length / 6)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 hover:border-[#0071e3] hover:text-[#0071e3] transition cursor-pointer disabled:cursor-not-allowed"
              >→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
