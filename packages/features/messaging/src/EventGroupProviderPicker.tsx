"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEventGroupProviders } from "./group-chat/event-group.queries";
import type { EventGroupProvider } from "./group-chat/event-group.types";
import { resolveEventGroupQueryState } from "./event-group-wizard-models";

interface EventGroupProviderPickerProps {
  eventId: string;
  selectedProviders: Readonly<Record<string, EventGroupProvider>>;
  onToggle: (provider: EventGroupProvider) => void;
}

/** Selects verified Providers by backend platform user ID; Providers are always ordinary invitees. */
export default function EventGroupProviderPicker({ eventId, selectedProviders, onToggle }: EventGroupProviderPickerProps) {
  const { t } = useTranslation("groupChatSpeech");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);
  const providersQuery = useEventGroupProviders(eventId, { q: debouncedSearch || undefined });
  const state = resolveEventGroupQueryState({ isPending: providersQuery.isPending, isError: providersQuery.isError, itemCount: providersQuery.data?.items.length ?? 0 });
  return <section className="space-y-3 rounded-2xl border border-[#d7e5df] bg-white p-4" aria-labelledby="event-group-providers-title">
    <div><h2 id="event-group-providers-title" className="font-bold text-[#16332b]">{t("eventGroup.providersTitle")}</h2><p className="mt-1 text-xs text-[#52736a]">{t("eventGroup.providersDescription")}</p><p className="mt-2 text-xs text-[#52736a]">{t("eventGroup.speakerProviderDescription")}</p></div>
    <label className="block text-sm font-semibold text-[#16332b]"><span className="sr-only">{t("eventGroup.searchProviders")}</span><input value={search} onChange={(change) => setSearch(change.target.value)} placeholder={t("eventGroup.searchProviders")} className="h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58]" /></label>
    {state === "loading" ? <p className="text-sm text-[#52736a]" aria-live="polite">{t("eventGroup.providersLoading")}</p> : null}
    {state === "error" ? <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert"><p>{providersQuery.error?.message ?? t("eventGroup.providersError")}</p><button type="button" onClick={() => void providersQuery.refetch()} className="mt-2 font-semibold underline">{t("eventGroup.tryAgain")}</button></div> : null}
    {state === "empty" ? <p className="text-sm text-[#52736a]">{debouncedSearch ? t("eventGroup.noProvidersMatch") : t("eventGroup.noProviders")}</p> : null}
    {state === "ready" ? <div className="space-y-2">{providersQuery.data?.items.map((provider) => { const selected = Boolean(selectedProviders[provider.user_id]); const selectable = !provider.is_me; return <label key={provider.user_id} className={`flex items-start gap-3 rounded-xl border p-3 ${selectable ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${selected ? "border-[#1f6a58] bg-[#f4faf7]" : "border-[#d7e5df]"}`}><input type="checkbox" checked={selected} disabled={!selectable} onChange={() => onToggle(provider)} className="mt-1 h-4 w-4 accent-[#1f6a58]" /><span className="min-w-0 flex-1"><span className="block font-semibold text-[#16332b]">{provider.name ?? t("eventGroup.providerNameUnavailable")}</span><span className="block text-xs text-[#52736a]">{provider.registration_number ?? t("eventGroup.registrationNumberUnavailable")}</span><span className="mt-1 block text-[11px] text-[#7f9d94]">{provider.is_me ? t("eventGroup.providerCurrentUser") : t("eventGroup.providerOrdinaryMember")}</span></span><span className="text-xs text-[#52736a]">{provider.user_id}</span></label>; })}</div> : null}
    <p className="text-xs text-[#805900]">{t("eventGroup.providersNoAdminRights")}</p>
  </section>;
}
