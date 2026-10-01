import Link from "next/link";

import PlatformAdminShell from "@/components/PlatformAdminShell";

const buildingPages = [
  ["Form Builder", "/onboarding-forms"],
  ["Form Builder New", "/form-builder-new"],
  ["Workflow Builder New", "/workflow-builder-new"],
  ["Enterprise Types", "/enterprise-types"],
  ["Sub-Admins / Super Admins", "/sub-admins"],
] as const;

export default function BuildingPages() {
  return <PlatformAdminShell><main className="mx-auto w-full max-w-5xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#7f9d94]">Super Admin</p><h1 className="mt-2 text-3xl font-bold text-[#06201c]">Building Pages</h1><p className="mt-2 text-sm text-[#52736a]">Internal links for platform pages still under construction.</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{buildingPages.map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-[#dfe9e4] bg-white p-5 font-bold text-[#1f6a58] shadow-sm hover:bg-[#f4faf7]"><span>{label}</span><span className="mt-2 block text-xs font-normal text-[#52736a]">Open page →</span></Link>)}</div></main></PlatformAdminShell>;
}
