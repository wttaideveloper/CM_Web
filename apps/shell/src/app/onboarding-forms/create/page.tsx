"use client";

import AppShell from "@/components/layout/AppShell";
import {
  createOnboardingForm,
  publishOnboardingForm,
  updateOnboardingForm,
} from "@/services/onboarding-form.service";
import type {
  CreateOnboardingFormPayload,
  OnboardingFormDto,
  RegistrationType,
} from "@/types/onboarding-form.types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DndContext, type DragEndEvent, closestCenter } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

const fieldTypes = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "url",
  "date",
  "dropdown",
  "checkbox",
  "radio",
  "file",
  "image",
] as const;

const enterpriseTypeOptions = [
  "Healthcare",
  "Fitness & Wellness",
  "Nutrition",
  "Mental Health",
  "Education",
  "Retail",
] as const;

const registrationTypeOptions = [
  "Enterprise (Business)",
  "Individual (Professional)",
] as const;

type FieldType = (typeof fieldTypes)[number];
type FormStatus = "draft" | "published" | "inactive" | (string & {});
type PreviewScope = "section" | "full";

type FormField = {
  id: string;
  order: number;
  label: string;
  field_key: string;
  field_type: FieldType;
  placeholder: string;
  help_text: string;
  required: boolean;
  locked: boolean;
  visible: boolean;
  options: string[];
};

type FormSection = {
  id: string;
  title: string;
  order: number;
  fields: FormField[];
};

type FormSchema = {
  name: string;
  description: string;
  entity_type: "enterprise";
  enterprise_type: string | null;
  registration_type: RegistrationType;
  status: FormStatus;
  sections: FormSection[];
};

type FieldDraft = {
  label: string;
  field_key: string;
  field_type: FieldType;
  placeholder: string;
  help_text: string;
  required: boolean;
  visible: boolean;
  optionsText: string;
};

const draftStorageKey = "ihp:onboarding-forms:create:draft";

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugifyFieldKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getAllFieldKeys(sections: FormSection[]) {
  return new Set(
    sections.flatMap((section) => section.fields.map((field) => field.field_key).filter(Boolean)),
  );
}

function createUniqueFieldKey(baseValue: string, sections: FormSection[]) {
  const baseKey = slugifyFieldKey(baseValue) || "new_field";
  const existingKeys = getAllFieldKeys(sections);

  if (!existingKeys.has(baseKey)) {
    return baseKey;
  }

  let counter = 2;
  let nextKey = `${baseKey}_${counter}`;

  while (existingKeys.has(nextKey)) {
    counter += 1;
    nextKey = `${baseKey}_${counter}`;
  }

  return nextKey;
}

function supportsOptions(fieldType: FieldType) {
  return fieldType === "dropdown" || fieldType === "checkbox" || fieldType === "radio";
}

function parseOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinOptions(options: string[]) {
  return options.join(", ");
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function createFieldDraft(field?: FormField): FieldDraft {
  return {
    label: field?.label ?? "New Field",
    field_key: field?.field_key ?? "new_field",
    field_type: field?.field_type ?? "text",
    placeholder: field?.placeholder ?? "",
    help_text: field?.help_text ?? "",
    required: field?.required ?? false,
    visible: field?.visible ?? true,
    optionsText: field ? joinOptions(field.options) : "",
  };
}

function createField(overrides: Partial<FormField>): FormField {
  return {
    id: createId(),
    order: 1,
    label: "New Field",
    field_key: "new_field",
    field_type: "text",
    placeholder: "",
    help_text: "",
    required: false,
    locked: false,
    visible: true,
    options: [],
    ...overrides,
  };
}

function createSection(title: string, fields: FormField[] = []): FormSection {
  return {
    id: createId(),
    title,
    order: 1,
    fields,
  };
}

function normalizeSections(sections: FormSection[]) {
  return sections.map((section, index) => ({
    ...section,
    order: index + 1,
  }));
}

function normalizeFields(fields: FormField[]) {
  return fields.map((field, index) => ({
    ...field,
    order: index + 1,
  }));
}

function findDuplicateFieldKey(sections: FormSection[]) {
  const seen = new Set<string>();

  for (const section of sections) {
    for (const field of section.fields) {
      const key = field.field_key.trim();
      if (!key) continue;

      if (seen.has(key)) {
        return key;
      }

      seen.add(key);
    }
  }

  return null;
}

function isBackendId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toApiField(field: FormField) {
  const payload = {
    label: field.label,
    field_key: field.field_key,
    field_type: field.field_type,
    placeholder: field.placeholder,
    help_text: field.help_text,
    required: field.required,
    locked: field.locked,
    visible: field.visible,
    order: field.order,
    options: field.options,
  };

  return field.id && isBackendId(field.id) ? { id: field.id, ...payload } : payload;
}

function toApiSection(section: FormSection) {
  const payload = {
    title: section.title,
    order: section.order,
    fields: section.fields.map(toApiField),
  };

  return section.id && isBackendId(section.id) ? { id: section.id, ...payload } : payload;
}

function hydrateFields(
  fields: OnboardingFormDto["sections"][number]["fields"],
  fallbackFields: FormField[] = [],
): FormField[] {
  if (!fields.length) {
    return fallbackFields;
  }

  return fields.map((field, index) => ({
    id: field.id ?? fallbackFields[index]?.id ?? createId(),
    order: field.order ?? index + 1,
    label: field.label,
    field_key: field.field_key,
    field_type: field.field_type,
    placeholder: field.placeholder,
    help_text: field.help_text,
    required: field.required,
    locked: field.locked,
    visible: field.visible,
    options: field.options ?? [],
  }));
}

function hydrateSections(
  sections: OnboardingFormDto["sections"],
  fallbackSections: FormSection[] = [],
): FormSection[] {
  if (!sections.length) {
    return fallbackSections;
  }

  return sections.map((section, index) => {
    const fallbackSection = fallbackSections[index];

    return {
      id: section.id ?? fallbackSection?.id ?? createId(),
      title: section.title,
      order: section.order ?? index + 1,
      fields: hydrateFields(section.fields, fallbackSection?.fields ?? []),
    };
  });
}

function toRegistrationTypeValue(
  value: (typeof registrationTypeOptions)[number],
): Exclude<RegistrationType, null> {
  return value === "Individual (Professional)" ? "individual" : "enterprise";
}

function toRegistrationTypeLabel(
  value: RegistrationType | undefined,
): (typeof registrationTypeOptions)[number] {
  return value === "individual" ? "Individual (Professional)" : "Enterprise (Business)";
}

function toEnterpriseTypeOption(value: string | null | undefined) {
  return enterpriseTypeOptions.includes(value as (typeof enterpriseTypeOptions)[number])
    ? (value as (typeof enterpriseTypeOptions)[number])
    : "Healthcare";
}

function buildFormPayload(
  form: FormSchema,
  status: FormStatus,
  enterpriseType: string | null,
  registrationType: (typeof registrationTypeOptions)[number],
): CreateOnboardingFormPayload {
  return {
    name: form.name,
    description: form.description,
    entity_type: form.entity_type,
    enterprise_type: enterpriseType,
    registration_type: toRegistrationTypeValue(registrationType),
    status,
    sections: form.sections.map(toApiSection),
  };
}

function createDefaultForm(): FormSchema {
  return {
    name: "",
    description: "",
    entity_type: "enterprise",
    enterprise_type: "Healthcare",
    registration_type: "enterprise",
    status: "draft",
    sections: [],
  };
}

function badgeClass(status: FormStatus) {
  return status === "draft"
    ? "bg-[#f1f4f3] text-[#6b7f79]"
    : status === "inactive"
      ? "bg-[#fff3e6] text-[#a15c00]"
    : "bg-[#e8f6ee] text-[#16825b]";
}

function fieldTypeLabel(fieldType: FieldType) {
  if (fieldType === "textarea") {
    return "Textarea";
  }

  if (fieldType === "dropdown") {
    return "Dropdown";
  }

  if (fieldType === "checkbox") {
    return "Checkbox";
  }

  if (fieldType === "radio") {
    return "Radio";
  }

  if (fieldType === "file") {
    return "File";
  }

  if (fieldType === "image") {
    return "Image";
  }

  return fieldType.toUpperCase();
}

function statusLabel(status: FormStatus) {
  if (status === "draft") {
    return "Draft";
  }

  if (status === "inactive") {
    return "Inactive";
  }

  return "Published";
}

function DragHandleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h.01M16 6h.01M8 12h.01M16 12h.01M8 18h.01M16 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FieldTypeIcon({ fieldType }: { fieldType: FieldType }) {
  const accentClass =
    fieldType === "email"
      ? "bg-[#f3e8ff] text-[#9333ea]"
      : fieldType === "phone"
        ? "bg-[#e7f8ee] text-[#16a34a]"
        : fieldType === "dropdown"
          ? "bg-[#fff4e5] text-[#d97706]"
          : fieldType === "file" || fieldType === "image"
            ? "bg-[#ffe7e5] text-[#ef4444]"
            : fieldType === "url"
              ? "bg-[#e0f2fe] text-[#0284c7]"
              : fieldType === "textarea"
                ? "bg-[#ede9fe] text-[#6366f1]"
                : fieldType === "date"
                  ? "bg-[#fff1f2] text-[#f97316]"
                  : fieldType === "checkbox"
                    ? "bg-[#ecfeff] text-[#0891b2]"
                    : "bg-[#e8f1ee] text-[#2f6a5c]";

  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${accentClass}`}>
      {fieldTypeLabel(fieldType).slice(0, 1)}
    </span>
  );
}

function SectionCard({
  section,
  isActive,
  onSelect,
  onDelete,
  children,
}: {
  section: FormSection;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const containsLockedFields = section.fields.some((field) => field.locked);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full rounded-[24px] border bg-white text-left shadow-sm transition ${
        isActive ? "border-[#c6ddd3] ring-2 ring-[#e2efe8]" : "border-[#e1ebe6]"
      } ${isDragging ? "opacity-70" : ""}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className="flex items-center justify-between gap-3 border-b border-[#edf3f0] px-4 py-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6c877f]"
            aria-label={`Drag ${section.title}`}
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <DragHandleIcon />
          </button>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#06201c]">{section.title}</p>
            <p className="mt-0.5 text-xs text-[#7f9d94]">{section.fields.length} field(s)</p>
          </div>
        </div>
        {!containsLockedFields ? (
          <button
            type="button"
            aria-label={`Delete ${section.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="rounded-full p-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff5f5]"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function FieldCard({
  field,
  onEdit,
  onDelete,
  onToggleRequired,
  isSelected = false,
}: {
  field: FormField;
  onEdit: () => void;
  onDelete: () => void;
  onToggleRequired: () => void;
  isSelected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border px-4 py-3 transition hover:border-[#c6ddd3] ${
        isSelected ? "border-[#1f6a58] bg-[#f3f8f6] ring-1 ring-[#1f6a58]" : "border-[#e6eeea] bg-[#fbfdfc]"
      } ${
        isDragging ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6c877f]"
          aria-label={`Drag ${field.label}`}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <FieldTypeIcon fieldType={field.field_type} />
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-[#06201c]">{field.label}</h4>
            <p className="mt-0.5 text-xs text-[#7f9d94]">{fieldTypeLabel(field.field_type)}</p>
          </div>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleRequired}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
              field.required ? "bg-[#ffe4e7] text-[#d92d20]" : "bg-[#f1ecff] text-[#6d5bd0]"
            }`}
          >
            {field.required ? "Required" : "Optional"}
          </button>
          {!field.locked ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full p-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff5f5]"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FieldControlPreview({ field }: { field: FormField }) {
  const options = field.options.length > 0 ? field.options : ["Option 1", "Option 2"];
  const commonInputClass =
    "h-12 w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e]";
  const accentBorderClass = field.visible ? "border-[#d7e5df]" : "border-dashed border-[#cdded6]";

  return (
    <div className={`rounded-2xl border bg-[#f9fcfa] p-4 ${accentBorderClass}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#06201c]">
            {field.label}
            {field.required ? <span className="ml-1 text-[#b42318]">*</span> : null}
          </p>
        </div>
        {!field.visible ? (
          <span className="rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-bold text-[#6b7f79]">
            Hidden
          </span>
        ) : null}
      </div>

      {field.field_type === "textarea" ? (
        <textarea
          disabled
          placeholder={field.placeholder || "Textarea preview"}
          className="min-h-[96px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e]"
        />
      ) : field.field_type === "dropdown" ? (
        <select disabled className={commonInputClass}>
          <option>{field.placeholder || "Select an option"}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.field_type === "radio" ? (
        <div className="space-y-3">
          {options.map((option, index) => (
            <label key={`${field.id}-${option}`} className="flex items-center gap-3 text-sm text-[#52736a]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#c6ddd3] bg-white">
                <span
                  className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#1f6a58]" : "bg-transparent"}`}
                />
              </span>
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : field.field_type === "checkbox" ? (
        <div className="space-y-3">
          {options.map((option) => (
            <label key={`${field.id}-${option}`} className="flex items-center gap-3 text-sm text-[#52736a]">
              <span className="flex h-4 w-4 items-center justify-center rounded border border-[#c6ddd3] bg-white">
                <span className="h-2 w-2 rounded-sm bg-[#1f6a58]" />
              </span>
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : field.field_type === "file" || field.field_type === "image" ? (
        <div className="rounded-xl border border-dashed border-[#c6ddd3] bg-white px-3.5 py-4 text-sm text-[#52736a]">
          <input
            disabled
            type="file"
            className="w-full text-sm text-[#52736a] file:mr-4 file:rounded-full file:border-0 file:bg-[#e8f6ee] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#16825b]"
          />
          <p className="mt-3 text-xs text-[#7f9d94]">File upload preview only.</p>
        </div>
      ) : (
        <input
          disabled
          type={field.field_type}
          placeholder={field.placeholder || `${field.label} preview`}
          className={commonInputClass}
        />
      )}

      {field.help_text ? <p className="mt-3 text-xs text-[#7f9d94]">{field.help_text}</p> : null}
    </div>
  );
}

export default function OnboardingFormCreatePage() {
  const router = useRouter();
  const initialForm = useMemo(() => createDefaultForm(), []);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const formNameRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormSchema>(() => initialForm);
  const [activeSectionId, setActiveSectionId] = useState<string>(initialForm.sections[0]?.id ?? "");
  const [previewScope, setPreviewScope] = useState<PreviewScope>("section");
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<FieldDraft>(() => createFieldDraft());
  const [quickAddOptionsError, setQuickAddOptionsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [enterpriseType, setEnterpriseType] =
    useState<(typeof enterpriseTypeOptions)[number]>("Healthcare");
  const [registrationType, setRegistrationType] =
    useState<(typeof registrationTypeOptions)[number]>("Enterprise (Business)");
  const activeSection = form.sections.find((section) => section.id === activeSectionId) ?? form.sections[0];
  const editingField =
    editingFieldId && activeSection
      ? activeSection.fields.find((field) => field.id === editingFieldId) ?? null
      : null;

  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(null), 2200);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [notice]);

  useEffect(() => {
    if (quickAddOptionsError) {
      const timer = window.setTimeout(() => setQuickAddOptionsError(null), 2200);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [quickAddOptionsError]);

  useEffect(() => {
    if (form.sections.length > 0 && !form.sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(form.sections[0].id);
    }
  }, [activeSectionId, form.sections]);

  function updateFormName(value: string) {
    setForm((current) => ({ ...current, name: value }));
  }

  function updateFormDescription(value: string) {
    setForm((current) => ({ ...current, description: value }));
  }

  function updateSelectedSectionTitle(value: string) {
    if (!activeSection) {
      return;
    }

    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === activeSection.id ? { ...section, title: value } : section,
      ),
    }));
  }

  function updateSections(nextSections: FormSection[]) {
    const normalizedSections = normalizeSections(nextSections);
    setForm((current) => ({ ...current, sections: normalizedSections }));
  }

  function addSection() {
    const newSection = createSection("New Section");
    setForm((current) => {
      const activeIndex = current.sections.findIndex((section) => section.id === activeSectionId);
      const nextSections = [...current.sections];
      const insertionIndex = activeIndex >= 0 ? activeIndex + 1 : nextSections.length;
      nextSections.splice(insertionIndex, 0, newSection);
      return { ...current, sections: normalizeSections(nextSections) };
    });
    setActiveSectionId(newSection.id);
  }

  function deleteSection(sectionId: string) {
    const targetSection = form.sections.find((section) => section.id === sectionId);

    if (!targetSection || targetSection.fields.some((field) => field.locked)) {
      return;
    }

    const targetIndex = form.sections.findIndex((section) => section.id === sectionId);
    const nextSections = form.sections.filter((section) => section.id !== sectionId);
    updateSections(nextSections);

    if (sectionId === activeSectionId) {
      const fallbackSection = nextSections[targetIndex - 1] ?? nextSections[targetIndex] ?? nextSections[0];
      setActiveSectionId(fallbackSection?.id ?? "");
    }
  }

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = form.sections.findIndex((section) => section.id === active.id);
    const newIndex = form.sections.findIndex((section) => section.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    updateSections(arrayMove(form.sections, oldIndex, newIndex));
  }

  function handleFieldDragEnd(sectionId: string, event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: (() => {
                const oldIndex = section.fields.findIndex((field) => field.id === active.id);
                const newIndex = section.fields.findIndex((field) => field.id === over.id);

                if (oldIndex < 0 || newIndex < 0) {
                  return section.fields;
                }

                return normalizeFields(arrayMove(section.fields, oldIndex, newIndex));
              })(),
            }
          : section,
      ),
    }));
  }

  function selectSection(sectionId: string) {
    setActiveSectionId(sectionId);
    setIsFieldEditorOpen(false);
    setEditingFieldId(null);
    setFieldDraft(createFieldDraft());
  }

  function openAddFieldPanelForSection(sectionId: string, nextFieldType: FieldType = fieldDraft.field_type) {
    setActiveSectionId(sectionId);
    setEditingFieldId(null);
    setFieldDraft((current) => ({
      ...createFieldDraft(),
      field_type: nextFieldType,
      label: current.field_type === nextFieldType ? current.label : fieldTypeLabel(nextFieldType),
      field_key: createUniqueFieldKey(`new_${nextFieldType}_field`, form.sections),
    }));
    setIsFieldEditorOpen(true);
  }

  function openAddFieldPanel() {
    if (!activeSection) {
      setNotice("Add a section first.");
      return;
    }

    openAddFieldPanelForSection(activeSection.id);
  }

  function openAddFieldPanelWithType(fieldType: FieldType) {
    if (!activeSection) {
      setNotice("Add a section first.");
      return;
    }
    openAddFieldPanelForSection(activeSection.id, fieldType);
  }

  function openEditFieldPanel(sectionId: string, field: FormField) {
    setActiveSectionId(sectionId);
    setEditingFieldId(field.id);
    setFieldDraft(createFieldDraft(field));
    setIsFieldEditorOpen(true);
  }

  function deleteField(fieldId: string) {
    if (!activeSection) {
      return;
    }

    const targetField = activeSection.fields.find((field) => field.id === fieldId);

    if (!targetField || targetField.locked) {
      return;
    }

    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === activeSection.id
          ? { ...section, fields: normalizeFields(section.fields.filter((field) => field.id !== fieldId)) }
          : section,
      ),
    }));
  }

  function toggleFieldRequired(sectionId: string, fieldId: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, required: !field.required } : field,
              ),
            }
          : section,
      ),
    }));
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    if (!activeSection) {
      return;
    }

    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== activeSection.id) {
          return section;
        }

        const fromIndex = section.fields.findIndex((field) => field.id === fieldId);
        const toIndex = fromIndex + direction;

        if (fromIndex < 0 || toIndex < 0 || toIndex >= section.fields.length) {
          return section;
        }

        return {
          ...section,
          fields: moveItem(section.fields, fromIndex, toIndex),
        };
      }),
    }));
  }

  function saveField() {
    if (!activeSection) {
      return;
    }

    const trimmedLabel = fieldDraft.label.trim();
    const trimmedFieldKey = fieldDraft.field_key.trim();
    const parsedOptions = supportsOptions(fieldDraft.field_type) ? parseOptions(fieldDraft.optionsText) : [];

    if (!trimmedLabel || !trimmedFieldKey) {
      setNotice("Label and Field Key are required.");
      return;
    }

    if (!editingFieldId && supportsOptions(fieldDraft.field_type) && parsedOptions.length < 2) {
      setQuickAddOptionsError("Please enter at least 2 choices.");
      return;
    }

    const nextField: FormField = {
      id: editingFieldId ?? createId(),
      order:
        editingFieldId
          ? activeSection.fields.find((field) => field.id === editingFieldId)?.order ??
            activeSection.fields.length + 1
          : activeSection.fields.length + 1,
      label: trimmedLabel,
      field_key: trimmedFieldKey || slugifyFieldKey(trimmedLabel),
      field_type: fieldDraft.field_type,
      placeholder: fieldDraft.placeholder.trim(),
      help_text: fieldDraft.help_text.trim(),
      required: fieldDraft.required,
      locked:
        editingFieldId
          ? activeSection.fields.find((field) => field.id === editingFieldId)?.locked ?? false
          : false,
      visible: fieldDraft.visible,
      options: parsedOptions,
    };

    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== activeSection.id) {
          return section;
        }

        const existingIndex = section.fields.findIndex((field) => field.id === nextField.id);
        if (existingIndex >= 0) {
          const nextFields = [...section.fields];
          nextFields[existingIndex] = nextField;
          return { ...section, fields: normalizeFields(nextFields) };
        }

        return { ...section, fields: normalizeFields([...section.fields, nextField]) };
      }),
    }));

    setIsFieldEditorOpen(false);
    setEditingFieldId(null);
    setFieldDraft(createFieldDraft());
    setQuickAddOptionsError(null);
  }

  function persistDraftLocally(snapshot: FormSchema) {
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
    } catch {
      // Local storage is optional in this prototype.
    }
  }

  async function saveDraft() {
    const snapshot = form;
    if (snapshot.sections.length === 0) {
      setNotice("Add at least one section before saving.");
      return;
    }
    const duplicateKey = findDuplicateFieldKey(snapshot.sections);

    if (duplicateKey) {
      setNotice(`Duplicate field key: ${duplicateKey}. Please make field keys unique.`);
      return;
    }

    const payload = buildFormPayload(snapshot, "draft", enterpriseType, registrationType);
    setIsSaving(true);

    try {
      if (savedFormId === null) {
        const response = await createOnboardingForm(payload);
        setSavedFormId(response.id);
        setEnterpriseType(toEnterpriseTypeOption(response.enterprise_type));
        setRegistrationType(toRegistrationTypeLabel(response.registration_type));
        setForm((current) => ({
          ...current,
          name: response.name ?? current.name,
          description: response.description ?? current.description,
          enterprise_type: response.enterprise_type ?? current.enterprise_type,
          registration_type: response.registration_type ?? current.registration_type,
          status: response.status ?? "draft",
          sections: hydrateSections(response.sections, current.sections),
        }));
        persistDraftLocally({
          ...snapshot,
          status: response.status ?? "draft",
          sections: hydrateSections(response.sections, snapshot.sections),
        });
        setNotice("Draft saved.");
        router.push("/onboarding-forms");
        return;
      }

      const response = await updateOnboardingForm(savedFormId, payload);
      setEnterpriseType(toEnterpriseTypeOption(response.enterprise_type));
      setRegistrationType(toRegistrationTypeLabel(response.registration_type));
      setForm((current) => ({
        ...current,
        enterprise_type: response.enterprise_type ?? current.enterprise_type,
        registration_type: response.registration_type ?? current.registration_type,
        status: response.status ?? current.status,
      }));
      persistDraftLocally({ ...snapshot, status: response.status ?? snapshot.status });
      setNotice("Draft updated.");
      router.push("/onboarding-forms");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  }

  async function publishForm() {
    const snapshot = form;
    if (snapshot.sections.length === 0) {
      setNotice("Add at least one section before saving.");
      return;
    }
    const duplicateKey = findDuplicateFieldKey(snapshot.sections);

    if (duplicateKey) {
      setNotice(`Duplicate field key: ${duplicateKey}. Please make field keys unique.`);
      return;
    }

    const payload = buildFormPayload(snapshot, "draft", enterpriseType, registrationType);
    setIsPublishing(true);

    try {
      let nextSavedFormId = savedFormId;

      if (nextSavedFormId === null) {
        const createResponse = await createOnboardingForm(payload);
        nextSavedFormId = createResponse.id;
        setSavedFormId(createResponse.id);
        setEnterpriseType(toEnterpriseTypeOption(createResponse.enterprise_type));
        setRegistrationType(toRegistrationTypeLabel(createResponse.registration_type));
        setForm((current) => ({
          ...current,
          name: createResponse.name ?? current.name,
          description: createResponse.description ?? current.description,
          enterprise_type: createResponse.enterprise_type ?? current.enterprise_type,
          registration_type: createResponse.registration_type ?? current.registration_type,
          status: createResponse.status ?? "draft",
          sections: hydrateSections(createResponse.sections, current.sections),
        }));
        persistDraftLocally({
          ...snapshot,
          status: createResponse.status ?? "draft",
          sections: hydrateSections(createResponse.sections, snapshot.sections),
        });
      } else {
        const updateResponse = await updateOnboardingForm(nextSavedFormId, payload);
        setEnterpriseType(toEnterpriseTypeOption(updateResponse.enterprise_type));
        setRegistrationType(toRegistrationTypeLabel(updateResponse.registration_type));
        setForm((current) => ({
          ...current,
          enterprise_type: updateResponse.enterprise_type ?? current.enterprise_type,
          registration_type: updateResponse.registration_type ?? current.registration_type,
          status: updateResponse.status ?? current.status,
        }));
        persistDraftLocally({ ...snapshot, status: updateResponse.status ?? snapshot.status });
      }

      await publishOnboardingForm(nextSavedFormId);
      setForm((current) => ({ ...current, status: "published" }));
      persistDraftLocally({ ...snapshot, status: "published" });
      setNotice("Form published.");
      router.push("/onboarding-forms");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to publish form.");
    } finally {
      setIsPublishing(false);
    }
  }

  function showPreview() {
    setPreviewScope("full");
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const previewSections = previewScope === "section" && activeSection ? [activeSection] : form.sections;
  const currentFieldList = activeSection?.fields ?? [];
  const requiredFieldsCount = form.sections.reduce(
    (total, section) => total + section.fields.filter((field) => field.required).length,
    0,
  );
  const totalFieldsCount = form.sections.reduce((total, section) => total + section.fields.length, 0);
  const optionalFieldsCount = totalFieldsCount - requiredFieldsCount;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">Registration Form Builder</h2>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeClass(form.status)}`}>
              {statusLabel(form.status)}
            </span>
          </div>
          <p className="max-w-3xl text-sm text-[#52736a]">
            Design the onboarding form enterprise owners fill out once when joining the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={showPreview}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfe6d9] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm transition hover:bg-[#f4faf7]"
          >
            Preview Form
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={isSaving || isPublishing}
            className="h-11 rounded-full border border-[#cfe6d9] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm transition hover:border-[#b6d7c5] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Draft"}
          </button>
          <button
            type="button"
            onClick={publishForm}
            disabled={isSaving || isPublishing}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPublishing ? "Publishing..." : "Save & Publish"}
          </button>
        </div>
      </div>

      <section className="relative mt-5 overflow-hidden rounded-[28px] border border-[#e1ebe6] bg-white shadow-sm">
        <div className="absolute left-0 right-0 top-0 h-1.5 bg-[#1f6a58]" />
        <div className="px-5 pb-0 pt-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px_150px]">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7f9d94]">FORM NAME *</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    ref={formNameRef}
                    type="text"
                    value={form.name}
                    onChange={(event) => updateFormName(event.target.value)}
                    className="mt-2 w-full min-w-0 border-0 bg-transparent p-0 text-[21px] font-bold leading-tight text-[#12483d] outline-none shadow-none ring-0 placeholder:text-[#8ca69e] focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => formNameRef.current?.focus()}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d7e5df] bg-white text-[#52736a] shadow-sm transition hover:bg-[#f4faf7]"
                    aria-label="Edit form name"
                  >
                    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 20h9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#52736a]">Description (shown to Enterprise Owners)</p>
                <textarea
                  value={form.description}
                  onChange={(event) => updateFormDescription(event.target.value)}
                  className="mt-2 min-h-[54px] w-full resize-none rounded-2xl border border-[#d7e5df] bg-[#f8fbf9] px-3.5 py-2.5 text-sm leading-5 text-[#06201c] outline-none focus:border-[#1f6a58] focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7f9d94]">ENTERPRISE TYPE *</p>
                <select
                  value={enterpriseType}
                  onChange={(event) =>
                    setEnterpriseType(event.target.value as (typeof enterpriseTypeOptions)[number])
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f3f8f6] px-4 text-[15px] font-bold text-[#06201c] outline-none focus:border-[#1f6a58] focus:ring-0"
                >
                  {enterpriseTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7f9d94]">PROVIDER TYPE *</p>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  {[
                    {
                      label: "Enterprise",
                      value: "Enterprise (Business)" as const,
                    },
                    {
                      label: "Individual",
                      value: "Individual (Professional)" as const,
                    },
                  ].map((option) => {
                    const active = registrationType === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRegistrationType(option.value)}
                        className={`flex h-12 items-center justify-center rounded-2xl border px-4 text-sm font-bold shadow-sm transition ${
                          active
                            ? "border-[#1f6a58] bg-[#1f6a58] text-white"
                            : "border-[#d7e5df] bg-white text-[#355a51] hover:bg-[#f8fbf9]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-[140px] rounded-[22px] border border-[#e1ebe6] bg-[#f7faf8] p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7f9d94]">SUMMARY</p>
              <div className="mt-2 divide-y divide-[#edf3f0] text-sm">
                {[
                  { label: "Sections", value: form.sections.length },
                  { label: "Total Fields", value: totalFieldsCount },
                  { label: "Required", value: requiredFieldsCount },
                  { label: "Optional", value: optionalFieldsCount },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-[#52736a]">{item.label}</span>
                    <span
                      className={`text-base font-bold ${
                        item.label === "Required" ? "text-[#b42318]" : item.label === "Optional" ? "text-[#16825b]" : "text-[#12483d]"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[#edf3f0] bg-[#f8fbf9] px-5 py-3 text-sm">
          <span className="font-semibold text-[#06201c]">This form is Step 2 of:</span>
          <span className="font-semibold text-[#52736a]">📝 Enterprise signs up</span>
          <span className="text-[#52736a]">&gt;</span>
          <span className="rounded-full bg-[#1f6a58] px-4 py-2 font-bold text-white">🖊️ Fills this form</span>
          <span className="text-[#52736a]">&gt;</span>
          <span className="font-semibold text-[#52736a]">🔍 Admin reviews</span>
          <span className="text-[#52736a]">&gt;</span>
          <span className="font-semibold text-[#52736a]">✅ Approved &amp; Live</span>
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-[#bfd6ff] bg-[#eef5ff] p-6 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <p className="text-sm font-bold text-[#1c4ed8]">Form Builder — What it is</p>
            <p className="mt-3 text-sm leading-7 text-[#33558d]">
              Controls the <span className="font-semibold text-[#1c4ed8]">registration / onboarding wizard</span>{" "}
              that an Enterprise Owner fills out one time when first signing up. Think of it as the job application
              form used to collect, verify, and approve the enterprise before it goes live.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Hospital Name", "Upload Medical License", "GST Certificate", "Departments Offered", "Google Maps Link"].map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[#dce9ff] px-3 py-1 text-xs font-semibold text-[#1c4ed8]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3 text-sm text-[#33558d]">
            {[
              "Runs once — only during enterprise signup / setup",
              "Drives approval — admin reviews this form before activating",
              "Sections & ordering — drag and reorder the whole wizard",
              "Not the same as Dynamic Attributes — those are post-signup metadata fields on listings",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1c4ed8]">
                  ✓
                </span>
                <p>{item}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-[#dfeaff] px-4 py-3 text-sm text-[#1c4ed8]">
              <span className="font-semibold">Analogy:</span> A job application form — filled once, used to screen
              and approve the applicant.
            </div>
          </div>
        </div>
      </section>

      {notice ? (
        <p className="mt-5 rounded-2xl border border-[#cfe6d9] bg-[#f1f8f4] px-4 py-3 text-sm font-medium text-[#16644f]">
          {notice}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:overflow-x-hidden">
            <section className="rounded-[22px] border border-[#e1ebe6] bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-[#06201c]">Add Field Types</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: "Text Field", type: "text" as FieldType },
                { label: "Email", type: "email" as FieldType },
                { label: "Phone", type: "phone" as FieldType },
                { label: "Dropdown", type: "dropdown" as FieldType },
                { label: "File Upload", type: "file" as FieldType },
                { label: "Web Link", type: "url" as FieldType },
                { label: "Long Text", type: "textarea" as FieldType },
                { label: "Date Picker", type: "date" as FieldType },
                { label: "Checkbox", type: "checkbox" as FieldType },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openAddFieldPanelWithType(item.type)}
                  className={`rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                    fieldDraft.field_type === item.type && isFieldEditorOpen
                      ? "border border-[#2e6a5b] bg-[#2e6a5b] text-white"
                      : "border border-[#e1ebe6] bg-[#f8fbf9] text-[#355a51] hover:bg-[#eef6f2]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#e1ebe6] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">
                    FIELD PROPERTIES
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[#06201c]">
                    {editingField ? "Edit Field" : "Field Properties"}
                  </h3>
                </div>
                {editingField ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsFieldEditorOpen(false);
                      setEditingFieldId(null);
                      setFieldDraft(createFieldDraft());
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]"
                    aria-label="Close field properties"
                  >
                    x
                  </button>
                ) : (
                  <span className="rounded-full bg-[#f1f8f4] px-2 py-0.5 text-[11px] font-bold text-[#16825b]">
                    Ready
                  </span>
                )}
              </div>

              {editingField ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-[#e1ebe6] bg-[#f8fbf9] p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                      <FieldTypeIcon fieldType={fieldDraft.field_type} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-[#06201c]">
                        {fieldDraft.label || "Selected Field"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7f9d94]">
                        {fieldTypeLabel(fieldDraft.field_type)}
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">
                      Label
                    </span>
                    <input
                      type="text"
                      value={fieldDraft.label}
                      onChange={(event) => {
                        const nextLabel = event.target.value;
                        setFieldDraft((current) => ({
                          ...current,
                          label: nextLabel,
                          field_key: current.field_key,
                        }));
                      }}
                      className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">
                      Field Type
                    </span>
                    <select
                      value={fieldDraft.field_type}
                      onChange={(event) =>
                        setFieldDraft((current) => ({
                          ...current,
                          field_type: event.target.value as FieldType,
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    >
                      {fieldTypes.map((fieldType) => (
                        <option key={fieldType} value={fieldType}>
                          {fieldTypeLabel(fieldType)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">
                      Placeholder
                    </span>
                    <input
                      type="text"
                      value={fieldDraft.placeholder}
                      onChange={(event) =>
                        setFieldDraft((current) => ({ ...current, placeholder: event.target.value }))
                      }
                      className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">
                      Help Text
                    </span>
                    <textarea
                      value={fieldDraft.help_text}
                      onChange={(event) =>
                        setFieldDraft((current) => ({ ...current, help_text: event.target.value }))
                      }
                      className="min-h-[64px] w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                    />
                  </label>

                  <div className="grid gap-2">
                    <label className="flex items-center gap-2.5 rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] p-3 text-sm font-semibold text-[#06201c]">
                      <input
                        type="checkbox"
                        checked={fieldDraft.required}
                        onChange={(event) =>
                          setFieldDraft((current) => ({ ...current, required: event.target.checked }))
                        }
                        className="h-3.5 w-3.5 rounded border-[#c6ddd3] text-[#1f6a58] focus:ring-[#1f6a58]"
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2.5 rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] p-3 text-sm font-semibold text-[#06201c]">
                      <input
                        type="checkbox"
                        checked={fieldDraft.visible}
                        onChange={(event) =>
                          setFieldDraft((current) => ({ ...current, visible: event.target.checked }))
                        }
                        className="h-3.5 w-3.5 rounded border-[#c6ddd3] text-[#1f6a58] focus:ring-[#1f6a58]"
                      />
                      Visible
                    </label>
                  </div>

                  {supportsOptions(fieldDraft.field_type) ? (
                    <label className="block">
                      <span className="mb-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">
                        Options
                        <span className="ml-2 text-[11px] font-medium text-[#7f9d94]">
                          Comma-separated values
                        </span>
                      </span>
                      <input
                        type="text"
                        value={fieldDraft.optionsText}
                        onChange={(event) =>
                          setFieldDraft((current) => ({ ...current, optionsText: event.target.value }))
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                      />
                    </label>
                  ) : null}

                  <div className="flex flex-wrap gap-2.5">
                    {editingField && !editingField.locked ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteField(editingField.id);
                          setIsFieldEditorOpen(false);
                          setEditingFieldId(null);
                          setFieldDraft(createFieldDraft());
                        }}
                        className="h-10 rounded-xl border border-[#f0c7c5] px-3.5 text-sm font-semibold text-[#b42318] hover:bg-[#fff5f5]"
                      >
                        Remove Field
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={saveField}
                      className="h-10 rounded-xl bg-[#1f6a58] px-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#175245]"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-[#cfe0d6] bg-[#fcfefd] p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f1f8f4]">
                      <FieldTypeIcon fieldType="text" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#06201c]">Select a field to edit its properties</p>
                      <p className="mt-1 text-xs leading-5 text-[#52736a]">
                        Update labels, field keys, visibility, required state, and options from here while keeping
                        the builder canvas clean.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-sm text-[#52736a]">
                    {[
                      "Click a field card in the builder to open its settings.",
                      "Changes stay scoped to the selected section and field.",
                      "Use the sticky panel while scrolling through long forms.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-[10px] font-bold text-[#1f6a58]">
                          ✓
                        </span>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </aside>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-[#bfd6ff] bg-[#f3f7ff] px-5 py-4 shadow-sm">
            <p className="text-base font-bold text-[#1c4ed8]">Drag sections to reorder</p>
            <p className="mt-1 text-sm text-[#5670a6]">
              Use the existing rearrange controls to change the onboarding wizard flow. Enterprise owners will see
              sections in this exact order.
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addSection}
              className="h-11 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm"
            >
              + Add Section
            </button>
          </div>

          {form.sections.length === 0 ? (
            <section className="rounded-[24px] border border-dashed border-[#cfe0d6] bg-[#fcfefd] p-8 text-center shadow-sm">
              <p className="text-lg font-bold text-[#06201c]">No sections yet</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#52736a]">
                Start by adding a section, then add fields to build this onboarding form.
              </p>
              <button
                type="button"
                onClick={addSection}
                className="mt-5 h-11 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm"
              >
                + Add Section
              </button>
            </section>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext
                items={form.sections.map((section) => section.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {form.sections.map((section) => {
                    const isSelected = section.id === activeSectionId;

                    return (
                      <SectionCard
                        key={section.id}
                        section={section}
                        isActive={isSelected}
                        onSelect={() => selectSection(section.id)}
                        onDelete={() => deleteSection(section.id)}
                      >
                        <div className="space-y-3">
                          {isSelected ? (
                            <label className="block">
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                                Section Title
                              </span>
                              <input
                                type="text"
                                value={activeSection?.title ?? ""}
                                onChange={(event) => updateSelectedSectionTitle(event.target.value)}
                                className="mt-1.5 h-10 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                              />
                            </label>
                          ) : null}

                          <DndContext
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleFieldDragEnd(section.id, event)}
                          >
                            <SortableContext
                              items={section.fields.map((field) => field.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2.5">
                                {section.fields.map((field) => (
                                  <FieldCard
                                    key={field.id}
                                    field={field}
                                    isSelected={editingFieldId === field.id}
                                    onEdit={() => openEditFieldPanel(section.id, field)}
                                    onDelete={() => deleteField(field.id)}
                                    onToggleRequired={() => toggleFieldRequired(section.id, field.id)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>

                          {isSelected && isFieldEditorOpen && !editingFieldId ? (
                            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-[#b7d1c5] bg-[#fcfefd] px-4 py-3 sm:flex-row sm:items-center">
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={fieldDraft.label}
                                  onChange={(event) =>
                                    setFieldDraft((current) => ({
                                      ...current,
                                      label: event.target.value,
                                      field_key:
                                        current.field_key.trim().length > 0 &&
                                        current.field_key !== slugifyFieldKey(current.label)
                                          ? current.field_key
                                          : createUniqueFieldKey(event.target.value, form.sections),
                                    }))
                                  }
                                  placeholder="Enter field label..."
                                  className="h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                                />
                                {supportsOptions(fieldDraft.field_type) ? (
                                  <label className="block">
                                    <span className="mb-1 inline-block text-xs font-semibold text-[#52736a]">
                                      Choices
                                    </span>
                                    <input
                                      type="text"
                                      value={fieldDraft.optionsText}
                                      onChange={(event) => {
                                        setFieldDraft((current) => ({
                                          ...current,
                                          optionsText: event.target.value,
                                        }));
                                        setQuickAddOptionsError(null);
                                      }}
                                      placeholder="Cardiology, Neurology, Pediatrics"
                                      className="h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                                    />
                                    {quickAddOptionsError ? (
                                      <p className="mt-1 text-xs font-medium text-[#b42318]">
                                        {quickAddOptionsError}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-xs text-[#7f9d94]">
                                        Separate choices with commas.
                                      </p>
                                    )}
                                  </label>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    saveField();
                                  }}
                                  className="rounded-full bg-[#1f6a58] px-4 py-2 text-xs font-bold text-white"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setIsFieldEditorOpen(false);
                                    setEditingFieldId(null);
                                    setFieldDraft(createFieldDraft());
                                    setQuickAddOptionsError(null);
                                  }}
                                  className="rounded-full px-3 py-2 text-xs font-semibold text-[#52736a]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openAddFieldPanelForSection(section.id);
                              }}
                              className="flex w-full items-center justify-start rounded-2xl border border-dashed border-[#cfe0d6] bg-[#fcfefd] px-4 py-3 text-left text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]"
                            >
                              + Add {fieldTypeLabel(fieldDraft.field_type)} field
                            </button>
                          )}
                        </div>
                      </SectionCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <section ref={previewRef} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Preview</p>
                <h3 className="mt-1 text-base font-bold text-[#06201c]">
                  {previewScope === "full" ? "Full Form Preview" : "Selected Section Preview"}
                </h3>
              </div>
              <div className="inline-flex rounded-full border border-[#d7e5df] bg-[#f9fcfa] p-1">
                <button
                  type="button"
                  onClick={() => setPreviewScope("section")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    previewScope === "section" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"
                  }`}
                >
                  Section
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScope("full")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    previewScope === "full" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"
                  }`}
                >
                  Full Form
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
                <p className="text-sm font-bold text-[#06201c]">{form.name}</p>
                <p className="mt-1 text-sm text-[#52736a]">{form.description}</p>
              </div>

              <div className="space-y-5">
                {previewSections.map((section) => (
                  <div key={section.id} className="rounded-2xl border border-[#edf3f0] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#06201c]">{section.title}</h4>
                        <p className="mt-1 text-xs text-[#7f9d94]">{section.fields.length} field(s)</p>
                      </div>
                      <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]">
                        {section.id === activeSectionId && previewScope === "section" ? "Active" : "Preview"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {section.fields.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-10 text-center">
                          <p className="text-sm font-semibold text-[#06201c]">No fields to preview yet.</p>
                        </div>
                      ) : (
                        section.fields.map((field) => <FieldControlPreview key={field.id} field={field} />)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
