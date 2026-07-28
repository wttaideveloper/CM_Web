export function OnboardingFormViewLoadingState() {
  return <div className="space-y-4"><div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="h-4 w-48 animate-pulse rounded-full bg-[#eef4ef]" /><div className="mt-3 h-3 w-72 animate-pulse rounded-full bg-[#eef4ef]" /></div><div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="h-5 w-56 animate-pulse rounded-full bg-[#eef4ef]" /><div className="mt-5 space-y-3"><div className="h-16 animate-pulse rounded-2xl bg-[#f3f7f5]" /><div className="h-16 animate-pulse rounded-2xl bg-[#f3f7f5]" /><div className="h-16 animate-pulse rounded-2xl bg-[#f3f7f5]" /></div></div></div>;
}

export function OnboardingFormViewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-2xl border border-[#f3d0cb] bg-[#fff6f5] p-5 shadow-sm"><p className="text-base font-bold text-[#b42318]">Unable to load onboarding form.</p><p className="mt-2 text-sm text-[#7a271a]">{message}</p><button type="button" onClick={onRetry} className="mt-4 h-11 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]">Retry</button></div>;
}
