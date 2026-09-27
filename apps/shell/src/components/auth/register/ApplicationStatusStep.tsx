"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRegistration } from "@/contexts/RegistrationContext";
import { getMyTenantApplication, RegistrationApiError } from "@/services/registration-ui.service";

export default function ApplicationStatusStep({ onBackToDocuments }: { onBackToDocuments: () => void }) {
  const { userId, tenantApplication, clearRegistrationState, updateRegistration } = useRegistration();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshStatus = useCallback(async () => {
    if (!userId) return;
    setIsRefreshing(true); setRefreshError(null);
    try { updateRegistration({ tenantApplication: await getMyTenantApplication(userId || undefined) }); }
    catch (error) { setRefreshError(error instanceof RegistrationApiError || error instanceof Error ? error.message : "Unable to refresh application status."); }
    finally { setIsRefreshing(false); }
  }, [updateRegistration, userId]);
  // Status is server state and must be synchronized when this step becomes active.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refreshStatus(); }, [refreshStatus]);
  const status = tenantApplication?.status;
  const approved = status === "approved";
  const rejected = status === "rejected";
  const documentsPending = status === "documents_pending";
  const title = approved ? "Application approved" : rejected ? "Application requires changes" : documentsPending ? "Complete your application" : "Application under review";
  const message = approved ? "Your organization has been approved." : rejected ? tenantApplication?.reviewNotes || "Please review the feedback and make the requested changes." : documentsPending ? "Your application setup is incomplete." : "A Platform Super Admin will review your application.";
  return <div className="space-y-5 text-center"><h2 className="text-2xl font-bold text-[#06201c]">{title}</h2><p className="text-sm leading-6 text-[#52736a]">{message}</p>{approved && tenantApplication ? <div className="rounded-2xl border border-[#d8e4df] bg-[#f7fbf9] p-4 text-left text-sm"><p><b>Organization:</b> {tenantApplication.tenantName}</p>{tenantApplication.tenantId ? <p className="mt-1"><b>Tenant ID:</b> {tenantApplication.tenantId}</p> : null}</div> : null}{refreshError ? <p role="alert" className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#b42318]">{refreshError}</p> : null}<div className="flex flex-wrap justify-center gap-3">{documentsPending ? <button type="button" onClick={onBackToDocuments} className="h-11 rounded-[14px] border border-[#d8e4df] px-4 text-sm font-bold text-[#06201c]">Back to Documents</button> : null}<button type="button" onClick={() => void refreshStatus()} disabled={isRefreshing || !userId} className="h-11 rounded-[14px] border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:opacity-60">{isRefreshing ? "Refreshing…" : "Refresh status"}</button>{approved ? <Link href="/auth/login" className="inline-flex h-11 items-center rounded-[14px] bg-[#1f6a58] px-5 text-sm font-bold text-white">Continue to sign in</Link> : <button type="button" onClick={clearRegistrationState} className="h-11 rounded-[14px] bg-[#1f6a58] px-5 text-sm font-bold text-white">Return to start</button>}</div></div>;
}
