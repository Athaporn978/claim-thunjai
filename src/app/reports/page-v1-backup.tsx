"use client";
import { useEffect, useState, useMemo } from "react";
import { useLang } from "@/lib/LangContext";

type Quotation = {
  id: string;
  quotationNo: string;
  customerName: string | null;
  licensePlate: string | null;
  insurerName: string | null;
  centerName: string | null;
  vehicleBrand: string | null;
  totalQuoted: number;
  totalControlled: number;
  totalSaving: number;
  createdAt: string;
  items?: { type: string; name: string; quotedUnit: number; controlledUnit: number }[];
};

export default function ReportsPageV1Backup() {
  const { lang } = useLang();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsurer, setSelectedInsurer] = useState("all");

  const load = () => {
    setLoading(true);
    fetch("/api/quotations")
      .then((r) => (r.ok ? r.json() : { quotations: [] }))
      .then((d) => setQuotations(d.quotations || []))
      .catch(() => setQuotations([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      if (selectedInsurer !== "all" && q.insurerName !== selectedInsurer) return false;
      return true;
    });
  }, [quotations, selectedInsurer]);

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

  const insurerList = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      if (q.insurerName) set.add(q.insurerName);
    });
    return Array.from(set);
  }, [quotations]);

  const topCenterSavings = useMemo(() => {
    const map = new Map<string, { quoted: number; controlled: number; saving: number; count: number }>();
    quotations.forEach((q) => {
      const name = q.centerName || "ไม่ระบุศูนย์/อู่ซ่อม";
      const cur = map.get(name) || { quoted: 0, controlled: 0, saving: 0, count: 0 };
      map.set(name, {
        quoted: cur.quoted + (q.totalQuoted || 0),
        controlled: cur.controlled + (q.totalControlled || 0),
        saving: cur.saving + (q.totalSaving || 0),
        count: cur.count + 1,
      });
    });
    return Array.from(map.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.saving - a.saving)
      .slice(0, 10);
  }, [quotations]);

  const brandSavings = useMemo(() => {
    const map = new Map<string, { saving: number; count: number }>();
    quotations.forEach((q) => {
      const brand = q.vehicleBrand || "อื่นๆ";
      const cur = map.get(brand) || { saving: 0, count: 0 };
      map.set(brand, { saving: cur.saving + (q.totalSaving || 0), count: cur.count + 1 });
    });
    return Array.from(map.entries())
      .map(([brand, stat]) => ({ brand, ...stat }))
      .sort((a, b) => b.saving - a.saving);
  }, [quotations]);

  const partsVsLabor = useMemo(() => {
    let partsSaving = 0;
    let laborSaving = 0;

    quotations.forEach((q) => {
      if (q.items) {
        q.items.forEach((item) => {
          const diff = (item.quotedUnit - item.controlledUnit) || 0;
          if (item.type === "part") partsSaving += diff;
          else laborSaving += diff;
        });
      }
    });

    const total = partsSaving + laborSaving || 1;
    return {
      partsSaving,
      laborSaving,
      partsPercent: (partsSaving / total) * 100,
      laborPercent: (laborSaving / total) * 100,
    };
  }, [quotations]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-[#0b132a] text-white rounded-2xl p-6 shadow-lg border border-[#1b2d58] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-[#0071e3] text-white text-[11px] font-extrabold tracking-wider uppercase shadow-xs">
              📊 Power BI & Tableau Executive Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {lang === "th" ? "แดชบอร์ดวิเคราะห์ยอดคุมราคา & Saving" : "Claims Cost Control Executive Dashboard"}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {lang === "th" ? "สรุปผลเชิงลึก เปรียบเทียบเม็ดเงินประหยัด และจัดอันดับ Top 10 ศูนย์บริการ/อู่ซ่อม" : "Real-time interactive BI analytics derived from price control data"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#111c38] border border-[#1b2d58] rounded-xl p-1.5 flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold px-2">บริษัทประกัน:</span>
            <select
              value={selectedInsurer}
              onChange={(e) => setSelectedInsurer(e.target.value)}
              className="bg-[#0b132a] text-white font-bold px-3 py-1.5 rounded-lg border border-[#1b2d58] focus:outline-none focus:border-[#0071e3] cursor-pointer"
            >
              <option value="all">🏢 ทั้งหมดทุกบริษัทประกัน ({quotations.length})</option>
              {insurerList.map((ins) => (
                <option key={ins} value={ins}>{ins}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
          >
            <span>📥</span> {lang === "th" ? "ส่งออกรายงาน Power BI" : "Export Report"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">
              {lang === "th" ? "จำนวนใบเสนอราคาคุมแล้ว" : "Quotation Volume"}
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2 flex items-baseline gap-2">
              <span>{metrics.count}</span>
              <span className="text-xs font-bold text-slate-500">รายการ</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
              <span>สถานะ: คุมราคาเสร็จสมบูรณ์</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">
              {lang === "th" ? "ยอดเสนอศูนย์ vs ยอดอนุมัติ" : "Quoted vs Controlled"}
            </div>
            <div className="text-xl font-extrabold text-slate-800 mt-2">
              ฿{metrics.totalControlled.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              จากราคาเสนอศูนย์ ฿{metrics.totalQuoted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="bg-[#0b132a] text-white rounded-2xl p-5 border border-[#1b2d58] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wide">
              {lang === "th" ? "ยอดประหยัดรวมสะสม (Total Saving)" : "Total Saving"}
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">
              ฿{metrics.totalSaving.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">เฉลี่ยต่อใบ:</span>
              <span className="font-extrabold text-emerald-300">฿{metrics.avgSaving.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">
              {lang === "th" ? "อัตราส่วนลดประหยัดเฉลี่ย" : "Saving Ratio"}
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2 flex items-baseline gap-1">
              <span>{metrics.savingPercent.toFixed(1)}%</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.savingPercent * 3, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
                {lang === "th" ? "เปรียบเทียบยอดเสนอจากศูนย์/อู่ vs ยอดหลังคุมราคา (รายใบ)" : "Quoted vs Controlled Price Matrix"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">แผนภูมิแท่งเปรียบเทียบมูลค่าก่อนและหลังคุมราคา</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-300"></span>
                <span className="text-slate-600">เสนอศูนย์</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#0071e3]"></span>
                <span className="text-[#0071e3]">หลังคุมราคา</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                <span className="text-emerald-600">ยอดประหยัด</span>
              </div>
            </div>
          </div>

          <div className="space-y-5 py-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">ไม่มีข้อมูลสำหรับแสดงผล</div>
            ) : (
              filtered.map((q) => {
                const maxVal = Math.max(...filtered.map((item) => item.totalQuoted || 1));
                const quotedWidth = (q.totalQuoted / maxVal) * 100;
                const controlledWidth = (q.totalControlled / maxVal) * 100;

                return (
                  <div key={q.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 font-mono">{q.quotationNo} ({q.customerName || "ไม่ระบุชื่อ"})</span>
                      <span className="text-emerald-600 font-extrabold">ประหยัด ฿{q.totalSaving.toLocaleString()}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                          <div className="bg-slate-400 h-full rounded-lg transition-all duration-500" style={{ width: `${quotedWidth}%` }}></div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 w-16 text-right">฿{q.totalQuoted.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                          <div className="bg-[#0071e3] h-full rounded-lg transition-all duration-500" style={{ width: `${controlledWidth}%` }}></div>
                        </div>
                        <span className="text-[10px] font-mono text-[#0071e3] font-bold w-16 text-right">฿{q.totalControlled.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {lang === "th" ? "สัดส่วนประหยัด ค่าอะไหล่ vs ค่าแรง" : "Parts vs Labor Savings"}
            </h2>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="flex justify-center my-2 relative">
              <div className="w-40 h-40 rounded-full border-12 border-emerald-500 border-t-[#0071e3] flex items-center justify-center shadow-inner relative">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">ยอดประหยัดรวม</div>
                  <div className="text-lg font-extrabold text-slate-900">฿{metrics.totalSaving.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#0071e3]"></span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">ประหยัดจาก ค่าอะไหล่</div>
                    <div className="text-[10px] text-slate-500">หมวดอะไหล่ OEM / REM</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-[#0071e3]">฿{partsVsLabor.partsSaving.toLocaleString()}</div>
                  <div className="text-[10px] text-blue-600 font-bold">{partsVsLabor.partsPercent.toFixed(1)}%</div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">ประหยัดจาก ค่าแรงซ่อม</div>
                    <div className="text-[10px] text-slate-500">หมวดค่าเคาะ พ่นสี และถอดประกอบ</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-emerald-700">฿{partsVsLabor.laborSaving.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">{partsVsLabor.laborPercent.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>🛠️</span> {lang === "th" ? "Top 10 ศูนย์บริการ / อู่ซ่อมที่มีมูลค่าประหยัดสูงสุด" : "Top 10 Repair Centers by Savings"}
            </h2>
            <span className="text-[11px] text-[#0071e3] font-extrabold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              อันดับ Saving
            </span>
          </div>

          <div className="space-y-3">
            {topCenterSavings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">ไม่มีข้อมูลศูนย์บริการ/อู่ซ่อม</div>
            ) : (
              topCenterSavings.map((center, idx) => {
                const pct = metrics.totalSaving > 0 ? (center.saving / metrics.totalSaving) * 100 : 0;
                return (
                  <div key={center.name} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center shadow-2xs ${
                          idx === 0 ? "bg-amber-500 shadow-amber-500/50" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-slate-800"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-extrabold">{center.name}</span>
                      </div>
                      <span className="text-emerald-600 font-extrabold">฿{center.saving.toLocaleString()} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct * 3, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                      <span>{center.count} ใบเสนอราคา</span>
                      <span>เสนอ ฿{center.quoted.toLocaleString()} ➔ อนุมัติ ฿{center.controlled.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>🚗</span> {lang === "th" ? "อันดับยี่ห้อรถยนต์ที่มีมูลค่าคุมราคาสูงสุด" : "Top Vehicle Brands by Savings"}
            </h2>
          </div>

          <div className="space-y-3">
            {brandSavings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">ไม่มีข้อมูลยี่ห้อรถยนต์</div>
            ) : (
              brandSavings.map((b, idx) => {
                const maxSaving = Math.max(...brandSavings.map((item) => item.saving || 1));
                const widthPct = (b.saving / maxSaving) * 100;
                return (
                  <div key={b.brand} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-extrabold">{b.brand}</span>
                      </div>
                      <span className="text-[#0071e3] font-extrabold">฿{b.saving.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#0071e3] h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
