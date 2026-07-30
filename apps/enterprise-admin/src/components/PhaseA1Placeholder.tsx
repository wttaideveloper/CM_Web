import Link from "next/link";

type PhaseA1PlaceholderProps = {
  title: string;
  description: string;
};

export default function PhaseA1Placeholder({ title, description }: PhaseA1PlaceholderProps) {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-[#e1ebe6] bg-white p-8 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">Phase 7F-A2.1</p>
      <h1 className="mt-2 text-2xl font-bold text-[#06201c]">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-[#52736a]">{description}</p>
      <p className="mt-3 text-sm leading-6 text-[#52736a]">
        Dashboard and settings extraction are intentionally deferred to Phase 7F-A2.2.
      </p>
      <Link
        href="/admin/enterprise"
        className="mt-6 inline-flex rounded-full bg-[#1f6a58] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#195646]"
      >
        View enterprise route wrapper
      </Link>
    </section>
  );
}
