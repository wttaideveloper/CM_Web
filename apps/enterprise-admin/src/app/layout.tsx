import type { Metadata } from "next";
import Link from "next/link";
import { AppFrame } from "@ihp/ui";

import "./globals.css";

export const metadata: Metadata = {
  title: "IHP Enterprise Admin",
  description: "Enterprise Admin route-build proof application.",
};

const navigationItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/enterprise", label: "Enterprise" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/settings", label: "Settings" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-white text-[#06201c]">
        <AppFrame
          sidebar={(
            <aside className="fixed left-0 top-[72px] hidden h-[calc(100vh-72px)] w-[240px] border-r border-[#e3eee9] bg-white lg:block">
              <nav className="space-y-1 px-3 py-5" aria-label="Enterprise Admin">
                <p className="mb-4 px-3 text-sm font-bold uppercase tracking-[0.22em] text-[#6b4fd3]">
                  Enterprise Admin
                </p>
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-[#4f6f67] transition hover:bg-[#f4faf7] hover:text-[#0f5d4a]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
          )}
          header={(
            <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-[#e3eee9] bg-white/95 px-6 backdrop-blur lg:px-8">
              <Link href="/admin/dashboard" className="text-lg font-bold text-[#07352d]">
                Invigorate Health
              </Link>
              <span className="ml-3 rounded-full bg-[#f4f0ff] px-3 py-1 text-xs font-semibold text-[#6b4fd3]">
                Enterprise Admin A1
              </span>
            </header>
          )}
        >
          {children}
        </AppFrame>
      </body>
    </html>
  );
}
