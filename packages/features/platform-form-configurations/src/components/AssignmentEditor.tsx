"use client";

import { useMemo, useState } from "react";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import type { FormConfigurationScope } from "../model/form-configuration.types";

/** `id` is the dedicated tenant API's canonical UUID and assignment identity. */
export interface AssignmentTenantOption {
  id: string;
  name: string;
  slug: string | null;
}

type Props = {
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
  canSaveAssignments: boolean;
  isSaving: boolean;
  /** Which Save button's mutation was actually clicked — both Save buttons share one mutation's
   * `isPending`, so this alone decides which button's label reads "Saving..." (the other stays
   * disabled, as before, but keeps its normal label instead of falsely claiming to be saving). */
  savingTarget?: "tenant" | "enterprise" | null;
  canSaveEnterpriseAssignments?: boolean;
  isSavingEnterpriseAssignments?: boolean;
  onScopeChange: (scope: FormConfigurationScope) => void;
  onTenantIdsChange: (ids: string[]) => void;
  onEnterpriseIdsChange?: (ids: string[]) => void;
  onSave: () => void;
  onSaveEnterprises?: () => void;
};

/** Edits backend-owned tenant assignments without inventing tenant identities. */
export function AssignmentEditor({
  scope,
  tenantIds,
  tenants,
  enterpriseIds = [],
  enterprises,
  isLoadingTenants,
  tenantError,
  isLoadingEnterprises = false,
  enterpriseError = false,
  isLoadingAssignments = false,
  assignmentError = false,
  isPersisted,
  canSaveAssignments,
  readOnly = isPersisted && !canSaveAssignments,
  isSaving,
  savingTarget = null,
  canSaveEnterpriseAssignments = false,
  isSavingEnterpriseAssignments = false,
  onScopeChange,
  onTenantIdsChange,
  onEnterpriseIdsChange,
  onSave,
  onSaveEnterprises,
}: Props) {
  const showEnterprises = enterprises !== undefined && onEnterpriseIdsChange !== undefined;
  const [search, setSearch] = useState("");
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const filtered = useMemo(
    () => tenants.filter((tenant) => tenant.name.toLowerCase().includes(search.toLowerCase())),
    [search, tenants],
  );
  const filteredEnterprises = useMemo(
    () => (enterprises ?? []).filter((enterprise) => enterprise.name.toLowerCase().includes(enterpriseSearch.toLowerCase())),
    [enterpriseSearch, enterprises],
  );
  const toggle = (tenantId: string) => onTenantIdsChange(
    tenantIds.includes(tenantId)
      ? tenantIds.filter((id) => id !== tenantId)
      : [...tenantIds, tenantId],
  );
  const toggleEnterprise = (enterpriseId: string) => onEnterpriseIdsChange?.(
    enterpriseIds.includes(enterpriseId)
      ? enterpriseIds.filter((id) => id !== enterpriseId)
      : [...enterpriseIds, enterpriseId],
  );

  const tenantControls = <>
    {isLoadingTenants ? <p className="py-3 text-sm text-[#52736a]">{copy.loading}</p> : null}
    {tenantError ? <p role="alert" className="py-3 text-sm font-medium text-[#b42318]">{copy.unableToLoadAvailableTenants}</p> : null}
    {!isLoadingTenants && !tenantError ? <>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          disabled={readOnly}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.searchTenants}
          aria-label={copy.searchTenants}
          className="min-w-0 flex-1 rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm text-[#06201c] outline-none placeholder:text-[#79958d] focus:border-[#1f6a58] focus:ring-2 focus:ring-[#cfe8de] disabled:bg-[#f4f8f6]"
        />
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={readOnly} onClick={() => onTenantIdsChange(tenants.map((tenant) => tenant.id))} className="rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{copy.selectAll}</button>
          <button type="button" disabled={readOnly} onClick={() => onTenantIdsChange([])} className="rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{copy.clearAll}</button>
        </div>
      </div>
      <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((tenant) => {
          const isSelected = tenantIds.includes(tenant.id);
          return <label key={tenant.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${isSelected ? "border-[#1f6a58] bg-[#eef8f3] text-[#06201c]" : "border-[#e1ebe6] bg-white text-[#355a51] hover:border-[#a9cbbd]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
            <input type="checkbox" checked={isSelected} disabled={readOnly} onChange={() => toggle(tenant.id)} className="h-4 w-4 accent-[#1f6a58]" />
            <span className="min-w-0 truncate font-medium" title={tenant.name}>{tenant.name}</span>
          </label>;
        })}
      </div>
      {!filtered.length ? <p className="py-3 text-sm text-[#52736a]">{copy.noTenants}</p> : null}
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
          <input type="radio" className="sr-only" disabled={readOnly} checked={scope === "global"} onChange={() => onScopeChange("global")} />
          {copy.allTenants}
        </label>
        <label className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition ${scope === "selective" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
          <input type="radio" className="sr-only" disabled={readOnly} checked={scope === "selective"} onChange={() => onScopeChange("selective")} />
          {copy.selectedTenants}
        </label>
      </div>
    </div>

    {scope === "selective" ? <div className="pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-bold text-[#1f6a58]">{copy.selectedCount.replace("{count}", String(tenantIds.length))}</span>
        {!tenantIds.length && !isLoadingAssignments && !assignmentError ? <span className="text-sm text-[#52736a]">{copy.noTenantsAssigned}</span> : null}
        {!isPersisted ? <span className="text-sm text-[#52736a]">{copy.selectedTenantsSavedOnCreate}</span> : null}
      </div>
      {isLoadingAssignments ? <p className="mt-3 text-sm text-[#52736a]">{copy.loadingAssignedTenants}</p> : null}
      {assignmentError ? <p role="alert" className="mt-3 text-sm font-medium text-[#b42318]">{copy.unableToLoadAssignedTenants}</p> : null}
      {tenantControls}
      {showEnterprises ? <div className="mt-4 border-t border-[#edf3f0] pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-[#06201c]">Enterprises</span>
          <span className="rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-bold text-[#1f6a58]">{enterpriseIds.length} selected</span>
        </div>
        {isLoadingEnterprises ? <p className="py-3 text-sm text-[#52736a]">{copy.loading}</p> : null}
        {enterpriseError ? <p role="alert" className="py-3 text-sm font-medium text-[#b42318]">{copy.unableToLoadAvailableTenants}</p> : null}
        {!isLoadingEnterprises && !enterpriseError ? <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              disabled={readOnly}
              value={enterpriseSearch}
              onChange={(event) => setEnterpriseSearch(event.target.value)}
              placeholder="Search enterprises"
              aria-label="Search enterprises"
              className="min-w-0 flex-1 rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm text-[#06201c] outline-none placeholder:text-[#79958d] focus:border-[#1f6a58] focus:ring-2 focus:ring-[#cfe8de] disabled:bg-[#f4f8f6]"
            />
            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={readOnly} onClick={() => onEnterpriseIdsChange?.((enterprises ?? []).map((enterprise) => enterprise.id))} className="rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{copy.selectAll}</button>
              <button type="button" disabled={readOnly} onClick={() => onEnterpriseIdsChange?.([])} className="rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{copy.clearAll}</button>
            </div>
          </div>
          <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredEnterprises.map((enterprise) => {
              const isSelected = enterpriseIds.includes(enterprise.id);
              return <label key={enterprise.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${isSelected ? "border-[#1f6a58] bg-[#eef8f3] text-[#06201c]" : "border-[#e1ebe6] bg-white text-[#355a51] hover:border-[#a9cbbd]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
                <input type="checkbox" checked={isSelected} disabled={readOnly} onChange={() => toggleEnterprise(enterprise.id)} className="h-4 w-4 accent-[#1f6a58]" />
                <span className="min-w-0 truncate font-medium" title={enterprise.name}>{enterprise.name}</span>
              </label>;
            })}
          </div>
          {!filteredEnterprises.length ? <p className="py-3 text-sm text-[#52736a]">No enterprises found.</p> : null}
        </> : null}
      </div> : null}
    </div> : <p className="pt-4 text-sm text-[#52736a]">{copy.globalAssignmentsDescription}</p>}

    {!readOnly && isPersisted && scope === "selective" ? <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf3f0] pt-4">
      {canSaveAssignments ? <button type="button" onClick={onSave} disabled={isSaving || isLoadingTenants || tenantError || isLoadingAssignments || assignmentError} className="rounded-lg bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white hover:bg-[#185746] disabled:cursor-not-allowed disabled:opacity-60">{isSaving && savingTarget === "tenant" ? copy.savingAssignments : copy.saveAssignments}</button> : null}
      {showEnterprises && canSaveEnterpriseAssignments && onSaveEnterprises ? <button type="button" onClick={onSaveEnterprises} disabled={isSavingEnterpriseAssignments || isLoadingEnterprises || enterpriseError || isLoadingAssignments || assignmentError} className="rounded-lg bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white hover:bg-[#185746] disabled:cursor-not-allowed disabled:opacity-60">{isSavingEnterpriseAssignments && savingTarget === "enterprise" ? copy.savingAssignments : "Save enterprises"}</button> : null}
    </div> : null}
  </section>;
}
