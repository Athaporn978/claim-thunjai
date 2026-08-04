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
  vehicleBrand: string | null;
  totalQuoted: number;
  totalControlled: number;
  totalSaving: number;
  createdAt: string;
  branchName?: string;
  items?: { type: string; name: string; quotedUnit: number; controlledUnit: number }[];
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
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    val: number;
    label: string;
    isPrev: boolean;
  } | null>(null);

  // Other components hover states
  const [hoveredSparkline, setHoveredSparkline] = useState<{ x: number; y: number; val: number } | null>(null);
  const [hoveredRadial, setHoveredRadial] = useState<boolean>(false);
  const [hoveredDonut, setHoveredDonut] = useState<"parts" | "labor" | null>(null);
  const [hoveredProgressItem, setHoveredProgressItem] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Date Filter States
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
        const plate = (q.licensePlate || "").toLowerCase();
        const qNo = (q.quotationNo || "").toLowerCase();
        if (!name.includes(query) && !plate.includes(query) && !qNo.includes(query)) {
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
      if (q.items && q.items.length > 0) {
        q.items.forEach((item: any) => {
          const diff = ((item.quotedUnit * (item.quotedQty || 1)) - (item.controlledUnit * (item.controlledQty || 1))) || 0;
          if (item.type === "part") partsSaving += Math.max(0, diff);
          else laborSaving += Math.max(0, diff);
        });
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

  // Smooth Bezier path builders
  const splineChartPaths = useMemo(() => {
    const width = 600;
    const height = 180;

    const labels = groupedChartData.labels;
    const currentCount = groupedChartData.currentCount;

    if (labels.length === 0) return null;

    const maxVal = Math.max(...currentCount, 5);

    const makePaths = (values: number[]) => {
      if (values.length === 0) return null;
      const points = values.map((val, idx) => {
        const x = (idx / (values.length - 1 || 1)) * width;
        const y = height - 15 - (val / maxVal) * (height - 30);
        return { x, y };
      });

      let linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        linePath += ` L ${points[i].x} ${points[i].y}`;
      }

      return { linePath, points };
    };

    return {
      currentCount: makePaths(currentCount),
      width,
      height,
      labels,
      maxVal,
    };
  }, [groupedChartData]);

  // Sparkline wave paths for top header trend card (Widget 4)
  const sparklinePaths = useMemo(() => {
    const width = 180;
    const height = 55;
    const vals = filtered.slice(0, 8).map((q) => q.totalSaving).reverse();
    if (vals.length < 2) return null;

    const maxVal = Math.max(...vals, 1);
    const minVal = Math.min(...vals, 0);
    const range = maxVal - minVal || 1;

    const points = vals.map((val, idx) => {
      const x = (idx / (vals.length - 1)) * width;
      const y = height - 5 - ((val - minVal) / range) * (height - 10);
      return { x, y };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
    return { linePath, areaPath, width, height, points };
  }, [filtered]);

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
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Row 1: Title, Search, Branch, Refresh & Export */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0071e3]"></span>
            <h1 className="text-xl font-extrabold text-[var(--navy-900)]">
              {lang === "th" ? "รายงานสรุปวิเคราะห์ระบบคุมราคา" : "Claims Analytics Report Suite"}
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-56 relative overflow-hidden text-center">
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-56 relative overflow-hidden text-center ring-2 ring-orange-400/40">
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-56 relative overflow-hidden text-center">
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-56 relative overflow-hidden text-center">
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
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[300px]">
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

          <div className="flex-1 w-full h-44 py-1 relative flex flex-col justify-end">
            {splineChartPaths ? (
              <>
                <svg width="100%" height="100%" viewBox={`0 0 ${splineChartPaths.width} ${splineChartPaths.height}`} preserveAspectRatio="none">
                  {/* Grid Lines & Y Axis Labels */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                    const y = splineChartPaths.height - 15 - ratio * (splineChartPaths.height - 30);
                    const val = Math.round(splineChartPaths.maxVal * ratio);
                    return (
                      <g key={idx}>
                        <line
                          x1="0"
                          y1={y}
                          x2={splineChartPaths.width}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                          strokeDasharray={ratio === 0 ? "none" : "4 4"}
                        />
                        <text
                          x="5"
                          y={y - 4}
                          fill="#94a3b8"
                          fontSize="8"
                          fontWeight="black"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Lines */}
                  {splineChartPaths.currentCount && (
                    <path d={splineChartPaths.currentCount.linePath} fill="none" stroke="#0071e3" strokeWidth="3" />
                  )}
                  
                  {/* Dots for Current Count Line */}
                  {splineChartPaths.currentCount && splineChartPaths.currentCount.points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#0071e3"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all hover:scale-125"
                      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                      onMouseEnter={() => setHoveredPoint({
                        x: p.x,
                        y: p.y,
                        val: groupedChartData.currentCount[idx] || 0,
                        label: splineChartPaths.labels[idx],
                        isPrev: false
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredPoint && (
                  (() => {
                    const percentX = (hoveredPoint.x / splineChartPaths.width) * 100;
                    let translateX = "-50%";
                    let arrowLeft = "50%";
                    
                    if (percentX > 85) {
                      translateX = "-85%";
                      arrowLeft = "85%";
                    } else if (percentX < 15) {
                      translateX = "-15%";
                      arrowLeft = "15%";
                    }

                    return (
                      <div
                        className="absolute z-30 pointer-events-none bg-[#0b132a] text-white px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-md text-[10px] font-bold transition-all flex flex-col items-center gap-0.5"
                        style={{
                          left: `${percentX}%`,
                          top: `${(hoveredPoint.y / splineChartPaths.height) * 100}%`,
                          transform: `translate(${translateX}, -48px)`,
                        }}
                      >
                        <div className="text-slate-400 font-extrabold">{chartGroupMode === "daily" ? `วันที่ ${hoveredPoint.label}` : hoveredPoint.label}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          <span>จำนวน:</span>
                          <span className="text-white font-black">{hoveredPoint.val} รายการ</span>
                        </div>
                        {/* Small arrow pointing to the dot */}
                        <div
                          className="absolute bottom-0 w-2 h-2 bg-[#0b132a] rotate-45 border-r border-b border-slate-800 translate-y-1/2"
                          style={{
                            left: arrowLeft,
                            transform: "translateX(-50%) rotate(45deg)",
                          }}
                        ></div>
                      </div>
                    );
                  })()
                )}

                {/* X Axis Labels */}
                <div className="flex justify-between text-[9px] font-black text-slate-400 mt-2 px-1">
                  {splineChartPaths.labels.map((label, idx) => {
                    const total = splineChartPaths.labels.length;
                    if (total > 12 && idx % 5 !== 0 && idx !== total - 1) {
                      return <span key={idx} className="w-8 text-center text-transparent">—</span>;
                    }
                    return <span key={idx} className="w-8 text-center text-slate-400">{label}</span>;
                  })}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 font-bold m-auto text-center">ไม่มีข้อมูลเพียงพอสำหรับการพล็อตกราฟตามเงื่อนไขที่เลือก</div>
            )}
          </div>
        </div>

        {/* Card 3: Workflow Progress (Redesigned to min-h-[300px] to align with Card 5) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[300px]">
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-64">
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-64">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-[var(--navy-900)]">สัดส่วนมูลค่า Saving สะสม</h3>
            <p className="text-[10px] text-slate-500 font-medium">ความต่างของเงินที่ Saving ได้ระหว่าง อะไหล่ และ ค่าแรง</p>
          </div>
          <div className="flex-1 flex items-center justify-around py-3">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Parts saving segment */}
                <circle
                  cx="50"
                  cy="50"
                  r={donutStrokeParams.radius}
                  stroke="#0071e3"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={donutStrokeParams.circ}
                  strokeDashoffset={donutStrokeParams.partsOffset}
                  strokeLinecap="round"
                  className="cursor-pointer transition-all hover:stroke-[14px]"
                  onMouseEnter={() => setHoveredDonut("parts")}
                  onMouseLeave={() => setHoveredDonut(null)}
                />
                {/* Labor saving segment */}
                <circle
                  cx="50"
                  cy="50"
                  r={donutStrokeParams.radius}
                  stroke="#10b981"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${(donutStrokeParams.laborVal / 100) * donutStrokeParams.circ} ${(donutStrokeParams.partsVal / 100) * donutStrokeParams.circ}`}
                  strokeDashoffset={-((donutStrokeParams.partsVal / 100) * donutStrokeParams.circ)}
                  strokeLinecap="round"
                  className="cursor-pointer transition-all hover:stroke-[14px]"
                  onMouseEnter={() => setHoveredDonut("labor")}
                  onMouseLeave={() => setHoveredDonut(null)}
                />
              </svg>
              {/* Central text for Donut hover values */}
              <div className="absolute text-center flex flex-col items-center justify-center pointer-events-none">
                {hoveredDonut ? (
                  <>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">
                      {hoveredDonut === "parts" ? "อะไหล่" : "ค่าแรง"}
                    </span>
                    <span className={`text-[10px] font-black ${hoveredDonut === "parts" ? "text-[#0071e3]" : "text-[#10b981]"}`}>
                      ฿{hoveredDonut === "parts" ? partsVsLabor.partsSaving.toLocaleString() : partsVsLabor.laborSaving.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">Saving</span>
                    <span className="text-[10px] font-black text-slate-800">
                      Breakdown
                    </span>
                  </>
                )}
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-64 relative">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--navy-900)]">ยอด Saving รวมรายเดือน</h3>
              <p className="text-[10px] text-slate-500 font-medium">ภาพรวมเงินที่ Saving ได้เปรียบเทียบในรอบ 7 เดือนล่าสุด</p>
            </div>
            <span className="text-[10px] font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              {lang === "th" ? "ดึงข้อมูลจริง" : "Live Data"}
            </span>
          </div>

          <div className="flex-1 flex items-end justify-between px-2 py-4 h-36 relative">
            {barChartCols.map((c, idx) => {
              const isHovered = hoveredBarIndex === idx;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-1.5 flex-1 relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Floating Rich Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-3.5 z-50 pointer-events-none whitespace-nowrap bg-[#0b132a] text-white p-2.5 rounded-2xl shadow-xl border border-slate-700 text-center transition-all animate-fadeIn">
                      <div className="text-[10px] font-bold text-slate-400">{c.fullMonth}</div>
                      <div className="text-xs font-extrabold text-emerald-400 mt-0.5">
                        ฿{c.saving.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-slate-300 font-medium mt-0.5">
                        {c.count} รายการ
                      </div>
                      {/* Triangle Pointer */}
                      <div className="w-2.5 h-2.5 bg-[#0b132a] border-r border-b border-slate-700 transform rotate-45 mx-auto -mb-3 mt-1" />
                    </div>
                  )}

                  {/* Bar Element */}
                  <div
                    className={`w-5 rounded-t-xl transition-all duration-300 ${
                      c.saving > 0
                        ? isHovered
                          ? "bg-gradient-to-t from-[#0071e3] to-sky-300 scale-110 shadow-md ring-2 ring-blue-300"
                          : "bg-gradient-to-t from-[#0071e3] to-blue-400"
                        : isHovered
                        ? "bg-slate-300 scale-105"
                        : "bg-slate-200"
                    }`}
                    style={{ height: `${c.heightPct}%`, minHeight: "12px" }}
                  ></div>

                  {/* Month Label */}
                  <span className={`text-[9px] font-extrabold tracking-wider transition-colors ${isHovered ? "text-[#0071e3]" : "text-slate-400"}`}>
                    {c.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
