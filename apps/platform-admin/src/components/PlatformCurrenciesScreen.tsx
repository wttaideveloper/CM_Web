"use client";

import { useMemo, useState, type ReactNode } from "react";

import PlatformCurrenciesLiveScreen from "./PlatformCurrenciesLiveScreen";

import {
  commercePreviewMutationsDisabled,
  currencyPreviews,
  exchangeRateHistoryPreviews,
  exchangeRatePreview,
  filterCurrencyPreviews,
  filterExchangeRateHistory,
  togglePreviewPanel,
  currencySectionHeadingIds,
  type CurrencyStatusFilter,
  type CurrencyPreview,
  type ExchangeRateHistoryPreview,
} from "./platform-currencies";

function PreviewBadge() {
  return <span className="inline-flex rounded-full bg-[#fff7e5] px-3 py-1 text-xs font-bold text-[#8a5a00]">Preview only</span>;
}

function DisabledActionNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs leading-5 text-[#7f9d94]">{children}</p>;
}

function SectionHeading({ title, titleId, description, action }: { title: string; titleId: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#edf3f0] pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 id={titleId} className="text-lg font-bold text-[#06201c]">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#52736a]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function BaseCurrencySection() {
  const [showImpactReview, setShowImpactReview] = useState(false);

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={currencySectionHeadingIds.base}>
      <SectionHeading
        title="Base Currency"
        titleId={currencySectionHeadingIds.base}
        description="The base currency will be used for platform financial reporting once the supported configuration contract is available."
        action={<PreviewBadge />}
      />
      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <div>
          <label htmlFor="base-currency-preview" className="text-sm font-semibold text-[#31594d]">Current platform base currency</label>
          <select id="base-currency-preview" disabled value="" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#7f9d94] disabled:cursor-not-allowed">
            <option value="">Not configured or available</option>
          </select>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#31594d]">Currency code and name</p>
          <div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">Unknown until backend data is loaded</div>
        </div>
        <button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full bg-[#1f6a58] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save base currency</button>
      </div>
      <div className="mt-4 rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
        <p className="text-sm font-semibold text-[#31594d]">Impact review required</p>
        <p className="mt-1 text-sm leading-6 text-[#52736a]">Changing the base currency could affect accounting reports, settlement presentation, exchange-rate history and future transaction reconciliation. Existing completed-payment values must remain historically unchanged.</p>
        <button type="button" onClick={() => setShowImpactReview((current) => togglePreviewPanel(current))} className="mt-3 rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-white">{showImpactReview ? "Hide impact review" : "Preview impact review"}</button>
        {showImpactReview ? <div className="mt-3 rounded-xl border border-[#e8dfbd] bg-[#fffdf4] p-3 text-sm leading-6 text-[#6f5a1b]" role="status">Preview only: no currency is selected, saved or changed. A future implementation must show affected accounting/reporting scopes and require an explicit confirmation after backend validation.</div> : null}
      </div>
      <DisabledActionNote>The API contract is not connected in this UI phase, so no base currency value is inferred or changed.</DisabledActionNote>
    </section>
  );
}

function CurrencyRow({ currency }: { currency: CurrencyPreview }) {
  return (
    <tr className="border-b border-[#edf3f0] last:border-b-0">
      <td className="px-4 py-3 font-bold text-[#06201c]">{currency.code}</td>
      <td className="px-4 py-3 text-[#31594d]">{currency.name}</td>
      <td className="px-4 py-3 text-[#52736a]">{currency.decimalPrecision}</td>
      <td className="px-4 py-3 text-[#52736a]">{currency.minimumPayment}</td>
      <td className="px-4 py-3 text-[#52736a]">{currency.maximumPayment}</td>
      <td className="px-4 py-3"><PreviewBadge /></td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2" aria-label={`${currency.code} currency status controls`}>
          <button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">Enable</button>
          <button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">Disable</button>
        </div>
      </td>
    </tr>
  );
}

function AddCurrencyPreview({ onClose }: { onClose: () => void }) {
  return (
    <section className="mt-4 rounded-2xl border border-[#d7e5df] bg-white p-5" role="dialog" aria-labelledby="add-currency-preview-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="add-currency-preview-title" className="font-bold text-[#06201c]">Add Currency</h3>
          <p className="mt-1 text-sm leading-6 text-[#52736a]">This is a non-editable preview until the currency management API is connected.</p>
        </div>
        <button type="button" onClick={onClose} className="self-start rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">Close</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-[#31594d]">Currency code<input disabled placeholder="ISO 4217 code" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a] disabled:cursor-not-allowed" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Currency name<input disabled placeholder="Currency name" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a] disabled:cursor-not-allowed" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save currency</button>
        <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">Cancel</button>
      </div>
    </section>
  );
}

export function SupportedCurrenciesSection() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CurrencyStatusFilter>("all");
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const filteredCurrencies = useMemo(() => {
    return filterCurrencyPreviews(currencyPreviews, search, status);
  }, [search, status]);

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={currencySectionHeadingIds.supported}>
      <SectionHeading
        title="Supported Currencies"
        titleId={currencySectionHeadingIds.supported}
        description="Illustrative catalog rows show the planned management surface only; they are not claims about currently enabled currencies."
        action={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowAddCurrency((current) => togglePreviewPanel(current))} className="rounded-full border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Add currency preview</button><button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full bg-[#1f6a58] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save supported currencies</button></div>}
      />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm font-semibold text-[#31594d]">Search currencies<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Code or name" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
        <label className="sm:w-52 text-sm font-semibold text-[#31594d]">Status<select value={status} onChange={(event) => setStatus(event.target.value as CurrencyStatusFilter)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]"><option value="all">All statuses</option><option value="preview-only">Preview only</option></select></label>
      </div>
      <DisabledActionNote>All rows are illustrative. Enable, Disable and Save controls remain disabled until the supported-currencies API is connected.</DisabledActionNote>
      {showAddCurrency ? <AddCurrencyPreview onClose={() => setShowAddCurrency(false)} /> : null}
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#edf3f0]">
        <table className="min-w-[920px] w-full text-left text-sm">
          <caption className="sr-only">Supported currency preview catalog</caption>
          <thead className="bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.06em] text-[#52736a]"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Currency name</th><th className="px-4 py-3">Decimals</th><th className="px-4 py-3">Minimum payment</th><th className="px-4 py-3">Maximum payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{filteredCurrencies.length > 0 ? filteredCurrencies.map((currency) => <CurrencyRow key={currency.code} currency={currency} />) : <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#52736a]">No preview currencies match these filters.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}

export function ExchangeRateSection() {
  const [showOverride, setShowOverride] = useState(false);

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={currencySectionHeadingIds.exchangeRates}>
      <SectionHeading
        title="Exchange Rates"
        titleId={currencySectionHeadingIds.exchangeRates}
        description="Rates are displayed only when returned by an authoritative backend source. No conversion or rate refresh is performed here."
        action={<PreviewBadge />}
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-[#31594d]">Exchange-rate provider<select disabled value="" onChange={() => undefined} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#7f9d94] disabled:cursor-not-allowed"><option value="">Unknown / unconfigured</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Automatic refresh frequency<select disabled value="" onChange={() => undefined} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#7f9d94] disabled:cursor-not-allowed"><option value="">Unknown / unconfigured</option></select></label>
        <div><p className="text-sm font-semibold text-[#31594d]">Rate source</p><div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">{exchangeRatePreview.source}</div></div>
        <div><p className="text-sm font-semibold text-[#31594d]">Last updated</p><div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">{exchangeRatePreview.lastUpdated}</div></div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="text-sm font-semibold text-[#31594d]">Base currency</p><div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">{exchangeRatePreview.baseCurrency}</div></div>
        <div><p className="text-sm font-semibold text-[#31594d]">Target currency</p><div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">{exchangeRatePreview.targetCurrency}</div></div>
        <div><p className="text-sm font-semibold text-[#31594d]">Current exchange rate</p><div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">{exchangeRatePreview.rate}</div></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full bg-[#1f6a58] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Refresh rates</button>
        <button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">Save Configuration</button>
        <button type="button" onClick={() => setShowOverride((current) => !current)} className="rounded-full border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Manual override</button>
      </div>
      <DisabledActionNote>Refresh remains disabled until the rate provider contract is connected. Manual override opens a non-persistent preview form.</DisabledActionNote>
      {showOverride ? <ExchangeRateOverridePreview onClose={() => setShowOverride(false)} /> : null}
    </section>
  );
}

function ExchangeRateOverridePreview({ onClose }: { onClose: () => void }) {
  return (
    <section className="mt-5 rounded-2xl border border-[#d7e5df] bg-white p-5" role="dialog" aria-labelledby="exchange-rate-override-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h3 id="exchange-rate-override-title" className="font-bold text-[#06201c]">Manual Exchange Rate Override</h3><p className="mt-1 text-sm leading-6 text-[#52736a]">The requested reason and effective date fields await final backend contract confirmation.</p></div>
        <button type="button" onClick={onClose} className="self-start rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">Close</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold text-[#31594d]">Base currency<select disabled className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option>Not configured</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Target currency<select disabled className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option>Not configured</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Exchange rate<input disabled type="number" min="0.000001" step="any" placeholder="Not available" aria-describedby="exchange-rate-positive-guidance" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d] sm:col-span-2">Reason for override<textarea disabled placeholder="Reason is required by the planned workflow" className="mt-1 min-h-20 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 font-normal text-[#52736a]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Effective date and time<input disabled type="datetime-local" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]" /></label>
      </div>
      <p id="exchange-rate-positive-guidance" className="mt-3 text-xs leading-5 text-[#7f9d94]">When enabled, the exchange rate must be a finite number greater than zero. This preview does not accept or validate a value.</p>
      <label className="mt-4 flex items-center gap-2 text-sm text-[#52736a]"><input type="checkbox" disabled /> Pin as manual override</label>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save override</button><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">Cancel</button></div>
      <DisabledActionNote>Saving is disabled because this preview does not process or persist exchange-rate changes.</DisabledActionNote>
      <div className="mt-4 rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3 text-sm leading-6 text-[#52736a]" aria-label="Override audit information preview">
        <p className="font-semibold text-[#31594d]">Audit information preview</p>
        <p>Administrator: Not available</p>
        <p>Reason: Supplied when an override is persisted</p>
        <p>Change time: Not available</p>
      </div>
    </section>
  );
}

function ExchangeRateHistoryDetails({ record }: { record: ExchangeRateHistoryPreview | null }) {
  return (
    <aside className="mt-4 rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] p-4" aria-labelledby="exchange-rate-history-details-title">
      <h3 id="exchange-rate-history-details-title" className="font-bold text-[#06201c]">Rate history details</h3>
      {record ? <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><span className="font-semibold text-[#31594d]">Pair</span><p className="text-[#52736a]">{record.baseCurrency}/{record.targetCurrency}</p></div><div><span className="font-semibold text-[#31594d]">Rate</span><p className="text-[#52736a]">{record.rate}</p></div><div><span className="font-semibold text-[#31594d]">Source</span><p className="text-[#52736a]">{record.source}</p></div><div><span className="font-semibold text-[#31594d]">Effective time</span><p className="text-[#52736a]">{record.effectiveDate}</p></div><div><span className="font-semibold text-[#31594d]">Administrator</span><p className="text-[#52736a]">{record.updatedBy}</p></div><div><span className="font-semibold text-[#31594d]">Override</span><p className="text-[#52736a]">{record.override}</p></div></div> : <p className="mt-2 text-sm leading-6 text-[#52736a]">No authoritative history record is selected. Details will appear here when the history API returns a record.</p>}
    </aside>
  );
}

export function ExchangeRateHistorySection() {
  const [pair, setPair] = useState("all");
  const [selectedRate, setSelectedRate] = useState<ExchangeRateHistoryPreview | null>(null);
  const visibleHistory = filterExchangeRateHistory(exchangeRateHistoryPreviews, pair);

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={currencySectionHeadingIds.history}>
      <SectionHeading title="Exchange Rate History" titleId={currencySectionHeadingIds.history} description="Historical rates will appear after the rates history endpoint is connected." action={<label className="text-sm font-semibold text-[#31594d]">Currency pair<select value={pair} onChange={(event) => setPair(event.target.value)} className="mt-1 h-10 rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="all">All pairs</option><option value="INR/USD">INR / USD</option><option value="USD/EUR">USD / EUR</option></select></label>} />
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[820px] w-full text-left text-sm"><caption className="sr-only">Exchange rate history</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.06em] text-[#52736a]"><tr><th className="px-4 py-3">Currency pair</th><th className="px-4 py-3">Applied rate</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Effective date</th><th className="px-4 py-3">Updated by</th><th className="px-4 py-3">Override</th><th className="px-4 py-3">Details</th></tr></thead><tbody>{visibleHistory.length > 0 ? visibleHistory.map((item) => <tr key={`${item.baseCurrency}-${item.targetCurrency}-${item.effectiveDate}`} className="border-b border-[#edf3f0]"><td className="px-4 py-3 font-semibold text-[#06201c]">{item.baseCurrency}/{item.targetCurrency}</td><td className="px-4 py-3 text-[#52736a]">{item.rate}</td><td className="px-4 py-3 text-[#52736a]">{item.source}</td><td className="px-4 py-3 text-[#52736a]">{item.effectiveDate}</td><td className="px-4 py-3 text-[#52736a]">{item.updatedBy}</td><td className="px-4 py-3 text-[#52736a]">{item.override}</td><td className="px-4 py-3"><button type="button" onClick={() => setSelectedRate(item)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">View</button></td></tr>) : <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#52736a]">No exchange-rate history is available.</td></tr>}</tbody></table></div>
      <ExchangeRateHistoryDetails record={selectedRate} />
    </section>
  );
}

export function ProviderSettingsSection() {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={currencySectionHeadingIds.provider}>
      <SectionHeading title="Exchange Rate Provider Settings" titleId={currencySectionHeadingIds.provider} description="Provider configuration and automatic refresh frequency are intentionally unconfigured until a supported backend contract is available." action={<PreviewBadge />} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-[#31594d]">Provider<select disabled value="" onChange={() => undefined} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#7f9d94] disabled:cursor-not-allowed"><option value="">Unknown / unconfigured</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Automatic refresh frequency<select disabled value="" onChange={() => undefined} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#7f9d94] disabled:cursor-not-allowed"><option value="">Unknown / unconfigured</option></select></label>
        <div><p className="text-sm font-semibold text-[#31594d]">Last synchronization</p><div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">Unknown</div></div>
        <div><p className="text-sm font-semibold text-[#31594d]">Provider status</p><div className="mt-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#7f9d94]">Unavailable</div></div>
      </div>
      <div className="mt-4"><button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full bg-[#1f6a58] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save Configuration</button><DisabledActionNote>Provider selection and refresh frequency remain unknown until the backend configuration contract is available.</DisabledActionNote></div>
    </section>
  );
}

export function EnterpriseCurrencySection() {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={currencySectionHeadingIds.enterprise}>
      <SectionHeading title="Enterprise Currency Restrictions" titleId={currencySectionHeadingIds.enterprise} description="Configure allowed selling and settlement currencies per enterprise after the enterprise currency contract is confirmed." action={<PreviewBadge />} />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold text-[#31594d]">Enterprise<select disabled value="" onChange={() => undefined} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option value="">Enterprise data unavailable</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Allowed selling currencies<select disabled multiple value={[]} onChange={() => undefined} className="mt-1 min-h-24 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 font-normal text-[#52736a]"><option>Platform currencies unavailable</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Settlement currency<select disabled value="" onChange={() => undefined} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 font-normal text-[#52736a]"><option value="">Not configured</option></select></label>
      </div>
      <div className="mt-4"><button type="button" disabled={commercePreviewMutationsDisabled} className="rounded-full bg-[#1f6a58] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save Configuration</button><DisabledActionNote>Available currencies must be authorized by the platform and supported gateway. Enterprise currency configuration is awaiting backend contract confirmation; no settings are changed.</DisabledActionNote></div>
    </section>
  );
}

export default function PlatformCurrenciesScreen() {
  return <PlatformCurrenciesLiveScreen />;
}
