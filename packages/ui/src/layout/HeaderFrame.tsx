import type { HeaderFrameProps } from "./ui-layout.types";

export default function HeaderFrame({ headerRef, left, right }: HeaderFrameProps) {
  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e3eee9] bg-white/95 px-6 backdrop-blur transition-colors lg:px-8"
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  );
}
