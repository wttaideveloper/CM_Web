import type { Metadata } from "next";

import EnterpriseAdminProviders from "@/providers/EnterpriseAdminProviders";

import "./globals.css";

// The per-request CSP nonce (see src/proxy.ts) can only be applied to server-rendered
// HTML, so every page is rendered on demand instead of being prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IHP Enterprise Admin",
  description: "IHP Enterprise Admin.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-white text-[#06201c]">
        <EnterpriseAdminProviders>{children}</EnterpriseAdminProviders>
      </body>
    </html>
  );
}
