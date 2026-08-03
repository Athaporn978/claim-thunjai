"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/LangContext";

export type PriceEstimate = {
  partTh: string;
  matched: boolean;
  vehicleType: string;
  size: string;
  repair: number | null;
  replace: number | null;
  low: number | null;
  high: number | null;
  source: string;
};

export type Damage = {
  part: string;
  partTh?: string;
  severity: "minor" | "moderate" | "severe";
  description: string;
  descriptionTh?: string;
  bbox: { x: number; y: number; w: number; h: number };
  confidence: number;
  priceEstimate?: PriceEstimate;
};

export type AnalyzeResult = {
  vehicleMake?: string;
  vehicleColor?: string;
  angle?: string;
  overallSeverity?: string;
  damages?: Damage[];
  totalEstimate?: { low: number; high: number; matchedCount: number; totalCount: number };
  error?: string;
  raw?: string;
};

export type ReportMeta = {
  claimNumber?: string;
  policyHolder?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  licensePlate?: string;
};

export type MergedItem = {
  part: string;
  partTh?: string;
  severity: "minor" | "moderate" | "severe";
  description?: string;
  descriptionTh?: string;
  repair: number | null;
  replace: number | null;
  matched: boolean;
  vehicleType?: string;
  size?: string;
  count: number; // how many images this part appeared in
};

const SEV_RANK: Record<string, number> = { minor: 0, moderate: 1, severe: 2 };

// Merge damages across ALL images, de-duplicating by part. Keeps the worst
// severity (and its price) per part, and counts occurrences.
export function mergeDamages(results: AnalyzeResult[]): {
  items: MergedItem[];
  totalRepair: number;
  totalReplace: number;
} {
  const map = new Map<string, MergedItem>();
  for (const r of results) {
    for (const d of r.damages || []) {
      const key = (d.partTh || d.part || "").trim().toLowerCase();
      if (!key) continue;
      const pe = d.priceEstimate;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          part: d.part, partTh: d.partTh, severity: d.severity,
          description: d.description, descriptionTh: d.descriptionTh,
          repair: pe?.repair ?? null, replace: pe?.replace ?? null, matched: !!pe?.matched,
          vehicleType: pe?.vehicleType, size: pe?.size, count: 1,
        });
      } else {
        existing.count += 1;
        if ((SEV_RANK[d.severity] ?? 0) > (SEV_RANK[existing.severity] ?? 0)) {
          existing.severity = d.severity;
          existing.description = d.description;
          existing.descriptionTh = d.descriptionTh;
          existing.repair = pe?.repair ?? null;
          existing.replace = pe?.replace ?? null;
          existing.matched = !!pe?.matched;
        }
      }
    }
  }
  const items = Array.from(map.values()).sort(
    (a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0),
  );
  const totalRepair = items.reduce((s, i) => s + (i.repair ?? i.replace ?? 0), 0);
  const totalReplace = items.reduce((s, i) => s + (i.replace ?? i.repair ?? 0), 0);
  return { items, totalRepair, totalReplace };
}

const severityClass: Record<string, string> = {
  minor: "badge-minor",
  moderate: "badge-moderate",
  severe: "badge-severe",
  total_loss: "badge-total",
};

const severityColor: Record<string, string> = {
  minor: "#10b981",
  moderate: "#f59e0b",
  severe: "#ef4444",
};

