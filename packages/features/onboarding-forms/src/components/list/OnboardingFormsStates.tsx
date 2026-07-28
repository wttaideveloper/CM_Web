import Link from "next/link";

export function OnboardingFormsEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-6 py-14 text-center">
      <p className="text-base font-bold text-[#06201c]">No onboarding forms found.</p>
      <p className="mt-2 text-sm text-[#52736a]">Create a new template to get started.</p>
      <Link
        href="/onboarding-forms/create"
        className="mt-5 inline-flex h-11 items-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
      >
        Create Form
      </Link>
    </div>
  );
}

export function OnboardingFormsLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-16 animate-pulse rounded-xl bg-[#f3f7f5]" />
            <div className="h-16 animate-pulse rounded-xl bg-[#f3f7f5]" />
          </div>
        </div>
      ))}
    </div>
  );
}
