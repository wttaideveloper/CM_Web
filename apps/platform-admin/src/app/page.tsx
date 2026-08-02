export default function PlatformAdminScaffoldPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] px-6 text-[#06201c]">
      <section className="w-full max-w-xl rounded-2xl border border-[#d8e7e1] bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">Phase B1 scaffold</p>
        <h1 className="mt-2 text-3xl font-bold">Platform Admin</h1>
        <p className="mt-3 text-sm leading-6 text-[#52736a]">
          This independently runnable app is a build proof. Route migration has not started.
        </p>
        <p className="mt-5 rounded-xl bg-[#f1f7f4] px-4 py-3 text-sm text-[#355a51]">
          Shell remains on port 3000 and Enterprise Admin remains on port 3001.
        </p>
      </section>
    </main>
  );
}
