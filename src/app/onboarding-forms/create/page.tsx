"use client";

import AppShell from "@/components/layout/AppShell";
import {
  createOnboardingForm,
  publishOnboardingForm,
  updateOnboardingForm,
} from "@/services/onboarding-form.service";
import type { CreateOnboardingFormPayload, OnboardingFormDto } from "@/types/onboarding-form.types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

function buildFormPayload(form: FormSchema, status: FormStatus): CreateOnboardingFormPayload {
  return {
    name: form.name,
    description: form.description,
    entity_type: form.entity_type,
    status,
    sections: form.sections.map(toApiSection),
  };
}

function createDefaultForm(): FormSchema {
  const sections = [
    {
      ...createSection("Business Info", [
        createField({
          label: "Enterprise Name",
          field_key: "business_legal_name",
          field_type: "text",
          placeholder: "Pinnacle Wellness Co.",
          help_text: "Legal enterprise name displayed across onboarding screens.",
          required: true,
          locked: true,
          visible: true,
        }),
        createField({
          label: "Trading / DBA Name",
          field_key: "business_short_name",
          field_type: "text",
          placeholder: "Pinnacle Wellness",
          help_text: "Short business name used in forms and summaries.",
          required: false,
          locked: true,
          visible: true,
        }),
      ]),
      order: 1,
    },
    {
      ...createSection("Contact", [
        createField({
          label: "Business Email",
          field_key: "business_email",
          field_type: "email",
          placeholder: "hello@pinnaclewellness.com",
          help_text: "Main email address for business communication.",
          required: true,
        }),
        createField({
          label: "Business Phone",
          field_key: "business_phone",
          field_type: "phone",
          placeholder: "+91 98765 43210",
          help_text: "Primary business contact number.",
          required: true,
        }),
        createField({
          label: "Primary Contact Name",
          field_key: "primary_contact_name",
          field_type: "text",
          placeholder: "Sarah Johnson",
          help_text: "Person responsible for onboarding responses.",
        }),
        createField({
          label: "Primary Contact Title",
          field_key: "primary_contact_title",
          field_type: "text",
          placeholder: "Founder & CEO",
          help_text: "Job title or role of the primary contact.",
        }),
      ]),
      order: 2,
    },
    {
      ...createSection("Address", [
        createField({
          label: "Registered Address",
          field_key: "registered_address",
          field_type: "textarea",
          placeholder: "Registered office address",
          help_text: "Legal registered address for the enterprise.",
        }),
        createField({
          label: "Business Address",
          field_key: "business_address",
          field_type: "textarea",
          placeholder: "Business address",
          help_text: "Operational or mailing address.",
        }),
        createField({
          label: "Communication Address",
          field_key: "communication_address",
          field_type: "textarea",
          placeholder: "Preferred communication address",
          help_text: "Where official communication should be sent.",
        }),
      ]),
      order: 3,
    },
    {
      ...createSection("Branding", [
        createField({
          label: "Logo",
          field_key: "logo_url",
          field_type: "image",
          placeholder: "https://example.com/logo.png",
          help_text: "Brand logo used in headers and cards.",
        }),
        createField({
          label: "Banner",
          field_key: "banner_url",
          field_type: "image",
          placeholder: "https://example.com/banner.png",
          help_text: "Large hero banner image for the enterprise.",
        }),
        createField({
          label: "Brand Color",
          field_key: "brand_color",
          field_type: "text",
          placeholder: "#1F5D4E",
          help_text: "Primary brand accent color.",
        }),
        createField({
          label: "Tagline",
          field_key: "tagline",
          field_type: "text",
          placeholder: "Wellness made simple",
          help_text: "Short brand phrase shown in profiles.",
        }),
      ]),
      order: 4,
    },
  ].map((section, index) => ({
    ...section,
    order: index + 1,
    fields: normalizeFields(section.fields),
  }));

  return {
    name: "Standard Enterprise Onboarding Form",
    description: "Default onboarding form for enterprise owners.",
    entity_type: "enterprise",
    status: "draft",
    sections,
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

function SectionCard({
  section,
  isActive,
  isRearrangeMode,
  onSelect,
  onDelete,
}: {
  section: FormSection;
  isActive: boolean;
  isRearrangeMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
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
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md ${
        isActive ? "border-[#c6ddd3] bg-[#f4faf7]" : "border-[#e1ebe6] bg-white"
      } ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isRearrangeMode ? (
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d7e5df] bg-white text-[#52736a] shadow-sm"
                aria-label={`Drag ${section.title}`}
                {...attributes}
                {...listeners}
              >
                <DragHandleIcon />
              </button>
            ) : null}
            <p className="truncate text-sm font-bold text-[#06201c]">{section.title}</p>
          </div>
          <p className="mt-1 text-xs text-[#52736a]">{section.fields.length} field(s)</p>
          <p className="mt-1 text-xs text-[#7f9d94]">Order {section.order}</p>
          {containsLockedFields ? (
            <span className="mt-2 inline-flex rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-bold text-[#4c6ef5]">
              Locked fields
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Delete ${section.title}`}
          disabled={containsLockedFields}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="rounded-full border border-[#d7e5df] px-2 py-1 text-[11px] font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-40"
          title={containsLockedFields ? "Locked fields cannot be deleted" : undefined}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function FieldCard({
  field,
  isRearrangeMode,
  onEdit,
  onDelete,
}: {
  field: FormField;
  isRearrangeMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = isRearrangeMode
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-4 transition hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md ${
        isDragging && isRearrangeMode ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {isRearrangeMode ? (
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d7e5df] bg-white text-[#52736a] shadow-sm"
                aria-label={`Drag ${field.label}`}
                {...attributes}
                {...listeners}
              >
                <DragHandleIcon />
              </button>
            ) : null}
            <h4 className="text-sm font-bold text-[#06201c]">{field.label}</h4>
            <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]">
              {fieldTypeLabel(field.field_type)}
            </span>
            {field.locked ? (
              <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-bold text-[#4c6ef5]">
                Locked
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[#52736a]">
            Field Key: <span className="font-mono">{field.field_key}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                field.required ? "bg-[#e8f6ee] text-[#16825b]" : "bg-[#f1f4f3] text-[#6b7f79]"
              }`}
            >
              {field.required ? "Required" : "Optional"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                field.visible ? "bg-[#e8f6ee] text-[#16825b]" : "bg-[#f1f4f3] text-[#6b7f79]"
              }`}
            >
              {field.visible ? "Visible" : "Hidden"}
            </span>
            <span className="rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-bold text-[#6b7f79]">
              Order {field.order}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[#d7e5df] px-3 py-2 font-semibold text-[#1f6a58] hover:bg-[#f4faf7]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={field.locked}
            title={field.locked ? "Locked fields cannot be deleted" : undefined}
            className="rounded-full border border-[#d7e5df] px-3 py-2 font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
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
          <p className="mt-1 text-xs text-[#52736a]">Key: {field.field_key}</p>
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
  const [form, setForm] = useState<FormSchema>(() => initialForm);
  const [activeSectionId, setActiveSectionId] = useState<string>(initialForm.sections[0]?.id ?? "");
  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [isFieldRearrangeMode, setIsFieldRearrangeMode] = useState(false);
  const [previewScope, setPreviewScope] = useState<PreviewScope>("section");
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<FieldDraft>(() => createFieldDraft());
  const [notice, setNotice] = useState<string | null>(null);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const activeSection = form.sections.find((section) => section.id === activeSectionId) ?? form.sections[0];

  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(null), 2200);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [notice]);

  useEffect(() => {
    if (form.sections.length > 0 && !form.sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(form.sections[0].id);
    }
  }, [activeSectionId, form.sections]);

  useEffect(() => {
    setIsFieldEditorOpen(false);
    setEditingFieldId(null);
    setFieldDraft(createFieldDraft());
  }, [activeSectionId]);

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

  function handleFieldDragEnd(event: DragEndEvent) {
    if (!activeSection || !isFieldRearrangeMode) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = activeSection.fields.findIndex((field) => field.id === active.id);
    const newIndex = activeSection.fields.findIndex((field) => field.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextFields = normalizeFields(arrayMove(activeSection.fields, oldIndex, newIndex));

    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === activeSection.id ? { ...section, fields: nextFields } : section,
      ),
    }));
  }

  function openAddFieldPanel() {
    if (!activeSection) {
      return;
    }

    setEditingFieldId(null);
    setFieldDraft(createFieldDraft());
    setIsFieldEditorOpen(true);
  }

  function openEditFieldPanel(field: FormField) {
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

    if (!trimmedLabel || !trimmedFieldKey) {
      setNotice("Label and Field Key are required.");
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
      options: supportsOptions(fieldDraft.field_type) ? parseOptions(fieldDraft.optionsText) : [],
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
    const payload = buildFormPayload(snapshot, "draft");
    setIsSaving(true);

    try {
      if (savedFormId === null) {
        const response = await createOnboardingForm(payload);
        setSavedFormId(response.id);
        setForm((current) => ({
          ...current,
          name: response.name ?? current.name,
          description: response.description ?? current.description,
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
      setForm((current) => ({
        ...current,
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
    const payload = buildFormPayload(snapshot, "draft");
    setIsPublishing(true);

    try {
      let nextSavedFormId = savedFormId;

      if (nextSavedFormId === null) {
        const createResponse = await createOnboardingForm(payload);
        nextSavedFormId = createResponse.id;
        setSavedFormId(createResponse.id);
        setForm((current) => ({
          ...current,
          name: createResponse.name ?? current.name,
          description: createResponse.description ?? current.description,
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
        setForm((current) => ({
          ...current,
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

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">Onboarding Form Builder</h2>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeClass(form.status)}`}>
              {statusLabel(form.status)}
            </span>
          </div>
          <p className="text-sm text-[#52736a]">Build the enterprise onboarding form template.</p>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-[#06201c]">Form Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateFormName(event.target.value)}
                className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#06201c]">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => updateFormDescription(event.target.value)}
                className="mt-1.5 min-h-24 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
              />
            </label>

            {notice ? (
              <p className="rounded-xl border border-[#cfe6d9] bg-[#f1f8f4] px-4 py-3 text-sm font-medium text-[#16644f]">
                {notice}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Actions</p>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSaving || isPublishing}
                className="h-11 rounded-full border border-[#cfe6d9] bg-white px-4 text-sm font-bold text-[#1f6a58] shadow-sm transition hover:border-[#b6d7c5] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={showPreview}
                className="h-11 rounded-full border border-[#cfe6d9] px-4 text-sm font-bold text-[#1f6a58] transition hover:bg-[#f4faf7]"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={publishForm}
                disabled={isSaving || isPublishing}
                className="h-11 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPublishing ? "Publishing..." : "Publish"}
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="h-11 cursor-not-allowed rounded-full border border-dashed border-[#d7e5df] bg-[#f5f7f6] px-4 text-sm font-bold text-[#8ca69e] opacity-80"
              >
                Assign to Enterprise
              </button>
            </div>
            <p className="mt-3 text-xs text-[#7f9d94]">Assign is disabled for now and marked as coming soon.</p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Sections</p>
                <h3 className="mt-1 text-base font-bold text-[#06201c]">Form Structure</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRearrangeMode((current) => !current)}
                  className="h-10 rounded-full border border-[#cfe6d9] px-4 text-sm font-bold text-[#1f6a58] transition hover:bg-[#f4faf7]"
                >
                  {isRearrangeMode ? "Done" : "Rearrange"}
                </button>
                <button
                  type="button"
                  onClick={addSection}
                  className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm"
                >
                  + Add Section
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <DndContext collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext
                  items={form.sections.map((section) => section.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {form.sections.map((section) => {
                    const active = section.id === activeSectionId;

                    return (
                      <SectionCard
                        key={section.id}
                        section={section}
                        isActive={active}
                        isRearrangeMode={isRearrangeMode}
                        onSelect={() => setActiveSectionId(section.id)}
                        onDelete={() => deleteSection(section.id)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Rename Selected Section</p>
            <label className="mt-3 block">
              <span className="text-sm font-bold text-[#06201c]">Section Title</span>
              <input
                type="text"
                value={activeSection?.title ?? ""}
                onChange={(event) => updateSelectedSectionTitle(event.target.value)}
                className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
              />
            </label>
            <p className="mt-3 text-xs text-[#7f9d94]">
              {activeSection ? `Selected: ${activeSection.title}` : "No section selected."}
            </p>
          </section>
        </aside>

        <div className="space-y-5">
          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Fields</p>
                <h3 className="mt-1 text-base font-bold text-[#06201c]">
                  {activeSection ? activeSection.title : "Selected Section"}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFieldRearrangeMode((current) => !current)}
                  className="h-11 rounded-full border border-[#cfe6d9] px-4 text-sm font-bold text-[#1f6a58] transition hover:bg-[#f4faf7]"
                >
                  {isFieldRearrangeMode ? "Done" : "Rearrange Fields"}
                </button>
                <button
                  type="button"
                  onClick={openAddFieldPanel}
                  className="h-11 rounded-full border border-[#cfe6d9] px-4 text-sm font-bold text-[#1f6a58] transition hover:bg-[#f4faf7]"
                >
                  + Add Field
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {!activeSection ? (
                <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-[#06201c]">Select a section to manage fields.</p>
                </div>
              ) : currentFieldList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-[#06201c]">No fields in this section yet.</p>
                  <p className="mt-1 text-sm text-[#52736a]">Add a field to start building the section.</p>
                </div>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                  <SortableContext
                    items={currentFieldList.map((field) => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {currentFieldList.map((field) => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          isRearrangeMode={isFieldRearrangeMode}
                          onEdit={() => openEditFieldPanel(field)}
                          onDelete={() => deleteField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </section>

          {isFieldEditorOpen ? (
            <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">
                    {editingFieldId ? "Edit Field Settings" : "Add Field"}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-[#06201c]">
                    {editingFieldId ? "Update the selected field" : "Create a new field for this section"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFieldEditorOpen(false);
                    setEditingFieldId(null);
                    setFieldDraft(createFieldDraft());
                  }}
                  className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-[#06201c]">Label</span>
                  <input
                    type="text"
                    value={fieldDraft.label}
                    onChange={(event) => {
                      const nextLabel = event.target.value;
                      setFieldDraft((current) => ({
                        ...current,
                        label: nextLabel,
                        field_key:
                          current.field_key.trim().length > 0 &&
                          current.field_key !== slugifyFieldKey(current.label)
                            ? current.field_key
                            : slugifyFieldKey(nextLabel),
                      }));
                    }}
                    className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#06201c]">Field Key</span>
                  <input
                    type="text"
                    value={fieldDraft.field_key}
                    onChange={(event) =>
                      setFieldDraft((current) => ({ ...current, field_key: event.target.value }))
                    }
                    className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#06201c]">Field Type</span>
                  <select
                    value={fieldDraft.field_type}
                    onChange={(event) =>
                      setFieldDraft((current) => ({
                        ...current,
                        field_type: event.target.value as FieldType,
                      }))
                    }
                    className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                  >
                    {fieldTypes.map((fieldType) => (
                      <option key={fieldType} value={fieldType}>
                        {fieldTypeLabel(fieldType)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#06201c]">Placeholder</span>
                  <input
                    type="text"
                    value={fieldDraft.placeholder}
                    onChange={(event) =>
                      setFieldDraft((current) => ({ ...current, placeholder: event.target.value }))
                    }
                    className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-bold text-[#06201c]">Help Text</span>
                  <textarea
                    value={fieldDraft.help_text}
                    onChange={(event) =>
                      setFieldDraft((current) => ({ ...current, help_text: event.target.value }))
                    }
                    className="mt-1.5 min-h-24 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#06201c]">
                  <input
                    type="checkbox"
                    checked={fieldDraft.required}
                    onChange={(event) =>
                      setFieldDraft((current) => ({ ...current, required: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-[#c6ddd3] text-[#1f6a58] focus:ring-[#1f6a58]"
                  />
                  Required
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#06201c]">
                  <input
                    type="checkbox"
                    checked={fieldDraft.visible}
                    onChange={(event) =>
                      setFieldDraft((current) => ({ ...current, visible: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-[#c6ddd3] text-[#1f6a58] focus:ring-[#1f6a58]"
                  />
                  Visible
                </label>
              </div>

              {supportsOptions(fieldDraft.field_type) ? (
                <label className="mt-4 block">
                  <span className="text-sm font-bold text-[#06201c]">
                    Options
                    <span className="ml-2 text-xs font-medium text-[#7f9d94]">
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
                    className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFieldEditorOpen(false);
                    setEditingFieldId(null);
                    setFieldDraft(createFieldDraft());
                  }}
                  className="h-11 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveField}
                  className="h-11 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#175245]"
                >
                  {editingFieldId ? "Save Changes" : "Add Field"}
                </button>
              </div>
            </section>
          ) : null}

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
