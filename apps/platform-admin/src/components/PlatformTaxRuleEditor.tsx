"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TaxRuleResponse } from "@ihp/commerce";

import { createTaxRuleDraft, taxRuleAppliesToOptions, validateTaxRuleDraft, type TaxRuleDraft, type TaxRuleDraftErrors } from "./platform-tax-rule-editor";

type EditorMode = "create" | "edit";

interface PlatformTaxRuleEditorProps {
  mode: EditorMode;
  rule?: TaxRuleResponse;
  onClose: () => void;
}

const taxTypeOptions = [
  ["GST", "taxTypeGst"],
  ["VAT", "taxTypeVat"],
  ["sales_tax", "taxTypeSales"],
  ["service_tax", "taxTypeService"],
] as const;

const applicabilityLabels: Record<string, string> = {
  all: "appliesAll",
  product: "appliesProduct",
  standard: "appliesStandard",
  reduced: "appliesReduced",
  zero_rate: "appliesZeroRate",
};

/** Shows a non-persistent tax-rule editor until deployed mutation schemas are verified. */
export default function PlatformTaxRuleEditor({ mode, rule, onClose }: PlatformTaxRuleEditorProps) {
  const { t } = useTranslation("platformTaxRules");
  const [draft, setDraft] = useState<TaxRuleDraft>(() => createTaxRuleDraft(rule));
  const [checked, setChecked] = useState(false);
  const allowedAppliesTo = taxRuleAppliesToOptions(rule?.applies_to);
  const errors = checked ? validateTaxRuleDraft(draft, allowedAppliesTo) : {};
  const headingId = "platform-tax-rule-editor-title";

  const update = <Field extends keyof TaxRuleDraft>(field: Field, value: TaxRuleDraft[Field]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const fieldClass = "mt-1 block h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]";
  const labelClass = "block text-sm font-semibold text-[#31594d]";

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf3f0] pb-4">
        <div>
          <h2 id={headingId} className="text-lg font-bold text-[#06201c]">{t(mode === "create" ? "createHeading" : "editHeading")}</h2>
          {mode === "edit" && rule ? <><p className="mt-1 text-sm text-[#52736a]">{t("currentVersion", { version: rule.version, date: rule.valid_from })}</p><p className="mt-1 text-sm text-[#52736a]">{t("versionNotice")}</p></> : null}
          <p className="mt-1 max-w-3xl text-sm text-[#7f2f28]" role="status">{t("formUnavailable")}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a]">{t("cancel")}</button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>{t("ruleName")}<input className={fieldClass} value={draft.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} /></label>
        <label className={labelClass}>{t("taxType")}<select className={fieldClass} value={draft.tax_type} onChange={(event) => update("tax_type", event.target.value)} aria-invalid={Boolean(errors.tax_type)}><option value="">{t("selectTaxType")}</option>{taxTypeOptions.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}{draft.tax_type && !taxTypeOptions.some(([value]) => value === draft.tax_type) ? <option value={draft.tax_type}>{draft.tax_type}</option> : null}</select></label>
        <label className={labelClass}>{t("country")}<input className={fieldClass} value={draft.country} onChange={(event) => update("country", event.target.value)} aria-invalid={Boolean(errors.country)} /></label>
        <label className={labelClass}>{t("state")}<input className={fieldClass} value={draft.state} onChange={(event) => update("state", event.target.value)} /></label>
        <label className={labelClass}>{t("rate")}<input className={fieldClass} inputMode="decimal" value={draft.rate} onChange={(event) => update("rate", event.target.value)} aria-invalid={Boolean(errors.rate)} /><span className="mt-1 block text-xs font-normal">{t("decimalRateHelp")}</span></label>
        <label className={labelClass}>{t("appliesTo")}<select className={fieldClass} value={draft.applies_to} onChange={(event) => update("applies_to", event.target.value)} aria-invalid={Boolean(errors.applies_to)}><option value="">{t("selectApplicability")}</option>{allowedAppliesTo.map((value) => <option key={value} value={value}>{applicabilityLabels[value] ? t(applicabilityLabels[value]!) : value}</option>)}</select></label>
        <label className={labelClass}>{t("condition")}<input className={fieldClass} value={draft.condition} onChange={(event) => update("condition", event.target.value)} aria-invalid={Boolean(errors.condition)} /></label>
        <label className={labelClass}>{t("roundingMode")}<input className={fieldClass} value={draft.rounding_mode} onChange={(event) => update("rounding_mode", event.target.value)} aria-invalid={Boolean(errors.rounding_mode)} /></label>
        <label className={labelClass}>{t("validFrom")}<input className={fieldClass} value={draft.valid_from} onChange={(event) => update("valid_from", event.target.value)} aria-invalid={Boolean(errors.valid_from)} /></label>
        <label className="flex items-center gap-2 text-sm font-semibold text-[#31594d]"><input type="checkbox" checked={draft.reverse_charge_allowed} onChange={(event) => update("reverse_charge_allowed", event.target.checked)} />{t("reverseCharge")}</label>
      </div>

      {checked ? <ValidationSummary errors={errors} /> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setChecked(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58]">{t("checkFields")}</button>
        <button type="button" disabled title={t("saveUnavailable")} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{t("saveUnavailable")}</button>
        <span className="text-xs text-[#52736a]">{t("noTaxCalculation")}</span>
      </div>
    </section>
  );
}

function ValidationSummary({ errors }: { errors: TaxRuleDraftErrors }) {
  const { t } = useTranslation("platformTaxRules");
  const messages = Object.values(errors);
  return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role={messages.length ? "alert" : "status"}>
    <p className="font-semibold text-[#31594d]">{t("validationHeading")}</p>
    {messages.length ? <ul className="mt-2 list-disc pl-5 text-sm text-[#9c2f24]">{messages.map((message) => <li key={message}>{t(message)}</li>)}</ul> : <p className="mt-1 text-sm text-[#52736a]">{t("validPreview")}</p>}
  </div>;
}
