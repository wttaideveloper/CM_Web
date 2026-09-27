"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@ihp/auth";
import { useRegistration } from "@/contexts/RegistrationContext";
import { getMyTenantApplication, RegistrationApiError } from "@/services/registration-ui.service";
import ApplicationStatusStep from "@/components/auth/register/ApplicationStatusStep";

export default function ApplicationStatusPage() {
  const { authenticated, isLoading, userId } = useAuth();
  const { updateRegistration } = useRegistration();
  const [loading, setLoading] = useState(true);
  const [applicationFound, setApplicationFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || authenticated) return;
    window.location.replace(`/auth/login?return_to=${encodeURIComponent("/auth/application-status")}`);
  }, [authenticated, isLoading]);

  useEffect(() => {
    if (!authenticated) return;
    void getMyTenantApplication().then((application) => { updateRegistration({ userId: userId ?? "", tenantApplication: application }); setApplicationFound(true); }).catch((reason) => {
      const missing = reason instanceof RegistrationApiError && (reason.status === 404 || reason.message.toLowerCase().includes("does not exist"));
      setError(missing ? "No tenant application was found for this account." : reason instanceof Error ? reason.message : "Unable to load application status.");
    }).finally(() => setLoading(false));
  }, [authenticated, updateRegistration, userId]);

  if (isLoading || (!authenticated && !error)) return <main className="flex min-h-screen items-center justify-center text-sm text-[#52736a]">Preparing application status…</main>;
  if (!authenticated) return null;
  if (loading) return <main className="flex min-h-screen items-center justify-center text-sm text-[#52736a]">Loading application status…</main>;
  if (!applicationFound) return <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-2xl font-bold text-[#06201c]">Application status</h1><p className="text-sm text-[#52736a]">{error}</p><div className="flex gap-3"><Link href="/auth/register" className="rounded-[14px] bg-[#1f6a58] px-4 py-3 text-sm font-bold text-white">Start application</Link><Link href="/auth/login" className="rounded-[14px] border border-[#d8e4df] px-4 py-3 text-sm font-bold">Return to sign in</Link></div></main>;
  return <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6"><ApplicationStatusStep onBackToDocuments={() => window.location.assign("/auth/register")} /></main>;
}
