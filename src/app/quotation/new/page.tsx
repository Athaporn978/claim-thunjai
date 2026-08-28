"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { ItemsTable } from "@/components/quotation/ItemsTable";
import { PhotoUploader } from "@/components/quotation/PhotoUploader";
import { BRANDS } from "@/lib/carCatalog";
import { totals, fmtBaht, type QuotationInput, type QuotationItemInput, type QuotationPhoto, type ItemType } from "@/lib/quotation";
import { useSidebar } from "@/lib/SidebarContext";
import { validateVin } from "@/lib/vinValidation";
import { compressImageToBase64 } from "@/lib/imageCompress";

const EMPTY: QuotationInput = {
  status: "draft",
  vehicleCategory: "sedan_asia",
  vehicleSize: "B",
  discountPercent: 15,
  discountAmount: 0,
  includeVat: true,
  photos: [],
  items: [],
};

const TOP_INSURERS = [
  { v: "วิริยะประกันภัย", th: "วิริยะประกันภัย (Viriyah Insurance)", en: "Viriyah Insurance" },
  { v: "ทิพยประกันภัย", th: "ทิพยประกันภัย (Dhipaya Insurance)", en: "Dhipaya Insurance" },
  { v: "กรุงเทพประกันภัย", th: "กรุงเทพประกันภัย (Bangkok Insurance)", en: "Bangkok Insurance" },
  { v: "คุ้มภัยโตเกียวมารีนประกันภัย", th: "คุ้มภัยโตเกียวมารีนประกันภัย (Tokio Marine)", en: "Tokio Marine Safety Insurance" },
  { v: "ธนชาตประกันภัย", th: "ธนชาตประกันภัย (Thanachart Insurance)", en: "Thanachart Insurance" },
  { v: "แอกซ่าประกันภัย", th: "แอกซ่าประกันภัย (AXA Insurance)", en: "AXA Insurance" },
  { v: "แอลเอ็มจี ประกันภัย", th: "แอลเอ็มจี ประกันภัย (LMG Insurance)", en: "LMG Insurance" },
  { v: "ไทยวิวัฒน์ประกันภัย", th: "ไทยวิวัฒน์ประกันภัย (Thaivivat Insurance)", en: "Thaivivat Insurance" },
];

const MOCK_CENTERS = [
  { name: "โตโยต้า บัสส์ สาขารัชดา", address: "123 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพมหานคร", contact: "02-123-4567" },
  { name: "ฮอนด้า เฟิร์ส สาขารามอินทรา", address: "45/9 ถ.รามอินทรา แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพมหานคร", contact: "02-552-0000" },
  { name: "นิสสัน กรุงไทย สาขาเกษตร-นวมินทร์", address: "88 ถ.ประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพมหานคร", contact: "02-792-2000" },
  { name: "อีซูซุ อึ้งง่วนไต๋ สาขาตลิ่งชัน", address: "99 ถ.บรมราชชนนี แขวงฉิมพลี เขตตลิ่งชัน กรุงเทพมหานคร", contact: "02-448-6000" },
  { name: "มาสด้า พระราม 9", address: "55/1 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร", contact: "02-719-8000" },
  { name: "มิตซู ออโต้ ซิตี้ สาขาบางนา", address: "102 ถ.บางนา-ตราด กม.3 แขวงบางนา เขตบางนา กรุงเทพมหานคร", contact: "02-398-0000" },
  { name: "เอ็มจี บีบีซี สาขาวิภาวดี", address: "77 ถ.วิภาวดีรังสิต แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร", contact: "02-272-1111" },
  { name: "บีเอ็มดับเบิลยู อมรเพรสทีจ สาขารัชดาภิเษก", address: "60 ถ.รัชดาภิเษก แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร", contact: "02-513-2222" },
  { name: "เมอร์เซเดส-เบนซ์ เภตรา สาขาปทุมธานี", address: "18/8 ถ.กรุงเทพ-ปทุมธานี ต.บางเดชะ อ.เมือง ปทุมธานี", contact: "02-975-5555" },
  { name: "ศูนย์บริการ อู่ร่วมเจริญการช่าง สาขาบางแค", address: "33/4 ถ.เพชรเกษม แขวงบางแคเหนือ เขตบางแค กรุงเทพมหานคร", contact: "02-454-3333" },
];

const VEHICLE_CATEGORIES = [
  { v: "sedan_asia", th: "รถเก๋ง (เอเชีย)", en: "Sedan (Asian)" },
  { v: "sedan_eu", th: "รถเก๋ง (ยุโรป)", en: "Sedan (European)" },
  { v: "pickup", th: "รถกระบะ", en: "Pickup" },
  { v: "van", th: "รถตู้ / MPV", en: "Van / MPV" },
];

