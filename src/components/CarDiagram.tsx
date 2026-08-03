"use client";
import { useEffect, useState } from "react";

export type Angle = "front" | "rear" | "left" | "right";
export type BodyStyle = "sedan" | "suv" | "pickup" | "van";
// kept for backward-compat with existing imports
export type CarBodyType = BodyStyle;

export type CarPart = {
  id: string;
  partTh: string;   // matches uklang catalog Thai name
  labelTh: string;
  labelEn: string;
  rect: { x: number; y: number; w: number; h: number }; // percentages of the image (0–100)
};

// Hotspots are defined per ANGLE and reused across body types, because every
// generated image follows the same standardized framing (see public/cars/README.md).
// After real images are added we can fine-tune per body type.
const HOTSPOTS: Record<Angle, CarPart[]> = {
  front: [
    { id: "windshield", partTh: "กระจกบังลมหน้า", labelTh: "กระจกบังลมหน้า", labelEn: "Windshield", rect: { x: 20, y: 20, w: 60, h: 17 } },
    { id: "hood", partTh: "ฝากระโปรงหน้า", labelTh: "ฝากระโปรงหน้า", labelEn: "Hood", rect: { x: 22, y: 38, w: 56, h: 16 } },
    { id: "headlight-l", partTh: "ไฟหน้า", labelTh: "ไฟหน้าซ้าย", labelEn: "Left Headlight", rect: { x: 15, y: 52, w: 18, h: 12 } },
    { id: "grille", partTh: "กระจังหน้า", labelTh: "กระจังหน้า", labelEn: "Grille", rect: { x: 40, y: 56, w: 20, h: 16 } },
    { id: "headlight-r", partTh: "ไฟหน้า", labelTh: "ไฟหน้าขวา", labelEn: "Right Headlight", rect: { x: 67, y: 52, w: 18, h: 12 } },
    { id: "front-bumper", partTh: "กันชนหน้า", labelTh: "กันชนหน้า", labelEn: "Front Bumper", rect: { x: 14, y: 73, w: 72, h: 15 } },
  ],
  rear: [
    { id: "rear-window", partTh: "กระจกบังลมหลัง", labelTh: "กระจกบังลมหลัง", labelEn: "Rear Window", rect: { x: 20, y: 20, w: 60, h: 17 } },
    { id: "trunk", partTh: "ฝากระโปรงหลัง", labelTh: "ฝากระโปรงหลัง", labelEn: "Trunk Lid", rect: { x: 22, y: 38, w: 56, h: 18 } },
    { id: "taillight-l", partTh: "ไฟท้าย", labelTh: "ไฟท้ายซ้าย", labelEn: "Left Taillight", rect: { x: 15, y: 54, w: 17, h: 13 } },
    { id: "taillight-r", partTh: "ไฟท้าย", labelTh: "ไฟท้ายขวา", labelEn: "Right Taillight", rect: { x: 68, y: 54, w: 17, h: 13 } },
    { id: "rear-bumper", partTh: "กันชนหลัง", labelTh: "กันชนหลัง", labelEn: "Rear Bumper", rect: { x: 14, y: 73, w: 72, h: 15 } },
  ],
  left: [
    { id: "side-mirror", partTh: "กระจกมองข้าง", labelTh: "กระจกมองข้าง", labelEn: "Side Mirror", rect: { x: 25, y: 34, w: 8, h: 8 } },
    { id: "front-fender", partTh: "บังโคลนหน้า", labelTh: "บังโคลนหน้าซ้าย", labelEn: "Front Left Fender", rect: { x: 6, y: 44, w: 19, h: 30 } },
    { id: "front-door", partTh: "ประตูหน้า", labelTh: "ประตูหน้าซ้าย", labelEn: "Front Left Door", rect: { x: 28, y: 40, w: 20, h: 38 } },
    { id: "rear-door", partTh: "ประตูหลัง", labelTh: "ประตูหลังซ้าย", labelEn: "Rear Left Door", rect: { x: 48, y: 40, w: 20, h: 38 } },
    { id: "rear-fender", partTh: "บังโคลนหลัง", labelTh: "บังโคลนหลังซ้าย", labelEn: "Rear Left Quarter", rect: { x: 70, y: 44, w: 22, h: 30 } },
    { id: "wheel-front", partTh: "ขอบล้อ", labelTh: "ล้อหน้า", labelEn: "Front Wheel", rect: { x: 10, y: 74, w: 15, h: 22 } },
    { id: "wheel-rear", partTh: "ขอบล้อ", labelTh: "ล้อหลัง", labelEn: "Rear Wheel", rect: { x: 74, y: 74, w: 15, h: 22 } },
  ],
  right: [
    { id: "side-mirror", partTh: "กระจกมองข้าง", labelTh: "กระจกมองข้าง", labelEn: "Side Mirror", rect: { x: 67, y: 34, w: 8, h: 8 } },
    { id: "front-fender", partTh: "บังโคลนหน้า", labelTh: "บังโคลนหน้าขวา", labelEn: "Front Right Fender", rect: { x: 75, y: 44, w: 19, h: 30 } },
    { id: "front-door", partTh: "ประตูหน้า", labelTh: "ประตูหน้าขวา", labelEn: "Front Right Door", rect: { x: 52, y: 40, w: 20, h: 38 } },
    { id: "rear-door", partTh: "ประตูหลัง", labelTh: "ประตูหลังขวา", labelEn: "Rear Right Door", rect: { x: 32, y: 40, w: 20, h: 38 } },
    { id: "rear-fender", partTh: "บังโคลนหลัง", labelTh: "บังโคลนหลังขวา", labelEn: "Rear Right Quarter", rect: { x: 8, y: 44, w: 22, h: 30 } },
    { id: "wheel-front", partTh: "ขอบล้อ", labelTh: "ล้อหน้า", labelEn: "Front Wheel", rect: { x: 75, y: 74, w: 15, h: 22 } },
    { id: "wheel-rear", partTh: "ขอบล้อ", labelTh: "ล้อหลัง", labelEn: "Rear Wheel", rect: { x: 10, y: 74, w: 15, h: 22 } },
  ],
};

