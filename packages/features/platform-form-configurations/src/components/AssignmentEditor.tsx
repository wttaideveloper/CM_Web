"use client";

import { useMemo, useState } from "react";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import type { FormConfigurationScope } from "../model/form-configuration.types";

/** `id` is the dedicated tenant API's canonical UUID and assignment identity. */
export interface AssignmentTenantOption {
  id: string;
  name: string;
  slug: string | null;
  tenantId?: string;
}

type Props = {
  assignmentMode?: "tenant" | "enterprise";
  readOnly?: boolean;
  scope: FormConfigurationScope;
  tenantIds: string[];
  tenants: readonly AssignmentTenantOption[];
  enterpriseIds?: string[];
  enterprises?: readonly AssignmentTenantOption[];
  isLoadingTenants: boolean;
  tenantError: boolean;
  isLoadingEnterprises?: boolean;
  enterpriseError?: boolean;
  isLoadingAssignments?: boolean;
  assignmentError?: boolean;
  isPersisted: boolean;
  scopeLocked?: boolean;
  scopeHint?: string;
  canSaveAssignments: boolean;
  isSaving: boolean;
  /** Distinguishes which assignment mutation is pending when both save actions exist. */
  savingTarget?: "tenant" | "enterprise" | null;
  canSaveEnterpriseAssignments?: boolean;
  isSavingEnterpriseAssignments?: boolean;
  onScopeChange: (scope: FormConfigurationScope) => void;
  onTenantIdsChange: (ids: string[]) => void;
  onEnterpriseIdsChange?: (ids: string[]) => void;
  onSave: () => void;
  onSaveEnterprises?: () => void;
};

