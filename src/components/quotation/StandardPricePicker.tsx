"use client";
import { useEffect, useMemo, useState } from "react";

type PriceRow = { minor: number | null; moderate: number | null; severe: number | null; replace: number | null };
type PriceMap = Record<string, PriceRow>;

const TIERS: { key: keyof PriceRow; th: string; en: string }[] = [
  { key: "minor", th: "ซ่อมเบา", en: "Light" },
  { key: "moderate", th: "ซ่อมกลาง", en: "Medium" },
  { key: "severe", th: "ซ่อมหนัก", en: "Heavy" },
  { key: "replace", th: "เปลี่ยน", en: "Replace" },
];

export function StandardPricePicker({
  open,
  vehicleCategory,
  vehicleSize,
  lang,
  onClose,
  onPick,
}: {
  open: boolean;
  vehicleCategory: string;
  vehicleSize: string;
  lang: "th" | "en";
  onClose: () => void;
  onPick: (args: { part: string; tierLabel: string; price: number }) => void;
}) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/prices?vehicleType=${vehicleCategory || "sedan_asia"}&size=${vehicleSize || "B"}`)
      .then((r) => r.json())
      .then((d) => setPrices(d.prices || {}))
      .finally(() => setLoading(false));
  }, [open, vehicleCategory, vehicleSize]);

  const parts = useMemo(() => {
    const names = Object.keys(prices);
    if (!q.trim()) return names;
    return names.filter((n) => n.includes(q.trim()));
  }, [prices, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--navy-900)]">{lang === "th" ? "ดึงราคากลาง" : "Pull Standard Price"}</h3>
            <p className="text-xs text-slate-500">{lang === "th" ? "เลือกแผงตัวถัง + ระดับการซ่อม" : "Pick a panel + repair tier"} · {vehicleCategory} / {vehicleSize}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <div className="p-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "th" ? "ค้นหาชิ้นส่วน เช่น กันชนหน้า" : "Search part…"}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading ? (
            <div className="text-center text-slate-400 py-8 text-sm">…</div>
          ) : parts.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">{lang === "th" ? "ไม่พบชิ้นส่วน" : "No parts found"}</div>
          ) : (
            parts.map((name) => {
              const row = prices[name];
              return (
                <div key={name} className="border border-slate-200 rounded-lg p-2.5">
                  <div className="font-semibold text-sm text-[var(--navy-900)] mb-1.5">{name}</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIERS.map((tier) => {
                      const val = row[tier.key];
                      const label = lang === "th" ? tier.th : tier.en;
                      return (
                        <button
                          key={tier.key}
                          disabled={val == null}
                          onClick={() => { onPick({ part: name, tierLabel: label, price: val as number }); onClose(); }}
                          className={`px-1 py-1.5 rounded-md text-xs border transition ${
                            val == null
                              ? "border-slate-100 text-slate-300 cursor-not-allowed"
                              : "border-slate-200 hover:border-[var(--orange-500)] hover:bg-orange-50 text-slate-700"
                          }`}
                        >
                          <div className="text-[10px] text-slate-400">{label}</div>
                          <div className="font-bold">{val != null ? val.toLocaleString() : "—"}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
