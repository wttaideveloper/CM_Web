"use client";

import { useState } from "react";
import { useEventFormConfigurationVersion, useEventFormConfigurationVersions } from "../form-configurations.queries";
import { toBuilderFormConfiguration } from "../model/form-configuration.mappers";
import type { EventFormConfiguration } from "../model/event-form-configuration-api.types";
import { ConfigurationPreview } from "./ConfigurationPreview";

/** Displays immutable versions for a persisted Event configuration. */
export function ConfigurationHistoryPanels({ configuration }: { configuration: EventFormConfiguration }) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const versions = useEventFormConfigurationVersions(configuration.id);
  const version = useEventFormConfigurationVersion(configuration.id, selectedVersionId);
  return <div className="mt-6"><section className="rounded-2xl border border-[#dfe9e4] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">Versions</h2>{versions.isLoading ? <p className="mt-3 text-sm text-[#52736a]">Loading versions...</p> : versions.isError ? <button type="button" onClick={() => void versions.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58]">Unable to load versions. Retry</button> : <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">{versions.data?.length ? versions.data.map((item) => <button key={item.id} type="button" onClick={() => setSelectedVersionId(item.id)} className={`block w-full rounded-xl border p-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[#1f6a58] ${item.id === configuration.published_version?.id ? "border-[#9bcfb7] bg-[#f4faf7]" : "border-[#edf3f0] hover:bg-[#f9fcfa]"}`}><span className="font-bold text-[#06201c]">v{item.version}</span><span className="ml-2 text-[#52736a]">{item.status}</span>{item.id === configuration.published_version?.id ? <span className="ml-2 rounded-full bg-[#dff2e6] px-2 py-0.5 text-xs font-bold text-[#1f6a58]">Current</span> : null}<span className="mt-1 block text-xs text-[#52736a]">Created {item.created_at ?? "—"}{item.published_at ? ` · Published ${item.published_at}` : ""}</span></button>) : <p className="text-sm text-[#52736a]">No versions have been published.</p>}</div>}{selectedVersionId ? <div className="mt-4">{version.isLoading ? <p className="text-sm text-[#52736a]">Loading version...</p> : version.data ? <ConfigurationPreview configuration={toBuilderFormConfiguration(configuration, version.data)} /> : null}</div> : null}</section></div>;
}
