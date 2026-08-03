"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

type Case = {
  id: string; caseNo: string; token: string; status: string;
  customer: string; licensePlate: string | null; email: string | null; phone: string | null;
  emailSentAt: string | null; createdAt: string; submittedAt: string | null;
  shots: string | null; validation: string | null; reviewNote: string | null; reviewedAt: string | null;
};

type Flag = { severity: "error" | "warn" | "info"; message: string };
type Validation = { status: "passed" | "review"; flags: Flag[]; damages?: DamageItem[] };

type DamageItem = {
  angle: string;
  partTh: string;
  severity: "minor" | "moderate" | "severe" | "replace";
  description: string;
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  price?: { minor: number | null; moderate: number | null; severe: number | null; replace: number | null } | null;
};

const ANGLE_LABEL: Record<string, string> = {
  front: "ด้านหน้า", "front-left": "แนวทแยงหน้าซ้าย", left: "ด้านซ้าย", "rear-left": "แนวทแยงหลังซ้าย",
  rear: "ด้านหลัง", "rear-right": "แนวทแยงหลังขวา", right: "ด้านขวา", "front-right": "แนวทแยงหน้าขวา",
};
const DOC_LABEL: Record<string, string> = { odometer: "เลขไมล์", vin: "เลขตัวถัง (VIN)", registration: "สมุดจดทะเบียน" };

