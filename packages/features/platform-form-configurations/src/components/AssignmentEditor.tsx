"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
  simplifyForEnterpriseUsers?: boolean;
  layout?: "card" | "scope-dropdown";
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
  simplifyForEnterpriseUsers = false,
  layout = "card",
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
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const usesEnterpriseAssignments = assignmentMode === "enterprise";
  const selectedIds = usesEnterpriseAssignments ? enterpriseIds : tenantIds;
  const options = usesEnterpriseAssignments
    ? enterprises
    : enterprises.length
      ? tenants.filter((tenant) => enterprises.some((enterprise) => enterprise.tenantId === tenant.id))
      : tenants;
  const isLoadingOptions = isLoadingTenants || isLoadingEnterprises;
  const optionsError = tenantError || enterpriseError;
  const searchPlaceholder = simplifyForEnterpriseUsers || usesEnterpriseAssignments ? copy.searchEnterprises : copy.searchTenants;
  const noOptionsMessage = simplifyForEnterpriseUsers || usesEnterpriseAssignments ? copy.noEnterprisesMatch : copy.noTenants;
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
          <button type="button" disabled={readOnly || !updateSelectedIds} onClick={() => updateSelectedIds?.(options.map((option) => option.id))} className="rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{simplifyForEnterpriseUsers ? copy.selectAllEnterprises : copy.selectAll}</button>
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

  if (layout === "scope-dropdown") return <div>
    <p id="form-audience-label" className="text-sm font-semibold text-[#355a51]">{copy.whoCanUseThisForm}</p>
    {scopeLocked || readOnly ? <div aria-labelledby="form-audience-label form-audience-value" className="mt-1 flex w-full items-center rounded-lg border border-[#dfe9e4] bg-[#f4f8f6] px-3 py-2.5 text-left text-sm text-[#52736a]">
      <span id="form-audience-value">{scope === "global" ? (simplifyForEnterpriseUsers ? copy.allEnterprises : copy.allTenants) : (simplifyForEnterpriseUsers ? copy.selectedEnterprises : copy.selectedTenants)}</span>
    </div> : <button type="button" aria-labelledby="form-audience-label form-audience-value" aria-haspopup="dialog" aria-expanded={scopeMenuOpen} onClick={() => setScopeMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === "Escape") setScopeMenuOpen(false); }} className="group mt-1 flex w-full items-center justify-between gap-3 rounded-lg border border-[#cfe0d8] bg-white px-3 py-2.5 text-left text-sm text-[#06201c] outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#cfe8de]">
      <span id="form-audience-value">{scope === "global" ? (simplifyForEnterpriseUsers ? copy.allEnterprises : copy.allTenants) : (simplifyForEnterpriseUsers ? copy.selectedEnterprises : copy.selectedTenants)}</span>
      <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#eef6f2] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] transition-colors group-hover:bg-[#e2f1e9]">
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path d="m12.7 4.1 3.2 3.2M4 16l3.3-.7 8.9-8.9a1.7 1.7 0 0 0-2.4-2.4l-8.9 8.9L4 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {copy.changeScope}
      </span>
    </button>}
    {scopeMenuOpen && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScopeMenuOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="form-audience-dialog-title" onKeyDown={(event) => { if (event.key === "Escape") setScopeMenuOpen(false); }} className="max-h-[min(90vh,52rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#dfe9e4] bg-white p-5 shadow-2xl sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div><h2 id="form-audience-dialog-title" className="text-xl font-bold text-[#06201c]">{copy.whoCanUseThisForm}</h2><p className="mt-1 text-sm text-[#52736a]">Choose who can access this form.</p></div>
          <button type="button" aria-label="Close" onClick={() => setScopeMenuOpen(false)} className="rounded-full px-3 py-1 text-2xl leading-none text-[#52736a] hover:bg-[#f4f8f6]">×</button>
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={copy.whoCanUseThisForm}>
          {(["global", "selective"] as const).map((option) => {
            const label = option === "global"
              ? (simplifyForEnterpriseUsers ? copy.allEnterprises : copy.allTenants)
              : (simplifyForEnterpriseUsers ? copy.selectedEnterprises : copy.selectedTenants);
            const description = option === "global"
              ? (simplifyForEnterpriseUsers ? "All enterprises can use this form." : "All tenants can use this form.")
              : (simplifyForEnterpriseUsers ? "Only selected enterprises can use it." : "Only selected tenants can use it.");
            return <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${scope === option ? "border-[#1f6a58] bg-[#eef8f3]" : "border-[#dfe9e4] hover:border-[#a9cbbd]"}`}>
              <input type="radio" name="form-audience-scope" checked={scope === option} onChange={() => onScopeChange(option)} className="mt-1 h-4 w-4 accent-[#1f6a58]" />
              <span><span className="block text-sm font-bold text-[#06201c]">{label}</span><span className="mt-1 block text-sm text-[#52736a]">{description}</span></span>
            </label>;
          })}
        </div>
        {scope === "selective" ? <div className="mt-5 rounded-xl border border-[#dfe9e4] bg-[#fbfdfc] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-[#06201c]">Choose enterprises</h3><span className="rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{selectedIds.length} selected</span></div>
          {isLoadingAssignments ? <p className="mt-2 text-sm text-[#52736a]">Loading saved selections…</p> : null}
          {assignmentError ? <p role="alert" className="mt-2 text-sm text-[#b42318]">Unable to load the saved selections.</p> : null}
          <div className="mt-2 max-h-72 overflow-y-auto">{assignmentControls}</div>
        </div> : null}
        <footer className="mt-5 flex justify-end border-t border-[#edf3f0] pt-4"><button type="button" onClick={() => setScopeMenuOpen(false)} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#195646]">Done</button></footer>
      </section>
    </div>, document.body) : null}
    <p className="mt-1 text-xs text-[#78948b]">{scopeLocked || readOnly ? copy.audienceCannotChangeSaved : "Choice locks after saving."}</p>
  </div>;

  return <section className="rounded-2xl border border-[#dfe9e4] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 border-b border-[#edf3f0] pb-4">
      <div className={simplifyForEnterpriseUsers ? "" : "sm:flex-1"}>
        <h3 className="text-base font-bold text-[#06201c]">{simplifyForEnterpriseUsers ? copy.whoCanUseThisForm : copy.assignment}</h3>
        {!simplifyForEnterpriseUsers ? <p className="mt-1 text-sm text-[#52736a]">{copy.assignmentDescription}</p> : null}
      </div>
      {simplifyForEnterpriseUsers ? <div className="inline-flex w-fit rounded-lg bg-[#eef6f2] p-1" role="radiogroup" aria-label={copy.whoCanUseThisForm}>
        <label className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition ${scope === "global" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a]"} ${readOnly || scopeLocked ? "cursor-default" : ""}`}>
          <input type="radio" className="sr-only" disabled={readOnly || scopeLocked} checked={scope === "global"} onChange={() => onScopeChange("global")} />
          {copy.allEnterprises}
        </label>
        <label className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition ${scope === "selective" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a]"} ${readOnly || scopeLocked ? "cursor-default" : ""}`}>
          <input type="radio" className="sr-only" disabled={readOnly || scopeLocked} checked={scope === "selective"} onChange={() => onScopeChange("selective")} />
          {copy.selectedEnterprises}
        </label>
      </div> : <div className="inline-flex w-fit rounded-lg bg-[#eef6f2] p-1" role="radiogroup" aria-label={copy.assignment}>
        <label className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition ${scope === "global" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
          <input type="radio" className="sr-only" disabled={readOnly || scopeLocked} checked={scope === "global"} onChange={() => onScopeChange("global")} />
          {usesEnterpriseAssignments ? copy.allEnterprises : copy.allTenants}
        </label>
        <label className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition ${scope === "selective" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a]"} ${readOnly ? "cursor-default opacity-75" : ""}`}>
          <input type="radio" className="sr-only" disabled={readOnly || scopeLocked} checked={scope === "selective"} onChange={() => onScopeChange("selective")} />
          {usesEnterpriseAssignments ? copy.selectedEnterprises : copy.selectedTenants}
        </label>
      </div>}
    </div>

    {(simplifyForEnterpriseUsers || scopeHint) ? <p className="mt-3 text-xs text-[#78948b]">{simplifyForEnterpriseUsers ? "Choice locks after saving." : scopeHint}</p> : null}

    {!simplifyForEnterpriseUsers ? <p className="mt-3 text-sm leading-5 text-[#52736a]">{scope === "global" ? copy.globalScopeHelp : usesEnterpriseAssignments ? copy.enterpriseAssignmentHelp : copy.selectiveScopeHelp}</p> : null}

    {scope === "selective" ? <div className="pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-bold text-[#1f6a58]">{simplifyForEnterpriseUsers ? copy.selectedEnterprisesCount(selectedIds.length) : usesEnterpriseAssignments ? `Selected enterprises: ${selectedIds.length}` : copy.selectedCount.replace("{count}", String(selectedIds.length))}</span>
        {!selectedIds.length && isPersisted && !isLoadingAssignments && !assignmentError ? <span className="text-sm text-[#52736a]">{simplifyForEnterpriseUsers || usesEnterpriseAssignments ? copy.noEnterprisesAssigned : copy.noTenantsAssigned}</span> : null}
        {!isPersisted ? <span className="text-sm text-[#52736a]">{simplifyForEnterpriseUsers ? copy.selectedEnterprisesSavedOnCreate : usesEnterpriseAssignments ? "Selected enterprises will be saved when this configuration is created." : copy.selectedTenantsSavedOnCreate}</span> : null}
      </div>
      {isLoadingAssignments ? <p className="mt-3 text-sm text-[#52736a]">{usesEnterpriseAssignments ? "Loading assigned enterprises…" : copy.loadingAssignedTenants}</p> : null}
      {assignmentError ? <p role="alert" className="mt-3 text-sm font-medium text-[#b42318]">{usesEnterpriseAssignments ? "Unable to load assigned enterprises." : copy.unableToLoadAssignedTenants}</p> : null}
      {assignmentControls}
    </div> : !simplifyForEnterpriseUsers ? <p className="pt-4 text-sm text-[#52736a]">{copy.globalAssignmentsDescription}</p> : null}

  </section>;
}
