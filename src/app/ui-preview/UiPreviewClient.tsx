"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
import "./ui-preview.css";

/* ──────────────────────────────────────────────────────────────────
   Standalone UI preview — NOT part of the product.
   Replicates dashboard-design/reports.html 1-to-1 (CSS copy).
   CDN deps swapped: Chart.js → Recharts, Font Awesome → SVG/emoji.
   Real data from /api/quotations; falls back to zeros while loading.
   Remove this folder before going live with real customers.
────────────────────────────────────────────────────────────────── */

// ── Simple SVG Icons (replaces Font Awesome CDN) ──────────────────
const IC = {
  bars:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
  bell:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 00-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
  mail:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  export:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
  plus:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 4v16m8-8H4"/></svg>,
  filter:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M3 4h18M7 12h10m-6 8h2"/></svg>,
  trash:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  lock:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  print:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>,
  sparkle: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  chart:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M19 9l-7 7-7-7"/></svg>,
};

// ── Nav definition — grouped to match the real Sidebar.tsx ─────────
type NavItem = { emoji: string; label: string; href: string; active?: boolean; showCount?: boolean };
type NavGroup = { group: string; items: NavItem[] };
const NAV_GROUPS: NavGroup[] = [
  {
    group: "ระบบคุมราคา",
    items: [
      { emoji: "🛡️", label: "คุมราคา", href: "/quotations", showCount: true },
    ],
  },
  {
    group: "ระบบวิเคราะห์ความเสียหาย",
    items: [
      { emoji: "✨", label: "วิเคราะห์ความเสียหาย AI", href: "/analyze" },
      { emoji: "🏠", label: "รวมเคสวิเคราะห์ความเสียหาย", href: "/dashboard" },
    ],
  },
  {
    group: "ระบบราคากลาง",
    items: [
      { emoji: "📖", label: "ราคาค่าแรง", href: "/catalog" },
      { emoji: "📦", label: "ราคาค่าอะไหล่", href: "/parts-catalog" },
      { emoji: "📤", label: "อัปเดตราคากลาง (Bulk Excel)", href: "/parts-catalog/import" },
    ],
  },
  {
    group: "ตั้งค่า & การจัดการผู้ใช้",
    items: [
      { emoji: "🏢", label: "สาขา", href: "/admin/branches" },
      { emoji: "👤", label: "พนักงาน", href: "/admin/users" },
      { emoji: "⚙️", label: "ตั้งค่า Workflow", href: "/admin/workflow" },
    ],
  },
  {
    group: "ระบบรายงาน",
    items: [
      { emoji: "📈", label: "รายงานสรุปยอด Saving", href: "/reports", active: true },
      { emoji: "⏱️", label: "รายงาน SLA", href: "/reports/sla" },
      { emoji: "⭐", label: "คะแนนอู่/ศูนย์", href: "/reports/garage-integrity" },
    ],
  },
];

// ── Gradient colours matching the mockup ──────────────────────────
const PINK   = "#e91e63";
const CYAN   = "#00c6ff";
const PURPLE = "#8e2de2";
const ORANGE = "#f7971e";
const BLUE   = "#0071e3";

const baht = (n: number) =>
  "฿" + Math.round(n).toLocaleString("th-TH");

// ── Types ──────────────────────────────────────────────────────────
type Q = {
  id: string;
  quotationNo: string;
  status: string;
  customerName: string | null;
  licensePlate: string | null;
  vehicleBrand: string | null;
  insurerName: string | null;
  totalQuoted: number;
  totalControlled: number;
  totalSaving: number;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { name: string } | null;
};

// ── Mini chart data (static decorative) ───────────────────────────
const MINI_BAR  = [40, 70, 30, 90, 60, 80].map((v, i) => ({ i, v }));
const MINI_AREA = [10, 40, 25, 60, 35, 75].map((v, i) => ({ i, v }));
const MINI_LINE = [30, 60, 20, 80, 50, 90].map((v, i) => ({ i, v }));
const MINI_BAR2 = [50, 80, 40, 95, 70, 60].map((v, i) => ({ i, v }));

// ── Status label helpers ───────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  approved: "เสร็จสมบูรณ์",
  pending_approval: "รอตรวจสอบ",
  draft: "บันทึกร่าง",
};
const STATUS_CLASS: Record<string, string> = {
  approved: "badge-open",
  pending_approval: "badge-hold",
  draft: "badge-process",
};

