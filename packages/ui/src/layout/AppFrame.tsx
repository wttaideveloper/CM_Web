import type { AppFrameProps } from "./ui-layout.types";

export default function AppFrame({ sidebar, header, children }: AppFrameProps) {
  return (
    <main className="min-h-screen bg-white text-[#06201c] transition-colors">
      {sidebar}
      {header}
      <section className="px-5 py-5 lg:ml-[240px] lg:px-6 lg:py-6">
        {children}
      </section>
    </main>
  );
}