/** Edits configuration assignments using the selected tenant or enterprise identity. */
export function AssignmentEditor({
  assignmentMode = "tenant",
  scope,
  tenantIds,
  tenants,
  enterpriseIds = [],
  enterprises = [],
  isLoadingTenants,
  tenantError,
  isLoadingEnterprises = false,
  enterpriseError = false,
  isLoadingAssignments = false,
  assignmentError = false,
  isPersisted,
  scopeLocked = false,
  scopeHint,
  canSaveAssignments,
  readOnly = isPersisted && !canSaveAssignments,
  onScopeChange,
  onTenantIdsChange,
  onEnterpriseIdsChange,
}: Props) {
  const [search, setSearch] = useState("");
  const usesEnterpriseAssignments = assignmentMode === "enterprise";
  const selectedIds = usesEnterpriseAssignments ? enterpriseIds : tenantIds;
  const options = usesEnterpriseAssignments
    ? enterprises
    : enterprises.length
      ? tenants.filter((tenant) => enterprises.some((enterprise) => enterprise.tenantId === tenant.id))
      : tenants;
  const isLoadingOptions = isLoadingTenants || isLoadingEnterprises;
  const optionsError = tenantError || enterpriseError;
  const searchPlaceholder = usesEnterpriseAssignments ? "Search enterprises" : copy.searchTenants;
  const noOptionsMessage = usesEnterpriseAssignments ? "No enterprises match this search." : copy.noTenants;
  const updateSelectedIds = usesEnterpriseAssignments ? onEnterpriseIdsChange : onTenantIdsChange;
  const filtered = useMemo(
    () => options.filter((option) => option.name.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );
  const toggle = (id: string) => updateSelectedIds?.(
    selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id],
  );
  const assignmentControls = <>
    {isLoadingOptions ? <p className="py-3 text-sm text-[#52736a]">{copy.loading}</p> : null}
    {optionsError ? <p role="alert" className="py-3 text-sm font-medium text-[#b42318]">{copy.unableToLoadAvailableTenants}</p> : null}
    {!isLoadingOptions && !optionsError ? <>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          disabled={readOnly}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm text-[#06201c] outline-none placeholder:text-[#79958d] focus:border-[#1f6a58] focus:ring-2 focus:ring-[#cfe8de] disabled:bg-[#f4f8f6]"
        />
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={readOnly || !updateSelectedIds} onClick={() => updateSelectedIds?.(options.map((option) => option.id))} className="rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{copy.selectAll}</button>
          <button type="button" disabled={readOnly || !updateSelectedIds} onClick={() => updateSelectedIds?.([])} className="rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{copy.clearAll}</button>
        </div>
      </div>
      <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return <label key={option.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${isSelected ? "border-[#1f6a58] bg-[#eef8f3] text-[#06201c]" : "border-[#e1ebe6] bg-white text-[#355a51] hover:border-[#a9cbbd]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
            <input type="checkbox" checked={isSelected} disabled={readOnly || !updateSelectedIds} onChange={() => toggle(option.id)} className="h-4 w-4 accent-[#1f6a58]" />
            <span className="min-w-0 truncate font-medium" title={option.name}>{option.name}</span>
          </label>;
        })}
      </div>
      {!filtered.length ? <p className="py-3 text-sm text-[#52736a]">{noOptionsMessage}</p> : null}
      {!usesEnterpriseAssignments && !options.length ? <p className="text-sm text-[#9b3f16]">No enterprises are linked to the available tenants. Link an enterprise to a tenant before assigning this Event form.</p> : null}
    </> : null}
  </>;

  return <section className="rounded-2xl border border-[#dfe9e4] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 border-b border-[#edf3f0] pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-base font-bold text-[#06201c]">{copy.assignment}</h3>
        <p className="mt-1 text-sm text-[#52736a]">{copy.assignmentDescription}</p>
      </div>
      <div className="inline-flex w-fit rounded-lg bg-[#eef6f2] p-1" role="radiogroup" aria-label={copy.assignment}>
        <label className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition ${scope === "global" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
          <input type="radio" className="sr-only" disabled={readOnly || scopeLocked} checked={scope === "global"} onChange={() => onScopeChange("global")} />
          {usesEnterpriseAssignments ? "All enterprises" : copy.allTenants}
        </label>
        <label className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition ${scope === "selective" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
          <input type="radio" className="sr-only" disabled={readOnly || scopeLocked} checked={scope === "selective"} onChange={() => onScopeChange("selective")} />
          {usesEnterpriseAssignments ? "Selected enterprises" : copy.selectedTenants}
        </label>
      </div>
      {scopeHint ? <p className="mt-3 rounded-lg bg-[#f4f8f6] px-3 py-2 text-sm leading-5 text-[#52736a]">{scopeHint}</p> : null}
    </div>

    <p className="mt-3 text-sm leading-5 text-[#52736a]">{scope === "global" ? copy.globalScopeHelp : usesEnterpriseAssignments ? copy.enterpriseAssignmentHelp : copy.selectiveScopeHelp}</p>

    {scope === "selective" ? <div className="pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-bold text-[#1f6a58]">{usesEnterpriseAssignments ? `Selected enterprises: ${selectedIds.length}` : copy.selectedCount.replace("{count}", String(selectedIds.length))}</span>
        {!selectedIds.length && isPersisted && !isLoadingAssignments && !assignmentError ? <span className="text-sm text-[#52736a]">{usesEnterpriseAssignments ? "No enterprises assigned." : copy.noTenantsAssigned}</span> : null}
        {!isPersisted ? <span className="text-sm text-[#52736a]">{usesEnterpriseAssignments ? "Selected enterprises will be saved when this configuration is created." : copy.selectedTenantsSavedOnCreate}</span> : null}
      </div>
      {isLoadingAssignments ? <p className="mt-3 text-sm text-[#52736a]">{usesEnterpriseAssignments ? "Loading assigned enterprises…" : copy.loadingAssignedTenants}</p> : null}
      {assignmentError ? <p role="alert" className="mt-3 text-sm font-medium text-[#b42318]">{usesEnterpriseAssignments ? "Unable to load assigned enterprises." : copy.unableToLoadAssignedTenants}</p> : null}
      {assignmentControls}
    </div> : <p className="pt-4 text-sm text-[#52736a]">{copy.globalAssignmentsDescription}</p>}

  </section>;
}
