/** Provides a stable loading shell while a protected Platform builder route resolves. */
export default function ProtectedBuildersLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-screen bg-white px-6 py-8"
    >
      <span className="sr-only">Loading builder workspace...</span>
      <div aria-hidden="true" className="mx-auto w-full max-w-[1500px] space-y-5">
        <header className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-[#e1ebe6]" />
          <div className="h-8 w-56 rounded-xl bg-[#edf3f0]" />
          <div className="h-4 w-full max-w-xl rounded-full bg-[#edf3f0]" />
        </header>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5">
            <div className="h-5 w-28 rounded-full bg-[#edf3f0]" />
            <div className="mt-5 h-9 w-full rounded-lg bg-[#f4f8f6]" />
            <div className="mt-4 space-y-3">
              <div className="h-16 rounded-xl bg-[#f4f8f6]" />
              <div className="h-16 rounded-xl bg-[#f4f8f6]" />
              <div className="h-16 rounded-xl bg-[#f4f8f6]" />
            </div>
          </section>

          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5">
            <div className="h-6 w-40 rounded-full bg-[#edf3f0]" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="h-10 rounded-xl bg-[#f4f8f6]" />
              <div className="h-10 rounded-xl bg-[#f4f8f6]" />
            </div>
            <div className="mt-5 h-56 rounded-2xl bg-[#f4f8f6]" />
          </section>

          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5">
            <div className="h-5 w-28 rounded-full bg-[#edf3f0]" />
            <div className="mt-5 space-y-3">
              <div className="h-20 rounded-xl bg-[#f4f8f6]" />
              <div className="h-20 rounded-xl bg-[#f4f8f6]" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
