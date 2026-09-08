"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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

function parseInvitePreview(value: unknown): InvitePreview {
  const candidate = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(candidate)) throw new InviteApiError(502, "Invitation preview returned an unsupported response.");
  const fullName = typeof candidate.fullName === "string" && candidate.fullName.trim() ? candidate.fullName.trim() : null;
  const email = typeof candidate.email === "string" && candidate.email.trim() ? candidate.email.trim() : null;
  return { fullName, email };
}

async function previewInvite(token: string): Promise<InvitePreview> {
  const response = await fetch(`/api/platform-super-admin/invite/preview?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : "Unable to validate this invitation.";
    throw new InviteApiError(response.status, detail);
  }
  return parseInvitePreview(body);
}

async function acceptInvite(payload: { token: string; email: string; password: string }): Promise<void> {
  const response = await fetch("/api/platform-super-admin/invite/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
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
    onSuccess: () => window.location.assign("/auth/login"),
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const preview = previewQuery.data;
  const resolvedEmail = preview?.email ?? email.trim();
  const canSubmit = Boolean(token && resolvedEmail && password && !acceptMutation.isPending && !previewQuery.isLoading && !previewQuery.isError);

  return <main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] p-6 text-[#06201c]"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#7f9d94]">Invigorate Health</p><h1 className="mt-2 text-2xl font-bold">Set your Super Admin password</h1>{!token ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">A valid invitation link is required.</p> : null}{token && previewQuery.isLoading ? <p role="status" className="mt-4 text-[#52736a]">Validating invitation...</p> : null}{token && previewQuery.isError ? <p role="alert" className="mt-4 font-semibold text-[#b42318]">{previewQuery.error instanceof Error ? previewQuery.error.message : "Unable to validate this invitation."}</p> : null}{preview ? <><p className="mt-3 text-sm text-[#52736a]">{preview.fullName ? `Welcome, ${preview.fullName}.` : "Complete your invitation to continue."}</p><form onSubmit={(event) => { event.preventDefault(); if (canSubmit) acceptMutation.mutate({ token, email: resolvedEmail, password }); }} className="mt-6 space-y-4">{preview.email ? <p className="rounded-xl bg-[#f7fbf9] p-3 text-sm"><span className="font-semibold">Email: </span>{preview.email}</p> : <label className="block text-sm font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label>}<label className="block text-sm font-semibold">New password<input required type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label>{acceptMutation.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{acceptMutation.error instanceof Error ? acceptMutation.error.message : "Unable to accept this invitation."}</p> : null}<button type="submit" disabled={!canSubmit} className="h-10 w-full rounded-full bg-[#1f6a58] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{acceptMutation.isPending ? "Accepting invitation..." : "Accept invitation"}</button></form></> : null}</section></main>;
}

/** Hosts the invitation acceptance query and mutation in an isolated Shell server-state client. */
export default function AcceptInvitePage() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={queryClient}><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] text-sm font-semibold text-[#52736a]">Preparing invitation...</main>}><AcceptInviteContent /></Suspense></QueryClientProvider>;
}
