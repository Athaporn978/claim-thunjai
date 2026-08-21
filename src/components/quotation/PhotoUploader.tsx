"use client";
import { useRef } from "react";
import type { QuotationPhoto } from "@/lib/quotation";
import { compressImageToDataUrl } from "@/lib/imageCompress";

export function PhotoUploader({
  photos,
  onChange,
  lang,
}: {
  photos: QuotationPhoto[];
  onChange: (next: QuotationPhoto[]) => void;
  lang: "th" | "en";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_PHOTOS = 50;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: QuotationPhoto[] = [];
    for (const file of Array.from(files)) {
      if (photos.length + next.length >= MAX_PHOTOS) break;
      if (!file.type.startsWith("image/") && file.type !== "application/pdf" && !file.name.endsWith(".pdf")) continue;
      const url = file.type.startsWith("image/")
        ? await compressImageToDataUrl(file)
        : await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
      next.push({ url, caption: file.name });
    }
    onChange([...photos, ...next]);
  };

  const remove = (i: number) => onChange(photos.filter((_, idx) => idx !== i));
  const setCaption = (i: number, caption: string) =>
    onChange(photos.map((p, idx) => (idx === i ? { ...p, caption } : p)));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-[var(--navy-900)]">
          {lang === "th" ? "รูปภาพรถยนต์ / ไฟล์ PDF" : "Vehicle Photos / PDF Documents"}
        </h3>
        <span className="text-sm text-slate-500">{photos.length} {lang === "th" ? "ไฟล์" : "files"}</span>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-slate-300 rounded-xl py-10 text-center cursor-pointer hover:border-[var(--orange-500)] hover:bg-orange-50/30 transition"
      >
        <input ref={fileRef} type="file" accept="image/*,.pdf,application/pdf" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        <div className="text-4xl mb-2">📷📄</div>
        <div className="font-semibold text-[var(--navy-900)]">
          {lang === "th" ? "ลากรูปภาพ หรือ ไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่ออัปโหลด" : "Drop photos or PDF files here, or click to upload"}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {lang === "th" ? `เพิ่มได้สูงสุด ${MAX_PHOTOS} ไฟล์ · JPEG / PNG / WebP / PDF` : `Up to ${MAX_PHOTOS} files · JPEG / PNG / WebP / PDF`}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
          {photos.map((p, i) => {
            const isPdf = p.url.startsWith("data:application/pdf") || p.caption?.endsWith(".pdf");
            return (
              <div key={i} className="border border-slate-200 rounded-lg overflow-hidden group bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100 flex items-center justify-center">
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-4xl mb-1">📄</span>
                      <span className="text-[11px] font-bold text-red-700 truncate max-w-[120px]">
                        {p.caption || "document.pdf"}
                      </span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => remove(i)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white text-sm opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    title={lang === "th" ? "ลบ" : "Remove"}
                  >✕</button>
                  <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">#{i + 1}</span>
                </div>
                <input
                  value={p.caption || ""}
                  onChange={(e) => setCaption(i, e.target.value)}
                  placeholder={lang === "th" ? "คำบรรยาย (เช่น หน้าซ้าย)" : "Caption (e.g. front-left)"}
                  className="w-full px-2 py-1.5 text-xs border-0 border-t border-slate-100 focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
