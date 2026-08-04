"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

export default function Home() {
  const { t, lang } = useLang();
  const [activeCarPart, setActiveCarPart] = useState<string>("grille");

  const carPartsDemo = {
    grille: { name: "กระจังหน้า (Grille)", code: "P-FRONT-01", price: "1,000", severity: "ซ่อมกลาง (Moderate)", bg: "#0071e3" },
    bumper: { name: "เปลือกกันชนหน้า (Front Bumper)", code: "P-FRONT-02", price: "2,500", severity: "ซ่อมหนัก (Severe)", bg: "#0077ed" },
    headlight: { name: "ชุดโคมไฟหน้า RH (Headlight)", code: "P-FRONT-03", price: "4,200", severity: "เปลี่ยน (Replace)", bg: "#38bdf8" },
  };

  const currentPart = carPartsDemo[activeCarPart as keyof typeof carPartsDemo];

  return (
    <div className="bg-[#f8fafc] text-[#1d1d1f] selection:bg-[#0071e3] selection:text-white font-sans">
      {/* 1. Hero Section - Exact Apple MacBook Air Light Ice Blue Style */}
      <section className="apple-ice-gradient min-h-[92vh] relative flex items-center justify-center overflow-hidden pt-12 pb-24 border-b border-sky-100">
        {/* Ice Blue Soft Glow Orbs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-tr from-sky-200/50 via-blue-200/30 to-indigo-100/20 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />

        <div className="max-w-6xl mx-auto px-6 text-center relative z-10 space-y-8">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-sky-200 shadow-sm animate-float-bounce">
            <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-ping" />
            <span className="text-xs font-bold tracking-wide text-[#0071e3] uppercase">
              {lang === "th" ? "✨ AI Claims Intelligence 2.0" : "✨ Next-Gen AI Claims 2.0"}
            </span>
          </div>

          {/* Main MacBook Air Style Title */}
          <div className="space-y-3 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#1d1d1f] leading-[1.08]">
              ClaimThunJai AI
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-700 tracking-tight">
              {lang === "th"
                ? "ยกระดับการประเมินเคลมด้วยระบบ AI อัจฉริยะ แม่นยำ 94%"
                : "Now supercharged by AI Claims Intelligence."}
            </p>
          </div>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {lang === "th"
              ? "แพลตฟอร์ม AI ประเมินความเสียหายรถยนต์ สกัดข้อมูลใบเสนอราคาและคำนวณราคากลางซ่อมเบ็ดเสร็จในไม่กี่วินาที"
              : "Automated AI damage assessment and instant quote parsing platform for insurance carriers and service centers."}
          </p>

          {/* Exact Apple Pill Buttons (Learn More & Buy style) */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/login" className="btn-apple-sky-primary text-base">
              <span>🔐</span>
              <span>{lang === "th" ? "เข้าสู่ระบบ Demo พอร์ตัล" : "Enter Demo Portal"}</span>
            </Link>
            <a href="#contact" className="btn-apple-sky-secondary text-base">
              <span>📞</span>
              <span>{lang === "th" ? "ติดต่อเรา" : "Contact Us"}</span>
            </a>
          </div>

          {/* Hero Floating Showcase Card */}
          <div className="pt-10 max-w-4xl mx-auto">
            <div className="apple-glass-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-200/80 border border-sky-100 hover:border-sky-300 transition-all duration-500 relative">
              {/* Window Header */}
              <div className="flex items-center justify-between mb-4 border-b border-sky-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                </div>
                <span className="text-[11px] font-mono font-bold text-[#0071e3] bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                  LIVE INTERACTIVE AI SCANNER
                </span>
              </div>

              {/* Interactive Car Image Preview */}
              <div className="relative aspect-[16/9] rounded-2xl bg-gradient-to-b from-sky-50/50 to-white border border-sky-100 overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cars/sedan/front.png" alt="Toyota Camry AI Scan" className="w-full h-full object-contain p-6 transition-all" />

                {/* Hotspot 1: Grille */}
                <button
                  onClick={() => setActiveCarPart("grille")}
                  className={`absolute left-[40%] top-[63%] w-[22%] h-[17%] rounded-lg border-2 transition-all duration-300 cursor-pointer flex items-center justify-center ${
                    activeCarPart === "grille"
                      ? "border-[#0071e3] bg-sky-400/40 scale-105 shadow-lg shadow-blue-500/30"
                      : "border-amber-400/80 bg-amber-400/20 hover:bg-amber-400/40"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-ping" />
                </button>

                {/* Hotspot 2: Bumper */}
                <button
                  onClick={() => setActiveCarPart("bumper")}
                  className={`absolute left-[25%] top-[72%] w-[50%] h-[18%] rounded-lg border-2 transition-all duration-300 cursor-pointer flex items-center justify-center ${
                    activeCarPart === "bumper"
                      ? "border-[#0071e3] bg-sky-400/40 scale-105 shadow-lg shadow-blue-500/30"
                      : "border-emerald-400/80 bg-emerald-400/20 hover:bg-emerald-400/40"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                </button>

                {/* Hotspot 3: Headlight */}
                <button
                  onClick={() => setActiveCarPart("headlight")}
                  className={`absolute right-[18%] top-[54%] w-[18%] h-[15%] rounded-lg border-2 transition-all duration-300 cursor-pointer flex items-center justify-center ${
                    activeCarPart === "headlight"
                      ? "border-[#0071e3] bg-sky-400/40 scale-105 shadow-lg shadow-blue-500/30"
                      : "border-blue-400/80 bg-blue-400/20 hover:bg-blue-400/40"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                </button>
              </div>

              {/* Dynamic Part Price Callout Card */}
              <div className="mt-4 p-4 rounded-xl bg-white border border-sky-100 shadow-sm flex items-center justify-between">
                <div className="text-left">
                  <div className="text-sm font-extrabold text-[#1d1d1f]">{currentPart.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{currentPart.severity}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">ราคากลางมาตรฐาน</div>
                  <div className="text-xl font-extrabold text-[#0071e3] font-mono">฿{currentPart.price}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Bar */}
      <section className="bg-white border-b border-sky-100 py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { k: "30+", v: t.stats.brands, icon: "🚘" },
            { k: "94%", v: t.stats.accuracy, icon: "🎯" },
            { k: "<2s", v: t.stats.time, icon: "⚡" },
            { k: "78%", v: t.stats.saved, icon: "💰" },
          ].map((s) => (
            <div key={s.v} className="text-center group p-4 rounded-2xl hover:bg-sky-50/60 transition duration-300 cursor-default">
              <div className="text-2xl mb-1 group-hover:scale-125 transition-transform duration-300">{s.icon}</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#1d1d1f] tracking-tight">
                {s.k}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Apple-style B2B Features Grid */}
      <section className="py-24 bg-[#f8fafe]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#0071e3] tracking-widest uppercase bg-sky-100/80 px-3 py-1 rounded-full border border-sky-200">
              CORE CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1d1d1f]">
              {lang === "th" ? "ฟีเจอร์อัจฉริยะสำหรับบริษัทประกันและอู่" : "Enterprise Grade Features"}
            </h2>
            <p className="text-slate-600 text-sm">{t.features.sub}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🎯", t: t.features.f1t, d: t.features.f1d },
              { icon: "🔧", t: t.features.f2t, d: t.features.f2d },
              { icon: "📊", t: t.features.f3t, d: t.features.f3d },
              { icon: "🔌", t: t.features.f4t, d: t.features.f4d },
              { icon: "🏢", t: t.features.f5t, d: t.features.f5d },
              { icon: "🌐", t: t.features.f6t, d: t.features.f6d },
            ].map((f) => (
              <div
                key={f.t}
                className="bg-white rounded-3xl p-7 border border-sky-100 shadow-lg shadow-sky-100/50 hover:border-[#0071e3] hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#0071e3] group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg text-[#1d1d1f] mb-2 group-hover:text-[#0071e3] transition">{f.t}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Dedicated Contact Us Section - Apple Bright Sky Blue Style */}
      <section id="contact" className="py-24 apple-ice-gradient relative overflow-hidden border-t border-sky-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-[#0071e3] uppercase tracking-widest bg-sky-100 px-3 py-1 rounded-full border border-sky-200">
              {lang === "th" ? "ช่องทางการติดต่อ" : "Get In Touch"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1d1d1f]">
              {lang === "th" ? "ติดต่อเราเพื่อทดลองใช้งานสำหรับองค์กร" : "Contact Us For Enterprise Demo & Solutions"}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              {lang === "th"
                ? "ทีมงานผู้เชี่ยวชาญพร้อมให้คำปรึกษาและเชื่อมต่อระบบ AI ประเมินเคลมประกันสำหรับบริษัทประกันและศูนย์บริการ"
                : "Our AI specialists are ready to help integrate automated claim solutions into your insurance workflows."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Card 1: Email */}
            <div className="bg-white/90 rounded-3xl p-6 text-center border border-sky-100 shadow-xl shadow-sky-100/80 hover:border-[#0071e3] hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 text-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-[#0071e3] group-hover:text-white transition-all duration-300">
                ✉️
              </div>
              <h3 className="font-extrabold text-base text-[#1d1d1f] mb-1">{lang === "th" ? "อีเมลติดต่อ" : "Email Us"}</h3>
              <p className="text-[11px] text-slate-500 mb-3">{lang === "th" ? "ตอบกลับภายใน 24 ชม." : "Response within 24 hrs"}</p>
              <a href="mailto:athaporn@htechnology.com" className="text-xs font-extrabold text-[#0071e3] hover:underline truncate block">
                athaporn@htechnology.com
              </a>
            </div>

            {/* Card 2: Company Info */}
            <div className="bg-white/90 rounded-3xl p-6 text-center border border-sky-100 shadow-xl shadow-sky-100/80 hover:border-purple-400 hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 text-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                🏢
              </div>
              <h3 className="font-extrabold text-base text-[#1d1d1f] mb-1">{lang === "th" ? "บริษัทผู้พัฒนา" : "Developer"}</h3>
              <p className="text-[11px] text-slate-500 mb-2">H TECHNOLOGY</p>
              <span className="text-[11px] text-slate-700 font-bold block leading-tight">
                H TECHNOLOGY AND SERVICES COMPANY LIMITED
              </span>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href="/login" className="btn-apple-sky-primary text-base">
              <span>🔐</span>
              <span>{lang === "th" ? "เข้าสู่ระบบพอร์ตัล Demo" : "Sign In To Demo Portal"}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
