"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listEnterpriseCatalogEvents, listEnterpriseCatalogTrainings, type EnterpriseCatalogEvent, type EnterpriseCatalogTraining } from "./enterprise-catalog.service";

type CatalogKind = "events" | "trainings";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Date not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function label(value: string | null | undefined): string {
  return value?.trim().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()) || "Not provided";
}

function CatalogCard({ item, kind }: { item: EnterpriseCatalogEvent | EnterpriseCatalogTraining; kind: CatalogKind }) {
  const isEvent = kind === "events";
  const location = isEvent && item.venue && typeof item.venue !== "string"
    ? [item.venue.name, item.venue.city].filter(Boolean).join(", ")
    : !isEvent && typeof item.venue === "string" ? item.venue : "";
  return <Link href={`/admin/${isEvent ? "events" : "trainings"}/${item.id}`} className="block rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#4f9f76] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"><article><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label(item.category)}</p><h3 className="mt-2 text-lg font-bold text-[#06201c]">{item.title}</h3></div><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{label(item.status)}</span></div><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">Date</dt><dd className="mt-1 text-[#31594d]">{formatDate(item.start_date)}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">Delivery</dt><dd className="mt-1 text-[#31594d]">{label(item.delivery_mode)}</dd></div>{location ? <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">Location</dt><dd className="mt-1 text-[#31594d]">{location}</dd></div> : null}</dl><p className="mt-5 text-sm font-semibold text-[#1f6a58]">View {isEvent ? "Event" : "Training"} details →</p></article></Link>;
}

export default function EnterpriseCatalogPanel({ enterpriseId, kind }: { enterpriseId: string | undefined; kind: CatalogKind }) {
  const [items, setItems] = useState<Array<EnterpriseCatalogEvent | EnterpriseCatalogTraining>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!enterpriseId) {
      setItems([]);
      setIsLoading(false);
      setError("Enterprise is unavailable.");
      return () => { cancelled = true; };
    }
    setIsLoading(true);
    setError(null);
    const load = kind === "events" ? listEnterpriseCatalogEvents(enterpriseId) : listEnterpriseCatalogTrainings(enterpriseId);
    void load.then((nextItems) => { if (!cancelled) setItems(nextItems); }).catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : `Unable to load enterprise ${kind}.`); }).finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [enterpriseId, kind, retryKey]);

  if (isLoading) return <div role="status" className="mt-5 grid gap-5 md:grid-cols-2"><div className="h-48 animate-pulse rounded-2xl bg-[#edf3f0]" /><div className="h-48 animate-pulse rounded-2xl bg-[#edf3f0]" /></div>;
  if (error) return <div className="mt-5 rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] p-6"><p role="alert" className="font-semibold text-[#b42318]">{error}</p><button type="button" onClick={() => setRetryKey((current) => current + 1)} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div>;
  if (items.length === 0) return <div className="mt-5 rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-5 py-16 text-center"><p className="text-base font-bold text-[#06201c]">No {kind} available yet.</p></div>;
  return <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <CatalogCard key={item.id} item={item} kind={kind} />)}</div>;
}
