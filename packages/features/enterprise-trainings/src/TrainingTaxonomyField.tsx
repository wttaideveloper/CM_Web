"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { CreateTrainingFormValues } from "./create-training-form";
import type { TrainingCategoryOption } from "./training-categories.service";
import { TRAINING_OTHER_OPTION_VALUE } from "./training-form-field-settings";

type TaxonomyField = "category" | "subcategory";
type UpdateForm = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => void;

const inputClass = "mt-1.5 h-11 w-full min-w-0 max-w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60";

/** Renders a Training category selector backed by the shared Training taxonomy. */
export default function TrainingTaxonomyField({
  field,
  label,
  value,
  categoryValue,
  categories,
  update,
  required = false,
  error,
  categoriesLoading = false,
  categoriesError = false,
  preserveLegacyValue = false,
  helpText,
  includeOther = false,
  onRetry,
}: {
  field: TaxonomyField;
  label: string;
  value: string;
  categoryValue: string;
  categories: readonly TrainingCategoryOption[];
  update: UpdateForm;
  required?: boolean;
  error?: string;
  categoriesLoading?: boolean;
  categoriesError?: boolean;
  preserveLegacyValue?: boolean;
  helpText?: string | null;
  includeOther?: boolean;
  onRetry?: () => void;
}) {
  const [customOtherValue, setCustomOtherValue] = useState("");
  const { t } = useTranslation("enterpriseTrainings");
  const category = categories.find((item) => item.parent_id === null && item.name === categoryValue);
  const options = field === "category"
    ? categories.filter((item) => item.parent_id === null)
    : category ? categories.filter((item) => item.parent_id === category.id) : [];
  const hasLegacyValue = preserveLegacyValue && Boolean(value) && value !== TRAINING_OTHER_OPTION_VALUE && !options.some((item) => item.name === value);
  const otherSelected = includeOther && value === TRAINING_OTHER_OPTION_VALUE;
  const disabled = categoriesLoading || (field === "subcategory" && !categoryValue);

  const onChange = (nextValue: string) => {
    if (field === "category") update("category", nextValue);
    else update("subcategory", nextValue);
    if (field === "category" && value !== nextValue) {
      update("subcategory", "");
    }
  };

  return (
    <div className="block min-w-0 break-words text-sm font-semibold text-[#06201c]">
      <label htmlFor={`training-field-${field}`}>
        {label}{required ? <span className="text-[#b42318]"> *</span> : null}
      </label>
      {helpText ? <span className="ml-1 font-normal text-[#52736a]">{helpText}</span> : null}
      <select
        id={`training-field-${field}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className={inputClass}
      >
        <option value="">
          {categoriesLoading
            ? "Loading Training categories..."
            : field === "category"
              ? t("taxonomy.chooseCategory")
              : categoryValue
                ? t("taxonomy.chooseSubcategory")
                : t("taxonomy.chooseCategoryFirst")}
        </option>
        {hasLegacyValue ? <option value={value}>{value} (existing value)</option> : null}
        {options.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}
        {includeOther ? <option value={TRAINING_OTHER_OPTION_VALUE}>Other (custom value)</option> : null}
      </select>
      {otherSelected ? (
        <span className="mt-2 block">
          <input
            type="text"
            value={customOtherValue}
            onChange={(event) => setCustomOtherValue(event.target.value)}
            placeholder={`Enter custom ${label.toLowerCase()}`}
            aria-label={`Custom ${label}`}
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-[#735c1e]">Custom entry is a UI preview only and cannot be saved until the Training API contract is available.</span>
        </span>
      ) : null}
      {categoriesError ? (
        <p role="alert" className="mt-1 flex items-center gap-2 text-xs text-[#b42318]">
          <span>Unable to load Training categories.</span>
          {onRetry ? <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button> : null}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
    </div>
  );
}
