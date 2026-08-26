import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClaimThunJai — B2B Claims Portal",
    short_name: "ClaimThunJai",
    description:
      "ระบบคุมราคาซ่อมรถยนต์และวิเคราะห์ความเสียหายด้วย AI สำหรับบริษัทประกันภัย",
    lang: "th",
    // Installed users are staff opening this to work, not to read the marketing
    // landing page. The portal guard sends them to /login when there's no session.
    start_url: "/quotations",
    scope: "/",
    display: "standalone",
    // Splash screen background — matches the portal canvas so the app doesn't flash
    // a different colour on launch.
    background_color: "#f0f4fd",
    // Colours the Android status bar, which sits directly above the app's own dark
    // navy top bar; anything else would show as a mismatched band.
    theme_color: "#0b132a",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
