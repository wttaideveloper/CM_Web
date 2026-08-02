import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "IHP Platform Admin",
  description: "IHP Platform Admin scaffold.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-white text-[#06201c]">{children}</body>
    </html>
  );
}
