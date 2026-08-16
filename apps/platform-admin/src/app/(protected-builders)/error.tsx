"use client";

type ProtectedBuildersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Handles route-level failures for the isolated Platform builder workspace. */
export default function ProtectedBuildersError({
  error,
  reset,
}: ProtectedBuildersErrorProps) {
  void error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-8">
      <section
        role="alert"
        className="w-full max-w-md rounded-2xl border border-[#f3c8c2] bg-[#fff5f4] p-6 text-center"
      >
        <h1 className="text-lg font-bold text-[#06201c]">Builder unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-[#8b3d1f]">
          The builder could not be loaded. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-[#1f6a58]/20"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
