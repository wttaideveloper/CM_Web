"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { getPasswordRequirementRules, getPasswordRequirements, getShellAppOrigin } from "@ihp/auth";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type InvitePreview = {
  email: string;
  fullName: string;
  tenantName: string;
  tenantSlug: string;
  membershipStatus: string;
  expiresInSeconds: number | null;
};

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

function readString(value: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
  }
  return "";
}

function errorMessage(body: unknown, status: number, fallback: string): string {
  const code = isRecord(body) ? readString(body, "code", "error_code") : "";
  if (code === "invite_link_expired") return "This invitation link has expired.";
  const detail = isRecord(body) ? body.detail : undefined;
  const detailItems = Array.isArray(detail) ? detail.filter(isRecord) : [];
  const detailMessage = typeof detail === "string"
    ? detail
    : Array.isArray(detail)
      ? detailItems.map((item) => typeof item.msg === "string" ? item.msg : null).filter((item): item is string => Boolean(item)).join(", ")
      : "";
  const message = detailMessage || (isRecord(body) ? readString(body, "message", "error_description") : "");
  const passwordFieldError = detailItems.some((item) =>
    Array.isArray(item.loc) && item.loc.some((part) => typeof part === "string" && /password|credential/i.test(part)),
  );
  if (/password|passphrase|credential|password.policy|unable to accept (the )?invitation/i.test(`${code} ${message}`)
    || passwordFieldError
    || status === 422) {
    return `${message || "Your password does not meet the required criteria."} Follow the password requirements listed above and try again.`;
  }
  if ((status === 400 || status === 422) && !message) {
    return "Unable to accept the invitation. Check the password requirements above and make sure the invitation is still valid.";
  }
  return message || fallback;
}

function parsePreview(value: unknown): InvitePreview {
  const envelope = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(envelope) || envelope.valid === false) throw new InviteApiError(400, "This invitation link is invalid or expired.");
  return {
    email: readString(envelope, "email"),
    fullName: readString(envelope, "full_name", "fullName"),
    tenantName: readString(envelope, "tenant_name", "tenantName"),
    tenantSlug: readString(envelope, "tenant_slug", "tenantSlug"),
    membershipStatus: readString(envelope, "membership_status", "membershipStatus"),
    expiresInSeconds: typeof envelope.expiresInSeconds === "number" ? envelope.expiresInSeconds : null,
  };
}

