"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { EnterprisesListScreen } from "@ihp/enterprises";

import TenantsListScreen from "./TenantsListScreen";
import {
  activatePlatformEnterprise,
  deactivatePlatformEnterprise,
  getPlatformEnterprises,
  PlatformEnterprisesApiError,
} from "./platform-enterprises.service";

function platformEnterpriseLoadErrorMessage(error: unknown): string {
  if (error instanceof PlatformEnterprisesApiError && error.status === 401) return "Super Admin authentication is required.";
  if (error instanceof PlatformEnterprisesApiError && error.status === 403) return "You do not have permission to access enterprises.";
  return "Unable to load enterprises.";
}

/** Hosts the existing enterprise management UI and isolated dedicated tenant query state. */
export default function PlatformEnterprisesManagementScreen() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  const [tab, setTab] = useState<"enterprises" | "tenants">("enterprises");

  return <QueryClientProvider client={client}><div className="space-y-5"><nav aria-label="Enterprise management sections" className="inline-flex rounded-full border border-[#d7e5df] bg-white p-1 shadow-sm"><button type="button" aria-pressed={tab === "enterprises"} onClick={() => setTab("enterprises")} className={tab === "enterprises" ? "rounded-full bg-[#e8f6ee] px-4 py-2 text-sm font-bold text-[#1f6a58]" : "rounded-full px-4 py-2 text-sm font-semibold text-[#52736a]"}>Enterprises</button><button type="button" aria-pressed={tab === "tenants"} onClick={() => setTab("tenants")} className={tab === "tenants" ? "rounded-full bg-[#e8f6ee] px-4 py-2 text-sm font-bold text-[#1f6a58]" : "rounded-full px-4 py-2 text-sm font-semibold text-[#52736a]"}>Tenants</button></nav>{tab === "enterprises" ? <EnterprisesListScreen enterprisesLoader={getPlatformEnterprises} errorMessageForLoadFailure={platformEnterpriseLoadErrorMessage} activateEnterpriseAction={activatePlatformEnterprise} deactivateEnterpriseAction={deactivatePlatformEnterprise} /> : <TenantsListScreen />}</div></QueryClientProvider>;
}
