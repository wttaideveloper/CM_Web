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
  const { t } = useTranslation("enterpriseTrainings");
  const category = categories.find((item) => item.parent_id === null && item.name === categoryValue);
  const options = field === "category"
    ? categories.filter((item) => item.parent_id === null)
    : category ? categories.filter((item) => item.parent_id === category.id) : [];
  const categoryIsCustom = field === "subcategory"
    && categoryValue !== TRAINING_OTHER_OPTION_VALUE
    && Boolean(categoryValue.trim())
    && !category
    && !preserveLegacyValue;
  const canChooseOther = includeOther && (field === "category" || categoryIsCustom);
  const hasLegacyValue = preserveLegacyValue && Boolean(value) && value !== TRAINING_OTHER_OPTION_VALUE && !options.some((item) => item.name === value);
  const isCustomOtherValue = canChooseOther && !preserveLegacyValue && Boolean(value.trim()) && value !== TRAINING_OTHER_OPTION_VALUE && !categoriesLoading && !options.some((item) => item.name === value);
  const [customOtherValue, setCustomOtherValue] = useState(() => (isCustomOtherValue ? value : ""));
  const [otherMode, setOtherMode] = useState(() => isCustomOtherValue);
  const otherSelected = canChooseOther && (otherMode || value === TRAINING_OTHER_OPTION_VALUE || isCustomOtherValue);
  const disabled = categoriesLoading || (field === "subcategory" && !categoryValue);

  const writeFieldText = (text: string) => {
    if (field === "category") update("category", text);
    else update("subcategory", text);
  };

  const onSelectChange = (nextValue: string) => {
    if (canChooseOther && nextValue === TRAINING_OTHER_OPTION_VALUE) {
      // Parent genuinely changed: drop the stale subcategory once, then keep it
      // untouched while the custom text is typed.
      setOtherMode(true);
      if (field === "category") update("subcategory", "");
      writeFieldText(customOtherValue);
      return;
    }
    setOtherMode(false);
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
        value={otherSelected ? TRAINING_OTHER_OPTION_VALUE : value}
        onChange={(event) => onSelectChange(event.target.value)}
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
        {canChooseOther ? <option value={TRAINING_OTHER_OPTION_VALUE}>Other (custom value)</option> : null}
      </select>
      {otherSelected ? (
        <span className="mt-2 block">
          <input
            type="text"
            value={customOtherValue}
            onChange={(event) => {
              const text = event.target.value;
              setCustomOtherValue(text);
              writeFieldText(text);
            }}
            placeholder={`Enter custom ${label.toLowerCase()}`}
            aria-label={`Custom ${label}`}
            className={inputClass}
          />
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
