"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { getShellAppOrigin } from "@ihp/auth";
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

function readString(value: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
  }
  return "";
}

function errorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body)) return fallback;
  const code = readString(body, "code", "error_code");
  if (code === "invite_link_expired") return "This invitation link has expired.";
  return readString(body, "detail", "message") || fallback;
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
  const response = await fetch(`/api/v1/auth/invite/preview?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new InviteApiError(response.status, errorMessage(body, "Unable to validate this invitation."));
  return parsePreview(body);
}

async function acceptInvite(payload: { token: string; password: string }): Promise<void> {
  const response = await fetch("/api/v1/auth/accept-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new InviteApiError(response.status, errorMessage(body, "Unable to accept this invitation."));
  }
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const previewQuery = useQuery({ queryKey: ["enterprise", "invite-preview", token], queryFn: () => previewInvite(token), enabled: Boolean(token), retry: false, staleTime: 0 });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const acceptMutation = useMutation({ mutationFn: acceptInvite, onSuccess: () => setAccepted(true) });
  const preview = previewQuery.data;
  const passwordError = password.length > 0 && password.length < 8 ? "Password must be at least 8 characters." : password && confirmPassword && password !== confirmPassword ? "Passwords do not match." : null;
  const canSubmit = Boolean(token && preview && password.length >= 8 && password === confirmPassword && !acceptMutation.isPending);

  useEffect(() => {
    if (!accepted) return;
    const timer = window.setTimeout(() => {
      const shellOrigin = getShellAppOrigin();
      window.location.assign(shellOrigin ? new URL("/auth/login", shellOrigin).toString() : "/auth/login");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [accepted]);

  return <main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] p-6 text-[#06201c]"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#7f9d94]">Invigorate Health</p><h1 className="mt-2 text-2xl font-bold">Accept your organization invitation</h1>{!token ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">A valid invitation link is required.</p> : null}{token && previewQuery.isLoading ? <p role="status" className="mt-4 text-[#52736a]">Validating invitation...</p> : null}{token && previewQuery.isError ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">{previewQuery.error instanceof Error ? previewQuery.error.message : "Unable to validate this invitation."}</p> : null}{accepted ? <div className="mt-5 rounded-xl bg-[#e8f6ee] p-4 text-sm font-semibold text-[#176044]" role="status">Invitation accepted. Redirecting to Enterprise login...</div> : null}{preview && !accepted ? <><div className="mt-5 space-y-2 rounded-xl bg-[#f7fbf9] p-4 text-sm"><p><span className="font-semibold">Name:</span> {preview.fullName || "Invited user"}</p><p><span className="font-semibold">Email:</span> {preview.email}</p><p><span className="font-semibold">Organization:</span> {preview.tenantName || preview.tenantSlug || "Your organization"}</p></div><form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSubmit) acceptMutation.mutate({ token, password }); }}><label className="block text-sm font-semibold">New password<input required type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="block text-sm font-semibold">Confirm password<input required type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label>{passwordError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{passwordError}</p> : null}{acceptMutation.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{acceptMutation.error instanceof Error ? acceptMutation.error.message : "Unable to accept this invitation."}</p> : null}<button type="submit" disabled={!canSubmit} className="h-10 w-full rounded-full bg-[#1f6a58] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{acceptMutation.isPending ? "Accepting invitation..." : "Accept invitation"}</button></form></> : null}</section></main>;
}

/** Hosts the Enterprise tenant-member invitation preview and acceptance flow. */
export default function AcceptInvitePage() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={queryClient}><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] text-sm font-semibold text-[#52736a]">Preparing invitation...</main>}><AcceptInviteContent /></Suspense></QueryClientProvider>;
}
