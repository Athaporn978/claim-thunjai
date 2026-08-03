"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const BAR_HEIGHT = 44;
const SHIFT_ATTR = "data-ttj-shifted";

/**
 * Demo Mode Top Bar — full-width banner above EVERYTHING
 *
 * Default:  Read-only Demo (banner: 🎯 ระบบตัวอย่าง — blue gradient)
 * VIP URL:  ?vip=ttj-pro2026 → Full Access (banner: 🔓 FULL ACCESS — green)
 *
 * Auto-pushes any fixed/sticky top-anchored navbar/header down by 44px,
 * so nothing overlaps with the bar.
 */
export default function DemoBadge() {
  const [mode, setMode] = useState<"readonly" | "full">("readonly");
  const [show, setShow] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("vip") === "ttj-pro2026") {
      document.cookie = "ttj_demo_full=1; path=/; max-age=3600; SameSite=Lax";
      setMode("full");
      return;
    }
    const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("ttj_demo_full="));
    if (hasCookie) setMode("full");
  }, []);

  /* Auto-shift fixed/sticky top elements down by BAR_HEIGHT */
  useEffect(() => {
    if (!show) return;

    const shifted: Array<{ el: HTMLElement; origTop: string; origTransform: string }> = [];

    const shiftEls = () => {
      const candidates = document.querySelectorAll<HTMLElement>(
        "header, nav, aside, [class*='navbar'], [class*='Navbar'], [class*='header'], [class*='Header']"
      );
      candidates.forEach((el) => {
        // Skip our own bar
        if (el.closest("[data-ttj-demo-bar]")) return;
        // Skip already shifted
        if (el.getAttribute(SHIFT_ATTR) === "1") return;

        const cs = getComputedStyle(el);
        if (cs.position !== "fixed" && cs.position !== "sticky") return;

        const topVal = parseFloat(cs.top);
        if (isNaN(topVal) || topVal > BAR_HEIGHT * 2) return;

        const origTop = el.style.top;
        const origTransform = el.style.transform;
        el.style.top = `${topVal + BAR_HEIGHT}px`;
        el.setAttribute(SHIFT_ATTR, "1");
        shifted.push({ el, origTop, origTransform });
      });
    };

    // Initial shift
    shiftEls();

    // Re-run when DOM changes (route navigation, lazy-mounted navbars)
    const observer = new MutationObserver(() => shiftEls());
    observer.observe(document.body, { childList: true, subtree: true });

    // Push regular content down too
    document.body.style.paddingTop = `${BAR_HEIGHT}px`;

    return () => {
      observer.disconnect();
      document.body.style.paddingTop = "";
      shifted.forEach(({ el, origTop, origTransform }) => {
        el.style.top = origTop;
        el.style.transform = origTransform;
        el.removeAttribute(SHIFT_ATTR);
      });
    };
  }, [show]);

  if (!show) return null;
  // Hide demo bar on customer-facing self-inspection route.
  if (pathname?.startsWith("/inspect/")) return null;

  const isFull = mode === "full";

  return (
    <div
      data-ttj-demo-bar="1"
      className="no-print"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: BAR_HEIGHT,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "0 16px",
        background: isFull
          ? "linear-gradient(90deg, #047857 0%, #10B981 50%, #047857 100%)"
          : "linear-gradient(90deg, #991B1B 0%, #DC2626 50%, #991B1B 100%)",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 13.5,
        fontWeight: 600,
        boxShadow: "0 4px 18px rgba(15,31,67,.30)",
        borderBottom: "1px solid rgba(255,255,255,.15)",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{isFull ? "🔓" : "🎯"}</span>
      <span style={{ letterSpacing: 0.3 }}>
        {isFull
          ? "DEMO — FULL ACCESS · ทดลองได้เต็มที่ 1 ชม."
          : "คุณกำลังดูระบบตัวอย่าง — สนใจสั่งทำระบบของคุณเอง?"}
      </span>
      <a
        href="https://techthunjai.com/#contact"
        target="_blank"
        rel="noopener"
        style={{
          padding: "6px 16px",
          background: "rgba(255,255,255,.95)",
          color: isFull ? "#047857" : "#991B1B",
          borderRadius: 999,
          textDecoration: "none",
          fontSize: 12.5,
          fontWeight: 800,
          letterSpacing: 0.3,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,.18)",
        }}
      >
        สั่งทำ →
      </a>
      <button
        onClick={() => setShow(false)}
        title="Hide"
        aria-label="Hide banner"
        style={{
          position: "absolute",
          right: 12,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,.15)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
