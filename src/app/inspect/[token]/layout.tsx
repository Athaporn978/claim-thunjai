import type { Metadata, Viewport } from "next";

// Customer-facing self-inspection layout — no admin chrome (no Header, no
// DemoBadge, no language switcher). Deliberately minimal so it's clear this
// page is meant for the policy-holder on their phone.

export const metadata: Metadata = {
  title: "ตรวจสภาพรถ · ClaimThunJai",
  description: "ถ่ายรูปรถเพื่อต่อกรมธรรม์",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a1f44",
};

export default function InspectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