async function previewInvite(token: string): Promise<InvitePreview> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/auth/invite/preview?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  } catch {
    throw new InviteApiError(0, "Unable to connect to the invitation service. Check your connection and try again.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new InviteApiError(response.status, errorMessage(body, response.status, "Unable to validate this invitation."));
  return parsePreview(body);
}

async function acceptInvite(payload: { token: string; password: string }): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/v1/auth/accept-invite", {
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
    throw new InviteApiError(response.status, errorMessage(body, response.status, "Unable to accept this invitation."));
  }
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const previewQuery = useQuery({ queryKey: ["enterprise", "invite-preview", token], queryFn: () => previewInvite(token), enabled: Boolean(token), retry: false, staleTime: 0 });
  const passwordRequirementsQuery = useQuery({ queryKey: ["auth", "password-requirements"], queryFn: getPasswordRequirements, enabled: Boolean(token), retry: false, staleTime: 5 * 60 * 1000 });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const acceptMutation = useMutation({ mutationFn: acceptInvite, onSuccess: () => setAccepted(true) });
  const preview = previewQuery.data;
  const passwordRules = getPasswordRequirementRules(passwordRequirementsQuery.data ?? null);
  const unmetPasswordRules = passwordRules?.filter((rule) => !rule.test(password)) ?? [];
  const passwordTooLong = password.length > 500 || confirmPassword.length > 500;
  const passwordError = passwordTooLong
    ? "Password must be 500 characters or fewer."
    : password && confirmPassword && password !== confirmPassword ? "Passwords do not match." : null;
  const canSubmit = Boolean(token && preview && passwordRules?.length && !unmetPasswordRules.length && !passwordTooLong && password === confirmPassword && !acceptMutation.isPending);

  useEffect(() => {
    if (!accepted) return;
    const timer = window.setTimeout(() => {
      const shellOrigin = getShellAppOrigin();
      window.location.assign(shellOrigin ? new URL("/auth/login", shellOrigin).toString() : "/auth/login");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [accepted]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] p-6 text-[#06201c]">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#7f9d94]">Invigorate Health</p>
        <h1 className="mt-2 text-2xl font-bold">Accept your organization invitation</h1>
        {!token ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">A valid invitation link is required.</p> : null}
        {token && previewQuery.isLoading ? <p role="status" className="mt-4 text-[#52736a]">Validating invitation...</p> : null}
        {token && previewQuery.isError ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">{previewQuery.error instanceof Error ? previewQuery.error.message : "Unable to validate this invitation."}</p> : null}
        {accepted ? <div className="mt-5 rounded-xl bg-[#e8f6ee] p-4 text-sm font-semibold text-[#176044]" role="status">Invitation accepted. Redirecting to Enterprise login...</div> : null}
        {preview && !accepted ? (
          <>
            <div className="mt-5 space-y-2 rounded-xl bg-[#f7fbf9] p-4 text-sm">
              <p><span className="font-semibold">Name:</span> {preview.fullName || "Invited user"}</p>
              <p><span className="font-semibold">Email:</span> {preview.email}</p>
              <p><span className="font-semibold">Organization:</span> {preview.tenantName || preview.tenantSlug || "Your organization"}</p>
            </div>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) acceptMutation.mutate({ token, password });
              }}
            >
              <label className="block text-sm font-semibold">
                New password
                <span className="relative mt-1.5 block">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      acceptMutation.reset();
                    }}
                    className="h-10 w-full rounded-xl border border-[#d7e5df] px-3 pr-12 font-normal"
                  />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-[#52736a] transition hover:text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]">
                    <PasswordVisibilityIcon visible={showPassword} />
                  </button>
                </span>
              </label>
              <label className="block text-sm font-semibold">
                Confirm password
                <span className="relative mt-1.5 block">
                  <input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      acceptMutation.reset();
                    }}
                    className="h-10 w-full rounded-xl border border-[#d7e5df] px-3 pr-12 font-normal"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword} className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-[#52736a] transition hover:text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]">
                    <PasswordVisibilityIcon visible={showConfirmPassword} />
                  </button>
                </span>
              </label>
              {passwordRequirementsQuery.isLoading ? <p role="status" className="text-sm text-[#52736a]">Loading password requirements...</p> : null}
              {passwordRequirementsQuery.isError || (!passwordRequirementsQuery.isLoading && !passwordRules) ? (
                <div role="alert" className="text-sm text-[#b42318]">
                  <p>Password requirements are unavailable. Load them before accepting the invitation.</p>
                  <button type="button" onClick={() => void passwordRequirementsQuery.refetch()} className="mt-1 font-semibold underline">Try again</button>
                </div>
              ) : null}
              {passwordRules ? (
                <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#52736a]">Password requirements</p>
                  <ul className="mt-2 space-y-1.5">
                    {passwordRules.map((rule) => {
                      const passes = rule.test(password);
                      return <li key={rule.key} className={`text-xs font-medium ${passes ? "text-[#1f6a58]" : "text-[#667085]"}`}>{passes ? "Met" : "Required"}: {rule.label}</li>;
                    })}
                  </ul>
                </div>
              ) : null}
              {passwordError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{passwordError}</p> : null}
              {acceptMutation.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{acceptMutation.error instanceof Error ? acceptMutation.error.message : "Unable to accept this invitation."}</p> : null}
              <button type="submit" disabled={!canSubmit} className="h-10 w-full rounded-full bg-[#1f6a58] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {acceptMutation.isPending ? "Accepting invitation..." : "Accept invitation"}
              </button>
            </form>
          </>
        ) : null}
      </section>
    </main>
  );
}

/** Hosts the Enterprise tenant-member invitation preview and acceptance flow. */
export default function AcceptInvitePage() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={queryClient}><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] text-sm font-semibold text-[#52736a]">Preparing invitation...</main>}><AcceptInviteContent /></Suspense></QueryClientProvider>;
}
