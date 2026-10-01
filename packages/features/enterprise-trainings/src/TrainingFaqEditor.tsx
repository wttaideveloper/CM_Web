"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type FaqItem = {
  question: string;
  answer: string;
};

type TrainingFaqEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  helpText?: string | null;
  error?: string | null;
};

const inputClass = "mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]";

function parseFaqItems(value: string): FaqItem[] {
  if (!value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === "string") return { question: item, answer: "" };
        if (typeof item !== "object" || item === null) return { question: String(item), answer: "" };
        const faq = item as Record<string, unknown>;
        return {
          question: typeof faq.question === "string" ? faq.question : typeof faq.q === "string" ? faq.q : "",
          answer: typeof faq.answer === "string" ? faq.answer : typeof faq.a === "string" ? faq.a : "",
        };
      });
    }
  } catch {
    return [{ question: value, answer: "" }];
  }
  return [{ question: value, answer: "" }];
}

function isFaqArray(value: string): boolean {
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}

/** Edits FAQs as question-and-answer pairs while preserving the API's array format. */
export default function TrainingFaqEditor({ label, value, onChange, required = false, helpText, error }: TrainingFaqEditorProps) {
  const { t } = useTranslation("enterpriseTrainings");
  const items = parseFaqItems(value);

  useEffect(() => {
    if (value.trim() && !isFaqArray(value)) {
      onChange(JSON.stringify(parseFaqItems(value)));
    }
  }, [onChange, value]);

  const updateItem = (index: number, patch: Partial<FaqItem>) => {
    onChange(JSON.stringify(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)));
  };
  const addItem = () => onChange(JSON.stringify([...items, { question: "", answer: "" }]));
  const removeItem = (index: number) => onChange(JSON.stringify(items.filter((_, itemIndex) => itemIndex !== index)));

  return (
    <fieldset className="block text-sm font-semibold text-[#06201c] md:col-span-2">
      <legend>{label}{required ? " *" : ""}{helpText ? <span className="ml-1 font-normal text-[#52736a]">{helpText}</span> : null}</legend>
      <p className="mt-1 text-xs font-normal text-[#52736a]">
        {t("faqs.help", { defaultValue: "Add questions and answers for learners. You can add as many as you need." })}
      </p>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <fieldset key={index} className="rounded-xl border border-[#dfe9e4] bg-white p-3">
            <legend className="px-1 text-xs font-bold text-[#52736a]">
              {t("faqs.itemLabel", { number: index + 1, defaultValue: `Question ${index + 1}` })}
            </legend>
            <label className="block text-sm font-medium text-[#355a51]">
              {t("faqs.questionLabel", { defaultValue: "Question" })}
              <input
                value={item.question}
                placeholder={t("faqs.questionPlaceholder", { defaultValue: "Enter a question learners may ask" })}
                onChange={(event) => updateItem(index, { question: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-[#355a51]">
              {t("faqs.answerLabel", { defaultValue: "Answer" })}
              <textarea
                value={item.answer}
                placeholder={t("faqs.answerPlaceholder", { defaultValue: "Write a clear, helpful answer" })}
                onChange={(event) => updateItem(index, { answer: event.target.value })}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </label>
            <button
              type="button"
              onClick={() => removeItem(index)}
              aria-label={t("faqs.removeQuestion", { number: index + 1, defaultValue: `Remove question ${index + 1}` })}
              className="mt-2 rounded-lg px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5] focus:outline-none focus:ring-2 focus:ring-[#b42318]"
            >
              {t("faqs.removeQuestion", { number: index + 1, defaultValue: "Remove" })}
            </button>
          </fieldset>
        ))}
      </div>
      {!items.length ? (
        <p className="mt-3 text-sm font-normal text-[#52736a]">
          {t("faqs.empty", { defaultValue: "No FAQs yet. Add one to help learners prepare." })}
        </p>
      ) : null}
      <button
        type="button"
        onClick={addItem}
        className="mt-3 rounded-lg border border-[#1f6a58] px-3 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]"
      >
        {t("faqs.addQuestion", { defaultValue: "Add a question" })}
      </button>
      {error ? <p role="alert" className="mt-1 text-xs font-medium text-[#b42318]">{error}</p> : null}
    </fieldset>
  );
}
