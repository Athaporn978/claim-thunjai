import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Next.js App Router injects inline hydration scripts on every page, and this app has no
// nonce-based CSP wiring (that requires forcing dynamic rendering on every route — see
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md "Without Nonces").
// So script-src/style-src use 'unsafe-inline' per that guide's documented non-nonce pattern —
// still blocks external script/style injection, which is the actual attack this defends against.
//
// Images/PDFs are stored as base64 data: URIs (see AGENTS.md), so img-src must allow data:.
// The UI loads Sarabun/Inter from Google Fonts, so style-src/font-src allow those two hosts.
// connect-src 'self' covers same-origin fetch() from the client; the Anthropic API is only
// ever called server-side, never from the browser.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`, // dev HMR needs eval; prod build does not
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'" + (isProd ? "" : " ws: wss:"), // dev HMR websocket
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  experimental: {
    // src/proxy.ts buffers the request body for every /api/* call (needed to read
    // the session cookie before the route handler runs). Next.js's default buffer
    // cap is 10MB — quotations with several scanned-PDF pages or photos embedded
    // as base64 data: URIs regularly exceed that, silently truncating the JSON
    // body and failing the save.
    //
    // Photos are now compressed client-side before upload (src/lib/imageCompress.ts,
    // 2400px/85% JPEG — measured ~0.95MB worst-case per photo on dense/noisy real
    // content). At the business-required cap of 50 photos/case that's up to ~47.5MB
    // raw, ~65MB once base64-encoded (+37% overhead) — 100mb leaves real headroom
    // above that worst case while still bounding memory use per request (not unlimited).
    proxyClientMaxBodySize: "100mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      // No /sw.js entry here on purpose. The PWA guide suggests pinning Content-Type
      // and Cache-Control on the worker, but files under public/ are served by Next's
      // static handler, which sets both itself and wins over headers() — verified
      // against a production build. What it sets is already what we need:
      // "application/javascript; charset=UTF-8" and "public, max-age=0", the latter
      // forcing an ETag revalidation on every request, so a fixed worker always
      // propagates on the next load.
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*.xlsx",
        destination: "/404",
        permanent: false,
      },
      {
        source: "/:path*.xls",
        destination: "/404",
        permanent: false,
      },
      {
        source: "/:path*.csv",
        destination: "/404",
        permanent: false,
      },
      {
        source: "/:path*.db",
        destination: "/404",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

