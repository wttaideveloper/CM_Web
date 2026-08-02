import PlatformAdminShell from "@/components/PlatformAdminShell";

export default function PlatformAdminScaffoldPage() {
  return (
    <PlatformAdminShell>
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-[#d8e7e1] bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">Phase B2 scaffold</p>
        <h1 className="mt-2 text-3xl font-bold">Platform Admin</h1>
        <p className="mt-3 text-sm leading-6 text-[#52736a]">
          The shared Platform layout is now available. Route migration has not started.
        </p>
        <p className="mt-5 rounded-xl bg-[#f1f7f4] px-4 py-3 text-sm text-[#355a51]">
          Platform navigation currently opens the existing Shell-owned routes. No Platform business route is local to this app yet.
        </p>
      </section>
    </PlatformAdminShell>
  );
}
