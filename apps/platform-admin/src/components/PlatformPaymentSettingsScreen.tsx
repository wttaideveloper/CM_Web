"use client";

import { useState } from "react";

import {
  getPaymentGatewayPreview,
  paymentGatewayPreviews,
  type PaymentGatewayId,
  type PaymentGatewayPreview,
} from "./platform-payment-settings";

const unavailableValue = "Unavailable until the backend contract is available";

function GatewayStatus({ gateway }: { gateway: PaymentGatewayPreview }) {
  const isUnsupported = gateway.availability === "unsupported";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isUnsupported ? "bg-[#fff1ef] text-[#b42318]" : "bg-[#fff7e5] text-[#8a5a00]"}`}>
      {isUnsupported ? "Not currently supported" : "Preview only"}
    </span>
  );
}

function GatewayCard({ gateway, onOpen }: { gateway: PaymentGatewayPreview; onOpen: (id: PaymentGatewayId) => void }) {
  const isUnsupported = gateway.availability === "unsupported";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => onOpen(gateway.id)}
        className="-m-2 rounded-xl p-2 text-left outline-none transition hover:bg-[#f4faf7] focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2"
        aria-label={`Open ${gateway.name} payment gateway details`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-[#06201c]">{gateway.name}</p>
            <p className="mt-1 text-sm text-[#52736a]">Payment gateway</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-lg font-bold text-[#1f6a58]" aria-hidden="true">
            {gateway.name.charAt(0)}
          </span>
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <GatewayStatus gateway={gateway} />
        <span className="text-xs font-semibold text-[#7f9d94]">Environment: {gateway.environment}</span>
      </div>
      <p className="mt-4 min-h-12 text-sm leading-6 text-[#52736a]">{gateway.summary}</p>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button type="button" onClick={() => onOpen(gateway.id)} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#195646] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">
          Configure
        </button>
        <button type="button" disabled aria-describedby={`${gateway.id}-disabled-actions`} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">
          Test connection
        </button>
        <button type="button" disabled aria-describedby={`${gateway.id}-disabled-actions`} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">
          {isUnsupported ? "Activate gateway" : "Activate / deactivate"}
        </button>
      </div>
      <p id={`${gateway.id}-disabled-actions`} className="mt-3 text-xs leading-5 text-[#7f9d94]">
        {isUnsupported ? "No backend support is documented for this gateway." : "Connection testing and activation are disabled until gateway APIs are documented."}
      </p>
    </article>
  );
}

function GatewayDetails({ gateway, onClose }: { gateway: PaymentGatewayPreview; onClose: () => void }) {
  const isUnsupported = gateway.availability === "unsupported";

  return (
    <section className="rounded-2xl border border-[#b9d8ce] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="payment-gateway-details-title">
      <div className="flex flex-col gap-3 border-b border-[#edf3f0] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7f9d94]">Gateway details</p>
          <h2 id="payment-gateway-details-title" className="mt-1 text-xl font-bold text-[#06201c]">{gateway.name}</h2>
          <p className="mt-1 text-sm leading-6 text-[#52736a]">{gateway.summary}</p>
        </div>
        <button type="button" onClick={onClose} className="self-start rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] transition hover:bg-[#f4faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">
          Close details
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="gateway-environment" className="text-sm font-semibold text-[#31594d]">Environment</label>
          <select id="gateway-environment" disabled value="unknown" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#52736a] disabled:cursor-not-allowed disabled:opacity-80">
            <option value="unknown">Unknown — not provided by backend</option>
          </select>
        </div>
        <div>
          <label htmlFor="gateway-assignment" className="text-sm font-semibold text-[#31594d]">Enterprise assignment</label>
          <select id="gateway-assignment" disabled value="unavailable" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#52736a] disabled:cursor-not-allowed disabled:opacity-80">
            <option value="unavailable">Unavailable — assignment API not documented</option>
          </select>
        </div>
        <div>
          <label htmlFor="gateway-public-key" className="text-sm font-semibold text-[#31594d]">Public credential</label>
          <input id="gateway-public-key" readOnly value="Not available in this preview" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#52736a]" />
        </div>
        <div>
          <label htmlFor="gateway-secret-key" className="text-sm font-semibold text-[#31594d]">Secret credential</label>
          <input id="gateway-secret-key" readOnly type="password" value="" placeholder="Not available in this preview" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#52736a]" aria-describedby="gateway-credentials-note" />
        </div>
        <div>
          <label htmlFor="gateway-currencies" className="text-sm font-semibold text-[#31594d]">Supported currencies</label>
          <input id="gateway-currencies" readOnly value={unavailableValue} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#52736a]" />
        </div>
        <div>
          <label htmlFor="gateway-methods" className="text-sm font-semibold text-[#31594d]">Payment methods</label>
          <input id="gateway-methods" readOnly value={unavailableValue} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#52736a]" />
        </div>
        <div>
          <label htmlFor="gateway-routing-priority" className="text-sm font-semibold text-[#31594d]">Routing priority</label>
          <input id="gateway-routing-priority" readOnly value="Unavailable — multi-gateway routing API not documented" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#52736a]" />
        </div>
      </div>

      <p id="gateway-credentials-note" className="mt-4 rounded-xl bg-[#f9fcfa] p-3 text-sm leading-6 text-[#52736a]">
        Credentials are intentionally non-editable. This screen does not send, store or process payment secrets because no gateway-management API is documented.
      </p>

      <div className="mt-5 flex flex-col gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" disabled aria-describedby="gateway-save-help" className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
          Save configuration
        </button>
        <button type="button" disabled className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">
          Test connection
        </button>
        <button type="button" disabled className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">
          {isUnsupported ? "Activate gateway" : "Activate / deactivate"}
        </button>
        <p id="gateway-save-help" className="basis-full text-xs leading-5 text-[#7f9d94]">
          These actions remain disabled until the backend publishes configuration, connection-test and activation endpoints.
        </p>
      </div>
    </section>
  );
}

export default function PlatformPaymentSettingsScreen() {
  const [selectedGatewayId, setSelectedGatewayId] = useState<PaymentGatewayId | null>(null);
  const selectedGateway = selectedGatewayId ? getPaymentGatewayPreview(selectedGatewayId) : null;

  return (
    <div className="space-y-5" aria-labelledby="payment-gateway-management-title">
      <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="payment-gateway-management-title" className="text-lg font-bold text-[#06201c]">Payment Gateway Management</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#52736a]">Review the planned gateway configuration surface. Current backend documentation does not expose gateway-management endpoints, so no financial configuration is loaded or changed here.</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#fff7e5] px-3 py-1 text-xs font-bold text-[#8a5a00]">Backend contract pending</span>
        </div>
      </section>

      <section aria-labelledby="available-gateways-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="available-gateways-title" className="text-lg font-bold text-[#06201c]">Available gateways</h2>
            <p className="mt-1 text-sm text-[#52736a]">Only documented availability is shown; no gateway status is inferred.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {paymentGatewayPreviews.map((gateway) => <GatewayCard key={gateway.id} gateway={gateway} onOpen={setSelectedGatewayId} />)}
        </div>
      </section>

      {selectedGateway ? <GatewayDetails gateway={selectedGateway} onClose={() => setSelectedGatewayId(null)} /> : (
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 text-center shadow-sm" aria-live="polite">
          <p className="font-semibold text-[#06201c]">Select a gateway to review its configuration surface.</p>
          <p className="mt-1 text-sm text-[#52736a]">Configuration remains a non-editable preview until supported backend operations are available.</p>
        </section>
      )}
    </div>
  );
}
