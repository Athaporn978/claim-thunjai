"use client";
import { useEffect } from "react";

/**
 * Registers the PWA service worker (see public/sw.js).
 *
 * Production only: in dev the worker's cache-first rule for /_next/static would
 * serve stale chunks and break hot reloading. Verify PWA behaviour against a
 * production build (`next build && next start`), not `next dev`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      // Never break the app over this — the site works fine without a worker.
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
