"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfigurationList } from "../components/ConfigurationList";
import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { useActivateEventFormConfiguration, useDeactivateEventFormConfiguration, useDeleteEventFormConfiguration, useEventFormConfigurations, usePublishEventFormConfiguration, useRetireEventFormConfiguration } from "../form-configurations.queries";
import { FormConfigurationsApiError } from "../services/form-configurations.service";

/** Lists real configurations and performs lifecycle mutations without local simulation. */
export function FormConfigurationsScreen() {
  const query = useEventFormConfigurations();
  const activate = useActivateEventFormConfiguration();
  const deactivate = useDeactivateEventFormConfiguration();
  const publish = usePublishEventFormConfiguration();
  const retire = useRetireEventFormConfiguration();
  const remove = useDeleteEventFormConfiguration();
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string>();
  const action = async (type: "publish" | "activate" | "deactivate" | "retire" | "delete", id: string) => { if (pendingId) return; setError(""); setPendingId(id); try { if (type === "publish") await publish.mutateAsync(id); else if (type === "activate") await activate.mutateAsync(id); else if (type === "deactivate") await deactivate.mutateAsync(id); else if (type === "retire") await retire.mutateAsync(id); else await remove.mutateAsync(id); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update the configuration."); } finally { setPendingId(undefined); } };
  const errorCopy = query.error instanceof FormConfigurationsApiError && (query.error.status === 401 || query.error.status === 403) ? copy.forbidden : copy.loadError;
  return <div className="mx-auto w-full max-w-[1180px]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#7f9d94]">{copy.eyebrow}</p><h1 className="mt-2 text-3xl font-bold text-[#06201c]">{copy.title}</h1><p className="mt-2 text-sm text-[#52736a]">{copy.description}</p></div><Link href="/form-configurations/new" className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">{copy.create}</Link></div><div className="mt-6">{query.isLoading ? <div className="rounded-2xl border border-[#dfe9e4] bg-white p-8 text-sm text-[#52736a]">{copy.loading}</div> : query.isError ? <div className="rounded-2xl border border-[#f0c8c4] bg-[#fff8f7] p-6"><p role="alert" className="text-sm font-semibold text-[#b42318]">{errorCopy}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 text-sm font-bold text-[#1f6a58]">{copy.retry}</button></div> : <><ConfigurationList configurations={query.data ?? []} pendingId={pendingId} onPublish={(id) => void action("publish", id)} onActivate={(id) => void action("activate", id)} onDeactivate={(id) => void action("deactivate", id)} onRetire={(id) => void action("retire", id)} onDelete={(id) => void action("delete", id)} />{error ? <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">{error}</p> : null}</>}</div></div>;
}