export function UiPreviewClient() {
  const [quotations, setQuotations] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(true);
  const [sidebarTheme, setSidebarTheme] = useState<"light" | "dark">("light");
  const dark = sidebarTheme === "dark";

  // ── Theme tokens ─────────────────────────────────────────────────
  const T = {
    // Chart line colours
    line1: dark ? "#0071e3" : "#e91e63",   // quoted / primary
    line2: dark ? "#38bdf8" : "#00c6ff",   // saving  / secondary
    // KPI gradient cards
    card1bg: dark ? "linear-gradient(135deg,#0071e3,#1d4ed8)"  : "linear-gradient(135deg,#ff416c,#ff4b2b)",
    card2bg: dark ? "linear-gradient(135deg,#1e40af,#3730a3)"  : "linear-gradient(135deg,#8e2de2,#4a00e0)",
    card3bg: dark ? "linear-gradient(135deg,#0284c7,#0369a1)"  : "linear-gradient(135deg,#00c6ff,#0072ff)",
    card4bg: dark ? "linear-gradient(135deg,#0f172a,#1e3a5f)"  : "linear-gradient(135deg,#f7971e,#ffd200)",
    // Donut
    donut1: dark ? "#2563eb" : "#8e2de2",
    donut2: dark ? "#38bdf8" : "#e91e63",
    donut3: dark ? "#0ea5e9" : "#f7971e",
    // Active tab underline / btn accent
    accent: dark ? "#0071e3" : "#e91e63",
    // Summary button
    summaryBg: dark ? "linear-gradient(135deg,#0071e3,#1d4ed8)" : "linear-gradient(135deg,#ff416c,#ff4b2b)",
    summaryBgShadow: dark ? "rgba(0,113,227,0.3)" : "rgba(255,65,108,0.3)",
    // Add case button
    addBg: dark ? "linear-gradient(135deg,#0071e3,#1d4ed8)" : "linear-gradient(135deg,#ff416c,#ff4b2b)",
    // Brand name gradient
    brandGrad: dark ? "linear-gradient(135deg,#0071e3,#38bdf8)" : "linear-gradient(135deg,#e91e63,#0071e3)",
    // dot colours in legend
    dotSaving:  dark ? "#38bdf8" : "#00c6ff",
    dotQuoted:  dark ? "#0071e3" : "#ff416c",
    // Page num active
    pageActive: dark ? "#0071e3" : "#e91e63",
  };
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 0:true,1:true,2:true,3:true,4:true });
  const toggleGroup = (i: number) => setOpenGroups((p) => ({ ...p, [i]: !p[i] }));

  useEffect(() => {
    fetch("/api/quotations")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login?next=/ui-preview"; return null; }
        return r.json();
      })
      .then((d) => { if (d) { setQuotations(d.quotations || []); setLoading(false); } })
      .catch(() => setLoading(false));
  }, []);

  // ── Aggregate stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const n = quotations.length;
    const totalQuoted     = quotations.reduce((s, q) => s + (q.totalQuoted     || 0), 0);
    const totalControlled = quotations.reduce((s, q) => s + (q.totalControlled || 0), 0);
    const totalSaving     = quotations.reduce((s, q) => s + (q.totalSaving     || 0), 0);
    const avgSaving       = n > 0 ? totalSaving / n : 0;
    const savingRate      = totalQuoted > 0 ? (totalSaving / totalQuoted) * 100 : 0;
    const completed = quotations.filter((q) => q.status === "approved").length;
    const reviewing  = quotations.filter((q) => q.status === "pending_approval").length;
    const pending    = quotations.filter((q) => q.status === "draft").length;
    const pctCompleted = n > 0 ? Math.round((completed / n) * 100) : 0;
    const pctReviewing  = n > 0 ? Math.round((reviewing  / n) * 100) : 0;
    const pctPending    = n > 0 ? Math.round((pending    / n) * 100) : 0;
    return { n, totalQuoted, totalControlled, totalSaving, avgSaving, savingRate,
             completed, reviewing, pending, pctCompleted, pctReviewing, pctPending };
  }, [quotations]);

  // ── Monthly trend (last 6 months) ────────────────────────────────
  const trend = useMemo(() => {
    const map = new Map<string, { count: number; saving: number }>();
    quotations.forEach((q) => {
      const d = new Date(q.updatedAt);
      const key = d.toLocaleString("th-TH", { month: "short" });
      const prev = map.get(key) || { count: 0, saving: 0 };
      map.set(key, { count: prev.count + 1, saving: prev.saving + (q.totalSaving || 0) });
    });
    const entries = Array.from(map.entries()).slice(-6);
    if (entries.length === 0) {
      return [
        { label: "ม.ค.", quoted: 10, saving: 8 },
        { label: "ก.พ.", quoted: 15, saving: 12 },
        { label: "มี.ค.", quoted: 12, saving: 18 },
        { label: "เม.ย.", quoted: 22, saving: 14 },
        { label: "พ.ค.", quoted: 14, saving: 26 },
        { label: "มิ.ย.", quoted: 25, saving: 18 },
      ];
    }
    const maxCount = Math.max(...entries.map(([, v]) => v.count), 1);
    return entries.map(([label, v]) => ({
      label,
      quoted: Math.round((v.count / maxCount) * 30),
      saving: Math.round((v.saving / (stats.totalSaving || 1)) * 30 * entries.length),
    }));
  }, [quotations, stats.totalSaving]);

  // ── Table filter ─────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    const q = search.toLowerCase();
    return quotations
      .filter((r) =>
        !q ||
        (r.customerName || "").toLowerCase().includes(q) ||
        (r.licensePlate || "").replace(/\s/g, "").toLowerCase().includes(q.replace(/\s/g, "")) ||
        r.quotationNo.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [quotations, search]);

  // ── Donut data ────────────────────────────────────────────────────
  const donutData = [
    { name: "เสร็จสมบูรณ์",  value: stats.pctCompleted || 65 },
    { name: "กำลังตรวจทาน",  value: stats.pctReviewing  || 25 },
    { name: "รอดำเนินการ",   value: stats.pctPending    || 10 },
  ];

  return (
    <div className="uipv-root app-container" style={{ background: "var(--bg-main)", color: "var(--text-main)", minHeight: "100vh", fontSize: 14 }}>

      {/* SVG gradient defs for charts */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="gpink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PINK} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PINK} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gcyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* ── TOP NAVBAR ─────────────────────────────────────────────── */}
      <header className="top-navbar">
        <div className="navbar-left">
          <a href="/ui-preview" className="brand-logo" style={{ textDecoration: "none" }}>
            <img src="/logo/Htech_logo.webp" alt="H Technology" className="logo-img" />
            <span className="brand-name">H Technology</span>
          </a>
          <button className="menu-toggle-btn" onClick={() => setNavOpen((v) => !v)} aria-label="toggle sidebar">
            <span style={{ display: "inline-flex", width: 18, height: 18 }}>{IC.bars}</span>
          </button>

        </div>

        <div className="navbar-right">
          <button
            onClick={() => setSidebarTheme(dark ? "light" : "dark")}
            title={dark ? "ตรีมสีสัน (Mockup)" : "ตรีมของ H Tech (ปัจจุบัน)"}
            style={{
              display:"flex",alignItems:"center",gap:6,padding:"5px 12px",
              borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
              ...(dark
                ? {background:"#0b132a",color:"#fff",border:"1px solid #152243"}
                : {background:"#eef6ff",color:"#0056b3",border:"1px solid #cce5ff"}),
            }}
          >
            <span>{dark ? "🎨" : "🏢"}</span>
            <span>{dark ? "ตรีมสีสัน" : "H Tech"}</span>
          </button>
          <button className="nav-icon-btn" title="แจ้งเตือน">
            <span style={{ display: "inline-flex", width: 18, height: 18 }}>{IC.bell}</span>
            <span className="notification-dot">1</span>
          </button>
          <button className="nav-icon-btn" title="ข้อความ">
            <span style={{ display: "inline-flex", width: 18, height: 18 }}>{IC.mail}</span>
            <span className="notification-dot">1</span>
          </button>
          <div className="user-profile">
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: BLUE, color: "#fff", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>ผู้</span>
            <span className="status-online" />
          </div>
        </div>
      </header>

      <div className="main-layout">
        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        {navOpen && (
          <aside className="sidebar" id="mainSidebar" style={dark ? {background:"#0b132a",borderRight:"1px solid #152243"} : {}}>
            <nav style={{padding:"12px 0",overflowY:"auto",flex:1}}>
              {NAV_GROUPS.map((g, gIdx) => {
                const isOpen = openGroups[gIdx] ?? true;
                return (
                  <div key={g.group} style={{marginBottom:8}}>
                    {/* Group header — accordion toggle */}
                    <button
                      onClick={() => toggleGroup(gIdx)}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        gap:10, padding:"8px 12px", margin:"4px 12px", width:"calc(100% - 24px)",
                        borderRadius:12, cursor:"pointer", border:"none",
                        fontSize:13, fontWeight:800, letterSpacing:"0.03em",
                        transition:"background .15s",
                        ...(dark
                          ? {background:"#111c38",color:"#93c5fd",borderColor:"#1b2d58"}
                          : {background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0"}),
                      }}
                    >
                      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                        {dark && <span style={{width:8,height:8,borderRadius:"50%",background:"#0071e3",flexShrink:0,display:"inline-block"}} />}
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.group}</span>
                      </div>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                        style={{flexShrink:0,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",
                          color: dark ? "#60a5fa" : "#94a3b8"}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    {/* Items */}
                    {isOpen && (
                      <div style={{marginTop:2}}>
                        {g.items.map((item) => {
                          const isActive = item.active;
                          const lightActive = {color:"#e91e63",fontWeight:700,background:"#fff5f8",borderLeft:"4px solid #e91e63"};
                          const darkActive  = {color:"#fff",fontWeight:700,background:"#2563eb",borderRadius:14};
                          const lightBase   = {color:"#64748b",fontWeight:500};
                          const darkBase    = {color:"#94a3b8",fontWeight:600};
                          return (
                            <a
                              key={item.label}
                              href={item.href}
                              style={{
                                display:"flex",alignItems:"center",padding:"10px 20px",gap:12,
                                textDecoration:"none",fontSize:14,transition:"all .15s",
                                margin: dark ? "2px 8px" : "1px 0",
                                borderRadius: dark ? 14 : 0,
                                ...(isActive ? (dark ? darkActive : lightActive) : (dark ? darkBase : lightBase)),
                              }}
                            >
                              <span style={{width:20,textAlign:"center",fontSize:16,flexShrink:0}}>{item.emoji}</span>
                              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span>
                              {item.showCount && (
                                <span style={{background:"#e0e7ff",color:"#4338ca",fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:10}}>{stats.n}</span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        )}

        {/* ── MAIN CONTENT ────────────────────────────────────────── */}
        <main className="content-area">

          {/* ── TOP SECTION: main chart + donut ─────────────────── */}
          <div className="grid-row top-charts-grid">

            {/* Main chart card */}
            <div className="card main-chart-card">
              <div className="card-header">
                <div className="header-titles">
                  <h2>รายงานสรุปวิเคราะห์ระบบคุมราคา</h2>
                  <p className="sub-title">
                    {loading ? "กำลังโหลด..." : `ข้อมูลจริง ${stats.n} รายการ`}
                  </p>
                </div>
                <div className="chart-controls">
                  <div className="time-tabs">
                    {["ทั้งหมด", "วันนี้", "7 วันล่าสุด", "MONTHLY", "ปีนี้"].map((t) => (
                      <button key={t} className="tab-btn" style={t==="MONTHLY"?{color:T.accent,borderBottom:`2px solid ${T.accent}`,paddingBottom:4}:{}}>{t}</button>
                    ))}
                  </div>
                  <div className="chart-legend">
                    <span className="legend-item"><span className="dot dot-online" /> ยอด Saving</span>
                    <span className="legend-item"><span className="dot dot-store" /> ใบเสนอราคา</span>
                  </div>
                </div>
              </div>

              <div className="card-body main-chart-body">
                <div className="metric-summary">
                  <div className="metric-price">{baht(stats.totalSaving)}</div>
                  <div>
                    <span className="sales-number">{stats.n}</span>
                    <span className="sales-label">ใบเสนอราคาคุมเสร็จสมบูรณ์</span>
                  </div>
                  <a href="/reports" className="btn-summary" style={{ textDecoration: "none", textAlign: "center", background: T.summaryBg, boxShadow: `0 4px 12px ${T.summaryBgShadow}` }}>
                    <span style={{ display: "inline-flex", width: 14, height: 14 }}>{IC.export}</span>
                    ส่งออกรายงาน
                  </a>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gpink2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PINK} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={PINK} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gcyan2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 35]} ticks={[0,5,10,15,20,25,30,35]} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                      <Area type="monotone" dataKey="quoted" stroke={T.line1} strokeWidth={3} fill="url(#gpink2)" dot={false} isAnimationActive={false} name="ใบเสนอราคา" />
                      <Area type="monotone" dataKey="saving" stroke={T.line2}  strokeWidth={3} fill="url(#gcyan2)" dot={false} isAnimationActive={false} name="ยอด Saving" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mini stat badges */}
              <div className="mini-badges-row">
                {[
                  { icon: "✅", cls: "icon-pink",   label: "ปริมาณรายการที่ดำเนินการ", value: `${stats.n} ใบ` },
                  { icon: "💰", cls: "icon-purple", label: "ยอด Saving รวมสุทธิ",      value: baht(stats.totalSaving) },
                  { icon: "🧮", cls: "icon-cyan",   label: "ยอด Saving เฉลี่ย/รายการ", value: baht(stats.avgSaving) },
                  { icon: "%",  cls: "icon-yellow", label: "อัตราส่วนลดคุมราคาเฉลี่ย", value: `${stats.savingRate.toFixed(1)}%` },
                ].map((b) => (
                  <div key={b.label} className="badge-item">
                    <div className={`badge-icon ${b.cls}`} style={{ fontSize: b.icon === "%" ? 14 : 16 }}>{b.icon}</div>
                    <div className="badge-info">
                      <span className="badge-label">{b.label}</span>
                      <span className="badge-value">{b.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut card */}
            <div className="card traffic-card">
              <div className="card-header"><h2>สถานะการคุมราคา</h2></div>
              <div className="card-body donut-body">
                <div className="donut-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius="62%" outerRadius="88%"
                           dataKey="value" isAnimationActive={false}>
                        {donutData.map((d, i) => <Cell key={i} fill={[T.donut1,T.donut2,T.donut3][i]} strokeWidth={0} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }} formatter={(v) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="traffic-metrics">
                  {[
                    { n: stats.pctCompleted || 65, color: T.donut1, label: "เสร็จสมบูรณ์" },
                    { n: stats.pctReviewing  || 25, color: T.donut2, label: "กำลังตรวจทาน" },
                    { n: stats.pctPending    || 10, color: T.donut3, label: "รอดำเนินการ" },
                  ].map((t) => (
                    <div key={t.label} className="traffic-stat">
                      <span className="traffic-num">{t.n}<sup>%</sup></span>
                      <span className="traffic-label"><span style={{width:8,height:8,borderRadius:"50%",display:"inline-block",background:t.color}} /> {t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4 GRADIENT FEATURE CARDS ─────────────────────────── */}
          <div className="grid-row gradient-cards-grid">
            {/* Card 1 – magenta */}
            <div className="gradient-card card-magenta" style={{background:T.card1bg}}>
              <div className="g-card-content">
                <span className="g-title">PROCESSED VOLUME</span>
                <div className="g-value">{stats.n}</div>
                <div className="g-date">ใบเสนอราคาคุมราคาเสร็จสมบูรณ์</div>
              </div>
              <div className="g-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MINI_BAR} barSize={6}>
                    <Bar dataKey="v" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 2 – purple */}
            <div className="gradient-card card-purple" style={{background:T.card2bg}}>
              <div className="g-card-content">
                <span className="g-title">TOTAL OPTIMIZATION</span>
                <div className="g-value">{baht(stats.totalSaving)}</div>
                <div className="g-date">ยอด Saving รวมสุทธิ</div>
              </div>
              <div className="g-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MINI_AREA}>
                    <Area type="monotone" dataKey="v" stroke="#fff" strokeWidth={2.5} fill="rgba(255,255,255,0.25)" dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 3 – cyan */}
            <div className="gradient-card card-cyan" style={{background:T.card3bg}}>
              <div className="g-card-content">
                <span className="g-title">AVERAGE OPTIMIZATION</span>
                <div className="g-value">{baht(stats.avgSaving)}</div>
                <div className="g-dropdown"><span>Monthly</span> ▾</div>
              </div>
              <div className="g-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MINI_LINE}>
                    <Line type="monotone" dataKey="v" stroke="#fff" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 4 – orange */}
            <div className="gradient-card card-orange" style={{background:T.card4bg}}>
              <div className="g-card-content">
                <span className="g-title">SAVING RATE</span>
                <div className="g-value">{stats.savingRate.toFixed(1)}%</div>
                <div className="g-date">อัตราส่วนลดคุมราคาเฉลี่ย</div>
              </div>
              <div className="g-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MINI_BAR2} barSize={6}>
                    <Bar dataKey="v" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── BOTTOM: activities + table ─────────────────────────── */}
          <div className="grid-row bottom-grid">

            {/* Recent activities */}
            <div className="card activities-card">
              <div className="card-header"><h2>กิจกรรมล่าสุดในระบบ</h2></div>
              <div className="card-body">
                <ul className="activity-timeline">
                  {quotations.slice(0, 5).map((q, i) => {
                    const colors = ["marker-pink", "marker-purple", "marker-cyan", "marker-yellow", "marker-green"];
                    const icons  = ["✓", "✨", "📄", "💰", "✅"];
                    const d = new Date(q.updatedAt);
                    const timeStr = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
                    return (
                      <li key={q.id} className="timeline-item">
                        <span className="time-ago">{timeStr}</span>
                        <div className={`timeline-marker ${colors[i % colors.length]}`}>{icons[i % icons.length]}</div>
                        <div className="timeline-content">
                          <h4>{STATUS_LABEL[q.status] || q.status}</h4>
                          <p><strong>{q.customerName || "ลูกค้า"} {q.licensePlate ? `(${q.licensePlate})` : ""}</strong> ยอดยื่น {baht(q.totalQuoted)}</p>
                        </div>
                      </li>
                    );
                  })}
                  {quotations.length === 0 && !loading && (
                    <li className="timeline-item" style={{ color: "#94a3b8" }}>ยังไม่มีข้อมูล</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Order table */}
            <div className="card table-card">
              <div className="card-header table-header-flex">
                <div>
                  <h2>รายการใบเสนอราคาคุมราคา (Order Status)</h2>
                  <p className="sub-title">ค้นหาด้วยชื่อ, ทะเบียนรถ, เลขที่เอกสาร</p>
                </div>
                <div className="table-toolbar">
                  <a href="/quotation/new" className="btn-add" style={{ textDecoration: "none", background: T.addBg }}>
                    <span style={{ display: "inline-flex", width: 12, height: 12 }}>{IC.plus}</span> เพิ่มเคส
                  </a>
                  <button className="btn-icon-tool"><span style={{ display: "inline-flex", width: 13, height: 13 }}>{IC.filter}</span></button>
                  <button className="btn-icon-tool"><span style={{ display: "inline-flex", width: 13, height: 13 }}>{IC.trash}</span></button>
                  <button className="btn-icon-tool"><span style={{ display: "inline-flex", width: 13, height: 13 }}>{IC.lock}</span></button>
                  <div className="table-search">
                    <input type="text" placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <span style={{ display: "inline-flex", width: 14, height: 14, color: "#94a3b8", cursor: "pointer" }}>{IC.print}</span>
                  </div>
                </div>
              </div>

              <div className="card-body table-responsive">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>INVOICE</th>
                      <th>CUSTOMERS / ทะเบียน</th>
                      <th>FROM / ศูนย์ซ่อม</th>
                      <th>PRICE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((q) => (
                      <tr key={q.id}>
                        <td><a href={`/quotations/${q.id}`} style={{ textDecoration: "underline", color: "inherit" }}>{q.quotationNo}</a></td>
                        <td><strong>{q.customerName || "—"}</strong>{q.licensePlate ? ` (${q.licensePlate})` : ""}</td>
                        <td>{q.insurerName || q.vehicleBrand || "—"}</td>
                        <td>{baht(q.totalQuoted)}</td>
                        <td><span className={`status-badge ${STATUS_CLASS[q.status] || "badge-process"}`}>{STATUS_LABEL[q.status] || q.status}</span></td>
                      </tr>
                    ))}
                    {tableRows.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
                        {loading ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="card-footer table-footer-flex">
                <span className="entries-info">แสดง {tableRows.length} จาก {quotations.length} รายการ</span>
                <div className="pagination">
                  <button className="page-nav">{"<"}</button>
                  <button className="page-num active" style={{background:T.pageActive,color:"#fff"}}>1</button>
                  <button className="page-nav">{">"}</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