// ── Image-calibrated hotspots ──────────────────────────────────────────────
// Rather than hand-place every rect per image, we store the CAR bounding box
// (measured from the actual image pixels) and a FRACTIONAL layout of parts
// inside that box. This reproduces alignment across any framing and lets new
// body types be added by only supplying their bbox.

type Frac = { id: string; partTh: string; labelTh: string; labelEn: string; fx: number; fy: number; fw: number; fh: number };
type Box = { x: number; y: number; w: number; h: number };

// Fractional part layout within the car bounding box (0..1), per angle.
const FRAC_LAYOUT: Record<Angle, Frac[]> = {
  front: [
    { id: "windshield", partTh: "กระจกบังลมหน้า", labelTh: "กระจกบังลมหน้า", labelEn: "Windshield", fx: 0.22, fy: 0.02, fw: 0.56, fh: 0.22 },
    { id: "hood", partTh: "ฝากระโปรงหน้า", labelTh: "ฝากระโปรงหน้า", labelEn: "Hood", fx: 0.10, fy: 0.26, fw: 0.80, fh: 0.16 },
    { id: "headlight-l", partTh: "ไฟหน้า", labelTh: "ไฟหน้าซ้าย", labelEn: "Left Headlight", fx: 0.06, fy: 0.44, fw: 0.24, fh: 0.15 },
    { id: "grille", partTh: "กระจังหน้า", labelTh: "กระจังหน้า", labelEn: "Grille", fx: 0.34, fy: 0.46, fw: 0.32, fh: 0.28 },
    { id: "headlight-r", partTh: "ไฟหน้า", labelTh: "ไฟหน้าขวา", labelEn: "Right Headlight", fx: 0.70, fy: 0.44, fw: 0.24, fh: 0.15 },
    { id: "front-bumper", partTh: "กันชนหน้า", labelTh: "กันชนหน้า", labelEn: "Front Bumper", fx: 0.08, fy: 0.76, fw: 0.84, fh: 0.22 },
  ],
  rear: [
    { id: "rear-window", partTh: "กระจกบังลมหลัง", labelTh: "กระจกบังลมหลัง", labelEn: "Rear Window", fx: 0.22, fy: 0.06, fw: 0.56, fh: 0.20 },
    { id: "trunk", partTh: "ฝากระโปรงหลัง", labelTh: "ฝากระโปรงหลัง", labelEn: "Trunk Lid", fx: 0.10, fy: 0.28, fw: 0.80, fh: 0.18 },
    { id: "taillight-l", partTh: "ไฟท้าย", labelTh: "ไฟท้ายซ้าย", labelEn: "Left Taillight", fx: 0.06, fy: 0.46, fw: 0.24, fh: 0.16 },
    { id: "taillight-r", partTh: "ไฟท้าย", labelTh: "ไฟท้ายขวา", labelEn: "Right Taillight", fx: 0.70, fy: 0.46, fw: 0.24, fh: 0.16 },
    { id: "rear-bumper", partTh: "กันชนหลัง", labelTh: "กันชนหลัง", labelEn: "Rear Bumper", fx: 0.08, fy: 0.72, fw: 0.84, fh: 0.24 },
  ],
  left: [
    { id: "side-mirror", partTh: "กระจกมองข้าง", labelTh: "กระจกมองข้าง", labelEn: "Side Mirror", fx: 0.33, fy: 0.02, fw: 0.09, fh: 0.16 },
    { id: "front-fender", partTh: "บังโคลนหน้า", labelTh: "บังโคลนหน้าซ้าย", labelEn: "Front Left Fender", fx: 0.10, fy: 0.30, fw: 0.20, fh: 0.42 },
    { id: "front-door", partTh: "ประตูหน้า", labelTh: "ประตูหน้าซ้าย", labelEn: "Front Left Door", fx: 0.32, fy: 0.22, fw: 0.19, fh: 0.52 },
    { id: "rear-door", partTh: "ประตูหลัง", labelTh: "ประตูหลังซ้าย", labelEn: "Rear Left Door", fx: 0.51, fy: 0.22, fw: 0.18, fh: 0.52 },
    { id: "rear-fender", partTh: "บังโคลนหลัง", labelTh: "บังโคลนหลังซ้าย", labelEn: "Rear Left Quarter", fx: 0.69, fy: 0.30, fw: 0.23, fh: 0.44 },
    { id: "wheel-front", partTh: "ขอบล้อ", labelTh: "ล้อหน้า", labelEn: "Front Wheel", fx: 0.10, fy: 0.62, fw: 0.17, fh: 0.33 },
    { id: "wheel-rear", partTh: "ขอบล้อ", labelTh: "ล้อหลัง", labelEn: "Rear Wheel", fx: 0.72, fy: 0.62, fw: 0.17, fh: 0.33 },
  ],
  right: [
    { id: "side-mirror", partTh: "กระจกมองข้าง", labelTh: "กระจกมองข้าง", labelEn: "Side Mirror", fx: 0.58, fy: 0.02, fw: 0.09, fh: 0.16 },
    { id: "front-fender", partTh: "บังโคลนหน้า", labelTh: "บังโคลนหน้าขวา", labelEn: "Front Right Fender", fx: 0.70, fy: 0.30, fw: 0.20, fh: 0.42 },
    { id: "front-door", partTh: "ประตูหน้า", labelTh: "ประตูหน้าขวา", labelEn: "Front Right Door", fx: 0.49, fy: 0.22, fw: 0.19, fh: 0.52 },
    { id: "rear-door", partTh: "ประตูหลัง", labelTh: "ประตูหลังขวา", labelEn: "Rear Right Door", fx: 0.31, fy: 0.22, fw: 0.18, fh: 0.52 },
    { id: "rear-fender", partTh: "บังโคลนหลัง", labelTh: "บังโคลนหลังขวา", labelEn: "Rear Right Quarter", fx: 0.08, fy: 0.30, fw: 0.23, fh: 0.44 },
    { id: "wheel-front", partTh: "ขอบล้อ", labelTh: "ล้อหน้า", labelEn: "Front Wheel", fx: 0.73, fy: 0.62, fw: 0.17, fh: 0.33 },
    { id: "wheel-rear", partTh: "ขอบล้อ", labelTh: "ล้อหลัง", labelEn: "Rear Wheel", fx: 0.11, fy: 0.62, fw: 0.17, fh: 0.33 },
  ],
};

