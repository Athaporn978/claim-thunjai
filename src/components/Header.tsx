"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/LangContext";

export function Header() {
  const { lang, setLang } = useLang();
  const pathname = usePathname();

  // Internal portal pages use Sidebar layout instead of top header
  if (
    pathname?.startsWith("/inspect/") ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/analyze") ||
    pathname?.startsWith("/admin/") ||
    pathname?.startsWith("/catalog") ||
    pathname?.startsWith("/parts-catalog") ||
    pathname?.startsWith("/quotation") ||
    pathname?.startsWith("/reports") ||
    pathname?.startsWith("/docs") ||
    pathname?.startsWith("/login")
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-sky-100/80 text-[#1d1d1f] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo - Apple Style */}
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300 shrink-0">
            <img src="/logo/Htech_logo.webp" alt="H Technology" className="w-full h-full object-cover" />
          </div>
          {/* Under ~400px the logo, language pill and sign-in button already fill the
              bar, so show the wordmark only once it fits rather than truncate it. */}
          <div className="hidden min-[400px]:flex flex-col leading-tight min-w-0">
            <span className="font-extrabold text-base tracking-tight text-[#1d1d1f] group-hover:text-[#0071e3] transition truncate">
              ClaimThunJai
            </span>
            <span className="hidden sm:block text-[10px] text-slate-500 font-medium -mt-0.5">AI Claims Intelligence</span>
          </div>
        </Link>

        {/* Main menu — dropped on phones so the brand and sign-in button keep their room */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#1d1d1f]">
          <Link href="/" className="hover:text-[#0071e3] transition duration-200">
            {lang === "th" ? "หน้าแรก" : "Home"}
          </Link>
          <a href="#contact" className="hover:text-[#0071e3] transition duration-200">
            {lang === "th" ? "ติดต่อเรา" : "Contact Us"}
          </a>
        </nav>

        {/* Right Controls: TH/EN & Apple Blue Pill Login Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

          <Link href="/login" className="btn-apple-sky-primary text-xs !py-2 !px-5">
            <span>🔐</span>
            <span>{lang === "th" ? "เข้าสู่ระบบ" : "Sign In"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
