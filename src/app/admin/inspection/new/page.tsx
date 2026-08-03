"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/LangContext";

export default function NewInspectionCasePage() {
  const { lang } = useLang();
  const router = useRouter();
  const [form, setForm] = useState({ customer: "", licensePlate: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ caseNo?: string; link?: string; delivery?: { sent: boolean; mocked?: boolean; error?: string } } | null>(null);

  const submit = async () => {
    if (!form.customer.trim() || !form.licensePlate.trim() || !form.email.trim()) {
      alert(lang === "th" ? "กรุณากรอกชื่อลูกค้า ทะเบียนรถ และอีเมล" : "Customer name, license plate, and email are required");
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, deliveryChannel: "email" }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "Error"); return; }
      setResult({ caseNo: d.case.caseNo, link: d.link, delivery: d.delivery });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link href="/admin/inspection" className="text-sm text-slate-500 hover:text-[var(--navy-900)]">
        ← {lang === "th" ? "กลับรายการเคส" : "Back to list"}
      </Link>
      <h1 className="text-3xl font-bold text-[var(--navy-900)] mt-2 mb-1">
        {lang === "th" ? "สร้างเคสตรวจสภาพใหม่" : "Create new inspection case"}
      </h1>
      <p className="text-slate-600 text-sm mb-6">
        {lang === "th"
          ? "กรอกข้อมูลลูกค้า → ระบบส่งลิงก์ไปยังอีเมลของลูกค้า → ลูกค้าเปิดลิงก์บนมือถือแล้วถ่ายรูปรอบคัน"
          : "Enter customer info → system emails the inspection link → customer opens on mobile and captures around the car"}
      </p>

      <div className="card space-y-4">
        {[
          { k: "customer", th: "ชื่อผู้เอาประกัน *", en: "Policy holder name *", placeholder: "สมชาย ใจดี" },
          { k: "licensePlate", th: "ทะเบียนรถยนต์ *", en: "License plate *", placeholder: "กข-1234" },
          { k: "email", th: "อีเมลลูกค้า *", en: "Customer email *", placeholder: "customer@example.com" },
          { k: "phone", th: "เบอร์โทร (สำรอง)", en: "Phone (backup)", placeholder: "081-234-5678" },
        ].map((f) => (
          <div key={f.k}>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{lang === "th" ? f.th : f.en}</label>
            <input
              value={form[f.k as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--orange-500)]"
              type={f.k === "email" ? "email" : "text"}
            />
          </div>
        ))}

        <button onClick={submit} disabled={saving} className="btn-primary w-full justify-center disabled:opacity-50">
          {saving ? (lang === "th" ? "กำลังสร้าง & ส่งลิงก์…" : "Creating & sending…") : (lang === "th" ? "✉︎ สร้างเคส + ส่งลิงก์ให้ลูกค้า" : "✉︎ Create case + email link")}
        </button>
      </div>

      {result && (
        <div className="card mt-4 border-2 border-emerald-300 bg-emerald-50">
          <h3 className="font-bold text-emerald-800 mb-1">✅ {lang === "th" ? "สร้างเคสสำเร็จ" : "Case created"}</h3>
          <p className="text-sm text-slate-700 mb-3">
            {lang === "th" ? "เลขที่เคส:" : "Case No.:"} <span className="font-mono font-bold">{result.caseNo}</span>
          </p>
          {result.delivery?.sent && (
            <p className="text-sm text-emerald-700 mb-3">📧 {lang === "th" ? "ส่งลิงก์ไปยังอีเมลลูกค้าเรียบร้อย" : "Link emailed to customer"}</p>
          )}
          {result.delivery?.mocked && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 mb-3">
              ⚠️ {lang === "th"
                ? "ยังไม่ได้ตั้ง RESEND_API_KEY — อีเมลจริงยังไม่ถูกส่ง กรุณาคัดลอกลิงก์ด้านล่างส่งให้ลูกค้าเอง"
                : "RESEND_API_KEY not set — no real email sent. Copy the link below and share manually."}
            </div>
          )}
          {result.delivery?.error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 mb-3">
              🔴 {lang === "th" ? "ส่งอีเมลไม่สำเร็จ" : "Email send failed"}: {result.delivery.error}
            </div>
          )}
          <div className="text-xs font-semibold text-slate-500 mb-1">{lang === "th" ? "ลิงก์สำหรับลูกค้า:" : "Customer link:"}</div>
          <div className="flex gap-2">
            <input readOnly value={result.link || ""} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-white" />
            <button
              onClick={() => { if (result.link) navigator.clipboard.writeText(result.link); }}
              className="btn-secondary text-xs !py-2"
            >
              {lang === "th" ? "คัดลอก" : "Copy"}
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <Link href="/admin/inspection" className="btn-secondary text-sm !py-2">{lang === "th" ? "← กลับรายการ" : "← Back to list"}</Link>
            <button onClick={() => { setResult(null); setForm({ customer: "", licensePlate: "", email: "", phone: "" }); router.refresh(); }} className="btn-primary text-sm !py-2">
              + {lang === "th" ? "สร้างเคสถัดไป" : "Next case"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
