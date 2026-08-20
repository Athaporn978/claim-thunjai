import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { Header } from "@/components/Header";
import PortalLayout from "@/components/PortalLayout";

export const metadata: Metadata = {
  title: "ClaimThunJai · AI Damage Detection for Insurance",
  description: "Claude-powered car damage detection for insurance companies. B2B2C.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-slate-900" suppressHydrationWarning>
        <LangProvider>
          <Header />
          <PortalLayout>{children}</PortalLayout>
        </LangProvider>
      </body>
    </html>
  );
}