// Measured car bounding boxes (% of image). front/rear from pixel analysis;
// sides set from the visible car extent (bumper→bumper, roof→tyre).
const CAR_BBOX: Partial<Record<BodyStyle, Record<Angle, Box>>> = {
  sedan: {
    front: { x: 20.7, y: 26.3, w: 58.5, h: 59.6 },
    rear: { x: 21.8, y: 26.3, w: 56.7, h: 60.5 },
    left: { x: 8, y: 40, w: 80, h: 35 },
    right: { x: 10, y: 40, w: 80, h: 35 },
  },
  suv: {
    front: { x: 21.5, y: 20.8, w: 57.0, h: 64.0 },
    rear: { x: 21.5, y: 20.3, w: 57.2, h: 69.4 },
    left: { x: 6.8, y: 27.7, w: 86.7, h: 46.0 },
    right: { x: 4.7, y: 26.6, w: 91.3, h: 50.4 },
  },
  pickup: {
    front: { x: 18.8, y: 18.0, w: 62.2, h: 70.0 },
    rear: { x: 20.7, y: 19.0, w: 58.6, h: 69.0 },
    left: { x: 4.3, y: 29.0, w: 91.2, h: 42.4 },
    right: { x: 5.0, y: 36.2, w: 88.3, h: 42.1 },
  },
  van: {
    front: { x: 13.7, y: 12.0, w: 72.8, h: 82.0 },
    rear: { x: 16.3, y: 10.0, w: 67.4, h: 85.0 },
    left: { x: 6.8, y: 29.7, w: 87.5, h: 47.1 },
    right: { x: 7.0, y: 26.3, w: 87.8, h: 46.5 },
  },
};

