"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import OnboardingFormCard from "../components/list/OnboardingFormCard";
import {
  OnboardingFormsEmptyState,
  OnboardingFormsLoadingState,
} from "../components/list/OnboardingFormsStates";
import { getOnboardingForms } from "../services/onboarding-form.service";
import type {
  FormStatus,
  OnboardingFormListItem,
  OnboardingFormListResponse,
} from "../types/onboarding-form.types";

const statusFilters: Array<{ label: string; value: FormStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Inactive", value: "inactive" },
];

const enterpriseTypeOptions = [
  "Healthcare",
  "Fitness & Wellness",
  "Nutrition",
  "Mental Health",
  "Education",
  "Retail",
];

const registrationTypeOptions = [
  { label: "Enterprise", value: "enterprise" },
  { label: "Individual", value: "individual" },
] as const;

export default function OnboardingFormsScreen() {
  const [items, setItems] = useState<OnboardingFormListItem[]>([]);
  const [pagination, setPagination] = useState<OnboardingFormListResponse["pagination"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVersion, setSearchVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FormStatus | "">("");
  const [enterpriseTypeFilter, setEnterpriseTypeFilter] = useState("all");
  const [registrationTypeFilter, setRegistrationTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isActionBusy, setIsActionBusy] = useState(false);

  async function loadForms() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getOnboardingForms({
        entity_type: "enterprise",
        page,
        page_size: 20,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setItems(response.items ?? []);
      setPagination(response.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load onboarding forms.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchVersion, statusFilter]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
    setSearchVersion((current) => current + 1);
  }

  const filteredForms = items.filter((form) => {
    const matchesEnterpriseType = enterpriseTypeFilter === "all" || form.enterprise_type === enterpriseTypeFilter;
    const matchesRegistrationType = registrationTypeFilter === "all" || form.registration_type === registrationTypeFilter;
    return matchesEnterpriseType && matchesRegistrationType;
  });
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">Onboarding Forms</h2>
          <p className="text-sm text-[#52736a]">Manage enterprise onboarding form templates.</p>
        </div>
        <Link href="/onboarding-forms/create" className="inline-flex h-11 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]">+ Create Form</Link>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-[650px]">
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search forms by name or description" className="h-12 flex-1 rounded-full border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" />
              <button type="submit" className="h-12 shrink-0 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]">Search</button>
            </form>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap lg:justify-end">
              {statusFilters.map((filter) => {
                const active = filter.value === statusFilter;
                return <button key={filter.label} type="button" onClick={() => { setPage(1); setStatusFilter(filter.value); }} className={`h-12 shrink-0 rounded-full px-6 text-sm font-semibold transition ${active ? "bg-[#e8f6ee] text-[#1f6a58]" : "border border-[#d7e5df] bg-white text-[#52736a] hover:bg-[#f4faf7]"}`}>{filter.label}</button>;
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={enterpriseTypeFilter} onChange={(event) => setEnterpriseTypeFilter(event.target.value)} className="h-11 min-w-[200px] rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#355a51] outline-none transition focus:border-[#1f6a58]">
              <option value="all">All Enterprise Types</option>
              {enterpriseTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={registrationTypeFilter} onChange={(event) => setRegistrationTypeFilter(event.target.value)} className="h-11 min-w-[200px] rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#355a51] outline-none transition focus:border-[#1f6a58]">
              <option value="all">All Registration Types</option>
              {registrationTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {error ? <div className="mt-5 rounded-2xl border border-[#f8d7da] bg-[#fff5f5] px-4 py-4 text-sm text-[#b42318]">{error}</div> : null}
      <section className="mt-5">
        {isLoading ? <OnboardingFormsLoadingState /> : filteredForms.length === 0 ? <OnboardingFormsEmptyState /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredForms.map((form) => <OnboardingFormCard key={form.id} form={form} onRefresh={loadForms} onBusyChange={setIsActionBusy} />)}</div>}
      </section>
      <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#52736a]">Page {pagination?.page ?? 1} of {totalPages}</p>
        <div className="flex gap-2">
          <button type="button" disabled={(pagination?.page ?? 1) <= 1 || isActionBusy} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60">Previous</button>
          <button type="button" disabled={(pagination?.page ?? 1) >= totalPages || isActionBusy} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60">Next</button>
        </div>
      </section>
    </>
  );
}