export default function AdminCaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const [c, setC] = useState<Case | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/inspection/${id}`).then((r) => r.json()).then((d) => { setC(d.case); setNote(d.case?.reviewNote || ""); });
  }, [id]);

  if (!c) return <div className="p-12 text-center text-slate-400">…</div>;

  let angles: Record<string, string> = {}, docs: Record<string, string> = {};
  try { const s = JSON.parse(c.shots || "{}"); angles = s.angles || {}; docs = s.docs || {}; } catch {}
  
  let validation: Validation | null = null;
  let damages: DamageItem[] = [];
  try {
    validation = c.validation ? JSON.parse(c.validation) : null;
    damages = validation?.damages || [];
  } catch {}

  const decide = async (status: "approved" | "rejected") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inspection/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: note.trim() || null }),
      });
      const d = await res.json();
      if (d.case) setC(d.case);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/admin/inspection" className="text-sm text-slate-500 hover:text-[var(--navy-900)]">
        ← {lang === "th" ? "กลับรายการเคส" : "Back to list"}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy-900)]">{c.caseNo}</h1>
          <p className="text-sm text-slate-500">{c.customer} · {c.licensePlate || "—"} · {c.email}</p>
        </div>
        <span className={`px-3 py-1 rounded text-sm font-semibold ${
          c.status === "approved" ? "bg-emerald-50 text-emerald-700" :
          c.status === "rejected" ? "bg-red-50 text-red-700" :
          c.status === "review" ? "bg-amber-50 text-amber-700" :
          c.status === "submitted" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
        }`}>{c.status}</span>
      </div>

      {validation && (
        <div className={`card mb-5 border-2 ${validation.status === "passed" && damages.length === 0 ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">{validation.status === "passed" && damages.length === 0 ? "✅" : "⚠️"}</div>
            <div className="flex-1">
              <h3 className={`font-bold ${validation.status === "passed" && damages.length === 0 ? "text-emerald-800" : "text-amber-800"}`}>
                {validation.status === "passed" && damages.length === 0 ? "AI ตรวจสอบผ่าน" : "AI พบข้อสังเกต หรือความเสียหาย — ต้องรอตรวจสอบ"}
              </h3>
              {validation.flags && validation.flags.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {validation.flags.map((f, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="w-4">{f.severity === "error" ? "🔴" : f.severity === "warn" ? "🟡" : "✓"}</span>
                      <span className={f.severity === "error" ? "text-red-800" : f.severity === "warn" ? "text-amber-800" : "text-emerald-700"}>{f.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {Object.keys(angles).length > 0 && (
        <>
          <h3 className="font-bold text-[var(--navy-900)] mb-2">รูปรอบคัน 8 มุม (AI Damage Detection Bounding Box)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {Object.entries(angles).map(([id, url]) => {
              const angleDamages = damages.filter((d) => d.angle === id);
              return (
                <div key={id} className="card !p-0 overflow-hidden relative border border-slate-200">
                  <div className="relative aspect-square w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    
                    {/* Overlay Bounding Boxes */}
                    {angleDamages.map((d, idx) => {
                      const [ymin, xmin, ymax, xmax] = d.bbox;
                      return (
                        <div
                          key={idx}
                          className="absolute border-2 border-orange-500 bg-orange-500/15 pointer-events-auto"
                          style={{
                            top: `${ymin}%`,
                            left: `${xmin}%`,
                            width: `${xmax - xmin}%`,
                            height: `${ymax - ymin}%`,
                          }}
                          title={`${d.partTh} (${d.severity}): ${d.description}`}
                        >
                          <span className="absolute -top-5 left-0 bg-orange-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-sm">
                            {d.partTh} ({d.severity})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-2 text-xs text-center text-slate-600 bg-slate-50 border-t border-slate-100 font-semibold">
                    {ANGLE_LABEL[id] || id}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Damage & Middle Price Matching (Rule 7) */}
      {damages.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-bold text-[var(--navy-900)] mb-3 flex items-center gap-2">
            🔎 {lang === "th" ? "รายการความเสียหายที่ตรวจพบและราคากลาง" : "Detected Pre-existing Damages & Middle Prices"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">{lang === "th" ? "ชิ้นส่วน / มุมมอง" : "Part / Angle"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "ความรุนแรงแผล" : "Severity"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "รายละเอียดของแผล" : "AI Description"}</th>
                  <th className="px-4 py-3 text-right">{lang === "th" ? "ราคากลางสมาคมอู่กลางฯ" : "Standard Price"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {damages.map((d, i) => {
                  const matchedPrice = d.price ? d.price[d.severity] : null;
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-medium">
                        <span className="text-[10px] text-slate-400 block font-normal">{ANGLE_LABEL[d.angle] || d.angle}</span>
                        {d.partTh}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          d.severity === "minor" ? "bg-emerald-50 text-emerald-700" :
                          d.severity === "moderate" ? "bg-amber-50 text-amber-700" :
                          d.severity === "severe" ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"
                        }`}>
                          {d.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{d.description}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        {matchedPrice !== undefined && matchedPrice !== null 
                          ? `${matchedPrice.toLocaleString()} บาท` 
                          : <span className="text-slate-400 font-normal">ไม่มีข้อมูลราคา</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(docs).length > 0 && (
        <>
          <h3 className="font-bold text-[var(--navy-900)] mb-2">เอกสารรถ</h3>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {Object.entries(docs).map(([id, url]) => (
              <div key={id} className="card !p-0 overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full aspect-[4/3] object-cover" />
                <div className="p-2 text-xs text-center text-slate-600 bg-slate-50 border-t border-slate-100 font-semibold">{DOC_LABEL[id] || id}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {c.status !== "approved" && c.status !== "rejected" && c.status !== "pending" && (
        <div className="card">
          <h3 className="font-bold text-[var(--navy-900)] mb-2">การตัดสินใจ</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={lang === "th" ? "หมายเหตุ (ไม่บังคับ)" : "Note (optional)"}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={() => decide("approved")} disabled={saving} className="btn-primary text-sm !py-2 flex-1 disabled:opacity-50">✅ อนุมัติ</button>
            <button onClick={() => decide("rejected")} disabled={saving} className="btn-secondary text-sm !py-2 flex-1 !border-red-300 !text-red-600 hover:!bg-red-50 disabled:opacity-50">❌ ปฏิเสธ</button>
          </div>
        </div>
      )}

      {(c.status === "approved" || c.status === "rejected") && c.reviewNote && (
        <div className="card bg-slate-50">
          <div className="text-xs font-bold text-slate-500 mb-1">หมายเหตุจากเจ้าหน้าที่</div>
          <div className="text-sm text-slate-700">{c.reviewNote}</div>
        </div>
      )}
    </div>
  );
}
