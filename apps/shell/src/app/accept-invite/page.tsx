"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type InvitePreview = { fullName: string | null; email: string | null };

class InviteApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "InviteApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {visible
        ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 002.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.3 9.5 7-.4 1.1-1.3 2.4-2.5 3.5" /><path d="M6.2 6.2C4.4 7.4 3.1 9.3 2.5 12c.9 2.6 4.4 7 9.5 7 1 0 2-.2 2.9-.5" /></>
        : <><path d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></>}
    </svg>
  );
}

function parseInvitePreview(value: unknown): InvitePreview {
  const candidate = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(candidate)) throw new InviteApiError(502, "Invitation preview returned an unsupported response.");
  const fullName = typeof candidate.fullName === "string" && candidate.fullName.trim() ? candidate.fullName.trim() : null;
  const email = typeof candidate.email === "string" && candidate.email.trim() ? candidate.email.trim() : null;
  return { fullName, email };
}

async function previewInvite(token: string): Promise<InvitePreview> {
  let response: Response;
  try {
    response = await fetch(`/api/platform-super-admin/invite/preview?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  } catch {
    throw new InviteApiError(0, "Unable to connect to the invitation service. Check your connection and try again.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : "Unable to validate this invitation.";
    throw new InviteApiError(response.status, detail);
  }
  return parseInvitePreview(body);
}

async function acceptInvite(payload: { token: string; email: string; password: string }): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/platform-super-admin/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    throw new InviteApiError(0, "Unable to connect to the invitation service. Check your connection and try again.");
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : "Unable to accept this invitation.";
    throw new InviteApiError(response.status, detail);
  }
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const previewQuery = useQuery({ queryKey: ["super-admin", "invite-preview", token], queryFn: () => previewInvite(token), enabled: Boolean(token), retry: false, staleTime: 0 });
  const acceptMutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => setAccepted(true),
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!accepted) return;
    const timer = window.setTimeout(() => window.location.replace("/auth/login"), 1500);
    return () => window.clearTimeout(timer);
  }, [accepted]);

  const preview = previewQuery.data;
  const resolvedEmail = preview?.email ?? email.trim();
  const passwordTooLong = password.length > 500 || confirmPassword.length > 500;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = Boolean(token && resolvedEmail && password && confirmPassword && passwordsMatch && !passwordTooLong && !acceptMutation.isPending && !previewQuery.isLoading && !previewQuery.isError);
  const passwordError = passwordTooLong
    ? "Password must be 500 characters or fewer."
    : confirmPassword && !passwordsMatch
      ? "Passwords do not match."
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] p-6 text-[#06201c]">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#7f9d94]">Invigorate Health</p>
        <h1 className="mt-2 text-2xl font-bold">Set your Super Admin password</h1>
        {!token ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">A valid invitation link is required.</p> : null}
        {token && previewQuery.isLoading ? <p role="status" className="mt-4 text-[#52736a]">Validating invitation...</p> : null}
        {token && previewQuery.isError ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">{previewQuery.error instanceof Error ? previewQuery.error.message : "Unable to validate this invitation."}</p> : null}
        {accepted ? <p role="status" className="mt-4 rounded-xl bg-[#e8f6ee] p-4 text-sm font-semibold text-[#176044]">Invitation accepted. Redirecting to sign in...</p> : null}
        {preview && !accepted ? (
          <>
            <p className="mt-3 text-sm text-[#52736a]">{preview.fullName ? `Welcome, ${preview.fullName}.` : "Complete your invitation to continue."}</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) acceptMutation.mutate({ token, email: resolvedEmail, password });
              }}
              className="mt-6 space-y-4"
            >
              {preview.email
                ? <p className="rounded-xl bg-[#f7fbf9] p-3 text-sm"><span className="font-semibold">Email: </span>{preview.email}</p>
                : <label className="block text-sm font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); acceptMutation.reset(); }} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label>}
              <label className="block text-sm font-semibold">
                New password
                <span className="relative mt-1.5 block">
                  <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); acceptMutation.reset(); }} className="h-10 w-full rounded-xl border border-[#d7e5df] px-3 pr-12 font-normal" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-[#52736a] transition hover:text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]">
                    <PasswordVisibilityIcon visible={showPassword} />
                  </button>
                </span>
              </label>
              <label className="block text-sm font-semibold">
                Confirm new password
                <span className="relative mt-1.5 block">
                  <input required type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); acceptMutation.reset(); }} className="h-10 w-full rounded-xl border border-[#d7e5df] px-3 pr-12 font-normal" />
                  <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword} className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-[#52736a] transition hover:text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]">
                    <PasswordVisibilityIcon visible={showConfirmPassword} />
                  </button>
                </span>
              </label>
              {passwordError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{passwordError}</p> : null}
              {acceptMutation.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{acceptMutation.error instanceof Error ? acceptMutation.error.message : "Unable to accept this invitation."}</p> : null}
              <button type="submit" disabled={!canSubmit} className="h-10 w-full rounded-full bg-[#1f6a58] text-sm font-bold text-white transition hover:bg-[#185746] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#226b58]/20 disabled:cursor-not-allowed disabled:opacity-50">
                {acceptMutation.isPending ? "Accepting invitation..." : "Accept invitation"}
              </button>
            </form>
          </>
        ) : null}
      </section>
    </main>
  );
}

/** Hosts the invitation acceptance query and mutation in an isolated Shell server-state client. */
export default function AcceptInvitePage() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={queryClient}><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] text-sm font-semibold text-[#52736a]">Preparing invitation...</main>}><AcceptInviteContent /></Suspense></QueryClientProvider>;
}