function resolveHotspots(body: BodyStyle, angle: Angle): CarPart[] {
  const bbox = CAR_BBOX[body]?.[angle];
  if (!bbox) return HOTSPOTS[angle];
  return FRAC_LAYOUT[angle].map((f) => ({
    id: f.id, partTh: f.partTh, labelTh: f.labelTh, labelEn: f.labelEn,
    rect: { x: bbox.x + f.fx * bbox.w, y: bbox.y + f.fy * bbox.h, w: f.fw * bbox.w, h: f.fh * bbox.h },
  }));
}

// The uklang price table names parts differently per vehicle category
// (pickup/van use their own terms). Each hotspot maps to several candidate
// catalog names; we pick the first one that actually has a price for this model.
const PART_ALTS: Record<string, string[]> = {
  windshield: ["บังลมหน้า"],
  hood: ["ฝากระโปรง"],
  "front-bumper": ["กันชน"],
  // headlight lamp isn't priced directly; use the headlight housing/panel
  "headlight-l": ["เบ้าไฟ", "แผงรับไฟหน้า", "แผงปิดไฟใหญ่หน้า", "คิ้วใต้ไฟ"],
  "headlight-r": ["เบ้าไฟ", "แผงรับไฟหน้า", "แผงปิดไฟใหญ่หน้า", "คิ้วใต้ไฟ"],
  "rear-window": ["บังลมหลัง", "แผงใต้กระจกบังลมหลัง"],
  trunk: ["ฝาปิดท้าย"],
  "taillight-l": ["เบ้ายึดไฟท้าย", "คิ้วใต้ไฟท้าย", "มุมไฟท้าย ซ้าย-ขวา"],
  "taillight-r": ["เบ้ายึดไฟท้าย", "คิ้วใต้ไฟท้าย", "มุมไฟท้าย ซ้าย-ขวา"],
  "rear-bumper": ["กันชน"],
  "front-fender": ["แก้มหน้า"],
  "front-door": ["ประตูเลื่อนข้าง", "โครงในประตู"],
  "rear-door": ["ประตูเลื่อนข้าง", "โครงในประตู"],
  "rear-fender": ["แผงข้างด้านมีประตูเลื่อน", "ชายล่างกระบะ", "ขอบกระบะบน"],
  "wheel-front": ["ฝาครอบล้อ", "ล้อแม็ก", "ล้อเหล็ก", "ซ่อมกระทะล้อแม็ก", "ซ่อมกระทะล้อเหล็ก"],
  "wheel-rear": ["ฝาครอบล้อ", "ล้อแม็ก", "ล้อเหล็ก", "ซ่อมกระทะล้อแม็ก", "ซ่อมกระทะล้อเหล็ก"],
};

