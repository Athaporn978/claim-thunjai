"use client";
import { useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/**
 * Design preview only — NOT part of the running product.
 *
 * Renders the whole shell (top bar, sidebar, logout menu, cards, charts) in the
 * theme from dashboard-design/, so the look can be judged in context before
 * deciding whether to migrate the real shell across all 21 portal pages.
 *
 * Deliberately isolated: no database, no session, no shared layout, and not
 * linked from the menu — reachable only at /ui-preview. Every number below is
 * fake. Deleting this folder removes it with zero effect on the product.
 *
 * One departure from the mockup: its accent is pink (#e91e63), which AGENTS.md
 * forbids. Uses the mandated blue (#0071e3) throughout instead.
 */

const BLUE = "#0071e3";
const NAVY = "#0a1f44";
const ORANGE = "#ff7a1a";
const EMERALD = "#10b981";

const TREND = [
  { label: "ก.พ.", quoted: 82000, approved: 61000 },
  { label: "มี.ค.", quoted: 95000, approved: 68000 },
  { label: "เม.ย.", quoted: 78000, approved: 59000 },
  { label: "พ.ค.", quoted: 120000, approved: 84000 },
  { label: "มิ.ย.", quoted: 105000, approved: 72000 },
  { label: "ก.ค.", quoted: 138000, approved: 95000 },
  { label: "ส.ค.", quoted: 152000, approved: 101000 },
];

const INSURERS = [
  { name: "ทิพยประกันภัย", value: 34 },
  { name: "วิริยะประกันภัย", value: 26 },
  { name: "ธนชาตประกันภัย", value: 18 },
  { name: "แอลเอ็มจี", value: 12 },
  { name: "อื่นๆ", value: 10 },
];
const DONUT = [BLUE, "#4c9aff", NAVY, ORANGE, "#94a3b8"];

const CASES = [
  { no: "HT-2026-08-0012", cust: "คุณสมชาย ใจดี", plate: "1กข-1234 กทม", quoted: 47076, saving: 7622, status: "อนุมัติ" },
  { no: "HT-2026-08-0011", cust: "คุณน้ำทิพย์ ทับวงศ์", plate: "2ขณ-2963 กทม", quoted: 19130, saving: 4670, status: "อนุมัติ" },
  { no: "HT-2026-08-0010", cust: "คุณวิภาวรรณ ขยันยิ่ง", plate: "ขก-5678 เชียงใหม่", quoted: 42000, saving: 8500, status: "รออนุมัติ" },
  { no: "HT-2026-08-0009", cust: "คุณธีรยุทธ รักดี", plate: "ฮฮ-999 กทม", quoted: 18000, saving: 3500, status: "อนุมัติ" },
  { no: "HT-2026-08-0008", cust: "คุณศักดิ์สิทธิ์ ปัตถาทุม", plate: "6ขฉ-5116 กทม", quoted: 28500, saving: 6100, status: "บันทึกร่าง" },
];

const NAV = [
  { group: "ระบบคุมราคา", items: [{ label: "คุมราคา", icon: "🛡️", active: false }] },
  { group: "ระบบวิเคราะห์ความเสียหาย", items: [
    { label: "วิเคราะห์ความเสียหาย AI", icon: "🔍", active: false },
    { label: "รวมเคสวิเคราะห์ความเสียหาย", icon: "🏠", active: false },
  ] },
  { group: "ระบบราคากลาง", items: [
    { label: "ราคาค่าแรง", icon: "📖", active: false },
    { label: "ราคาค่าอะไหล่", icon: "📦", active: false },
    { label: "อัปเดตราคากลาง", icon: "⬆️", active: false },
  ] },
  { group: "ระบบรายงาน", items: [
    { label: "รายงานสรุปยอด Saving", icon: "📊", active: true },
    { label: "รายงาน SLA", icon: "⏱️", active: false },
    { label: "คะแนนอู่/ศูนย์", icon: "🏢", active: false },
  ] },
];

const tip = {
  contentStyle: { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" },
};
const baht = (n: number) => "฿" + n.toLocaleString("th-TH");

export function UiPreviewClient() {
  const [userMenu, setUserMenu] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f6fc] text-[#2d3748]">
      {/* ── Top navbar (mockup: white, 64px, sticky, soft shadow) ── */}
      <header className="sticky top-0 z-50 h-16 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/logo/Htech_logo.webp" alt="H Technology" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-extrabold text-lg tracking-tight text-[#0071e3] hidden sm:block">H Technology</span>
          </div>
          <button
            onClick={() => setNavOpen((v) => !v)}
            aria-label="สลับเมนู"
            className="p-2 rounded-lg text-slate-500 hover:text-[#0071e3] hover:bg-slate-50 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden md:flex items-center gap-2 bg-[#eef6ff] border border-[#cce5ff] text-[#0056b3] rounded-full px-3.5 py-1.5 text-[13px] font-medium">
            <span>🚗</span>
            <span>ทะเบียนปัจจุบัน: <strong>1กข-1234 กทม.</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {["🔔", "✉️"].map((ic) => (
            <button key={ic} className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer">
              <span className="text-base">{ic}</span>
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#0071e3] text-white text-[10px] font-bold flex items-center justify-center">1</span>
            </button>
          ))}

          {/* User + logout menu */}
          <div className="relative">
            <button onClick={() => setUserMenu((v) => !v)} className="relative flex items-center gap-2 cursor-pointer">
              <span className="w-9 h-9 rounded-full bg-[#0071e3] text-white font-extrabold text-xs flex items-center justify-center border-2 border-white shadow-[0_2px_5px_rgba(0,0,0,0.1)]">
                ผู้
              </span>
              <span className="absolute bottom-0.5 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </button>

            {userMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="font-bold text-sm text-[#2d3748]">ผู้บริหารระบบ</div>
                    <div className="text-xs text-slate-500 font-medium">admin@htechnology.com</div>
                    <div className="mt-1.5 inline-block text-[11px] font-bold text-[#0071e3] bg-[#eef6ff] px-2 py-0.5 rounded-md">
                      สาขากรุงเทพฯ (ลาดพร้าว)
                    </div>
                  </div>
                  {[
                    { icon: "👤", label: "โปรไฟล์ของฉัน" },
                    { icon: "⚙️", label: "ตั้งค่าบัญชี" },
                  ].map((m) => (
                    <button key={m.label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer">
                      <span>{m.icon}</span>{m.label}
                    </button>
                  ))}
                  <div className="border-t border-slate-100">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition cursor-pointer">
                      <span>🚪</span>ออกจากระบบ
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Sidebar (mockup: white, grey text, blue active with left bar) ── */}
        <aside
          className={`${navOpen ? "block" : "hidden"} lg:block w-60 shrink-0 bg-white border-r border-[#edf2f7] py-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto`}
        >
          <nav className="flex flex-col gap-0.5">
            {NAV.map((g) => (
              <div key={g.group} className="mb-1">
                <div className="px-5 pt-3 pb-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{g.group}</div>
                {g.items.map((it) => (
                  <a
                    key={it.label}
                    href="#"
                    className={`relative flex items-center px-5 py-2.5 text-[13px] transition ${
                      it.active ? "text-[#0071e3] font-semibold bg-[#eef6ff]" : "text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-700"
                    }`}
                  >
                    {it.active && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0071e3] rounded-r" />}
                    <span className="w-5 mr-3 text-center text-sm">{it.icon}</span>
                    <span className="truncate">{it.label}</span>
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2d3748]">รายงานสรุปวิเคราะห์ระบบคุมราคา</h1>
            <p className="text-sm text-slate-500 font-medium">ภาพรวมผลการคุมราคาซ่อมรถยนต์ · ข้อมูลตัวอย่างสำหรับดูดีไซน์</p>
          </div>

          {/* KPI badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { icon: "📄", label: "จำนวนเคส", value: "128", color: BLUE },
              { icon: "🏬", label: "ราคาเสนอรวม", value: baht(770000), color: NAVY },
              { icon: "🛡️", label: "อนุมัติรวม", value: baht(540000), color: EMERALD },
              { icon: "💰", label: "เฉลี่ย/ใบ", value: baht(1797), color: ORANGE },
            ].map((b) => (
              <div key={b.label} className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: b.color + "1a" }}>{b.icon}</div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500 font-semibold truncate">{b.label}</div>
                  <div className="text-lg font-extrabold text-[#2d3748] truncate">{b.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trend + donut */}
          <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#2d3748]">แนวโน้มการคุมราคา</h2>
                  <p className="text-xs text-slate-500 font-medium">เทียบราคาเสนอกับราคาอนุมัติ</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
                  {["รายวัน", "รายสัปดาห์", "รายเดือน", "รายปี"].map((t, i) => (
                    <button key={t} className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${i === 2 ? "bg-[#0071e3] text-white" : "text-slate-500 hover:text-slate-800"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="text-3xl font-black text-[#2d3748] tracking-tight">{baht(230000)}</div>
              <div className="text-sm text-slate-500 font-semibold mb-2">128 เคส · ยอดประหยัดรวม</div>
              <div className="h-56 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={TREND} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pvQ" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NAVY} stopOpacity={0.28} /><stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="pvA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BLUE} stopOpacity={0.32} /><stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} width={46} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip {...tip} formatter={(v) => baht(Number(v) || 0)} />
                    <Area type="monotone" dataKey="quoted" stroke={NAVY} strokeWidth={2.5} fill="url(#pvQ)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="approved" stroke={BLUE} strokeWidth={2.5} fill="url(#pvA)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col">
              <h2 className="text-base font-extrabold text-[#2d3748]">สัดส่วนบริษัทประกัน</h2>
              <div className="h-48 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={INSURERS} dataKey="value" nameKey="name" innerRadius="72%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                      {INSURERS.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
                    </Pie>
                    <Tooltip {...tip} wrapperStyle={{ zIndex: 20 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                {INSURERS.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT[i % DONUT.length] }} />
                      <span className="font-semibold text-slate-600 truncate">{s.name}</span>
                    </span>
                    <span className="font-extrabold text-[#2d3748]">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gradient cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { t: "ยอดประหยัดรวม", v: baht(230000), g: "from-[#0071e3] to-[#005bb5]", c: "area" },
              { t: "อัตราประหยัด", v: "29.8%", g: "from-blue-700 to-indigo-800", c: "bar" },
              { t: "รออนุมัติ", v: "14", g: "from-[#ff7a1a] to-[#e8650a]", c: "bar" },
              { t: "เสร็จสิ้นแล้ว", v: "114", g: "from-emerald-500 to-teal-600", c: "area" },
            ].map((c) => (
              <div key={c.t} className={`relative overflow-hidden rounded-2xl p-[18px] text-white bg-gradient-to-br ${c.g} shadow-[0_8px_20px_rgba(0,0,0,0.08)] min-h-[110px] flex items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <div className="text-xs font-medium opacity-90 truncate">{c.t}</div>
                  <div className="text-[22px] font-extrabold tracking-tight mt-1 truncate">{c.v}</div>
                </div>
                <div className="w-24 h-14 shrink-0 opacity-90">
                  <ResponsiveContainer width="100%" height="100%">
                    {c.c === "bar" ? (
                      <BarChart data={TREND}><Bar dataKey="approved" fill="rgba(255,255,255,.75)" radius={4} isAnimationActive={false} /></BarChart>
                    ) : (
                      <AreaChart data={TREND}><Area type="monotone" dataKey="approved" stroke="#fff" strokeWidth={2.5} fill="rgba(255,255,255,.25)" isAnimationActive={false} /></AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* Activity + table */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="text-base font-extrabold text-[#2d3748] mb-4">ความเคลื่อนไหวล่าสุด</h3>
              <div className="space-y-4">
                {CASES.map((c, i) => (
                  <div key={c.no} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm" style={{ background: DONUT[i % DONUT.length] }}>🚗</span>
                      {i < CASES.length - 1 && <span className="flex-1 w-px bg-slate-200 mt-1" />}
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="text-sm font-extrabold text-[#0071e3]">{c.no}</div>
                      <div className="text-xs text-slate-600 font-semibold truncate">{c.cust} · {c.plate}</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">26 ส.ค. 69 · สาขากรุงเทพฯ</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-[#2d3748]">รายการเคสล่าสุด</h3>
                <a href="#" className="text-xs font-bold text-[#0071e3] hover:underline">ดูทั้งหมด →</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100">
                      {["เลขที่", "ลูกค้า / ทะเบียน", "ราคาเสนอ", "Saving", "สถานะ"].map((h, i) => (
                        <th key={h} className={`px-3 py-2.5 font-bold whitespace-nowrap ${i >= 2 && i < 4 ? "text-right" : i === 4 ? "text-center" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CASES.map((c) => (
                      <tr key={c.no} className="border-b border-slate-50 hover:bg-slate-50/70 transition">
                        <td className="px-3 py-3 font-bold text-[#0071e3] whitespace-nowrap">{c.no}</td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-slate-700 truncate max-w-[170px]">{c.cust}</div>
                          <div className="text-[11px] text-slate-500">{c.plate}</div>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-700 whitespace-nowrap">{baht(c.quoted)}</td>
                        <td className="px-3 py-3 text-right font-extrabold text-orange-600 whitespace-nowrap">{baht(c.saving)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                            c.status === "อนุมัติ" ? "bg-emerald-50 text-emerald-700"
                            : c.status === "รออนุมัติ" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold">แสดง 1–5 จาก 128</span>
                <div className="flex items-center gap-1.5">
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">←</button>
                  {[1, 2, 3].map((n) => (
                    <button key={n} className={`w-8 h-8 rounded-lg text-xs font-extrabold cursor-pointer ${n === 1 ? "bg-[#0071e3] text-white" : "border border-slate-200 text-slate-600"}`}>{n}</button>
                  ))}
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">→</button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 font-medium py-4">
            หน้านี้เป็นตัวอย่างดีไซน์เท่านั้น · ข้อมูลทั้งหมดเป็นข้อมูลสมมติ · ไม่เชื่อมต่อฐานข้อมูลจริง
          </p>
        </main>
      </div>
    </div>
  );
}
