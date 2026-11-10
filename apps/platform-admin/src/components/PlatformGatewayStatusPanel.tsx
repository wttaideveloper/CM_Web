"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CommerceApiError, getGatewayStatus } from "@ihp/commerce";

import { platformCommerceRequest } from "../lib/platform-commerce-client";
import { mapGatewayStatus, type GatewayProviderView } from "./platform-gateway-status";

function ProviderCard({ provider, onOpen }: { provider: GatewayProviderView; onOpen: (id: string) => void }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <button type="button" onClick={() => onOpen(provider.id)} className="-m-2 rounded-xl p-2 text-left outline-none transition hover:bg-[#f4faf7] focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2" aria-label={`View ${provider.name} gateway details`}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-lg font-bold text-[#06201c]">{provider.name}</p><p className="mt-1 text-sm text-[#52736a]">Backend-reported provider</p></div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-lg font-bold text-[#1f6a58]" aria-hidden="true">{provider.name.charAt(0)}</span>
        </div>
      </button>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs font-semibold text-[#7f9d94]">Status</dt><dd className="mt-1 font-semibold text-[#06201c]">{provider.active}</dd></div><div><dt className="text-xs font-semibold text-[#7f9d94]">Configuration</dt><dd className="mt-1 font-semibold text-[#06201c]">{provider.configured}</dd></div><div><dt className="text-xs font-semibold text-[#7f9d94]">Mode</dt><dd className="mt-1 font-semibold text-[#06201c]">{provider.mode}</dd></div></dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-5"><button type="button" onClick={() => onOpen(provider.id)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-bold text-[#1f6a58]">View details</button><button type="button" disabled aria-describedby={`${provider.id}-server-managed`} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Configure</button></div>
      <p id={`${provider.id}-server-managed`} className="mt-3 text-xs leading-5 text-[#7f9d94]">Configuration, testing and activation are server-managed and unavailable in this client.</p>
    </article>
  );
}

function ProviderDetails({ provider, onClose }: { provider: GatewayProviderView; onClose: () => void }) {
  return (
    <section className="rounded-2xl border border-[#b9d8ce] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="gateway-status-details-title">
      <div className="flex flex-col gap-3 border-b border-[#edf3f0] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7f9d94]">Gateway details</p><h2 id="gateway-status-details-title" className="mt-1 text-xl font-bold text-[#06201c]">{provider.name}</h2></div><button type="button" onClick={onClose} className="self-start rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">Close details</button></div>
      <dl className="mt-5 grid gap-4 md:grid-cols-2"><div><dt className="text-sm font-semibold text-[#31594d]">Configuration</dt><dd className="mt-1 text-sm text-[#06201c]">{provider.configured}</dd></div><div><dt className="text-sm font-semibold text-[#31594d]">Environment</dt><dd className="mt-1 text-sm text-[#06201c]">{provider.mode}</dd></div><div><dt className="text-sm font-semibold text-[#31594d]">Active state</dt><dd className="mt-1 text-sm text-[#06201c]">{provider.active}</dd></div><div><dt className="text-sm font-semibold text-[#31594d]">Webhook secret</dt><dd className="mt-1 text-sm text-[#06201c]">{provider.webhookSecret}</dd></div><div><dt className="text-sm font-semibold text-[#31594d]">Webhook URL</dt><dd className="mt-1 break-all text-sm text-[#06201c]">{provider.webhookUrl}</dd></div><div><dt className="text-sm font-semibold text-[#31594d]">Required webhook events</dt><dd className="mt-1 text-sm text-[#06201c]">{provider.webhookEvents.length ? provider.webhookEvents.join(", ") : "Not supplied"}</dd></div></dl>
      <p className="mt-5 rounded-xl bg-[#f9fcfa] p-3 text-sm leading-6 text-[#52736a]">Credentials are never rendered. Gateway configuration and connection operations remain server-managed.</p>
    </section>
  );
}

function GatewayStatusError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof CommerceApiError ? `${error.status} - ${error.message}` : "Gateway status is temporarily unavailable.";
  return <section className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] p-6 shadow-sm" role="alert"><p className="font-semibold text-[#b42318]">Unable to load gateway status</p><p className="mt-1 text-sm text-[#7f2f28]">{message}</p><button type="button" onClick={onRetry} className="mt-4 rounded-full border border-[#dba8a2] px-4 py-2 text-sm font-semibold text-[#9c2f24]">Retry</button></section>;
}

export default function PlatformGatewayStatusPanel() {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const gatewayQuery = useQuery({ queryKey: ["platform-commerce", "gateway-status"], queryFn: () => getGatewayStatus(platformCommerceRequest), retry: false, staleTime: 30_000 });

  if (gatewayQuery.isPending) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm" aria-live="polite"><p className="font-semibold text-[#52736a]">Loading gateway status...</p></section>;
  if (gatewayQuery.error) return <GatewayStatusError error={gatewayQuery.error} onRetry={() => void gatewayQuery.refetch()} />;
  if (!gatewayQuery.data) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm" role="status"><p className="font-semibold text-[#52736a]">Gateway status is unavailable.</p></section>;

  const status = mapGatewayStatus(gatewayQuery.data);
  const selectedProvider = status.providers.find((provider) => provider.id === selectedProviderId);
  return <div className="space-y-5" aria-labelledby="payment-gateway-management-title">
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="payment-gateway-management-title" className="text-lg font-bold text-[#06201c]">Payment Gateway Status</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#52736a]">This view reflects the authenticated backend gateway-status response. Configuration changes remain server-managed.</p></div><span className="shrink-0 rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-bold text-[#31594d]">{status.editability}</span></div><p className="mt-3 text-sm text-[#52736a]">{status.editNote}</p></section>
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Active gateway summary"><div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-[#7f9d94]">Active gateway</p><p className="mt-1 text-lg font-bold text-[#06201c]">{status.activeGateway}</p></div><div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-[#7f9d94]">Environment</p><p className="mt-1 text-lg font-bold text-[#06201c]">{status.activeMode}</p></div><div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-[#7f9d94]">Base currency</p><p className="mt-1 text-lg font-bold text-[#06201c]">{status.baseCurrency}</p></div></section>
    <section aria-labelledby="gateway-providers-title"><h2 id="gateway-providers-title" className="text-lg font-bold text-[#06201c]">Configured providers</h2><p className="mt-1 text-sm text-[#52736a]">Only providers returned by the backend are shown.</p>{status.providers.length ? <div className="mt-3 grid gap-4 lg:grid-cols-3">{status.providers.map((provider) => <ProviderCard key={provider.id} provider={provider} onOpen={setSelectedProviderId} />)}</div> : <div className="mt-3 rounded-2xl border border-[#e1ebe6] bg-white p-6 text-sm text-[#52736a]">No provider records were supplied.</div>}</section>
    {selectedProvider ? <ProviderDetails provider={selectedProvider} onClose={() => setSelectedProviderId(null)} /> : null}
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="gateway-warnings-title"><h2 id="gateway-warnings-title" className="text-lg font-bold text-[#06201c]">Backend warnings</h2>{status.warnings.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#7f2f28]">{status.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul> : <p className="mt-1 text-sm text-[#52736a]">No warnings supplied.</p>}</section>
    <p className="rounded-xl bg-[#f9fcfa] p-3 text-sm leading-6 text-[#52736a]">Activation, credential editing, connection testing and enterprise assignment are unavailable because no frontend mutation or assignment endpoints are documented.</p>
  </div>;
}