// Returns the catalog part name that has a price for this model, or null.
export function matchedPartTh(part: { id: string; partTh: string }, prices: Record<string, unknown>): string | null {
  const candidates = [part.partTh, ...(PART_ALTS[part.id] || [])];
  return candidates.find((n) => prices[n]) ?? null;
}

type PriceTiers = { minor: number | null; moderate: number | null; severe: number | null; replace: number | null } | undefined;

// Neutral placeholder silhouette (shown until a real image is dropped in).
function FallbackSilhouette({ angle, body }: { angle: Angle; body: BodyStyle }) {
  const isSide = angle === "left" || angle === "right";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      {isSide ? (
        <g fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.6">
          {/* generic side body */}
          <path d="M6 74 L10 54 Q12 48 20 47 L30 40 Q34 34 44 34 L64 35 Q72 37 76 46 L92 50 Q95 54 95 62 L95 74 Z" />
          <circle cx="20" cy="76" r="8" fill="#94a3b8" />
          <circle cx="80" cy="76" r="8" fill="#94a3b8" />
          <path d="M32 42 Q36 37 44 37 L62 38 Q68 40 70 47 L70 52 L32 52 Z" fill="#cbd5e1" />
        </g>
      ) : (
        <g fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.6">
          {/* generic front/rear body */}
          <path d="M14 74 L18 40 Q20 30 30 28 L70 28 Q80 30 82 40 L86 74 L86 88 L78 88 Q76 92 70 92 L30 92 Q24 92 22 88 L14 88 Z" />
          <path d="M22 30 Q30 22 50 22 Q70 22 78 30 L74 40 L26 40 Z" fill="#cbd5e1" />
          <circle cx="24" cy="88" r="6" fill="#94a3b8" />
          <circle cx="76" cy="88" r="6" fill="#94a3b8" />
        </g>
      )}
    </svg>
  );
}

