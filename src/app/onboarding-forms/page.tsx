"use client";

import AppShell from "@/components/layout/AppShell";
import {
  deleteOnboardingForm,
  duplicateOnboardingForm,
  getOnboardingForms,
  publishOnboardingForm,
  unpublishOnboardingForm,
} from "@/services/onboarding-form.service";
import type {
  FormStatus,
  OnboardingFormListItem,
  OnboardingFormListResponse,
} from "@/types/onboarding-form.types";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

const statusFilters: Array<{ label: string; value: FormStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Inactive", value: "inactive" },
];

function statusBadgeClass(status: FormStatus) {
  if (status === "draft") {
    return "bg-[#f1f4f3] text-[#6b7f79]";
  }

  if (status === "inactive") {
    return "bg-[#fff3e6] text-[#a15c00]";
  }

  return "bg-[#e8f6ee] text-[#16825b]";
}

function statusLabel(status: FormStatus) {
  if (status === "draft") {
    return "Draft";
  }

  if (status === "inactive") {
    return "Inactive";
  }

  return "Published";
}

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-6 py-14 text-center">
      <p className="text-base font-bold text-[#06201c]">No onboarding forms found.</p>
      <p className="mt-2 text-sm text-[#52736a]">Create a new template to get started.</p>
      <Link
        href="/onboarding-forms/create"
        className="mt-5 inline-flex h-11 items-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
      >
        Create Form
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-16 animate-pulse rounded-xl bg-[#f3f7f5]" />
            <div className="h-16 animate-pulse rounded-xl bg-[#f3f7f5]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormCard({
  form,
  onRefresh,
  onBusyChange,
}: {
  form: OnboardingFormListItem;
  onRefresh: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function runAction(action: () => Promise<void | boolean>) {
    setActionError(null);
    setIsWorking(true);
    onBusyChange(true);

    try {
      const shouldRefresh = await action();
      if (shouldRefresh !== false) {
        await onRefresh();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setIsWorking(false);
      onBusyChange(false);
    }
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-[#06201c]">{form.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-[#52736a]">{form.description || "—"}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(form.status)}`}>
          {statusLabel(form.status)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-[#f9fcfa] px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Sections</p>
          <p className="mt-1 font-bold text-[#06201c]">{form.sections_count}</p>
        </div>
        <div className="rounded-xl bg-[#f9fcfa] px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Fields</p>
          <p className="mt-1 font-bold text-[#06201c]">{form.fields_count}</p>
        </div>
        <div className="rounded-xl bg-[#f9fcfa] px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Assigned</p>
          <p className="mt-1 font-bold text-[#06201c]">{form.assigned_count}</p>
        </div>
        <div className="rounded-xl bg-[#f9fcfa] px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Created</p>
          <p className="mt-1 text-xs font-semibold text-[#06201c]">{formatDate(form.created_at)}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-[#f9fcfa] px-3 py-3 text-xs text-[#52736a]">
        <span className="font-bold text-[#06201c]">Updated: </span>
        {formatDate(form.updated_at)}
      </div>

      {actionError ? (
        <p className="mt-4 rounded-xl border border-[#f8d7da] bg-[#fff5f5] px-3 py-2 text-sm text-[#b42318]">
          {actionError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/onboarding-forms/${form.id}`}
          className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7]"
        >
          View
        </Link>
        <Link
          href={`/onboarding-forms/${form.id}/edit`}
          className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7]"
        >
          Edit
        </Link>
        {form.status === "draft" ? (
          <button
            type="button"
            disabled={isWorking}
            onClick={() =>
              runAction(async () => {
                await publishOnboardingForm(form.id);
              })
            }
            className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Publish
          </button>
        ) : null}
        {form.status === "published" ? (
          <button
            type="button"
            disabled={isWorking}
            onClick={() =>
              runAction(async () => {
                await unpublishOnboardingForm(form.id);
              })
            }
            className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Unpublish
          </button>
        ) : null}
        <button
          type="button"
          disabled={isWorking}
          onClick={() =>
            runAction(async () => {
              await duplicateOnboardingForm(form.id, `Copy of ${form.name}`);
            })
          }
          className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={isWorking}
          onClick={() =>
            runAction(async () => {
              const confirmed = window.confirm(`Delete "${form.name}"?`);
              if (!confirmed) {
                return false;
              }

              await deleteOnboardingForm(form.id);
              return true;
            })
          }
          className="rounded-full border border-[#efd4d1] px-3 py-2 text-xs font-semibold text-[#b42318] hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function OnboardingFormsPage() {
  const [items, setItems] = useState<OnboardingFormListItem[]>([]);
  const [pagination, setPagination] = useState<OnboardingFormListResponse["pagination"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVersion, setSearchVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FormStatus | "">("");
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

  async function handleRefresh() {
    await loadForms();
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
    setSearchVersion((current) => current + 1);
  }

  function handleFilterChange(value: FormStatus | "") {
    setPage(1);
    setStatusFilter(value);
  }

  const totalPages = pagination?.total_pages ?? 1;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">Onboarding Forms</h2>
          <p className="text-sm text-[#52736a]">Manage enterprise onboarding form templates.</p>
        </div>
        <Link
          href="/onboarding-forms/create"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
        >
          + Create Form
        </Link>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-[650px]"
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search forms by name or description"
              className="h-12 flex-1 rounded-full border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-3 lg:flex-nowrap lg:justify-end">
            {statusFilters.map((filter) => {
              const active = filter.value === statusFilter;

              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => handleFilterChange(filter.value)}
                  className={`shrink-0 rounded-full px-6 h-12 text-sm font-semibold transition ${
                    active
                      ? "bg-[#e8f6ee] text-[#1f6a58]"
                      : "border border-[#d7e5df] bg-white text-[#52736a] hover:bg-[#f4faf7]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-2xl border border-[#f8d7da] bg-[#fff5f5] px-4 py-4 text-sm text-[#b42318]">
          {error}
        </div>
      ) : null}

      <section className="mt-5">
        {isLoading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onRefresh={handleRefresh}
                onBusyChange={setIsActionBusy}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#52736a]">
          Page {pagination?.page ?? 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={(pagination?.page ?? 1) <= 1 || isActionBusy}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={(pagination?.page ?? 1) >= totalPages || isActionBusy}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </section>
    </AppShell>
  );
}
