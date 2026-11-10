"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CommerceApiError, getTaxExemptions, getTaxHistory, getTaxRuleHistory, getTaxRules, type TaxExemptionResponse, type TaxRuleResponse } from "@ihp/commerce";

import { platformCommerceRequest } from "../lib/platform-commerce-client";
import { buildTaxHistoryParams, exemptionJurisdiction, filterBackendTaxRules, maskTaxRegistrationNumber, taxRuleVersionDetails, taxRuleVersionHistoryDescription, taxRuleVersionsQueryKey } from "./platform-tax-live";
import PlatformTaxRuleEditor from "./PlatformTaxRuleEditor";

const PAGE_SIZE = 50;
const card = "rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6";
const table = "min-w-[900px] w-full text-left text-sm";

function errorText(error: unknown): string {
  return error instanceof CommerceApiError ? `${error.status} · ${error.message}` : "The authenticated tax service is temporarily unavailable.";
}

function Heading({ title, id, description, action }: { title: string; id: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-[#edf3f0] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 id={id} className="text-lg font-bold text-[#06201c]">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#52736a]">{description}</p></div>{action}</div>;
}

function QueryState({ label, error, retry, empty }: { label: string; error?: unknown; retry: () => void; empty?: boolean }) {
  if (error) return <div className="mt-5 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="font-semibold text-[#b42318]">Unable to load {label}</p><p className="mt-1 text-sm text-[#7f2f28]">{errorText(error)}</p><button type="button" onClick={retry} className="mt-3 rounded-full border border-[#dba8a2] px-3 py-1.5 text-sm font-semibold text-[#9c2f24]">Retry</button></div>;
  if (empty) return <p className="mt-5 rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-5 text-sm text-[#52736a]">No {label} were returned for this request.</p>;
  return <p className="mt-5 rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-5 text-sm text-[#52736a]" role="status">Loading {label}…</p>;
}

function RuleRow({ rule, onHistory, onEdit }: { rule: TaxRuleResponse; onHistory: (rule: TaxRuleResponse) => void; onEdit: (rule: TaxRuleResponse) => void }) {
  const { t } = useTranslation("platformTaxRules");
  return <tr className="border-b border-[#edf3f0] last:border-0"><td className="break-all px-4 py-3 text-xs text-[#52736a]">{rule.id}</td><td className="px-4 py-3 font-semibold text-[#06201c]">{rule.name}</td><td className="px-4 py-3">{rule.country}{rule.state ? ` / ${rule.state}` : ""}</td><td className="px-4 py-3">{rule.tax_type}</td><td className="px-4 py-3">{rule.rate}</td><td className="px-4 py-3">{rule.applies_to}</td><td className="px-4 py-3">{rule.condition}</td><td className="px-4 py-3">{rule.rounding_mode}</td><td className="px-4 py-3">{rule.reverse_charge_allowed ? "Allowed" : "Not allowed"}</td><td className="whitespace-nowrap px-4 py-3">{rule.valid_from}</td><td className="whitespace-nowrap px-4 py-3">{rule.valid_to ?? "No end supplied"}</td><td className="px-4 py-3">{rule.is_active ? "Active" : "Inactive"}{rule.is_current === false ? " · historical version" : ""}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onHistory(rule)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">View versions</button><button type="button" onClick={() => onEdit(rule)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">{t("editAction")}</button><button type="button" disabled title={t("disableUnavailable")} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{t("disableUnavailableLabel")}</button></div></td></tr>;
}

function TaxRuleVersionHistorySection({ rule, onClear }: { rule: TaxRuleResponse | null; onClear: () => void }) {
  const query = useQuery({
    queryKey: taxRuleVersionsQueryKey(rule?.id ?? null),
    queryFn: () => {
      if (!rule) throw new Error("Select a tax rule to request its version history.");
      return getTaxRuleHistory(rule.id, platformCommerceRequest);
    },
    enabled: rule !== null,
    retry: false,
    staleTime: 30_000,
  });
  return <section className={card} aria-labelledby="tax-version-history-title"><Heading title="Tax Rule Version History" id="tax-version-history-title" description={taxRuleVersionHistoryDescription(rule)} action={rule ? <button type="button" onClick={onClear} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a]">Clear selected rule</button> : null} />
    {!rule ? <p className="mt-4 rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-5 text-sm text-[#52736a]" role="status">Select a tax rule to view its version history. Version history has not been requested while no rule is selected.</p> : null}
    {rule && query.isPending ? <QueryState label="rule versions" retry={() => void query.refetch()} /> : null}
    {rule && query.isError ? <QueryState label="rule versions" error={query.error} retry={() => void query.refetch()} /> : null}
    {rule && query.data && query.data.items.length === 0 ? <p className="mt-5 rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-5 text-sm text-[#52736a]">No version records were returned for this rule.</p> : null}
    {rule && query.data && query.data.items.length > 0 ? <div className="mt-4 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[1450px] w-full text-left text-sm"><caption className="sr-only">Backend tax rule version history</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase text-[#52736a]"><tr><th className="px-3 py-2">Version</th><th className="px-3 py-2">Rule name</th><th className="px-3 py-2">Tax type</th><th className="px-3 py-2">Rate</th><th className="px-3 py-2">applies_to</th><th className="px-3 py-2">Effective from</th><th className="px-3 py-2">Effective to</th><th className="px-3 py-2">Active / current</th><th className="px-3 py-2">Created at/by</th><th className="px-3 py-2">Notes / supersedes</th></tr></thead><tbody>{query.data.items.map((record) => { const version = taxRuleVersionDetails(record); return <tr key={`${version.id}-${version.version}`} className="border-t border-[#edf3f0]"><td className="px-3 py-2">{version.version}</td><td className="px-3 py-2">{version.name}</td><td className="px-3 py-2">{version.taxType}</td><td className="px-3 py-2">{version.rate}</td><td className="px-3 py-2">{version.appliesTo}</td><td className="px-3 py-2">{version.effectiveFrom}</td><td className="px-3 py-2">{version.effectiveTo ?? "Not supplied"}</td><td className="px-3 py-2">{version.active ? "Active" : "Inactive"} / {version.current === undefined ? "Current status not supplied" : version.current ? "Current" : "Historical"}</td><td className="px-3 py-2">{version.createdAt}{version.createdBy ? <span className="block text-xs">{version.createdBy}</span> : null}</td><td className="px-3 py-2">{version.notes ?? "No notes supplied"}{version.supersedesId ? <span className="block break-all text-xs">Supersedes {version.supersedesId}</span> : null}</td></tr>; })}</tbody></table></div> : null}
  </section>;
}

function TaxRulesSection({ onSelectRule, onEditRule, onCreateRule }: { onSelectRule: (rule: TaxRuleResponse) => void; onEditRule: (rule: TaxRuleResponse) => void; onCreateRule: () => void }) {
  const { t } = useTranslation("platformTaxRules");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [taxType, setTaxType] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const query = useQuery({ queryKey: ["platform-commerce", "tax", "rules"], queryFn: () => getTaxRules({ current_only: true }, platformCommerceRequest), retry: false, staleTime: 30_000 });
  const rules = useMemo(() => filterBackendTaxRules(query.data?.items ?? [], { search, country, taxType, status }), [query.data, search, country, taxType, status]);
  const countries = Array.from(new Set((query.data?.items ?? []).map((rule) => rule.country)));
  const types = Array.from(new Set((query.data?.items ?? []).map((rule) => rule.tax_type)));
  return <section className={card} aria-labelledby="tax-rules-title"><Heading title="Tax Rules" id="tax-rules-title" description="Backend-authoritative rules. Rate strings and applies_to classifications are displayed without tax calculation or local mutation." action={<button type="button" onClick={onCreateRule} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58]">{t("createAction")}</button>} />
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-semibold text-[#31594d]">Search<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID, rule, jurisdiction, applies_to" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="text-sm font-semibold text-[#31594d]">Country<select value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="all">All countries</option>{countries.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-semibold text-[#31594d]">Tax type<select value={taxType} onChange={(event) => setTaxType(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="all">All tax types</option>{types.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-semibold text-[#31594d]">Active state<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="all">All states</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
    {query.isPending ? <QueryState label="tax rules" retry={() => void query.refetch()} /> : query.isError ? <QueryState label="tax rules" error={query.error} retry={() => void query.refetch()} /> : query.data.items.length === 0 ? <QueryState label="tax rules" empty retry={() => void query.refetch()} /> : <div className="mt-5 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[1650px] w-full text-left text-sm"><caption className="sr-only">Backend tax rules</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase text-[#52736a]"><tr><th className="px-4 py-3">Rule ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Country / state</th><th className="px-4 py-3">Tax type</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">applies_to</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Rounding</th><th className="px-4 py-3">Reverse charge</th><th className="px-4 py-3">Effective from</th><th className="px-4 py-3">Effective to</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{rules.length ? rules.map((rule) => <RuleRow key={rule.id} rule={rule} onHistory={onSelectRule} onEdit={onEditRule} />) : <tr><td colSpan={13} className="px-4 py-10 text-center text-sm text-[#52736a]">No tax rules match these filters.</td></tr>}</tbody></table></div>}
    {query.data ? <p className="mt-2 text-xs text-[#7f9d94]">Showing {rules.length} of {query.data.total} returned rules. Priority: {rules[0]?.priority ?? "Not supplied"}. Each row’s version history is available separately.</p> : null}
    <p className="mt-3 text-xs text-[#7f9d94]">{t("rulesMutationNote")}</p>
  </section>;
}

function TaxHistorySection() {
  const [country, setCountry] = useState("");
  const [taxType, setTaxType] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => buildTaxHistoryParams({ country, taxType, tenantId, paymentId, from, to, page }, PAGE_SIZE), [country, taxType, tenantId, paymentId, from, to, page]);
  const query = useQuery({ queryKey: ["platform-commerce", "tax", "history", params], queryFn: () => getTaxHistory(params, platformCommerceRequest), placeholderData: keepPreviousData, retry: false, staleTime: 30_000 });
  const pageCount = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.page_size)) : 1;
  const setFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };
  return <section className={card} aria-labelledby="tax-history-title"><Heading title="Tax History" id="tax-history-title" description="Stored transaction tax snapshots from the backend; values and timestamps are not recomputed." />
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-semibold text-[#31594d]">Country<input value={country} onChange={(event) => setFilter(setCountry)(event.target.value)} maxLength={2} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="text-sm font-semibold text-[#31594d]">Tax type<input value={taxType} onChange={(event) => setFilter(setTaxType)(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="text-sm font-semibold text-[#31594d]">Enterprise / tenant ID (Super Admin)<input value={tenantId} onChange={(event) => setFilter(setTenantId)(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="text-sm font-semibold text-[#31594d]">Payment ID<input value={paymentId} onChange={(event) => setFilter(setPaymentId)(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="text-sm font-semibold text-[#31594d]">From (local date/time)<input type="datetime-local" value={from} onChange={(event) => setFilter(setFrom)(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="text-sm font-semibold text-[#31594d]">To (local date/time)<input type="datetime-local" value={to} onChange={(event) => setFilter(setTo)(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label></div>
    {query.isPending ? <QueryState label="tax history" retry={() => void query.refetch()} /> : query.isError ? <QueryState label="tax history" error={query.error} retry={() => void query.refetch()} /> : query.data.items.length === 0 ? <QueryState label="tax history" empty retry={() => void query.refetch()} /> : <><p className="mt-3 text-xs text-[#7f9d94]">Page {query.data.page} of {pageCount} · {query.data.total} records · {query.data.page_size} per page</p><div className="mt-4 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className={table}><caption className="sr-only">Backend tax history</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase text-[#52736a]"><tr><th className="px-4 py-3">Payment / record</th><th className="px-4 py-3">Jurisdiction</th><th className="px-4 py-3">Tax type</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Taxable amount</th><th className="px-4 py-3">Tax amount / item currency</th><th className="px-4 py-3">Tax amount / charge currency</th><th className="px-4 py-3">Exempt / reverse charge</th><th className="px-4 py-3">Recorded at</th></tr></thead><tbody>{query.data.items.map((row) => <tr key={row.id} className="border-t border-[#edf3f0]"><td className="break-all px-4 py-3 text-xs">{row.payment_id}<span className="block text-[#7f9d94]">Tax record {row.id}</span></td><td className="px-4 py-3">{row.country}{row.state ? ` / ${row.state}` : ""}</td><td className="px-4 py-3">{row.tax_type} · {row.name}</td><td className="px-4 py-3">{row.rate}</td><td className="px-4 py-3">{row.taxable_amount} {row.item_currency}</td><td className="px-4 py-3">{row.tax_amount} {row.item_currency}</td><td className="px-4 py-3">{row.tax_amount_charge} {row.charge_currency}</td><td className="px-4 py-3">{row.is_exempt ? "Exempt" : "Not exempt"} / {row.is_reverse_charge ? "Reverse charge" : "Standard charge"}</td><td className="whitespace-nowrap px-4 py-3">{row.created_at}</td></tr>)}</tbody></table></div><Pager page={query.data.page} pages={pageCount} busy={query.isFetching} onPage={setPage} /></>}
  </section>;
}

function Pager({ page, pages, busy, onPage }: { page: number; pages: number; busy: boolean; onPage: (page: number) => void }) {
  return <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#52736a]"><span>Page {page} of {pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:opacity-50">Previous</button><button type="button" disabled={page >= pages || busy} onClick={() => onPage(page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:opacity-50">Next</button></div></div>;
}

function TaxExemptionsSection() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["platform-commerce", "tax", "exemptions", status, page], queryFn: () => getTaxExemptions({ status: status || undefined, page, page_size: PAGE_SIZE }, platformCommerceRequest), placeholderData: keepPreviousData, retry: false, staleTime: 30_000 });
  const pageCount = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;
  return <section className={card} aria-labelledby="tax-exemptions-title"><Heading title="Tax Registrations & Exemptions" id="tax-exemptions-title" description="Authorized registration records from the backend. Certificate numbers are masked; personal user IDs and legal names are not displayed." />
    <label className="mt-4 inline-block text-sm font-semibold text-[#31594d]">Status filter<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1 block h-10 min-w-52 rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">All statuses</option>{[...new Set(["pending", "approved", "rejected", "expired", "revoked", ...(query.data?.items ?? []).map((entry) => entry.status)])].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    {query.isPending ? <QueryState label="tax exemption records" retry={() => void query.refetch()} /> : query.isError ? <QueryState label="tax exemption records" error={query.error} retry={() => void query.refetch()} /> : query.data.items.length === 0 ? <QueryState label="tax exemption records" empty retry={() => void query.refetch()} /> : <><div className="mt-4 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[1050px] w-full text-left text-sm"><caption className="sr-only">Backend tax registrations and exemptions</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase text-[#52736a]"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Registration type</th><th className="px-4 py-3">Jurisdiction</th><th className="px-4 py-3">Registration number (masked)</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Format check</th><th className="px-4 py-3">Valid until</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Reviewed / details</th></tr></thead><tbody>{query.data.items.map((entry) => <ExemptionRow key={entry.id} entry={entry} />)}</tbody></table></div><Pager page={page} pages={pageCount} busy={query.isFetching} onPage={setPage} /><p className="mt-2 text-xs text-[#7f9d94]">{query.data.total} records total. Approval, rejection and revocation are disabled; this screen performs no exemption mutations.</p></>}
  </section>;
}

function ExemptionRow({ entry }: { entry: TaxExemptionResponse }) {
  return <tr className="border-t border-[#edf3f0]"><td className="break-all px-4 py-3 text-xs">{entry.id}</td><td className="px-4 py-3">{entry.id_type}</td><td className="px-4 py-3">{exemptionJurisdiction(entry)}</td><td className="px-4 py-3">{maskTaxRegistrationNumber(entry.number)}</td><td className="px-4 py-3">{entry.status}</td><td className="px-4 py-3">{entry.format_valid ? "Valid format" : "Invalid format"}</td><td className="px-4 py-3">{entry.valid_until ?? "Not supplied"}</td><td className="px-4 py-3">{entry.created_at}</td><td className="px-4 py-3">{entry.reviewed_at ?? "Not reviewed"}{entry.reviewed_by ? <span className="block text-xs text-[#52736a]">Reviewer: {entry.reviewed_by}</span> : null}{entry.review_note ? <span className="block max-w-sm whitespace-normal text-xs text-[#52736a]">{entry.review_note}</span> : null}</td></tr>;
}

function TaxClassesNotice() {
  return <section className={card} aria-labelledby="tax-classes-title"><Heading title="Tax Classes" id="tax-classes-title" description="No separate Tax Class CRUD API is available." /><p className="mt-4 text-sm leading-6 text-[#52736a]">Product <code>tax_class</code> values are matched against the backend tax rules’ <code>applies_to</code> field. This page does not create or infer class records, and Product forms and tax calculations are unchanged.</p></section>;
}

function TaxPolicyNotice() {
  return <aside className={card} aria-labelledby="tax-policy-title"><h2 id="tax-policy-title" className="text-lg font-bold text-[#06201c]">Tax calculation and historical-record policy</h2><ul className="mt-3 grid gap-2 text-sm leading-6 text-[#52736a] md:grid-cols-2"><li>Jurisdiction, classification, effective date, exemption and reverse-charge rules are applied by the backend.</li><li>Tax-inclusive/exclusive price handling is backend-authoritative.</li><li>Tax changes do not recalculate completed payments; historical tax snapshots are preserved.</li><li>No tax calculation or tax mutation API is called by this screen.</li></ul></aside>;
}

/** Renders backend tax rules, versions, transaction history and exemption records through the Super Admin BFF. */
export default function PlatformTaxManagementLiveScreen() {
  const [selectedRule, setSelectedRule] = useState<TaxRuleResponse | null>(null);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; rule?: TaxRuleResponse } | null>(null);
  return <div className="space-y-5" aria-labelledby="tax-management-page-title"><h2 id="tax-management-page-title" className="sr-only">Tax Management</h2><TaxRulesSection onSelectRule={setSelectedRule} onCreateRule={() => setEditor({ mode: "create" })} onEditRule={(rule) => setEditor({ mode: "edit", rule })} />{editor ? <PlatformTaxRuleEditor key={`${editor.mode}-${editor.rule?.id ?? "new"}`} mode={editor.mode} rule={editor.rule} onClose={() => setEditor(null)} /> : null}<TaxRuleVersionHistorySection rule={selectedRule} onClear={() => setSelectedRule(null)} /><TaxClassesNotice /><TaxHistorySection /><TaxExemptionsSection /><TaxPolicyNotice /></div>;
}
