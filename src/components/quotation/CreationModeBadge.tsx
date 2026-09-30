/**
 * Shows whether a case was produced by an AI scan or typed by hand. Cases
 * created before this was recorded fall back to "manual", matching the column
 * default.
 */
export function CreationModeBadge({ mode, lang }: { mode?: string | null; lang: string }) {
  const th = lang === "th";
  const isAi = mode === "ai_extract";

  return (
    <span
      title={
        th
          ? isAi
            ? "เคสนี้สร้างจากการสแกนเอกสารด้วย AI — ควรตรวจทานรายการและราคาก่อนอนุมัติ"
            : "เคสนี้เจ้าหน้าที่กรอกข้อมูลเองทั้งหมด"
          : isAi
          ? "Created from an AI document scan — verify items and prices before approving"
          : "Entered manually by staff"
      }
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${
        isAi
          ? "bg-blue-50 text-[#0071e3] border-blue-200"
          : "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      <span>{isAi ? "✨" : "✍️"}</span>
      <span>{isAi ? (th ? "สร้างด้วย AI" : "AI-created") : th ? "กรอกเอง" : "Manual"}</span>
    </span>
  );
}
