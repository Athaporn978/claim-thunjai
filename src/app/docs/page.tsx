"use client";
import { useLang } from "@/lib/LangContext";

export default function DocsPage() {
  const { lang } = useLang();
  const sample = `POST /api/analyze
Content-Type: application/json

{
  "images": [
    { "data": "<base64>", "mediaType": "image/jpeg" }
  ],
  "claimNumber": "CLM-2026-001",
  "insurerId": "<your_insurer_id>",
  "policyHolder": "John Doe",
  "vehicleMake": "Toyota",
  "vehicleModel": "Camry",
  "licensePlate": "ABC-123"
}

→ Response
{
  "overallSeverity": "moderate",
  "claimId": "...",
  "results": [
    {
      "vehicleMake": "Toyota",
      "angle": "front-left",
      "overallSeverity": "moderate",
      "damages": [
        {
          "part": "Front Bumper",
          "partTh": "กันชนหน้า",
          "severity": "moderate",
          "description": "Deep scratch ~20cm with paint chipping",
          "bbox": { "x": 12, "y": 55, "w": 18, "h": 22 },
          "confidence": 0.94
        }
      ]
    }
  ]
}`;
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-[var(--navy-900)]">API Documentation</h1>
      <p className="text-slate-600 mt-2">
        {lang === "th"
          ? "Endpoint เดียวสำหรับวิเคราะห์ภาพรถ — ส่งภาพ base64 รับ JSON ที่มีกรอบและระดับความเสียหาย"
          : "Single endpoint to analyze vehicle images — send base64 images, receive JSON with bounding boxes and severity grades."}
      </p>

      <div className="card mt-6">
        <h2 className="font-bold text-[var(--navy-900)] mb-3">Endpoint</h2>
        <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">{sample}</pre>
      </div>

      <div className="card mt-6">
        <h2 className="font-bold text-[var(--navy-900)] mb-3">Severity Rubric</h2>
        <ul className="space-y-2 text-sm">
          <li><span className="badge-minor px-2 py-0.5 rounded font-bold mr-2">MINOR</span>{lang === "th" ? "รอยขีดข่วน/สีถลอก ไม่กระทบโครงสร้าง" : "Cosmetic scratches/scuffs, no structural impact"}</li>
          <li><span className="badge-moderate px-2 py-0.5 rounded font-bold mr-2">MODERATE</span>{lang === "th" ? "บุบ ต้องซ่อมหรือเปลี่ยนชิ้นส่วน" : "Dents requiring panel repair or replacement"}</li>
          <li><span className="badge-severe px-2 py-0.5 rounded font-bold mr-2">SEVERE</span>{lang === "th" ? "เสียหายระดับโครงสร้าง หลายชิ้นส่วน" : "Structural damage, multiple panels"}</li>
          <li><span className="badge-total px-2 py-0.5 rounded font-bold mr-2">TOTAL LOSS</span>{lang === "th" ? "เสียหายเกินมูลค่าซ่อม" : "Damage exceeds repair value"}</li>
        </ul>
      </div>
    </div>
  );
}
