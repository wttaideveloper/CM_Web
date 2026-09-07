"use client";

/** Provides a scoped recovery path when a Form Configurations route cannot render. */
export default function FormConfigurationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="rounded-2xl border border-[#f0c8c4] bg-[#fff8f7] p-6"><p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load Form Configurations. Please try again.</p><button type="button" onClick={reset} className="mt-3 text-sm font-bold text-[#1f6a58]">Retry</button></section>;
}