function VinField({ value, onChange, make, year, lang }: {
  value: string | null | undefined; onChange: (v: string) => void;
  make?: string; year?: string | number; lang: string;
}) {
  const vin = ((value || "")).toUpperCase();
  const result = validateVin(vin, { make, year });
  const hasError = !!result.formatError;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {lang === "th" ? "หมายเลขตัวถัง (VIN)" : "VIN / Chassis No."}
      </label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="17-character VIN"
        maxLength={17}
        className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:border-[var(--orange-500)] ${
          hasError ? "border-red-400 bg-red-50" : "border-slate-200"
        }`}
      />
      {hasError && (
        <p className="mt-1 text-[11px] text-red-600 font-medium">⛔ {result.formatError}</p>
      )}
      {!hasError && hasWarnings && (
        <div className="mt-1.5 space-y-0.5">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-700 font-medium">⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, className = "", required = false,
}: {
  label: string; value: string | number | null | undefined;
  onChange: (v: string) => void; type?: string; placeholder?: string; className?: string; required?: boolean;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {label} {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--orange-500)]"
      />
    </div>
  );
}

function Wizard() {
  const { lang } = useLang();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("id");
  const [form, setForm] = useState<QuotationInput>(EMPTY);
  // Cost row for the AI scan that populated this form, linked to the quotation
  // on first save. A ref, not state: it must never trigger a re-render.
  const scanUsageLogId = useRef<number | null>(null);
  const [insurerCustom, setInsurerCustom] = useState(false);
  const [centerCustom, setCenterCustom] = useState(false);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(editId);
  const [leaveModal, setLeaveModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStepText, setScanStepText] = useState<string>("");
  const [duplicateNoticeMsg, setDuplicateNoticeMsg] = useState<string | null>(null);
  const [pendingReuploadData, setPendingReuploadData] = useState<{ extractedItems: QuotationItemInput[]; meta: any } | null>(null);
  const [uploadedFileSignatures, setUploadedFileSignatures] = useState<string[]>([]);
  const [prefillNote, setPrefillNote] = useState<string>("");
  const [saveToast, setSaveToast] = useState<{ msg: string } | null>(null);
  const skipGuard = useRef(false);

  const resetWizardForm = useCallback(() => {
    setForm(EMPTY);
    setDirty(false);
    setId(null);
    setStep(0);
    setPrefillNote("");
    setUploadedFileSignatures([]);
    setPendingReuploadData(null);
    setDuplicateNoticeMsg(null);
    // Clear too, or a fresh case would inherit the previous scan's cost row.
    scanUsageLogId.current = null;
  }, []);

  // Reset form when opening a new quotation
  useEffect(() => {
    if (!editId) {
      resetWizardForm();
    }
  }, [editId, resetWizardForm]);

  // Load existing
  useEffect(() => {
    if (!editId) return;
    fetch(`/api/quotations/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.quotation) {
          const qd = d.quotation;
          const isCompleted = qd.status === "completed" || qd.status === "approved" || qd.status === "finalized";
          if (isCompleted) {
            // Completed cases cannot be edited; redirect to read-only detail view
            router.push(`/quotations/${editId}`);
            return;
          }
          let photos: QuotationPhoto[] = [];
          try { photos = qd.photos ? JSON.parse(qd.photos) : []; } catch { photos = []; }
          setForm({
            ...qd,
            coverageStart: qd.coverageStart ? qd.coverageStart.slice(0, 10) : null,
            coverageEnd: qd.coverageEnd ? qd.coverageEnd.slice(0, 10) : null,
            photos,
            items: (qd.items || []) as QuotationItemInput[],
          });
        }
      });
  }, [editId, router]);

  const [pendingNavHref, setPendingNavHref] = useState<string>("");

  // beforeunload guard for full page reload/close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !skipGuard.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Intercept Next.js client-side link clicks (Header, Navbar, Logo) when form is dirty
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (!dirty || skipGuard.current) return;
      const target = (e.target as HTMLElement).closest("a");
      if (target) {
        const href = target.getAttribute("href");
        if (href && !href.startsWith("#") && !href.startsWith("javascript:") && href !== window.location.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavHref(href);
          setLeaveModal(true);
        }
      }
    };
    document.addEventListener("click", handleAnchorClick, true);
    return () => document.removeEventListener("click", handleAnchorClick, true);
  }, [dirty]);

  const set = useCallback(<K extends keyof QuotationInput>(key: K, value: QuotationInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }, []);

  const setNum = (key: keyof QuotationInput) => (v: string) =>
    set(key, (v === "" ? null : Number(v)) as QuotationInput[typeof key]);

  const setItems = (items: QuotationItemInput[]) => { setForm((f) => ({ ...f, items })); setDirty(true); };
  const setPhotos = (photos: QuotationPhoto[]) => { setForm((f) => ({ ...f, photos })); setDirty(true); };

  const selBrand = BRANDS.find((b) => b.name === form.vehicleBrand);
  const onBrandChange = (name: string) => {
    setForm((f) => ({ ...f, vehicleBrand: name || null, vehicleModel: null }));
    setDirty(true);
  };
  const onModelChange = (name: string) => {
    const m = BRANDS.find((b) => b.name === form.vehicleBrand)?.models.find((x) => x.name === name);
    setForm((f) => ({
      ...f,
      vehicleModel: name || null,
      vehicleCategory: m ? m.vehicleType : f.vehicleCategory,
      vehicleSize: m ? m.size : f.vehicleSize,
    }));
    setDirty(true);
  };

  const t = totals(form.items);

  const save = async (opts?: { finalize?: boolean; thenView?: boolean }) => {
    setSaving(true);
    try {
      let sessionUser: any = null;
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem("claim_user_session") : null;
        if (raw) sessionUser = JSON.parse(raw);
      } catch {}

      const userEmail = sessionUser?.email || "somchai@htechnology.com";
      const userName = sessionUser?.name || sessionUser?.fullName || (userEmail.includes("kanya") ? "กัญญา มีสุข" : "สมชาย ใจดี");
      const userBranch = sessionUser?.branchName || sessionUser?.branch || (userEmail.includes("kanya") ? "สาขาเชียงใหม่" : "สาขากรุงเทพฯ (ลาดพร้าว)");

      const userRole = sessionUser?.roleName || sessionUser?.role?.name || "เจ้าหน้าที่คุมราคา";
      const payload: any = {
        ...form,
        createdByName: userName,
        createdByEmail: userEmail,
        branchName: userBranch,
        status: (opts?.finalize || opts?.thenView) ? "completed" : (form.status || "draft"),
        // Only meaningful on the first save (POST) of an AI-scanned case; the
        // server ignores it otherwise.
        usageLogId: scanUsageLogId.current,
        // For EDITED audit log on PUT
        _editorName: userName,
        _editorRole: userRole,
      };
      const res = await fetch(id ? `/api/quotations/${id}` : "/api/quotations", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const savedId = data.quotation?.id;
      if (savedId) {
        setId(savedId);
        setDirty(false);
        if (opts?.thenView) {
          setSaveToast({ msg: lang === "th" ? "✅ บันทึกเรียบร้อยแล้ว! กำลังเปิดรายงาน…" : "✅ Saved! Opening report…" });
          setTimeout(() => {
            skipGuard.current = true;
            router.push(`/quotations/${savedId}`);
          }, 900);
        } else {
          if (!id) {
            window.history.replaceState(null, "", `/quotation/new?id=${savedId}`);
          }
          setSaveToast({ msg: lang === "th" ? "✅ บันทึกร่างเรียบร้อยแล้ว!" : "✅ Draft saved!" });
          setTimeout(() => setSaveToast(null), 2500);
          setPrefillNote(
            lang === "th"
              ? "📝 บันทึกร่างเรียบร้อยแล้ว! (ข้อมูลบันทึกแล้ว สามารถสลับไปทำเคสอื่นหรือออกจากหน้าได้ทันทีโดยไม่ติด Guard)"
              : "📝 Draft saved successfully! (You can leave or switch pages without triggering guard)"
          );
        }
      }
    } catch {
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const tryLeave = () => {
    if (dirty) setLeaveModal(true);
    else { skipGuard.current = true; router.push("/quotations"); }
  };

  const handleAiScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Instant Pre-scan Reset: Wipe form and state clean immediately on new upload start
    setForm(EMPTY);
    setDirty(false);
    setPrefillNote("");
    setUploadedFileSignatures([]);
    setPendingReuploadData(null);
    setDuplicateNoticeMsg(null);

    setScanning(true);
    setScanProgress(15);
    setScanStepText(lang === "th" ? "กำลังอ่านไฟล์เอกสารใบเสนอราคา..." : "Reading quote document file...");
    setStepError("");

    // Live progress timer animation
    const progressTimer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 92) return 92;
        const next = prev + Math.floor(Math.random() * 10) + 5;
        if (next < 35) {
          setScanStepText(lang === "th" ? "กำลังวิเคราะห์โครงสร้างเอกสารด้วย AI..." : "Scanning document structure with AI...");
        } else if (next < 65) {
          setScanStepText(lang === "th" ? "กำลังสกัดข้อมูลลูกค้า รถยนต์ และบริษัทประกันภัย..." : "Extracting customer, vehicle & insurance info...");
        } else if (next < 85) {
          setScanStepText(lang === "th" ? "กำลังอ่านรายการซ่อมและคำนวณเปรียบเทียบราคากลางอู่กลาง..." : "Extracting repair items & looking up standard prices...");
        } else {
          setScanStepText(lang === "th" ? "กำลัง Auto-fill ข้อมูลเข้าสู่ฟอร์มทั้ง 6 ขั้นตอน..." : "Auto-filling data into all 6 form steps...");
        }
        return next > 92 ? 92 : next;
      });
    }, 350);

    try {
      const fileArray: { data: string; mediaType: string; name: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Images are resized/re-encoded client-side before ever becoming base64 —
        // uncompressed phone photos (3-8MB each) were blowing past the request
        // body-size cap once a case had several of them, silently corrupting the
        // save. PDFs pass through untouched (can't canvas-compress a PDF).
        if (file.type.startsWith("image/")) {
          const { data, mediaType } = await compressImageToBase64(file);
          fileArray.push({ data, mediaType, name: file.name });
        } else {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              const base64Data = res.split(",")[1] || res;
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          fileArray.push({
            data: base64,
            mediaType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
            name: file.name,
          });
        }
      }

      const res = await fetch("/api/extract-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: fileArray }),
      });

      const data = await res.json();
      clearInterval(progressTimer);

      if (!res.ok || data.error) {
        throw new Error(data.error || "Extraction failed");
      }

      setScanProgress(100);
      setScanStepText(lang === "th" ? "สแกนสำเร็จ 100%! กำลังนำข้อมูลเข้าฟอร์ม..." : "Scan 100% complete! Populating form...");

      const items = data.items || [];
      const meta = data.metadata || {};
      // Carried through to the save so the scan's AI cost can be attributed to
      // the quotation it produced (see linkUsageToQuotation).
      scanUsageLogId.current = typeof data.usageLogId === "number" ? data.usageLogId : null;

      let matchedBrandName = meta.vehicleBrand || "";
      let matchedModelName = meta.vehicleModel || "";
      let category = "sedan_asia";
      let size = "B";

      if (matchedBrandName) {
        const brandObj = BRANDS.find(
          (b) =>
            b.name.toLowerCase().includes((matchedBrandName || "").toLowerCase()) ||
            (matchedBrandName || "").toLowerCase().includes(b.name.toLowerCase())
        );
        if (brandObj) {
          matchedBrandName = brandObj.name;
          const modelObj = brandObj.models.find(
            (m) =>
              m.name.toLowerCase().includes((matchedModelName || "").toLowerCase()) ||
              (matchedModelName || "").toLowerCase().includes(m.name.toLowerCase())
          );
          if (modelObj) {
            matchedModelName = modelObj.name;
            category = modelObj.vehicleType || category;
            size = modelObj.size || size;
          } else if (brandObj.models.length > 0) {
            matchedModelName = brandObj.models[0].name;
            category = brandObj.models[0].vehicleType || category;
            size = brandObj.models[0].size || size;
          }
        }
      }

      const newPhotos: QuotationPhoto[] = fileArray
        .filter((f) => f.mediaType.startsWith("image/"))
        .map((f, idx) => ({
          url: `data:${f.mediaType};base64,${f.data}`,
          caption: `ใบเสนอราคา (${f.name})`,
        }));

      const formattedItems: QuotationItemInput[] = items.map((i: any, index: number) => {
        const itemType = i.type === "labor" ? "labor" : "part";
        const quoted = Number(i.unitPrice) || 0;
        const std = i.standardPrice != null ? Number(i.standardPrice) : null;
        // std === 0 means "no standard price found" (see extract-quote/route.ts),
        // not a genuine zero price — must not be treated as cheaper than quoted,
        // or the controlled price would incorrectly collapse to ฿0.
        const controlled = (std != null && std > 0 && std < quoted) ? std : quoted;
        return {
          type: itemType,
          name: i.name,
          quotedUnit: quoted,
          quotedQty: Number(i.qty) || 1,
          controlledUnit: controlled,
          controlledQty: Number(i.qty) || 1,
          standardPrice: std ?? 0,
          sortOrder: index,
        };
      });

      // Short delay so user sees 100% complete bar
      await new Promise((resolve) => setTimeout(resolve, 500));

      setForm({
        ...EMPTY,
        customerName: meta.customerName || "",
        licensePlate: meta.licensePlate || "",
        vehicleCategory: category || "sedan_asia",
        vehicleBrand: matchedBrandName || meta.vehicleBrand || "",
        vehicleModel: matchedModelName || meta.vehicleModel || "",
        vehicleYear: meta.vehicleYear || 2026,
        vehicleSize: size || "B",
        chassisNo: meta.chassisNo || "",
        color: meta.color || "",
        mileage: meta.mileage || null,
        insurerName: meta.insurerName || "",
        claimNo: meta.claimNo || "",
        policyNo: meta.policyNo || "",
        policyType: meta.policyType || "ชั้น 1",
        centerName: meta.centerName || "",
        centerAddress: meta.centerAddress || "",
        centerContact: meta.centerContact || "",
        discountPercent: meta.discountPercent ?? 15,
        discountAmount: (meta.discountAmount && Number(meta.discountAmount) > 0) ? Number(meta.discountAmount) : 0,
        includeVat: meta.includeVat ?? true,
        photos: newPhotos,
        items: formattedItems,
      });

      setDirty(true);
      setPrefillNote(
        lang === "th"
          ? `✨ สแกนเอกสาร (${files[0].name}) สำเร็จ 100%! นำข้อมูล Auto-fill เข้าครบทั้ง 6 ขั้นตอนแล้ว (${formattedItems.length} รายการซ่อม)`
          : `✨ Scanned document (${files[0].name}) 100% successfully! Auto-filled all 6 steps (${formattedItems.length} items)`
      );
    } catch (err: any) {
      console.error("AI scan upload error:", err);
      clearInterval(progressTimer);
      setStepError(
        err?.message ||
          (lang === "th"
            ? "สแกนเอกสารไม่สำเร็จ กรุณาลองใหม่หรือกรอกข้อมูลด้วยตนเอง"
            : "Document scan failed. Please try again or enter data manually.")
      );
    } finally {
      setScanning(false);
      setScanProgress(0);
      setScanStepText("");
      e.target.value = "";
    }
  };

  const [stepError, setStepError] = useState<string>("");

  const applyReuploadOption = (option: "replace" | "append" | "cancel") => {
    if (option === "cancel" || !pendingReuploadData) {
      setPendingReuploadData(null);
      return;
    }

    const { extractedItems, meta } = pendingReuploadData;
    let matchedBrandName = meta.vehicleBrand || "";
    let matchedModelName = meta.vehicleModel || "";

    if (matchedBrandName) {
      const brandObj = BRANDS.find((b) =>
        b.name.toLowerCase().includes((matchedBrandName || "").toLowerCase()) ||
        (matchedBrandName || "").toLowerCase().includes(b.name.toLowerCase())
      );
      if (brandObj) {
        matchedBrandName = brandObj.name;
        const modelObj = brandObj.models.find((m) =>
          m.name.toLowerCase().includes((matchedModelName || "").toLowerCase()) ||
          (matchedModelName || "").toLowerCase().includes(m.name.toLowerCase())
        );
        if (modelObj) {
          matchedModelName = modelObj.name;
        } else if (brandObj.models.length > 0) {
          matchedModelName = brandObj.models[0].name;
        }
      }
    }

    if (option === "replace") {
      setForm({
        ...EMPTY,
        customerName: meta.customerName || "",
        licensePlate: meta.licensePlate || "",
        vehicleBrand: matchedBrandName || "",
        vehicleModel: matchedModelName || "",
        vehicleYear: meta.vehicleYear || 2026,
        chassisNo: meta.chassisNo || "",
        color: meta.color || "",
        mileage: meta.mileage || null,
        insurerName: meta.insurerName || "",
        claimNo: meta.claimNo || "",
        policyNo: meta.policyNo || "",
        policyType: meta.policyType || "ชั้น 1",
        centerName: meta.centerName || "",
        centerAddress: meta.centerAddress || "",
        centerContact: meta.centerContact || "",
        items: extractedItems,
      });
    } else if (option === "append") {
      setForm((prev) => ({
        ...prev,
        items: [...prev.items, ...extractedItems],
      }));
    }

    setPendingReuploadData(null);
  };

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 0) {
      if (!form.customerName?.trim()) return lang === "th" ? "กรุณากรอก 'ชื่อลูกค้า' ก่อนไปขั้นตอนถัดไป" : "Please enter 'Customer Name' before proceeding";
      if (!form.licensePlate?.trim()) return lang === "th" ? "กรุณากรอก 'หมายเลขทะเบียน' ก่อนไปขั้นตอนถัดไป" : "Please enter 'License Plate' before proceeding";
      if (!form.vehicleBrand?.trim()) return lang === "th" ? "กรุณาเลือก 'ยี่ห้อรถยนต์' ก่อนไปขั้นตอนถัดไป" : "Please select 'Vehicle Brand' before proceeding";
      if (!form.vehicleModel?.trim()) return lang === "th" ? "กรุณาเลือก 'รุ่นรถยนต์' ก่อนไปขั้นตอนถัดไป" : "Please select 'Vehicle Model' before proceeding";
    } else if (currentStep === 1) {
      if (!form.insurerName?.trim()) return lang === "th" ? "กรุณากรอก 'ชื่อบริษัทประกัน' ก่อนไปขั้นตอนถัดไป" : "Please enter 'Insurer Name' before proceeding";
      if (!form.claimNo?.trim()) return lang === "th" ? "กรุณากรอก 'หมายเลขเคลม' ก่อนไปขั้นตอนถัดไป" : "Please enter 'Claim No.' before proceeding";
    } else if (currentStep === 2) {
      if (!form.centerName?.trim()) return lang === "th" ? "กรุณากรอก 'ชื่อศูนย์บริการ' ก่อนไปขั้นตอนถัดไป" : "Please enter 'Service Center Name' before proceeding";
    }
    return null;
  };

  const goToStep = (targetStep: number) => {
    if (targetStep <= step) {
      setStepError("");
      setStep(targetStep);
      return;
    }
    for (let s = 0; s < targetStep; s++) {
      const err = validateStep(s);
      if (err) {
        setStepError(err);
        setStep(s);
        return;
      }
    }
    setStepError("");
    setStep(targetStep);
  };

  const STEPS = lang === "th"
    ? ["ข้อมูลลูกค้า", "ข้อมูลประกัน", "ศูนย์/อู่บริการ", "รูปภาพรถยนต์", "ค่าแรง", "ค่าอะไหล่"]
    : ["Customer", "Insurance", "Service Center", "Photos", "Labor", "Parts"];
  const LAST = STEPS.length - 1;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      {/* Save toast */}
      {saveToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl bg-emerald-600 text-white text-sm font-bold animate-fade-in pointer-events-none">
          {saveToast.msg}
        </div>
      )}
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={tryLeave} className="text-sm text-slate-500 hover:text-[var(--navy-900)]">← {lang === "th" ? "กลับไปรายการ" : "Back to list"}</button>
            {/* Sidebar collapse shortcut — desktop only; below lg the sidebar is already
                an off-canvas drawer, so there is nothing to collapse for more width. */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 text-[#0071e3] border border-sky-200 hover:bg-[#0071e3] hover:text-white text-xs font-bold transition cursor-pointer shadow-2xs"
              title={isCollapsed ? (lang === "th" ? "แสดงแถบเมนู" : "Expand Sidebar") : (lang === "th" ? "ย่อแถบเมนูเพื่อขยายตารางเต็มจอ" : "Collapse Sidebar")}
            >
              {isCollapsed ? (lang === "th" ? "⇉ แสดงเมนู" : "⇉ Show Sidebar") : (lang === "th" ? "⇇ ย่อเมนู (ขยายตารางเต็มจอ)" : "⇇ Focus Mode")}
            </button>
          </div>
          <h1 className="text-2xl font-bold text-[var(--navy-900)]">
            {lang === "th" ? "ใบเสนอราคาซ่อมรถยนต์" : "Repair Quotation"}
            {form.quotationNo && <span className="ml-2 text-sm font-mono text-slate-400">{form.quotationNo}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Saving</div>
            <div className="text-xl font-bold text-[var(--orange-600)]">฿{fmtBaht(t.totalSaving, lang)}</div>
          </div>
        </div>
      </div>

      {/* AI Quote Auto-Scan Banner (Clean White Card matching form below) */}
      <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">
                {lang === "th" ? "สแกนใบเสนอราคาอัตโนมัติด้วย AI" : "AI Automatic Quote Scanner"}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071e3] border border-blue-100 text-[11px] font-extrabold uppercase tracking-wide">
                Full 6-Step Auto-Fill
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === "th"
                ? "อัปโหลดไฟล์ PDF หรือรูปถ่ายใบเสนอราคา ระบบ AI จะอ่านและกรอกข้อมูลอัตโนมัติทั้ง 6 ขั้นตอน (ลูกค้า, ประกัน, ศูนย์ซ่อม, ภาพ, ค่าแรง, ค่าอะไหล่)"
                : "Upload PDF or photo of repair quote to automatically fill all 6 steps."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={resetWizardForm}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-md"
              title={lang === "th" ? "ล้างข้อมูลฟอร์มทั้งหมดเพื่อเริ่มสแกนใหม่" : "Reset form data for new scan"}
            >
              <span>🔄</span>
              <span>{lang === "th" ? "ล้างข้อมูล / เริ่มสแกนใหม่" : "Reset / New Scan"}</span>
            </button>
          )}
          <label
            title={dirty ? (lang === "th" ? "กรุณากด 'ล้างข้อมูล / เริ่มสแกนใหม่' ก่อนสแกนไฟล์ใหม่" : "Please reset form before scanning a new file") : undefined}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-md ${
              dirty || scanning
                ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                : "bg-[#0071e3] hover:bg-blue-600 text-white cursor-pointer"
            }`}
          >
            {scanning ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{lang === "th" ? "กำลังสแกนและกรอกข้อมูล..." : "Scanning & Auto-filling..."}</span>
              </>
            ) : (
              <>
                <span>📁</span>
                <span>{lang === "th" ? "เลือกไฟล์ PDF / รูปภาพเพื่อสแกน" : "Select PDF / Images to Scan"}</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={handleAiScanUpload}
              disabled={scanning || dirty}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {prefillNote && (
        <div className="mb-4 bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 text-sm text-emerald-900 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">✨</span>
            <span>{prefillNote}</span>
          </div>
          <div className="flex items-center gap-1 text-xs bg-amber-100/90 text-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 font-bold shadow-2xs">
            <span>⚠️</span>
            <span>{lang === "th" ? "กรุณาตรวจสอบความถูกต้องของรายการและตัวเลขราคาก่อนอนุมัติเสมอ" : "Please verify extracted items and amounts for accuracy"}</span>
          </div>
        </div>
      )}

      {stepError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center justify-between font-semibold">
          <span>⚠️ {stepError}</span>
          <button onClick={() => setStepError("")} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center mb-6 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-shrink-0">
            <button
              onClick={() => goToStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                step === i ? "bg-[#0071e3] text-white shadow-sm" : i < step ? "text-[#0071e3] font-bold" : "text-slate-400"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === i ? "bg-white text-[#0071e3] font-bold" : i < step ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>{i < step ? "✓" : i + 1}</span>
              <span className="whitespace-nowrap">{label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="card min-h-[360px]">
        {/* Step 1 Customer */}
        {step === 0 && (
          <div>


            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label={lang === "th" ? "ชื่อลูกค้า" : "Customer Name"} value={form.customerName} onChange={(v) => set("customerName", v)} required />
              <Field label={lang === "th" ? "หมายเลขทะเบียน" : "License Plate"} value={form.licensePlate} onChange={(v) => set("licensePlate", v)} required />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{lang === "th" ? "ประเภทยานพาหนะ" : "Vehicle Type"}</label>
              <select value={form.vehicleCategory ?? "sedan_asia"} onChange={(e) => set("vehicleCategory", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                {VEHICLE_CATEGORIES.map((o) => <option key={o.v} value={o.v}>{lang === "th" ? o.th : o.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{lang === "th" ? "ยี่ห้อรถยนต์" : "Brand"} <span className="text-red-500 font-bold ml-0.5">*</span></label>
              <select value={form.vehicleBrand ?? ""} onChange={(e) => onBrandChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">{lang === "th" ? "— เลือกยี่ห้อ —" : "— Select brand —"}</option>
                {BRANDS.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{lang === "th" ? "รุ่น" : "Model"} <span className="text-red-500 font-bold ml-0.5">*</span></label>
              <select value={form.vehicleModel ?? ""} onChange={(e) => onModelChange(e.target.value)} disabled={!selBrand} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">{!selBrand ? (lang === "th" ? "เลือกยี่ห้อก่อน" : "Select brand first") : (lang === "th" ? "— เลือกรุ่น —" : "— Select model —")}</option>
                {selBrand?.models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <Field label={lang === "th" ? "ปี" : "Year"} value={form.vehicleYear} onChange={setNum("vehicleYear")} type="number" placeholder="2022" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{lang === "th" ? "ขนาดรถ (สำหรับราคากลาง)" : "Size (for standard price)"}</label>
              <select value={form.vehicleSize ?? "B"} onChange={(e) => set("vehicleSize", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="A">A · {lang === "th" ? "เล็ก" : "Small"}</option>
                <option value="B">B · {lang === "th" ? "กลาง" : "Medium"}</option>
                <option value="C">C · {lang === "th" ? "ใหญ่" : "Large"}</option>
              </select>
            </div>
            <VinField
              value={form.chassisNo}
              onChange={(v) => set("chassisNo", v)}
              make={form.vehicleBrand || undefined}
              year={form.vehicleYear || undefined}
              lang={lang}
            />
            <Field label={lang === "th" ? "สี" : "Color"} value={form.color} onChange={(v) => set("color", v)} />
            <Field label={lang === "th" ? "เลขไมล์" : "Mileage"} value={form.mileage} onChange={setNum("mileage")} type="number" />
          </div>
        </div>
        )}

        {/* Step 2 Insurance */}
        {step === 1 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                {lang === "th" ? "ชื่อบริษัทประกัน" : "Insurer"} <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={
                  TOP_INSURERS.some((i) => form.insurerName?.includes(i.v))
                    ? TOP_INSURERS.find((i) => form.insurerName?.includes(i.v))?.v
                    : insurerCustom || form.insurerName
                    ? "custom"
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "custom") {
                    setInsurerCustom(true);
                    set("insurerName", "");
                  } else {
                    setInsurerCustom(false);
                    set("insurerName", val);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--orange-500)]"
              >
                <option value="">{lang === "th" ? "— เลือกบริษัทประกัน —" : "— Select Insurer —"}</option>
                {TOP_INSURERS.map((i) => (
                  <option key={i.v} value={i.v}>{lang === "th" ? i.th : i.en}</option>
                ))}
                <option value="custom">{lang === "th" ? "— อื่นๆ (กรอกระบุเอง) —" : "— Other (Specify) —"}</option>
              </select>
              {(!TOP_INSURERS.some((i) => form.insurerName?.includes(i.v)) && (insurerCustom || form.insurerName)) && (
                <input
                  type="text"
                  value={form.insurerName ?? ""}
                  onChange={(e) => set("insurerName", e.target.value)}
                  placeholder={lang === "th" ? "ระบุชื่อบริษัทประกัน…" : "Specify insurer name…"}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--orange-500)]"
                />
              )}
            </div>
            <Field label={lang === "th" ? "หมายเลขเคลม" : "Claim No."} value={form.claimNo} onChange={(v) => set("claimNo", v)} required />
            <Field label={lang === "th" ? "หมายเลขกรมธรรม์" : "Policy No."} value={form.policyNo} onChange={(v) => set("policyNo", v)} />
            <Field label={lang === "th" ? "ประเภทกรมธรรม์" : "Policy Type"} value={form.policyType} onChange={(v) => set("policyType", v)} placeholder={lang === "th" ? "ชั้น 1" : "Type 1"} />
            <Field label={lang === "th" ? "ทุนประกัน" : "Sum Insured"} value={form.sumInsured} onChange={setNum("sumInsured")} type="number" />
            <Field label={lang === "th" ? "วันที่เริ่มคุ้มครอง" : "Coverage Start"} value={form.coverageStart} onChange={(v) => set("coverageStart", v)} type="date" />
            <Field label={lang === "th" ? "วันที่สิ้นสุดคุ้มครอง" : "Coverage End"} value={form.coverageEnd} onChange={(v) => set("coverageEnd", v)} type="date" />
            <Field label={lang === "th" ? "ค่าเสียหายส่วนแรก (Deductible / Excess)" : "Deductible / Excess"} value={form.deductible} onChange={setNum("deductible")} type="number" />
          </div>
        )}

        {/* Step 3 Center */}
        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                {lang === "th" ? "ชื่อศูนย์บริการ" : "Service Center"} <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={
                  MOCK_CENTERS.some((c) => form.centerName?.includes(c.name))
                    ? MOCK_CENTERS.find((c) => form.centerName?.includes(c.name))?.name
                    : centerCustom || form.centerName
                    ? "custom"
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "custom") {
                    setCenterCustom(true);
                    set("centerName", "");
                  } else {
                    setCenterCustom(false);
                    const found = MOCK_CENTERS.find((c) => c.name === val);
                    if (found) {
                      set("centerName", found.name);
                      set("centerAddress", found.address);
                      set("centerContact", found.contact);
                    } else {
                      set("centerName", val);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--orange-500)] font-medium"
              >
                <option value="">{lang === "th" ? "— เลือกศูนย์บริการ / อู่ซ่อม —" : "— Select Service Center —"}</option>
                {MOCK_CENTERS.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
                <option value="custom">{lang === "th" ? "— อื่นๆ (กรอกระบุเอง) —" : "— Other (Specify) —"}</option>
              </select>

              {(!MOCK_CENTERS.some((c) => form.centerName?.includes(c.name)) && (centerCustom || form.centerName)) && (
                <input
                  type="text"
                  value={form.centerName ?? ""}
                  onChange={(e) => set("centerName", e.target.value)}
                  placeholder={lang === "th" ? "ระบุชื่อศูนย์บริการ…" : "Specify center name…"}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--orange-500)]"
                />
              )}
            </div>
            <Field label={lang === "th" ? "ที่อยู่" : "Address"} value={form.centerAddress} onChange={(v) => set("centerAddress", v)} className="md:col-span-2" />
            <Field label={lang === "th" ? "ติดต่อ" : "Contact"} value={form.centerContact} onChange={(v) => set("centerContact", v)} />
          </div>
        )}

        {/* Step 4 Photos */}
        {step === 3 && (
          <PhotoUploader photos={form.photos || []} onChange={setPhotos} lang={lang} />
        )}

        {/* Step 5 Labor */}
        {step === 4 && (
          <ItemsTable
            title={lang === "th" ? "ค่าแรง" : "Labor"}
            type="labor"
            items={form.items}
            onChange={setItems}
            vehicleCategory={form.vehicleCategory || "sedan_asia"}
            vehicleSize={form.vehicleSize || "B"}
            lang={lang}
            photos={form.photos || []}
          />
        )}

        {/* Step 6 Parts */}
        {step === 5 && (
          <div className="space-y-6">
            <ItemsTable
              title={lang === "th" ? "ค่าอะไหล่" : "Parts"}
              type="part"
              items={form.items}
              onChange={setItems}
              vehicleCategory={form.vehicleCategory || "sedan_asia"}
              vehicleSize={form.vehicleSize || "B"}
              lang={lang}
              photos={form.photos || []}
            />
            {/* Grand summary with Baht-only Discount Card, Officer Saving KPI & VAT 7% Toggle */}
            {(() => {
              const actualDiscAmount = form.discountAmount != null ? Math.max(0, Number(form.discountAmount) || 0) : 0;
              const netApprovedBeforeVat = Math.max(0, t.totalControlled - actualDiscAmount);
              const includeVat = form.includeVat !== false;
              const vatAmount = includeVat ? netApprovedBeforeVat * 0.07 : 0;
              const grandApprovedTotal = netApprovedBeforeVat + vatAmount;

              // Officer Performance Saving: Pure rate cut performance (Quoted - Controlled), EXCLUDING discount
              const officerSaving = t.totalSaving;
              const officerSavingPct = t.totalQuoted > 0 ? (officerSaving / t.totalQuoted) * 100 : 0;

              return (
                <div className="space-y-4 border-t border-slate-200 pt-6 mt-6">
                  {/* VAT 7% Toggle & Controls Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span>🏷️ {lang === "th" ? "ส่วนลดศูนย์บริการ & ภาษีมูลค่าเพิ่ม" : "Discount & VAT Configuration"}</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0071e3] bg-white px-3 py-1.5 rounded-xl border border-sky-200 shadow-2xs hover:bg-sky-50 transition">
                      <input
                        type="checkbox"
                        checked={includeVat}
                        onChange={(e) => set("includeVat", e.target.checked)}
                        className="w-4 h-4 text-[#0071e3] rounded focus:ring-blue-500"
                      />
                      <span>{lang === "th" ? "คิดภาษีมูลค่าเพิ่ม VAT 7% (ใช้ในใบอนุมัติ)" : "Include VAT 7% (In Approval Report)"}</span>
                    </label>
                  </div>

                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: Total Quoted */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 text-center shadow-2xs">
                      <div className="text-xs font-bold text-slate-500 mb-1">{lang === "th" ? "ราคาเสนอรวม" : "Total Quoted"}</div>
                      <div className="text-xl font-extrabold text-slate-800 font-mono">฿{fmtBaht(t.totalQuoted, lang)}</div>
                    </div>

                    {/* Card 2: Total Controlled */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 text-center shadow-2xs">
                      <div className="text-xs font-bold text-slate-500 mb-1">{lang === "th" ? "ราคาอนุมัติ (ก่อนส่วนลด)" : "Approved (Pre-Discount)"}</div>
                      <div className="text-xl font-extrabold text-[#0071e3] font-mono">฿{fmtBaht(t.totalControlled, lang)}</div>
                    </div>

                    {/* Card 3: Discount Card (Baht Only - Editable) */}
                    <div className="bg-sky-50/70 rounded-2xl p-4 border-2 border-sky-300 text-center shadow-2xs relative">
                      <div className="text-xs font-bold text-[#0071e3] mb-1">
                        {lang === "th" ? "ราคาส่วนลด (บาท)" : "Discount Amount (THB)"}
                      </div>
                      <div className="relative mt-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0071e3]">฿</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={form.discountAmount === undefined || form.discountAmount === null || form.discountAmount === 0 ? "" : form.discountAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              set("discountAmount", 0);
                            } else {
                              const parsed = parseFloat(val);
                              set("discountAmount", isNaN(parsed) ? 0 : parsed);
                            }
                          }}
                          className="w-full text-center text-xl font-extrabold text-[#0071e3] font-mono bg-white border border-sky-300 rounded-xl py-1 pl-6 pr-2 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 shadow-xs"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Card 4: Total Saving Card */}
                    <div className="bg-amber-50/60 rounded-2xl p-4 border-2 border-amber-400 text-center shadow-2xs flex flex-col items-center justify-center">
                      <div className="text-xs font-bold text-amber-900 mb-1">
                        {lang === "th" ? "รวมยอด Saving" : "Total Saving"} ({officerSavingPct.toFixed(1)}%)
                      </div>
                      <div className="text-2xl font-extrabold text-amber-700 font-mono mt-0.5">฿{fmtBaht(officerSaving, lang)}</div>
                    </div>
                  </div>

                  {/* 5-Line Summary Net Approved Banner for Report PDF */}
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 shadow-md space-y-3">
                    <div className="text-xs font-bold opacity-90 border-b border-white/20 pb-2">
                      📋 {lang === "th" ? "สรุปยอดอนุมัติซ่อม (สำหรับออกรายงาน Report PDF)" : "Repair Approval Summary (For PDF Report)"}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="bg-white/10 p-2.5 rounded-xl">
                        <div className="text-[10px] opacity-75 font-sans mb-0.5">{lang === "th" ? "ราคาเสนอ" : "Quoted Price"}</div>
                        <div className="font-bold">฿{fmtBaht(t.totalQuoted, lang)}</div>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-xl">
                        <div className="text-[10px] opacity-75 font-sans mb-0.5">{lang === "th" ? "ราคาอนุมัติ" : "Approved Price"}</div>
                        <div className="font-bold">฿{fmtBaht(t.totalControlled, lang)}</div>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-xl">
                        <div className="text-[10px] opacity-75 font-sans mb-0.5">{lang === "th" ? "ราคาส่วนลด" : "Discount"}</div>
                        <div className="font-bold">฿{fmtBaht(actualDiscAmount, lang)}</div>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-xl">
                        <div className="text-[10px] opacity-75 font-sans mb-0.5">
                          {includeVat ? "VAT 7%" : (lang === "th" ? "VAT (ไม่คิด)" : "VAT (Excl.)")}
                        </div>
                        <div className="font-bold">฿{fmtBaht(vatAmount, lang)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/20">
                      <div className="text-sm font-extrabold">
                        🏆 {lang === "th" ? "รวมยอดสุทธิอนุมัติ" : "Grand Net Approved Total"}:
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight bg-white/20 px-4 py-1 rounded-xl border border-white/30">
                        ฿{fmtBaht(grandApprovedTotal, lang)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Officer note — last thing filled before finalising, and printed
                above the Approval Summary so the insurer sees the reasoning. */}
            <div className="border-t border-slate-200 pt-6">
              <label className="block text-sm font-bold text-[var(--navy-900)] mb-1.5">
                💬 {lang === "th" ? "ความเห็นเจ้าหน้าที่คุมราคา" : "Officer's Comment"}
              </label>
              <p className="text-xs text-slate-500 font-medium mb-2">
                {lang === "th"
                  ? "ข้อความนี้จะแสดงในใบรายงาน PDF เหนือส่วนสรุปผลการพิจารณา (ไม่บังคับกรอก)"
                  : "Shown on the printed report above the Approval Summary. Optional."}
              </p>
              <textarea
                value={form.officerComment ?? ""}
                onChange={(e) => set("officerComment", e.target.value)}
                rows={4}
                placeholder={lang === "th"
                  ? "เช่น เหตุผลการปรับลดราคา ข้อตกลงกับศูนย์บริการ หรือข้อสังเกตเพิ่มเติม…"
                  : "e.g. reasons for the price adjustments, agreements with the service centre, other notes…"}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-[#0071e3] resize-y"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between mt-5">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-primary text-sm !py-2 !px-6 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← {lang === "th" ? "ถอยหลัง" : "Back"}
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => save()} disabled={saving} className="btn-primary text-sm !py-2 !px-6 disabled:opacity-50 cursor-pointer">
            {saving ? "…" : (lang === "th" ? "📝 บันทึกร่าง" : "📝 Save Draft")}
          </button>
          {step < LAST ? (
            <button onClick={() => goToStep(step + 1)} className="btn-primary text-sm !py-2 !px-6 cursor-pointer">
              {lang === "th" ? "ถัดไป" : "Next"} →
            </button>
          ) : (
            <button onClick={() => save({ thenView: true })} disabled={saving} className="btn-primary text-sm !py-2 !px-6 disabled:opacity-50 cursor-pointer">
              {saving ? "…" : (lang === "th" ? "บันทึก & ดูรายงาน" : "Save & View Report")}
            </button>
          )}
        </div>
      </div>

      {/* Unsaved-changes Guard Modal */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-bold mb-3 mx-auto">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-[var(--navy-900)] text-center mb-1">
              {lang === "th" ? "คุณกำลังจะออกจากหน้านี้" : "You are leaving this page"}
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
              {lang === "th"
                ? "คุณกำลังจะออกจากหน้านี้และข้อมูลยังไม่ได้ถูกบันทึก ต้องการดำเนินการอย่างไร?"
                : "You are about to leave this page and your data has not been saved yet."}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setLeaveModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0071e3] text-white text-sm font-bold hover:bg-blue-600 transition cursor-pointer shadow-sm"
              >
                {lang === "th" ? "อยู่ต่อ (กรอกข้อมูลต่อ)" : "Stay on page"}
              </button>
              <button
                onClick={async () => { await save(); skipGuard.current = true; router.push(pendingNavHref || "/quotations"); }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                📝 {lang === "th" ? "บันทึกและออกจากหน้านี้" : "Save & Leave"}
              </button>
              <button
                onClick={() => { skipGuard.current = true; setDirty(false); router.push(pendingNavHref || "/quotations"); }}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
              >
                {lang === "th" ? "ออกจากหน้านี้ (ไม่บันทึก)" : "Leave page (Discard)"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Document Scanning Progress Overlay Modal */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 border border-sky-100 animate-in zoom-in-95 duration-200">
            {/* Header with spinning loader & % indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0071e3] text-white flex items-center justify-center text-xl shadow-md">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {lang === "th" ? "กำลังประมวลผลสแกนเอกสารด้วย AI" : "AI Document Processing"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Auto-filling 6 Form Steps</p>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0071e3] font-mono">
                {scanProgress}%
              </div>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-slate-100 rounded-full h-4 mb-3 p-0.5 overflow-hidden border border-slate-200 shadow-inner">
              <div
                className="bg-gradient-to-r from-[#0071e3] via-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-md"
                style={{ width: `${Math.max(5, Math.min(100, scanProgress))}%` }}
              />
            </div>

            {/* Live Step Status Message */}
            <div className="text-xs font-semibold text-[#0071e3] text-center mb-6 bg-sky-50 py-2.5 px-3 rounded-xl border border-sky-200">
              {scanStepText || (lang === "th" ? "กำลังประมวลผล..." : "Processing...")}
            </div>

            {/* Required Warnings */}
            <div className="space-y-2.5">
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs font-semibold">
                <span className="text-base shrink-0">🛑</span>
                <span className="leading-relaxed">
                  {lang === "th"
                    ? "ห้ามปิดหน้านี้ขณะระบบกำลังสแกนและประมวลผลเอกสาร"
                    : "Do not close this page while scanning and processing the document."}
                </span>
              </div>

              <div className="bg-sky-50 border border-sky-300 rounded-2xl p-3 text-xs text-sky-950 flex items-start gap-2.5 shadow-2xs font-semibold">
                <span className="text-base shrink-0">⚠️</span>
                <span className="leading-relaxed">
                  {lang === "th"
                    ? "เอกสารนี้ใช้ AI ในการอ่านค่า อาจเกิดข้อผิดพลาดได้ กรุณาตรวจสอบความถูกต้องของข้อมูลทุกครั้งก่อนบันทึก"
                    : "This document uses AI for data extraction and errors may occur. Please verify all information before saving."}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* End of Wizard Container */}
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">…</div>}>
      <Wizard />
    </Suspense>
  );
}
