"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { DamageReportView, type AnalyzeResult } from "@/components/DamageReportView";

const REQUIRED = new Set(["customer", "licensePlate", "vehicleMake", "claimNumber"]);
const FIELDS: { k: string; th: string; en: string }[] = [
  { k: "customer", th: "ชื่อลูกค้า", en: "Customer" },
  { k: "licensePlate", th: "ทะเบียน", en: "Plate" },
  { k: "vehicleMake", th: "ยี่ห้อ", en: "Make" },
  { k: "vehicleModel", th: "รุ่น", en: "Model" },
  { k: "vehicleYear", th: "ปี", en: "Year" },
  { k: "claimNumber", th: "เลขเคลม", en: "Claim No." },
  { k: "policyNo", th: "เลขกรมธรรม์", en: "Policy No." },
  { k: "insurer", th: "บริษัทประกัน", en: "Insurer" },
  { k: "centerName", th: "ศูนย์บริการ", en: "Center" },
  { k: "centerContact", th: "ติดต่อ", en: "Contact" },
];

export default function IntakeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const router = useRouter();
  const [q, setQ] = useState<Record<string, string> | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<{ results: AnalyzeResult[]; overallSeverity: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetch(`/api/intake/${id}`).then((r) => r.json()).then((d) => {
      const it = d.intake; if (!it) return;
      const f: Record<string, string> = {};
      for (const { k } of FIELDS) f[k] = it[k] ?? "";
      f.status = it.status; f.intakeNo = it.intakeNo; f.subject = it.subject ?? ""; f.fromEmail = it.fromEmail ?? "";
      setQ(f);
      try { setPhotos((JSON.parse(it.photos || "[]") as { url: string }[]).map((p) => p.url)); } catch {}
      try { const a = JSON.parse(it.analysis || "{}"); setAnalysis({ results: a.results || [], overallSeverity: a.overallSeverity || "minor" }); } catch {}
    });
  }, [id]);

  if (!q) return <div className="p-12 text-center text-slate-400">…</div>;

  const missing = [...REQUIRED].filter((k) => !q[k]);
  const set = (k: string, v: string) => setQ({ ...q, [k]: v });

  const fetchThirdParty = async () => {
    if (!q.claimNumber) { alert(lang === "th" ? "กรอกเลขเคลมก่อน" : "Enter claim number first"); return; }
    setFetching(true);
    try {
      const res = await fetch("/api/intake/fetch-thirdparty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimNumber: q.claimNumber }) });
      const d = await res.json();
      if (d.found) { const dd = d.data; setQ((cur) => ({ ...cur!, customer: dd.customer, licensePlate: dd.licensePlate, vehicleMake: dd.vehicleMake, vehicleModel: dd.vehicleModel, vehicleYear: String(dd.vehicleYear), policyNo: dd.policyNo, insurer: dd.insurer })); }
    } finally { setFetching(false); }
  };

  const save = async (finalize?: boolean) => {
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      for (const { k } of FIELDS) payload[k] = q[k] || null;
      if (finalize) payload.status = "completed";
      const res = await fetch(`/api/intake/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (d.intake) setQ((cur) => ({ ...cur!, status: d.intake.status }));
      if (finalize) router.push("/intake");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href="/intake" className="text-sm text-slate-500 hover:text-[var(--navy-900)]">← {lang === "th" ? "กลับกล่องงานเข้า" : "Back to queue"}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy-900)]">{q.intakeNo}</h1>
          <p className="text-xs text-slate-500">{q.fromEmail} · {q.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded text-sm font-semibold ${q.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {q.status === "completed" ? (lang === "th" ? "เสร็จสิ้น" : "Completed") : (lang === "th" ? "รอข้อมูลเพิ่ม" : "Needs info")}
          </span>
          <Link href={`/quotation/new?fromIntake=${id}`} className="btn-primary text-sm !py-2">
            → {lang === "th" ? "สร้างใบเสนอราคา" : "Create quotation"}
          </Link>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          ⚠️ {lang === "th" ? "ข้อมูลไม่ครบ — กรุณาเติมช่องที่ไฮไลต์ (หรือดึงจากเลขเคลม)" : "Incomplete — fill highlighted fields (or fetch by claim no.)"}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Extracted fields (editable) */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[var(--navy-900)]">{lang === "th" ? "ข้อมูลที่ AI ดึงมา (แก้ไขได้)" : "AI-extracted (editable)"}</h3>
            <button onClick={fetchThirdParty} disabled={fetching} className="btn-secondary text-xs !py-1.5 disabled:opacity-50">
              {fetching ? "…" : `🔌 ${lang === "th" ? "ดึงจากเลขเคลม" : "Fetch by claim no."}`}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.k} className={f.k === "customer" || f.k === "centerName" ? "col-span-2" : ""}>
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  {lang === "th" ? f.th : f.en}
                  {REQUIRED.has(f.k) && !q[f.k] && <span className="text-amber-500">*</span>}
                </label>
                <input
                  value={q[f.k] || ""}
                  onChange={(e) => set(f.k, e.target.value)}
                  className={`mt-1 w-full px-3 py-2 border rounded-lg text-sm ${REQUIRED.has(f.k) && !q[f.k] ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => save(false)} disabled={saving} className="btn-secondary text-sm !py-2 flex-1 disabled:opacity-50">{lang === "th" ? "บันทึก" : "Save"}</button>
            <button onClick={() => save(true)} disabled={saving || missing.length > 0} className="btn-primary text-sm !py-2 flex-1 disabled:opacity-40">{lang === "th" ? "ยืนยันเสร็จสิ้น" : "Confirm & complete"}</button>
          </div>
        </div>

        {/* Photos */}
        <div className="card">
          <h3 className="font-bold text-[var(--navy-900)] mb-3">{lang === "th" ? "รูปแนบจากอีเมล" : "Attached photos"} ({photos.length})</h3>
          {photos.length === 0 ? <div className="text-sm text-slate-400 text-center py-8">{lang === "th" ? "ไม่มีรูปแนบ" : "No photos"}</div> : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="aspect-square object-cover rounded-lg border border-slate-200" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI damage + price */}
      {analysis && analysis.results.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-[var(--navy-900)] mb-2">{lang === "th" ? "ผลวิเคราะห์ความเสียหาย + ราคากลาง" : "AI Damage + Standard Price"}</h3>
          <DamageReportView
            results={analysis.results}
            previews={photos}
            overallSeverity={analysis.overallSeverity}
            meta={{ policyHolder: q.customer, licensePlate: q.licensePlate, vehicleMake: q.vehicleMake, vehicleModel: q.vehicleModel, claimNumber: q.claimNumber }}
          />
        </div>
      )}
    </div>
  );
}
