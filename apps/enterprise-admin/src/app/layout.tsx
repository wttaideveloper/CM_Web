import type { Metadata } from "next";

import EnterpriseAdminProviders from "@/providers/EnterpriseAdminProviders";

import "./globals.css";

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
