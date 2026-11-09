"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  exemptionStatuses,
  filterTaxExemptions,
  filterTaxRules,
  taxClassPreviews,
  taxExemptionPreviews,
  taxPreviewMutationsDisabled,
  taxRulePreviews,
  taxRuleStatuses,
  taxTypes,
  type ExemptionStatusFilter,
  type TaxRuleStatusFilter,
  type TaxType,
} from "./platform-tax";

function PreviewBadge() {
  return <span className="inline-flex rounded-full bg-[#fff7e5] px-3 py-1 text-xs font-bold text-[#8a5a00]">Preview only</span>;
}

function DisabledNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs leading-5 text-[#7f9d94]">{children}</p>;
}

function SectionHeading({ title, description, action, titleId }: { title: string; description: string; action?: ReactNode; titleId?: string }) {
  return <div className="flex flex-col gap-3 border-b border-[#edf3f0] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 id={titleId} className="text-lg font-bold text-[#06201c]">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#52736a]">{description}</p></div>{action}</div>;
}

function TaxRuleFormPreview({ onClose, mode }: { onClose: () => void; mode: "add" | "edit" }) {
  return (
    <section className="mt-4 rounded-2xl border border-[#d7e5df] bg-white p-5" role="dialog" aria-labelledby="tax-rule-form-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 id="tax-rule-form-title" className="font-bold text-[#06201c]">{mode === "add" ? "Add Tax Rule" : "Edit Tax Rule / Create Next Version"} preview</h3><p className="mt-1 text-sm leading-6 text-[#52736a]">This form is a non-persistent preview. Conflicting or overlapping rules require backend validation, and historical rules must remain preserved.</p></div><button type="button" onClick={onClose} className="self-start rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">Close</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold text-[#31594d]">Tax Rule Name<input disabled placeholder="Rule name" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Country<select disabled className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option>Unavailable</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">State / Region<input disabled placeholder="Unavailable" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Tax Type<select disabled className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option>Select tax type</option>{taxTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="text-sm font-semibold text-[#31594d]">Tax Percentage<input disabled type="number" min="0" step="any" placeholder="Must not be negative" aria-describedby="tax-rate-guidance" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Effective From<input disabled type="datetime-local" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Effective To<input disabled type="datetime-local" aria-describedby="tax-date-guidance" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Applicable exemptions<input disabled placeholder="Not configured" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Applicability / classification<input disabled placeholder="Not configured" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Rounding mode<select disabled className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option>Not configured</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Condition<select disabled className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option>Not configured</option></select></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-[#31594d]"><input type="checkbox" disabled /> Reverse charge</label>
      </div>
      <div className="mt-4 rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3 text-xs leading-5 text-[#52736a]"><p id="tax-rate-guidance">Tax rate cannot be negative.</p><p id="tax-date-guidance">Effective To cannot be before Effective From.</p><p>Overlapping or conflicting rules require backend validation. Historical rules must be preserved.</p></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={taxPreviewMutationsDisabled} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save Tax Rule</button><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">Cancel</button></div>
    </section>
  );
}

function TaxRuleLifecyclePreview({ onClose }: { onClose: () => void }) {
  return <section className="mt-4 rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] p-4" role="dialog" aria-labelledby="tax-rule-lifecycle-title"><div className="flex items-start justify-between gap-3"><div><h3 id="tax-rule-lifecycle-title" className="font-bold text-[#06201c]">Tax Rule lifecycle confirmation preview</h3><p className="mt-1 text-sm leading-6 text-[#52736a]">No authoritative rule is selected. These controls demonstrate the future review flow only.</p></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm text-[#52736a]">Close</button></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Review details</button><button type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Activate</button><button type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Edit next version</button><button type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Retire / deactivate</button></div><p className="mt-3 text-xs leading-5 text-[#7f9d94]">Activation, editing and retirement require backend validation and explicit confirmation. Completed transactions must retain their historical tax treatment.</p></section>;
}

function TaxRulesSection() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [taxType, setTaxType] = useState<TaxType | "all">("all");
  const [status, setStatus] = useState<TaxRuleStatusFilter>("all");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [showLifecyclePreview, setShowLifecyclePreview] = useState(false);
  const rules = useMemo(() => filterTaxRules(taxRulePreviews, search, country, taxType, status), [country, search, status, taxType]);

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="tax-rules-title">
      <SectionHeading title="Tax Rules" titleId="tax-rules-title" description="No tax rules are loaded in this preview. Tax depends on jurisdiction, classification and effective date." action={<button type="button" onClick={() => setFormMode("add")} className="rounded-full bg-[#1f6a58] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#195646]">Add Tax Rule preview</button>} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-[#31594d]">Search<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rule, country or region" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Country<select value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]"><option value="all">All countries</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Tax type<select value={taxType} onChange={(event) => setTaxType(event.target.value as TaxType | "all")} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]"><option value="all">All tax types</option>{taxTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="text-sm font-semibold text-[#31594d]">Status<select value={status} onChange={(event) => setStatus(event.target.value as TaxRuleStatusFilter)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]">{taxRuleStatuses.map((option) => <option key={option} value={option}>{option === "all" ? "All statuses" : option}</option>)}</select></label>
      </div>
      {formMode ? <TaxRuleFormPreview mode={formMode} onClose={() => setFormMode(null)} /> : null}
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[1050px] w-full text-left text-sm"><caption className="sr-only">Tax rule preview list</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.06em] text-[#52736a]"><tr><th className="px-4 py-3">Rule name</th><th className="px-4 py-3">Country</th><th className="px-4 py-3">State / Region</th><th className="px-4 py-3">Tax type</th><th className="px-4 py-3">Tax %</th><th className="px-4 py-3">Effective From</th><th className="px-4 py-3">Effective To</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{rules.length > 0 ? rules.map((rule) => <tr key={rule.id} className="border-b border-[#edf3f0]"><td className="px-4 py-3 font-semibold text-[#06201c]">{rule.name}</td><td className="px-4 py-3">{rule.country}</td><td className="px-4 py-3">{rule.region}</td><td className="px-4 py-3">{rule.taxType}</td><td className="px-4 py-3">{rule.percentage}</td><td className="px-4 py-3">{rule.effectiveFrom}</td><td className="px-4 py-3">{rule.effectiveTo}</td><td className="px-4 py-3"><PreviewBadge /></td><td className="px-4 py-3"><button type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Unavailable</button></td></tr>) : <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-[#52736a]">No authoritative tax rules are available.</td></tr>}</tbody></table></div>
      <button type="button" onClick={() => setShowLifecyclePreview((current) => !current)} className="mt-4 rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Preview rule lifecycle confirmations</button>
      {showLifecyclePreview ? <TaxRuleLifecyclePreview onClose={() => setShowLifecyclePreview(false)} /> : null}
      <DisabledNote>Rule details, Activate, Edit next version and Retire actions remain disabled until tax-rule APIs are available. Historical completed transactions must not be recalculated.</DisabledNote>
    </section>
  );
}

function TaxClassesSection() {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="tax-classes-title">
      <SectionHeading title="Tax Classes" titleId="tax-classes-title" description="These labels illustrate the planned classification surface and are not configured tax classes." action={<button type="button" onClick={() => setShowPreview((current) => !current)} className="rounded-full border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Add Tax Class preview</button>} />
      <div className="mt-5 grid gap-4 md:grid-cols-3">{taxClassPreviews.map((taxClass) => <article key={taxClass.name} className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-bold text-[#06201c]">{taxClass.name}</h3><PreviewBadge /></div><p className="mt-3 text-sm text-[#52736a]">Linked rules: {taxClass.linkedRules}</p><p className="mt-1 text-sm text-[#52736a]">Offering categories: {taxClass.offeringCategories}</p><p className="mt-1 text-sm text-[#52736a]">Enterprises: {taxClass.enterprises}</p><button type="button" disabled className="mt-4 rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Actions unavailable</button></article>)}</div>
      {showPreview ? <section className="mt-4 rounded-2xl border border-[#d7e5df] bg-white p-5" role="dialog" aria-labelledby="tax-class-preview-title"><div className="flex items-start justify-between gap-3"><div><h3 id="tax-class-preview-title" className="font-bold text-[#06201c]">Add Tax Class preview</h3><p className="mt-1 text-sm text-[#52736a]">Tax Class CRUD APIs are not documented, so this form cannot persist data.</p></div><button type="button" onClick={() => setShowPreview(false)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm text-[#52736a]">Close</button></div><label className="mt-4 block text-sm font-semibold text-[#31594d]">Tax Class Name<input disabled placeholder="Class name" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label><div className="mt-4 flex gap-2"><button type="button" disabled className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save Tax Class</button><button type="button" onClick={() => setShowPreview(false)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm text-[#52736a]">Cancel</button></div></section> : null}
    </section>
  );
}

function TaxExemptionReviewPreview({ onClose }: { onClose: () => void }) {
  return <section className="mt-4 rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] p-4" role="dialog" aria-labelledby="tax-exemption-review-title"><div className="flex items-start justify-between gap-3"><div><h3 id="tax-exemption-review-title" className="font-bold text-[#06201c]">Tax exemption review preview</h3><p className="mt-1 text-sm leading-6 text-[#52736a]">No authoritative exemption record is selected. Review and approval actions remain unavailable until the documented API and authorization scope are connected.</p></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm text-[#52736a]">Close</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#edf3f0] bg-white p-3 text-sm text-[#52736a]">Identification: not available</div><div className="rounded-xl border border-[#edf3f0] bg-white p-3 text-sm text-[#52736a]">Jurisdiction and effective period: not available</div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Approve exemption</button><button type="button" disabled className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Reject exemption</button></div></section>;
}

function TaxExemptionsSection() {
  const [status, setStatus] = useState<ExemptionStatusFilter>("all");
  const [showReviewPreview, setShowReviewPreview] = useState(false);
  const exemptions = useMemo(() => filterTaxExemptions(taxExemptionPreviews, status), [status]);
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="tax-exemptions-title">
      <SectionHeading title="Tax Exemptions" titleId="tax-exemptions-title" description="Review states and authorized identification fields without exposing unnecessary sensitive tax identifiers." action={<div className="flex flex-wrap items-end gap-3"><label className="text-sm font-semibold text-[#31594d]">Status<select value={status} onChange={(event) => setStatus(event.target.value as ExemptionStatusFilter)} className="mt-1 h-10 rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="all">All statuses</option>{exemptionStatuses.slice(1).map((option) => <option key={option} value={option}>{option}</option>)}</select></label><button type="button" onClick={() => setShowReviewPreview((current) => !current)} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Review exemption preview</button></div>} />
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[900px] w-full text-left text-sm"><caption className="sr-only">Tax exemption preview list</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.06em] text-[#52736a]"><tr><th className="px-4 py-3">Status</th><th className="px-4 py-3">Customer / business</th><th className="px-4 py-3">Jurisdiction</th><th className="px-4 py-3">GSTIN / VAT / certificate</th><th className="px-4 py-3">Effective period</th><th className="px-4 py-3">Review</th></tr></thead><tbody>{exemptions.length > 0 ? exemptions.map((exemption) => <tr key={exemption.id} className="border-b border-[#edf3f0]"><td className="px-4 py-3">{exemption.status}</td><td className="px-4 py-3">{exemption.customer}</td><td className="px-4 py-3">{exemption.jurisdiction}</td><td className="px-4 py-3">{exemption.taxIdentifier}</td><td className="px-4 py-3">{exemption.effectivePeriod}</td><td className="px-4 py-3"><button type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Unavailable</button></td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#52736a]">No tax exemption records are available for this status.</td></tr>}</tbody></table></div>
      {showReviewPreview ? <TaxExemptionReviewPreview onClose={() => setShowReviewPreview(false)} /> : null}
      <DisabledNote>Exemption review, approval and rejection actions require the documented exemption APIs and authorization scope.</DisabledNote>
    </section>
  );
}

function TaxRuleHistorySection() {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="tax-rule-history-title"><SectionHeading title="Tax Rule History" titleId="tax-rule-history-title" description="Historical rule versions will be loaded from the documented versions endpoint; no audit records are fabricated." action={<PreviewBadge />} /><div className="mt-5 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[800px] w-full text-left text-sm"><caption className="sr-only">Tax rule version history</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.06em] text-[#52736a]"><tr><th className="px-4 py-3">Rule name</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Previous rate</th><th className="px-4 py-3">Updated rate</th><th className="px-4 py-3">Effective dates</th><th className="px-4 py-3">Changed by</th></tr></thead><tbody><tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#52736a]">No tax rule history is available.</td></tr></tbody></table></div></section>;
}

function TaxBusinessRulesNotice() {
  return <aside className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="tax-business-rules-title"><h2 id="tax-business-rules-title" className="text-lg font-bold text-[#06201c]">Tax calculation dependencies</h2><ul className="mt-3 grid gap-2 text-sm leading-6 text-[#52736a] md:grid-cols-2"><li>Jurisdiction, tax classification and effective date determine applicable rules.</li><li>Same-state and different-state rules may produce different taxes.</li><li>Tax-inclusive and tax-exclusive prices require different backend calculations.</li><li>Approved exemptions and reverse-charge rules may affect calculations.</li><li>Tax changes must not recalculate completed transactions.</li><li>Finance must confirm tax rates before production use.</li></ul><p className="mt-4 text-xs leading-5 text-[#7f9d94]">Tax calculation, checkout quotes, expiry and customer confirmation remain future payment/checkout integration dependencies.</p></aside>;
}

export default function PlatformTaxManagementScreen() {
  return <div className="space-y-5" aria-labelledby="tax-management-page-title"><h2 id="tax-management-page-title" className="sr-only">Tax Management</h2><TaxRulesSection /><TaxClassesSection /><TaxExemptionsSection /><TaxRuleHistorySection /><TaxBusinessRulesNotice /></div>;
}