export function DamageReportView({
  results,
  previews,
  overallSeverity,
  meta,
}: {
  results: AnalyzeResult[];
  previews: string[];
  overallSeverity: string;
  meta?: ReportMeta;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedClaimNo, setSavedClaimNo] = useState("");

  const totalDamages = results.reduce((sum, r) => sum + (r.damages?.length || 0), 0);
  const fmt = (n: number) => n.toLocaleString(lang === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 0 });

  // Merged repair list (deduped across all images)
  const merged = mergeDamages(results);
  const grandTotalLow = merged.totalRepair;
  const grandTotalHigh = merged.totalReplace;

  const handleSaveClaim = async () => {
    setIsSaving(true);
    try {
      const claimNum = meta?.claimNumber || `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const res = await fetch("/api/claims/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimNumber: claimNum,
          comment,
          policyHolder: meta?.policyHolder,
          vehicleMake: meta?.vehicleMake,
          vehicleModel: meta?.vehicleModel,
          licensePlate: meta?.licensePlate,
          overallSeverity,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedClaimNo(claimNum);
        setSavedSuccess(true);
      } else {
        alert(data.error || "ไม่สามารถบันทึกเคสได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (e) {
      console.error("Save claim error:", e);
      alert("เกิดข้อผิดพลาดในการบันทึกเคส");
    } finally {
      setIsSaving(false);
    }
  };

  const exportPdf = () => {
    document.body.classList.add("printing-damage");
    const cleanup = () => {
      document.body.classList.remove("printing-damage");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  const sevLabel = (s: string) => t.severity[s as keyof typeof t.severity] || s;

  return (
    <>
    <div className="card !p-0 overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--navy-900)] text-white px-6 py-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t.report.title}</h2>
          <p className="text-xs text-white/60 mt-0.5">Powered by Claude Vision</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-white/60">{t.report.overall}</div>
            <span className={`${severityClass[overallSeverity] || "badge-minor"} px-3 py-1 rounded font-bold text-sm mt-1 inline-block`}>
              {t.severity[overallSeverity as keyof typeof t.severity] || overallSeverity}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60">{t.report.detected}</div>
            <div className="text-2xl font-bold">{totalDamages}</div>
          </div>
          {grandTotalHigh > 0 && (
            <div className="text-right border-l border-white/20 pl-4">
              <div className="text-xs text-white/60">{lang === "th" ? "ราคากลางประมาณการ" : "Est. Repair Cost"}</div>
              <div className="text-2xl font-bold text-[var(--orange-500)]">
                ฿{fmt(grandTotalLow)}–{fmt(grandTotalHigh)}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{lang === "th" ? "อ้างอิงสมาคมอู่กลางฯ" : "Source: uklang.com"}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {results.length > 1 && (
        <div className="border-b border-slate-200 px-4 flex gap-1 overflow-x-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                active === i ? "border-b-2 border-[var(--orange-500)] text-[var(--navy-900)]" : "text-slate-500"
              }`}
            >
              {lang === "th" ? "ภาพ" : "Image"} {i + 1}
              {r.angle && <span className="ml-1 text-xs text-slate-400">· {r.angle}</span>}
              {r.damages && r.damages.length > 0 && (
                <span className="ml-2 bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs">{r.damages.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-0">
        {/* Image with bounding boxes */}
        <div className="lg:col-span-3 bg-slate-100 relative">
          <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previews[active]} alt="" className="absolute inset-0 w-full h-full object-contain"/>
            {(results[active]?.damages || []).map((d, i) => (
              <div
                key={i}
                className="bbox"
                style={{
                  left: `${d.bbox.x}%`,
                  top: `${d.bbox.y}%`,
                  width: `${d.bbox.w}%`,
                  height: `${d.bbox.h}%`,
                  borderColor: severityColor[d.severity],
                }}
              >
                <span className="bbox-label" style={{ background: severityColor[d.severity] }}>
                  {i + 1}. {lang === "th" && d.partTh ? d.partTh : d.part}
                </span>
              </div>
            ))}
          </div>
          {results[active]?.error && (
            <div className="absolute inset-x-4 bottom-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded">
              AI parse failed. Raw: {results[active].raw?.slice(0, 200)}
            </div>
          )}
        </div>

        {/* Damage list */}
        <div className="lg:col-span-2 max-h-[600px] overflow-y-auto">
          {(results[active]?.damages || []).length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="text-4xl mb-2">✅</div>
              <div className="font-semibold">{t.report.noDamage}</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(results[active]?.damages || []).map((d, i) => (
                <div key={i} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: severityColor[d.severity] }}
                      >
                        {i + 1}
                      </span>
                      <h4 className="font-bold text-[var(--navy-900)]">
                        {lang === "th" && d.partTh ? d.partTh : d.part}
                      </h4>
                    </div>
                    <span className={`${severityClass[d.severity]} px-2 py-0.5 rounded text-xs font-bold flex-shrink-0`}>
                      {t.severity[d.severity]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 ml-8">
                    {lang === "th" && d.descriptionTh ? d.descriptionTh : d.description}
                  </p>
                  <div className="ml-8 mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>📊 {t.report.confidence}: <span className="font-semibold text-slate-700">{Math.round(d.confidence * 100)}%</span></span>
                  </div>
                  {d.priceEstimate && d.priceEstimate.matched && (
                    <div className="ml-8 mt-2 bg-orange-50 border border-orange-200 rounded p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--navy-900)]">
                          💰 {lang === "th" ? "ราคากลาง" : "Standard Price"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {d.priceEstimate.vehicleType.replace("_", " ")} · {lang === "th" ? "ขนาด" : "size"} {d.priceEstimate.size}
                        </span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px]">
                        {d.priceEstimate.repair !== null && (
                          <div>
                            <div className="text-slate-500">{lang === "th" ? "ซ่อม" : "Repair"}</div>
                            <div className="font-bold text-slate-900">฿{fmt(d.priceEstimate.repair)}</div>
                          </div>
                        )}
                        {d.priceEstimate.replace !== null && (
                          <div>
                            <div className="text-slate-500">{lang === "th" ? "เปลี่ยน" : "Replace"}</div>
                            <div className="font-bold text-slate-900">฿{fmt(d.priceEstimate.replace)}</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400 italic">{d.priceEstimate.source}</div>
                    </div>
                  )}
                  {d.priceEstimate && !d.priceEstimate.matched && (
                    <div className="ml-8 mt-2 text-[11px] text-slate-400 italic">
                      {lang === "th" ? "ไม่พบในตารางราคากลาง" : "Not in standard price table"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Merged repair summary (deduped across all images) ── */}
    <div className="card !p-0 overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--navy-900)]">
            {lang === "th" ? "สรุปรายการซ่อม" : "Repair Summary"}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === "th"
              ? `รวมจากทุกภาพ (${totalDamages} จุด) ตัดชิ้นซ้ำแล้วเหลือ ${merged.items.length} รายการ`
              : `Merged from all images (${totalDamages} findings), ${merged.items.length} unique parts after de-dup`}
          </p>
        </div>
        <button onClick={exportPdf} className="btn-primary text-sm !py-2 no-print">
          🖨 {lang === "th" ? "Export PDF" : "Export PDF"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
            <tr>
              <th className="text-left px-4 py-2.5 w-8">#</th>
              <th className="text-left px-4 py-2.5">{lang === "th" ? "ชิ้นส่วน" : "Part"}</th>
              <th className="text-left px-4 py-2.5">{lang === "th" ? "ระดับ" : "Severity"}</th>
              <th className="text-center px-4 py-2.5">{lang === "th" ? "พบใน" : "Found in"}</th>
              <th className="text-right px-4 py-2.5">{lang === "th" ? "ค่าแรงซ่อมสี (ราคากลาง)" : "Labor Repair Cost"}</th>
              <th className="text-right px-4 py-2.5">{lang === "th" ? "ค่าเปลี่ยนใหม่ (อะไหล่+ค่าแรง)" : "Replacement Cost"}</th>
            </tr>
          </thead>
          <tbody>
            {merged.items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">{t.report.noDamage}</td></tr>
            ) : merged.items.map((it, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-[var(--navy-900)]">{lang === "th" && it.partTh ? it.partTh : it.part}</div>
                  {!it.matched && <div className="text-[10px] text-slate-400">{lang === "th" ? "ไม่มีในตารางราคา" : "no standard price"}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`${severityClass[it.severity]} px-2 py-0.5 rounded text-xs font-bold`}>{sevLabel(it.severity)}</span>
                </td>
                <td className="px-4 py-2.5 text-center text-slate-500">{it.count > 1 ? `${it.count} ${lang === "th" ? "ภาพ" : "imgs"}` : "—"}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap font-bold text-slate-800">{it.repair != null ? `฿${fmt(it.repair)}` : "—"}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-slate-500 font-medium">
                  {it.severity === "minor" || it.replace === it.repair ? "—" : it.replace != null ? `฿${fmt(it.replace)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
              <td className="px-4 py-3 text-right text-slate-600" colSpan={4}>{lang === "th" ? "ราคากลางรวม" : "Total (standard)"}</td>
              <td className="px-4 py-3 text-right text-[#0071e3] whitespace-nowrap text-base">฿{fmt(merged.totalRepair)}</td>
              <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                {merged.totalReplace > merged.totalRepair ? `฿${fmt(merged.totalReplace)}` : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-4 py-2 text-[10px] text-slate-400 text-right border-b border-slate-100">
        {lang === "th" ? "ราคากลางอ้างอิงสมาคมอู่กลางการประกันภัย (uklang.com)" : "Standard prices: uklang.com"}
      </div>

      {/* ── Evaluator Comment Box & Save Claim Action Bar ── */}
      <div className="p-6 bg-slate-50/70 border-t border-slate-200 space-y-4 no-print">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            💬 {lang === "th" ? "หมายเหตุ / ข้อเสนอแนะเพิ่มเติมจากเจ้าหน้าที่ประเมินราคา" : "Evaluator Notes / Remarks"}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={
              lang === "th"
                ? "กรอกหมายเหตุ หรือข้อเสนอแนะเพิ่มเติมสำหรับเคสนี้ (เช่น รอยถลอกบนกันชนหลังสามารถทำสีเฉพาะจุดได้โดยไม่ต้องเปลี่ยนชิ้นงาน)..."
                : "Enter any additional remarks or notes for this claim..."
            }
            className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500">
            📌 {lang === "th" ? "กดบันทึกเพื่อจัดเก็บเคสและหมายเหตุเข้าสู่ระบบ" : "Click save to store claim case & notes"}
          </div>
          <button
            onClick={handleSaveClaim}
            disabled={isSaving}
            className="px-6 py-3 bg-[#0071e3] hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{lang === "th" ? "กำลังบันทึกเคส..." : "Saving..."}</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>{lang === "th" ? "บันทึกเคสเข้าสู่ระบบ" : "Save Claim Case"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* ── Modal Success Popup Notification ── */}
    {savedSuccess && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4 border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✅
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {lang === "th" ? "บันทึกเคสเข้าสู่ระบบเรียบร้อยแล้ว!" : "Claim Saved Successfully!"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lang === "th"
                ? `เคสหมายเลข ${savedClaimNo} และหมายเหตุประเมินราคาได้รับการจัดเก็บบนฐานข้อมูลเรียบร้อยแล้ว`
                : `Claim #${savedClaimNo} and evaluator remarks have been saved.`}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 bg-[#0071e3] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              📊 {lang === "th" ? "ดูเคสในหน้า รวมเคสวิเคราะห์ความเสียหาย" : "View in Cases Overview"}
            </button>
            <button
              onClick={() => router.push("/quotations")}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              🛡️ {lang === "th" ? "ไปที่ระบบคุมราคา" : "Go to Price Control"}
            </button>
            <button
              onClick={() => setSavedSuccess(false)}
              className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
            >
              {lang === "th" ? "ปิดหน้าต่างนี้" : "Close"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Printable report (visible only when exporting to PDF) ── */}
    <div id="print-area" className="hidden print:block" style={{ fontFamily: "'Noto Sans Thai', sans-serif", color: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0a1f44", paddingBottom: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0a1f44" }}>ClaimThunJai</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {lang === "th" ? "ใบสรุปการประเมินความเสียหายรถยนต์" : "Vehicle Damage Assessment Report"}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          <div><b>{meta?.claimNumber || "-"}</b></div>
          <div style={{ color: "#64748b" }}>{new Date().toLocaleDateString(lang === "th" ? "th-TH" : "en-US")}</div>
        </div>
      </div>

      <table style={{ width: "100%", fontSize: 12, marginBottom: 14 }}>
        <tbody>
          <tr>
            <td style={{ color: "#64748b", padding: "2px 8px 2px 0" }}>{lang === "th" ? "ผู้เอาประกัน" : "Policy Holder"}</td>
            <td style={{ fontWeight: 600, paddingRight: 24 }}>{meta?.policyHolder || "-"}</td>
            <td style={{ color: "#64748b", padding: "2px 8px 2px 0" }}>{lang === "th" ? "ทะเบียน" : "Plate"}</td>
            <td style={{ fontWeight: 600 }}>{meta?.licensePlate || "-"}</td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", padding: "2px 8px 2px 0" }}>{lang === "th" ? "รถยนต์" : "Vehicle"}</td>
            <td style={{ fontWeight: 600, paddingRight: 24 }}>{[meta?.vehicleMake, meta?.vehicleModel].filter(Boolean).join(" ") || "-"}</td>
            <td style={{ color: "#64748b", padding: "2px 8px 2px 0" }}>{lang === "th" ? "ความเสียหายรวม" : "Overall"}</td>
            <td style={{ fontWeight: 700 }}>{sevLabel(overallSeverity)}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#0a1f44", color: "#fff" }}>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>#</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>{lang === "th" ? "ชิ้นส่วน" : "Part"}</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>{lang === "th" ? "ระดับ" : "Severity"}</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>{lang === "th" ? "รายละเอียด" : "Description"}</th>
            <th style={{ textAlign: "right", padding: "6px 8px" }}>{lang === "th" ? "ซ่อม" : "Repair"}</th>
            <th style={{ textAlign: "right", padding: "6px 8px" }}>{lang === "th" ? "เปลี่ยน" : "Replace"}</th>
          </tr>
        </thead>
        <tbody>
          {merged.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "5px 8px", color: "#94a3b8" }}>{i + 1}</td>
              <td style={{ padding: "5px 8px", fontWeight: 600 }}>{lang === "th" && it.partTh ? it.partTh : it.part}</td>
              <td style={{ padding: "5px 8px" }}>{sevLabel(it.severity)}</td>
              <td style={{ padding: "5px 8px", color: "#475569", maxWidth: 220 }}>{(lang === "th" ? it.descriptionTh : it.description) || "-"}</td>
              <td style={{ padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{it.repair != null ? `฿${fmt(it.repair)}` : "-"}</td>
              <td style={{ padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{it.replace != null ? `฿${fmt(it.replace)}` : "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f8fafc", fontWeight: 700, borderTop: "2px solid #0a1f44" }}>
            <td colSpan={4} style={{ padding: "7px 8px", textAlign: "right" }}>{lang === "th" ? "ราคากลางรวม" : "Total (standard)"}</td>
            <td style={{ padding: "7px 8px", textAlign: "right", color: "#e8650a" }}>฿{fmt(merged.totalRepair)}</td>
            <td style={{ padding: "7px 8px", textAlign: "right", color: "#e8650a" }}>฿{fmt(merged.totalReplace)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginTop: 18, fontSize: 10, color: "#94a3b8" }}>
        {lang === "th"
          ? "ราคากลางอ้างอิงจากตารางมาตรฐานสมาคมอู่กลางการประกันภัย (uklang.com) · รายการซ่อมนับจากทุกภาพและตัดชิ้นซ้ำแล้ว · ประเมินความเสียหายด้วย Claude Vision"
          : "Standard prices from สมาคมอู่กลางการประกันภัย (uklang.com) · Items merged across all images with duplicates removed · Damage assessed by Claude Vision"}
      </div>
    </div>
    </>
  );
}
