import type { SidebarFrameProps } from "./ui-layout.types";

export default function SidebarFrame({
  desktopContent,
  mobileHeader,
  mobileContent,
  mobileOpen,
  onMobileSidebarClose,
}: SidebarFrameProps) {
  return (
    <>
      <aside className="fixed left-0 top-[72px] hidden h-[calc(100vh-72px)] w-[240px] flex-col overflow-hidden border-r border-[#e3eee9] bg-white transition-colors lg:flex">
        {desktopContent}
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          onClick={onMobileSidebarClose}
          className={`absolute inset-0 top-[72px] bg-slate-900/45 backdrop-blur-sm transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-[72px] flex h-[calc(100vh-72px)] w-[280px] max-w-[86vw] flex-col overflow-hidden border-r border-[#e3eee9] bg-white shadow-[0_20px_40px_rgba(7,53,45,0.18)] transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#edf3f0] px-4 py-4">
            {mobileHeader}
          </div>
          {mobileContent}
        </aside>
      </div>
    </>
  );
}