export function CarDiagram({
  angle,
  bodyType,
  prices,
  onPartClick,
  selectedPartId,
  lang,
}: {
  angle: Angle;
  bodyType: BodyStyle;
  prices: Record<string, PriceTiers>;
  onPartClick?: (part: CarPart) => void;
  selectedPartId?: string | null;
  lang: "th" | "en";
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(true);

  const src = `/cars/${bodyType}/${angle}.png`;
  useEffect(() => { setImgOk(true); }, [src]);

  const parts = resolveHotspots(bodyType, angle);
  const selected = parts.find((p) => p.id === selectedPartId) || null;
  const selectedMatch = selected ? matchedPartTh(selected, prices) : null;
  const selectedPrices = selectedMatch ? prices[selectedMatch] : undefined;

  const fmt = (n: number | null | undefined) =>
    n != null ? n.toLocaleString(lang === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 0 }) : "—";

  // Callout anchored to the right of the selected hotspot
  const calloutTop = selected ? Math.min(Math.max(selected.rect.y, 4), 60) : 0;

  return (
    <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-slate-50 to-white rounded-xl overflow-hidden">
      {/* Background: real image or fallback silhouette */}
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          onError={() => setImgOk(false)}
        />
      ) : (
        <>
          <FallbackSilhouette angle={angle} body={bodyType} />
          <div className="absolute top-2 left-2 text-[10px] text-slate-400 bg-white/70 px-2 py-0.5 rounded">
            {lang === "th" ? "รอภาพจริง" : "placeholder"} · {bodyType}/{angle}
          </div>
        </>
      )}

      {/* Hotspot overlay */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {parts.map((p) => {
          const isHover = hover === p.id;
          const isSel = selectedPartId === p.id;
          const hasPrice = !!matchedPartTh(p, prices);
          return (
            <rect
              key={p.id}
              x={p.rect.x} y={p.rect.y} width={p.rect.w} height={p.rect.h}
              rx="1.5"
              fill={isSel ? "#facc15" : isHover ? "#fde047" : "transparent"}
              stroke={isSel ? "#ca8a04" : isHover ? "#eab308" : "transparent"}
              strokeWidth={isSel || isHover ? 0.5 : 0}
              style={{
                cursor: hasPrice ? "pointer" : "not-allowed",
                opacity: isSel ? 0.55 : isHover ? 0.4 : 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => hasPrice && onPartClick?.(p)}
            />
          );
        })}
      </svg>

      {/* Price callout */}
      {selected && selectedPrices && (
        <div
          className="absolute right-2 w-[210px] bg-white border border-red-400 rounded-2xl p-3 shadow-lg"
          style={{ top: `${calloutTop}%` }}
        >
          <div className="font-bold text-[var(--navy-900)] text-sm mb-1.5">{selected.labelTh}</div>
          <div className="space-y-1.5 text-xs">
            {[
              { k: "minor", th: "ค่าแรงซ่อมเบา", en: "Light Labor", v: selectedPrices.minor },
              { k: "moderate", th: "ค่าแรงซ่อมกลาง", en: "Medium Labor", v: selectedPrices.moderate },
              { k: "severe", th: "ค่าแรงซ่อมหนัก", en: "Heavy Labor", v: selectedPrices.severe },
              { k: "replace", th: "ราคาอะไหล่เปลี่ยนใหม่", en: "Part Replace", v: selectedPrices.replace },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className={`w-2 h-2 rounded-full inline-block ${row.k === "replace" ? "bg-[#0071e3]" : "bg-slate-400"}`}></span>
                  {lang === "th" ? row.th : row.en}
                </span>
                <span className={`font-bold ${row.v ? "text-slate-900" : "text-slate-300"}`}>{fmt(row.v)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[9.5px] text-slate-400 leading-tight">
            {lang === "th"
              ? "* 3 รายการแรกคืออัตราค่าแรงซ่อม/พ่นสี — รายการสุดท้ายคือราคาอะไหล่เปลี่ยนใหม่"
              : "* Top 3 lines = Repair Labor — Bottom line = Spare Part Replacement"}
          </div>
        </div>
      )}
      {selected && !selectedPrices && (
        <div className="absolute right-2 top-2 w-[210px] bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs text-amber-800 text-center">
          {lang === "th" ? `ไม่พบ ${selected.labelTh} ในตารางราคา` : `${selected.labelEn} not in price table`}
        </div>
      )}
    </div>
  );
}

export const ANGLES: { id: Angle; labelTh: string; labelEn: string }[] = [
  { id: "front", labelTh: "ด้านหน้า", labelEn: "Front" },
  { id: "rear", labelTh: "ด้านหลัง", labelEn: "Rear" },
  { id: "left", labelTh: "ด้านซ้าย", labelEn: "Left Side" },
  { id: "right", labelTh: "ด้านขวา", labelEn: "Right Side" },
];

export function getAngleParts(angle: Angle, bodyType: BodyStyle = "sedan"): CarPart[] {
  return resolveHotspots(bodyType, angle);
}
