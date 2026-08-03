"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

export default function LoginPage() {
  const { lang, setLang } = useLang();
  const router = useRouter();

  const [email, setEmail] = useState("athaporn@techthunjai.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
      }

      router.push("/quotations");
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen apple-ice-gradient text-[#1d1d1f] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Glow Spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-gradient-to-tr from-sky-200/50 via-blue-200/30 to-indigo-100/20 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />

      {/* Top Navbar */}
      <header className="p-6 flex items-center justify-between z-10 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-full bg-[#0071e3] flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-xl tracking-tight text-[#1d1d1f] group-hover:text-[#0071e3] transition">
              ClaimThunJai
            </span>
            <span className="text-xs text-slate-500 font-medium">AI Damage Detection</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs font-bold border border-sky-200 rounded-full overflow-hidden p-0.5 bg-white/90 shadow-xs">
            <button
              onClick={() => setLang("th")}
              className={`px-3 py-1 rounded-full transition ${
                lang === "th" ? "bg-[#0071e3] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              TH
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full transition ${
                lang === "en" ? "bg-[#0071e3] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              EN
            </button>
          </div>

          <Link href="/" className="text-sm font-semibold text-slate-700 hover:text-[#0071e3] transition">
            ← {lang === "th" ? "กลับหน้าแรก" : "Back to Home"}
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-white/85 backdrop-blur-2xl border border-sky-100 rounded-3xl p-8 shadow-2xl shadow-sky-200/80 space-y-6 relative">
          {/* Demo Accounts Quick-Select Badge Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#0071e3] flex items-center gap-1.5 uppercase tracking-wider">
                <span>🔑</span> บัญชีทดสอบระบบ (Demo Credentials)
              </span>
              <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                คลิกเพื่อเติมข้อมูล
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs font-bold">
              {/* Account 1: Super Admin */}
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@techthunjai.com");
                  setPassword("123456");
                }}
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 hover:border-[#0071e3] hover:bg-sky-50/50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <div>
                    <div className="text-slate-800 font-extrabold group-hover:text-[#0071e3] transition">
                      Super Admin (เห็นทุกสาขา)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      admin@techthunjai.com • Pass: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#0071e3] font-black opacity-0 group-hover:opacity-100 transition">
                  ใช้บัญชีนี้ →
                </span>
              </button>

              {/* Account 2: Staff Lat Phrao */}
              <button
                type="button"
                onClick={() => {
                  setEmail("somchai@techthunjai.com");
                  setPassword("123456");
                }}
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 hover:border-[#0071e3] hover:bg-sky-50/50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <div>
                    <div className="text-slate-800 font-extrabold group-hover:text-[#0071e3] transition">
                      เจ้าหน้าที่คุมราคา (สาขาลาดพร้าว)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      somchai@techthunjai.com • Pass: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#0071e3] font-black opacity-0 group-hover:opacity-100 transition">
                  ใช้บัญชีนี้ →
                </span>
              </button>

              {/* Account 3: Staff Chiang Mai */}
              <button
                type="button"
                onClick={() => {
                  setEmail("kanya@techthunjai.com");
                  setPassword("123456");
                }}
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 hover:border-[#0071e3] hover:bg-sky-50/50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <div>
                    <div className="text-slate-800 font-extrabold group-hover:text-[#0071e3] transition">
                      เจ้าหน้าที่คุมราคา (สาขาเชียงใหม่)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      kanya@techthunjai.com • Pass: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#0071e3] font-black opacity-0 group-hover:opacity-100 transition">
                  ใช้บัญชีนี้ →
                </span>
              </button>

              {/* Account 4: Supervisor Lat Phrao */}
              <button
                type="button"
                onClick={() => {
                  setEmail("supervisor_latphrao@techthunjai.com");
                  setPassword("123456");
                }}
                className="flex items-center justify-between px-3 py-2 bg-amber-50/60 rounded-xl border border-amber-200 hover:border-amber-500 hover:bg-amber-100/60 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👔</span>
                  <div>
                    <div className="text-amber-950 font-extrabold group-hover:text-amber-700 transition">
                      หัวหน้าคุมราคา / Supervisor (สาขาลาดพร้าว)
                    </div>
                    <div className="text-[10px] text-amber-700 font-mono">
                      supervisor_latphrao@techthunjai.com • Pass: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-amber-700 font-black opacity-0 group-hover:opacity-100 transition">
                  ใช้บัญชีนี้ →
                </span>
              </button>

              {/* Account 5: Supervisor Chiang Mai */}
              <button
                type="button"
                onClick={() => {
                  setEmail("supervisor_chiangmai@techthunjai.com");
                  setPassword("123456");
                }}
                className="flex items-center justify-between px-3 py-2 bg-amber-50/60 rounded-xl border border-amber-200 hover:border-amber-500 hover:bg-amber-100/60 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👔</span>
                  <div>
                    <div className="text-amber-950 font-extrabold group-hover:text-amber-700 transition">
                      หัวหน้าคุมราคา / Supervisor (สาขาเชียงใหม่)
                    </div>
                    <div className="text-[10px] text-amber-700 font-mono">
                      supervisor_chiangmai@techthunjai.com • Pass: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-amber-700 font-black opacity-0 group-hover:opacity-100 transition">
                  ใช้บัญชีนี้ →
                </span>
              </button>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1d1d1f]">
              {lang === "th" ? "เข้าสู่ระบบพนักงาน" : "Sign in to Employee Portal"}
            </h1>
            <p className="text-sm text-slate-500">
              {lang === "th" ? "ระบบวิเคราะห์และควบคุมราคาซ่อมรถยนต์ AI" : "Automated AI Car Insurance Claim Platform"}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === "th" ? "อีเมลเข้าใช้งาน (Email Address)" : "Email Address"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athaporn@techthunjai.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-white border border-sky-200 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === "th" ? "รหัสผ่าน (Password)" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-white border border-sky-200 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? (
                    /* Official Eye Slash SVG Icon */
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 013.98-.863c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-3-3m-6.312-3.116A3 3 0 0012 9a2.983 2.983 0 00-2.116.884m0 0L3 3" />
                    </svg>
                  ) : (
                    /* Official Eye Open SVG Icon */
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
            >
              {loading ? (
                <span>{lang === "th" ? "กำลังยืนยันตัวตน..." : "Verifying Credentials..."}</span>
              ) : (
                <>
                  <span>🔐</span>
                  <span>{lang === "th" ? "เข้าสู่ระบบพนักงาน (Sign In)" : "Sign In"}</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-sky-100">
            <span className="text-xs text-slate-500 font-semibold block">
              © 2026 บริษัท เทคทันใจ อินโนเวชั่น จำกัด
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
              (TECHTHUNJAI INNOVATION CO., LTD.)
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 z-10">
        © 2026 TECHTHUNJAI INNOVATION CO., LTD. All rights reserved.
      </footer>
    </div>
  );
}
