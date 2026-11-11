"use client";

import { validateFieldConfiguration } from "./blog-form-validator";
import { BlogConfirmationModal } from "./BlogConfirmationModal";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DragEndEvent } from "@dnd-kit/core";
import { FieldEditor, FormStructureCanvas, type BuilderSelection, type ConfiguredField, type CoreFieldRegistryItem, type FormSection } from "@ihp/platform-form-configurations";
import { BlogFormActivationDialog, BlogFormDetailsDialog } from "./BlogFormDialogs";
import {
  createAdminBlogFormDraft,
  getAdminBlogForm,
  publishAdminBlogForm,
  updateAdminBlogForm,
  type BlogForm,
  type BlogFormField,
  type BlogFormSection,
} from "@ihp/shared";

export type FieldVisibilityScope = "customer_visible" | "admin_only";

export type FieldSectionType = "core_protected" | "configurable" | "admin_notes";
export type SectionVisibilityScope = "customer_visible" | "admin_only";

export interface FormSectionDef {
  readonly id: string;
  name: string;
  description: string;
  readonly type: FieldSectionType;
  readonly isProtected: boolean;
  isActive: boolean;
  visibilityScope: SectionVisibilityScope;
}

export interface SchemaFieldItem {
  readonly id: string;
  readonly key: string;
  label: string;
  readonly type: string;
  readonly sectionId: string;
  readonly isLocked: boolean;
  isRequired: boolean;
  isActive: boolean;
  description: string;
  placeholder: string;
  visibilityScope: FieldVisibilityScope;
  validation?: Record<string, string | number | boolean | null>;
  tags?: readonly string[];
}

const PROTECTED_SYSTEM_FIELD_KEYS = new Set([
  "post_type",
  "title",
  "excerpt",
  "content",
  "category",
  "cover_image",
  "post_title_slug",
  "short_summary",
  "article_content",
  "category_id",
  "cover_image_file",
  "cover_image_url",
]);

function isProtectedSystemFieldKey(fieldKey: string): boolean {
  return PROTECTED_SYSTEM_FIELD_KEYS.has(fieldKey);
}

export const LEGACY_DEFAULT_PLACEHOLDERS = new Set<string>([
  "Choose Blog or News",
  "Enter the post title",
  "Summarize the post for readers",
  "Write the post content...",
  "Choose a category",
  "Upload cover image",
  "Add tags",
  "Add tags separated by commas",
  "https://example.com",
  "Upload a document",
  "Upload a document (PDF)",
  "Upload additional images",
  "Add additional information",
  "e.g., REF-2026-0891",
  "Add editorial review notes, remarks, or revision feedback...",
  "Upload internal document (PDF, DOCX)",
  "Add an internal note",
  "Enter text value...",
  "Enter formatted article content...",
  "Add additional information...",
  "Choose an option from dropdown...",
  "Choose one option...",
  "Select multiple values...",
  "Enter a number...",
  "Choose a date...",
  "Choose a time...",
]);

export function getFieldDefaultPlaceholder(field?: { key?: string; type?: string; label?: string } | null): string {
  if (!field) return "";
  const key = (field.key || "").toLowerCase();
  if (key === "post_type") return "Choose Blog or News";
  if (key === "post_title_slug" || key === "title") return "Enter the post title";
  if (key === "short_summary" || key === "excerpt") return "Summarize the post for readers";
  if (key === "article_content" || key === "content") return "Write the post content...";
  if (key === "category_id" || key === "category") return "Choose a category";
  if (key === "cover_image_url" || key === "cover_image" || key === "cover_image_file") return "Upload cover image";
  if (key === "article_tags" || key === "tags") return "Add tags separated by commas";
  if (key === "reference_url") return "https://example.com";
  if (key === "supporting_document") return "Upload a document (PDF)";
  if (key === "additional_images") return "Upload additional images";
  if (key === "additional_information") return "Add additional information";
  if (key === "internal_reference_number") return "e.g., REF-2026-0891";
  if (key === "editorial_notes") return "Add editorial review notes, remarks, or revision feedback...";
  if (key === "supporting_internal_document") return "Upload internal document (PDF, DOCX)";
  if (key === "internal_reviewer_notes") return "Add an internal note";

  switch (field.type) {
    case "text":
      return field.label ? `Enter ${field.label.toLowerCase()}...` : "Enter text...";
    case "textarea":
      return field.label ? `Enter ${field.label.toLowerCase()}...` : "Enter description...";
    case "rich_text":
      return "Write formatted content...";
    case "select":
    case "radio":
      return "Choose an option...";
    case "multi_select":
    case "multiselect":
      return "Select options...";
    case "number":
      return "0";
    case "date":
      return "YYYY-MM-DD";
    case "time":
      return "HH:MM";
    case "url":
      return "https://example.com";
    case "file_upload":
      return "Upload a file...";
    case "media_upload":
      return "Upload media...";
    default:
      return field.label ? `Enter ${field.label.toLowerCase()}...` : "Enter value...";
  }
}

function renumberSections(sectionItems: FormSectionDef[]): FormSectionDef[] {
  return sectionItems.map((section, index) => ({
    ...section,
    name: `${index + 1}. ${section.name.replace(/^\d+\.\s*/, "").trim() || "Untitled Section"}`,
  }));
}

function blogRendererLabel(type: SchemaFieldItem["type"]): string {
  const labels: Partial<Record<SchemaFieldItem["type"], string>> = {
    text: "Short Text",
    textarea: "Long Text",
    rich_text: "Rich Text Field",
    select: "Dropdown",
    radio: "Radio Button",
    checkbox: "Checkbox / Multi-select",
    multi_select: "Checkbox / Multi-select",
    number: "Number",
    date: "Date",
    time: "Time",
    url: "Reference URL",
    media_upload: "Additional Images",
    file_upload: "Supporting Document",
    video: "Videos",
  };
  return labels[type] ?? type;
}

// Note: validateFieldConfiguration is imported from ./blog-form-validator

const INITIAL_SECTIONS: FormSectionDef[] = [
  {
    id: "sec-core-1",
    name: "1. Main Blog Details",
    description: "Required fields used on every Blog and News submission form.",
    type: "core_protected",
    isProtected: true,
    isActive: true,
    visibilityScope: "customer_visible",
  },
  {
    id: "sec-config-2",
    name: "2. Supporting Media & References",
    description: "Optional details that help readers explore or download the post.",
    type: "configurable",
    isProtected: false,
    isActive: true,
    visibilityScope: "customer_visible",
  },
  {
    id: "sec-admin-3",
    name: "3. Internal Information",
    description: "Private internal records and editorial documentation for Enterprise Admins.",
    type: "admin_notes",
    isProtected: false,
    isActive: true,
    visibilityScope: "admin_only",
  },
];

const INITIAL_FIELDS: SchemaFieldItem[] = [
  {
    id: "f-type-00",
    key: "post_type",
    label: "Post Type",
    type: "select",
    sectionId: "sec-core-1",
    isLocked: true,
    isRequired: true,
    isActive: true,
    description: "Choose whether this submission is a Blog or News post.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-title-01",
    key: "post_title_slug",
    label: "Title",
    type: "text",
    sectionId: "sec-core-1",
    isLocked: true,
    isRequired: true,
    isActive: true,
    description: "The title shown to readers.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-summary-02",
    key: "short_summary",
    label: "Short Summary",
    type: "textarea",
    sectionId: "sec-core-1",
    isLocked: true,
    isRequired: true,
    isActive: true,
    description: "A short overview shown before readers open the full post.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-content-05",
    key: "article_content",
    label: "Blog/News Content",
    type: "rich_text",
    sectionId: "sec-core-1",
    isLocked: true,
    isRequired: true,
    isActive: true,
    description: "Write the full content readers will see.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-category-03",
    key: "category_id",
    label: "Category",
    type: "select",
    sectionId: "sec-core-1",
    isLocked: true,
    isRequired: true,
    isActive: true,
    description: "Choose the category that best fits the post.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-cover-04",
    key: "cover_image_url",
    label: "Cover Image",
    type: "media_upload",
    sectionId: "sec-core-1",
    isLocked: true,
    isRequired: true,
    isActive: true,
    description: "The image shown with the post in listings and previews.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-tags-06",
    key: "article_tags",
    label: "Tags",
    type: "multi_select",
    sectionId: "sec-config-2",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Optional keywords to help readers find the post.",
    placeholder: "",
    visibilityScope: "customer_visible",
    tags: [],
  },
  {
    id: "f-ref-07",
    key: "reference_url",
    label: "Reference URL",
    type: "url",
    sectionId: "sec-config-2",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Add an optional link related to the post.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-pdf-08",
    key: "supporting_document",
    label: "Supporting Document",
    type: "file_upload",
    sectionId: "sec-config-2",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Optional document related to the post.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-images-09",
    key: "additional_images",
    label: "Additional Images",
    type: "media_upload",
    sectionId: "sec-config-2",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Optional images that support the article.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-info-10",
    key: "additional_information",
    label: "Additional Information",
    type: "textarea",
    sectionId: "sec-config-2",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Optional context or information related to the article.",
    placeholder: "",
    visibilityScope: "customer_visible",
  },
  {
    id: "f-ref-11",
    key: "internal_reference_number",
    label: "Internal Reference Number",
    type: "text",
    sectionId: "sec-admin-3",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Internal reference number for enterprise auditing and tracking.",
    placeholder: "",
    visibilityScope: "admin_only",
  },
  {
    id: "f-editorial-12",
    key: "editorial_notes",
    label: "Editorial Notes",
    type: "textarea",
    sectionId: "sec-admin-3",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Editorial notes visible only to enterprise administrators and reviewers.",
    placeholder: "",
    visibilityScope: "admin_only",
  },
  {
    id: "f-doc-13",
    key: "supporting_internal_document",
    label: "Supporting Internal Document",
    type: "file_upload",
    sectionId: "sec-admin-3",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Internal documentation for compliance and verification; never published to customers.",
    placeholder: "",
    visibilityScope: "admin_only",
  },
  {
    id: "f-reviewnotes-14",
    key: "internal_reviewer_notes",
    label: "Internal Reviewer Notes",
    type: "textarea",
    sectionId: "sec-admin-3",
    isLocked: false,
    isRequired: false,
    isActive: true,
    description: "Notes visible only to administrators.",
    placeholder: "",
    visibilityScope: "admin_only",
  },
];

interface PaletteItem {
  readonly type: string;
  readonly label: string;
  readonly defaultPlaceholder: string;
  readonly defaultDescription: string;
}

interface NewFieldDraft {
  readonly paletteItem: PaletteItem;
  label: string;
  helpText: string;
  placeholder: string;
  isRequired: boolean;
  isActive: boolean;
  visibilityScope: FieldVisibilityScope;
  validation: Record<string, string | number | boolean | null>;
  sectionId?: string;
}

const PALETTE_ITEMS: readonly PaletteItem[] = [
  {
    type: "text",
    label: "Short Text",
    defaultPlaceholder: "Enter text value...",
    defaultDescription: "Single line textual input for alphanumeric data.",
  },
  {
    type: "rich_text",
    label: "Rich Text Field",
    defaultPlaceholder: "Enter formatted article content...",
    defaultDescription: "Formatted Markdown and WYSIWYG editor canvas.",
  },
  {
    type: "textarea",
    label: "Long Text",
    defaultPlaceholder: "Add additional information...",
    defaultDescription: "Optional supporting context for the article.",
  },
  {
    type: "select",
    label: "Dropdown",
    defaultPlaceholder: "Choose an option from dropdown...",
    defaultDescription: "Select one option from a predefined list.",
  },
  {
    type: "radio",
    label: "Radio Button",
    defaultPlaceholder: "Choose one option...",
    defaultDescription: "Choose exactly one option from a list.",
  },
  {
    type: "multi_select",
    label: "Checkbox / Multi-select",
    defaultPlaceholder: "Select multiple values...",
    defaultDescription: "Select one or more tags.",
  },
  {
    type: "number",
    label: "Number",
    defaultPlaceholder: "Enter a number...",
    defaultDescription: "Numeric value with optional range validation.",
  },
  {
    type: "date",
    label: "Date",
    defaultPlaceholder: "Choose a date...",
    defaultDescription: "Calendar date value.",
  },
  {
    type: "time",
    label: "Time",
    defaultPlaceholder: "Choose a time...",
    defaultDescription: "Time value.",
  },
  {
    type: "url",
    label: "Reference URL",
    defaultPlaceholder: "https://example.com",
    defaultDescription: "Optional link related to the article.",
  },
  {
    type: "media_upload",
    label: "Additional Images",
    defaultPlaceholder: "Upload additional images...",
    defaultDescription: "Optional images that support the article.",
  },
  {
    type: "file_upload",
    label: "Supporting Document",
    defaultPlaceholder: "Upload a supporting document...",
    defaultDescription: "Attach an optional document related to the post.",
  },
];

export default function PlatformBlogFormBuilderScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryName = searchParams?.get("name");
  const queryType = searchParams?.get("type") as BlogForm["type"] | null;

  const formId = searchParams?.get("id");
  const [formTitle, setFormTitle] = useState(queryName || "Blog and News Submission Form");
  const [formType, setFormType] = useState<BlogForm["type"]>(queryType || "both");
  const [formMode, setFormMode] = useState<"standard" | "configurable">("configurable");
  const [formStatus, setFormStatus] = useState<BlogForm["status"]>("draft");
  const [sections, setSections] = useState<FormSectionDef[]>(INITIAL_SECTIONS);
  const [fields, setFields] = useState<SchemaFieldItem[]>(INITIAL_FIELDS);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("sec-core-1");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, SchemaFieldItem>>({});
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, FormSectionDef>>({});
  const [fieldToDelete, setFieldToDelete] = useState<SchemaFieldItem | null>(null);
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<FormSectionDef | null>(null);
  const [schemaVersion, setSchemaVersion] = useState("v1");
  const [formRevision, setFormRevision] = useState<number | null>(null);
  const [showSavedDraftModal, setShowSavedDraftModal] = useState(false);
  const [showFormDetailsModal, setShowFormDetailsModal] = useState(false);
  const [showReviewSubmitModal, setShowReviewSubmitModal] = useState(false);
  const [publishStep, setPublishStep] = useState<"review" | "confirm" | "published">("review");
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMode, setPreviewRole] = useState<"enterprise" | "customer_mobile" | "customer_web">("enterprise");
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldDraft, setNewFieldDraft] = useState<NewFieldDraft | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [newSectionVisibility, setNewSectionVisibility] = useState<SectionVisibilityScope>("customer_visible");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormLoaded, setIsFormLoaded] = useState(!formId);
  const [savedSnapshot, setSavedSnapshot] = useState("");

  const currentSnapshot = useMemo(
    () => JSON.stringify({ formTitle, formMode, sections, fields }),
    [formTitle, formMode, sections, fields]
  );
  const isDirty = isFormLoaded && Boolean(savedSnapshot) && currentSnapshot !== savedSnapshot;

  useEffect(() => {
    if (!formId) return;
    let cancelled = false;
    void getAdminBlogForm(formId).then((form: BlogForm) => {
      if (cancelled) return;
      setFormTitle(form.name);
      setFormType(form.type);
      setFormMode("configurable");
      setFormStatus(form.status);
      setSchemaVersion(`v${Math.max(1, form.version)}`);
      setFormRevision(typeof form.revision === "number" ? form.revision : null);
      const sourceCoreSection = form.sections.find((section: BlogFormSection) =>
        section.fields.some((field) => isProtectedSystemFieldKey(field.key)),
      );
      const mappedSections: FormSectionDef[] = form.sections.map((section: BlogFormSection, index) => ({
        id: section.id,
        name: section.title.match(/^\d+\./) ? section.title : `${index + 1}. ${section.title}`,
        description: section.description ?? "",
        type: section.id === sourceCoreSection?.id
          ? "core_protected"
          : (section.type as FormSectionDef["type"] ?? (section.visibility_scope === "admin_only" ? "admin_notes" : "configurable")),
        isProtected: section.id === sourceCoreSection?.id,
        isActive: section.visible !== false,
        visibilityScope: section.visibility_scope === "admin_only" ? "admin_only" : "customer_visible",
      }));
      const needsSyntheticCore = !sourceCoreSection;
      let nextSections: FormSectionDef[];
      nextSections = mappedSections.length > 0
        ? needsSyntheticCore
          ? [{ ...INITIAL_SECTIONS[0], id: "sec-core-1" }, ...mappedSections]
          : mappedSections
        : INITIAL_SECTIONS;
      const coreSectionId = nextSections.find((section) => section.isProtected)?.id ?? "sec-core-1";

      const mappedFields: SchemaFieldItem[] = form.sections.flatMap((section: BlogFormSection) =>
        section.fields.map((field: BlogFormField) => {
          const rawPlaceholder = field.placeholder?.trim() ?? "";
          const isLegacyDefault = LEGACY_DEFAULT_PLACEHOLDERS.has(rawPlaceholder);
          return {
            id: field.id,
            key: field.key,
            label: field.label,
            type: field.type,
            sectionId: section.id,
            isLocked: isProtectedSystemFieldKey(field.key),
            isRequired: isProtectedSystemFieldKey(field.key) || field.required,
            isActive: isProtectedSystemFieldKey(field.key) || field.visible,
            description: field.help_text ?? "",
            placeholder: isLegacyDefault ? "" : rawPlaceholder,
            visibilityScope: isProtectedSystemFieldKey(field.key)
              ? "customer_visible"
              : (field.visibility_scope as FieldVisibilityScope | null) ?? "customer_visible",
            validation: field.validation ?? undefined,
          };
        })
      );

      const hasCoreFields = mappedFields.some((f) => isProtectedSystemFieldKey(f.key));
      const coreFields = INITIAL_FIELDS
        .filter((field) => field.sectionId === "sec-core-1")
        .map((field) => ({ ...field, sectionId: coreSectionId }));

      let resolvedFields: SchemaFieldItem[];
      resolvedFields = hasCoreFields
        ? [
            ...mappedFields,
            ...(needsSyntheticCore ? coreFields : []),
          ]
        : [
            ...coreFields,
            ...mappedFields,
          ];

      setSections(nextSections);
      setFields(resolvedFields);
      setSelectedSectionId(coreSectionId);
      setSelectedFieldId(null);
      setIsInspectorOpen(false);
      setSavedSnapshot(JSON.stringify({ formTitle: form.name, formMode: form.mode, sections: nextSections, fields: resolvedFields }));
      setIsFormLoaded(true);
    }).catch(() => {
      showToast("Unable to load this form. Start with the available fields.");
      setIsFormLoaded(true);
    });
    return () => { cancelled = true; };
  }, [formId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!showPreviewModal && !showAddSectionModal && !showAddFieldModal && !fieldToDelete && !showSavedDraftModal && !showFormDetailsModal && !showReviewSubmitModal && !showActivationDialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowPreviewModal(false);
        setShowAddSectionModal(false);
        setShowAddFieldModal(false);
        setFieldToDelete(null);
        setShowSavedDraftModal(false);
        setShowFormDetailsModal(false);
        setShowReviewSubmitModal(false);
        setShowActivationDialog(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPreviewModal, showAddSectionModal, showAddFieldModal, fieldToDelete, showSavedDraftModal, showFormDetailsModal, showReviewSubmitModal, showActivationDialog]);

  const labelId = useId();
  const descId = useId();
  const placeholderId = useId();
  const sectionNameId = useId();
  const sectionDescId = useId();

  const selectedField = useMemo(
    () => {
      if (!selectedFieldId) return null;
      const field = fields.find((item) => item.id === selectedFieldId);
      return field ? fieldDrafts[field.id] ?? field : null;
    },
    [fields, fieldDrafts, selectedFieldId]
  );

  const displayedSections = sections;

  const isSelectedFieldLabelDuplicate = useMemo(() => {
    if (!selectedField) return false;
    const label = selectedField.label.trim().toLowerCase();
    if (!label) return false;
    return fields.some(
      (f) =>
        f.id !== selectedField.id &&
        f.sectionId === selectedField.sectionId &&
        f.label.trim().toLowerCase() === label,
    );
  }, [fields, selectedField]);

  const selectedSection = useMemo(
    () => {
      const section = displayedSections.find((item) => item.id === selectedSectionId) ?? displayedSections[0] ?? null;
      return section ? sectionDrafts[section.id] ?? section : null;
    },
    [displayedSections, sectionDrafts, selectedSectionId]
  );

  const builderSections = useMemo<readonly FormSection[]>(
    () => displayedSections.map((section, index) => ({
      localId: section.id,
      serverId: null,
      stableKey: section.id,
      name: section.name.replace(/^\d+\.\s*/, ""),
      description: section.description,
      enabled: section.isActive,
      position: index + 1,
      contentVisibility: section.visibilityScope === "admin_only" ? "admin_only" : "published",
    })),
    [displayedSections],
  );

  const builderFields = useMemo<readonly ConfiguredField[]>(
    () => fields.map((rawField, index) => {
      const field = fieldDrafts[rawField.id] ?? rawField;
      return ({
      localId: field.id,
      serverId: null,
      stableKey: field.key,
      coreKey: field.isLocked ? field.key : null,
      source: field.isLocked ? "core" : "custom",
      label: field.label,
      sectionLocalId: field.sectionId,
      position: index + 1,
      valueType: field.type === "number" ? "number" : field.type === "checkbox" ? "boolean" : "string",
      required: field.isRequired,
      renderer: field.type,
      placeholder: field.placeholder,
      helpText: field.description,
      options: String(field.validation?.options ?? "").split(",").map((label) => label.trim()).filter(Boolean).map((label, optionIndex) => ({ value: label, label, position: optionIndex + 1 })),
      validation: {
        minLength: typeof field.validation?.min_length === "number" ? field.validation.min_length : null,
        maxLength: typeof field.validation?.max_length === "number" ? field.validation.max_length : null,
        min: typeof field.validation?.min === "number" ? field.validation.min : null,
        max: typeof field.validation?.max === "number" ? field.validation.max : null,
        pattern: typeof field.validation?.pattern === "string" ? field.validation.pattern : null,
      },
      contentVisibility: field.visibilityScope === "admin_only" ? "admin_only" : "published",
      compositeConfig: null,
      enabled: field.isActive,
      });
    }),
    [fieldDrafts, fields],
  );

  const blogFieldRegistry = useMemo<readonly CoreFieldRegistryItem[]>(
    () => fields.filter((field) => field.isLocked).map((field) => ({
      key: field.key,
      displayName: field.label,
      valueType: field.type === "number" ? "number" : "string",
      allowedRenderers: PALETTE_ITEMS.map((item) => item.type),
      defaultRenderer: field.type,
      requiredByDomain: field.isRequired,
      removable: false,
      hideable: false,
      options: String(field.validation?.options ?? "").split(",").map((label) => label.trim()).filter(Boolean).map((label, optionIndex) => ({ value: label, label, position: optionIndex + 1 })),
      configurable: { label: true, section: true, position: true, required: false, renderer: true, placeholder: true, helpText: true, validation: true },
    })),
    [fields],
  );

  const selectedBuilderField = selectedFieldId ? builderFields.find((field) => field.localId === selectedFieldId) ?? null : null;

  const inspectorOpen = isInspectorOpen && Boolean(selectedField || selectedSection);
  const inspectorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!inspectorOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest("[data-inspector-trigger=\"true\"]")) return;
      if (!inspectorRef.current?.contains(target)) {
        if (selectedField) discardFieldDraft(selectedField.id);
        if (selectedSection) discardSectionDraft(selectedSection.id);
        setSelectedFieldId(null);
        setSelectedSectionId("");
        setIsInspectorOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedField) discardFieldDraft(selectedField.id);
      if (selectedSection) discardSectionDraft(selectedSection.id);
      setSelectedFieldId(null);
      setSelectedSectionId("");
      setIsInspectorOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [inspectorOpen, selectedField, selectedSection]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddFieldFromPalette = (paletteItem: PaletteItem, targetSectionId?: string) => {
    let targetSection: FormSectionDef | undefined;
    if (targetSectionId) {
      targetSection = sections.find((section) => section.id === targetSectionId);
    }
    if (!targetSection && selectedSection) {
      targetSection = selectedSection;
    }
    if (!targetSection) {
      targetSection = sections.find((section) => section.isActive) ?? sections[0];
    }

    if (!targetSection) {
      // Auto-create a configurable section and switch form to configurable mode
      const newSecId = `sec-custom-${Date.now()}`;
      const newSecName = `${sections.length + 1}. Additional Details`;
      const newSectionItem: FormSectionDef = {
        id: newSecId,
        name: newSecName,
        description: "",
        type: "configurable",
        isProtected: false,
        isActive: true,
        visibilityScope: "customer_visible",
      };
      setSections((prev) => [...prev, newSectionItem]);
      setFormMode("configurable");
      setSelectedSectionId(newSecId);
      targetSection = newSectionItem;
      showToast(`Added “${newSecName}” section.`);
    } else {
      setSelectedSectionId(targetSection.id);
    }

    setNewFieldDraft({
      paletteItem,
      label: paletteItem.label,
      helpText: paletteItem.defaultDescription,
      placeholder: "",
      isRequired: false,
      isActive: true,
      visibilityScope: targetSection.visibilityScope === "admin_only" ? "admin_only" : "customer_visible",
      validation: {},
      sectionId: targetSection.id,
    });
    setShowAddFieldModal(true);
  };

  const handleCreateField = () => {
    if (!newFieldDraft) return;
    const targetSection = sections.find((s) => s.id === (newFieldDraft.sectionId || selectedSection?.id)) ?? selectedSection;
    if (!targetSection) return;
    if (!newFieldDraft.label.trim()) {
      showToast("Enter a field label before adding the field.");
      return;
    }
    if (fields.some((field) => field.sectionId === targetSection.id && field.label.trim().toLowerCase() === newFieldDraft.label.trim().toLowerCase())) {
      showToast("Field labels must be unique within the selected section.");
      return;
    }
    const timestamp = Date.now();
    const newField: SchemaFieldItem = {
      id: `f-custom-${timestamp}`,
      key: `field_${newFieldDraft.paletteItem.type}_${timestamp.toString().slice(-4)}`,
      label: newFieldDraft.label.trim(),
      type: newFieldDraft.paletteItem.type,
      sectionId: targetSection.id,
      isLocked: false,
      isRequired: newFieldDraft.isRequired,
      isActive: newFieldDraft.isActive,
      description: newFieldDraft.helpText.trim(),
      placeholder: newFieldDraft.placeholder.trim(),
      visibilityScope:
        targetSection.visibilityScope === "admin_only" || targetSection.type === "admin_notes"
          ? "admin_only"
          : newFieldDraft.visibilityScope,
      validation: newFieldDraft.validation,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedSectionId(targetSection.id);
    setSelectedFieldId(newField.id);
    setShowAddFieldModal(false);
    setNewFieldDraft(null);
    showToast(`Added "${newField.label}" to section "${targetSection.name}".`);
  };

  const handleUpdateSelectedField = (patch: Partial<SchemaFieldItem>) => {
    if (!selectedField) return;
    const isParentSectionAdmin = selectedSection
      ? selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes"
      : false;
    const isFieldProtected = selectedField.isLocked || isProtectedSystemFieldKey(selectedField.key);

    if (patch.visibilityScope === "customer_visible" && isParentSectionAdmin) {
      showToast("This field cannot be published because its parent section is Enterprise Admin Only.");
      return;
    }
    if (patch.visibilityScope === "admin_only" && isFieldProtected) {
      showToast("Protected core article content must remain publishable.");
      return;
    }

    const nextLabel = typeof patch.label === "string" ? patch.label.trim().toLowerCase() : "";
    if (nextLabel && fields.some((field) => field.id !== selectedField.id && field.sectionId === selectedField.sectionId && field.label.trim().toLowerCase() === nextLabel)) {
      showToast("Field labels must be unique within the selected section.");
      return;
    }
    setFieldDrafts((prev) => ({
      ...prev,
      [selectedField.id]: { ...selectedField, ...patch },
    }));
  };

  const handleUpdateSharedField = (patch: Partial<ConfiguredField>) => {
    if (!selectedField) return;
    if (patch.contentVisibility === "admin_only" && selectedField.isLocked) {
      showToast("Protected core fields must remain included in published content.");
      return;
    }
    const nextValidation = patch.validation
      ? {
          ...(selectedField.validation ?? {}),
          ...(patch.validation.minLength !== undefined ? { min_length: patch.validation.minLength } : {}),
          ...(patch.validation.maxLength !== undefined ? { max_length: patch.validation.maxLength } : {}),
          ...(patch.validation.min !== undefined ? { min: patch.validation.min } : {}),
          ...(patch.validation.max !== undefined ? { max: patch.validation.max } : {}),
          ...(patch.validation.pattern !== undefined ? { pattern: patch.validation.pattern } : {}),
        }
      : selectedField.validation;
    const nextOptions = patch.options ? patch.options.map((option) => option.label).join(", ") : undefined;
    handleUpdateSelectedField({
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.placeholder !== undefined ? { placeholder: patch.placeholder } : {}),
      ...(patch.helpText !== undefined ? { description: patch.helpText } : {}),
      ...(patch.renderer !== undefined ? { type: patch.renderer } : {}),
      ...(patch.required !== undefined ? { isRequired: patch.required } : {}),
      ...(patch.enabled !== undefined ? { isActive: patch.enabled } : {}),
      ...(patch.sectionLocalId !== undefined ? { sectionId: patch.sectionLocalId } : {}),
      ...(patch.contentVisibility !== undefined ? { visibilityScope: patch.contentVisibility === "admin_only" ? "admin_only" : "customer_visible" } : {}),
      ...(nextOptions !== undefined ? { validation: { ...(nextValidation ?? {}), options: nextOptions } } : nextValidation !== selectedField.validation ? { validation: nextValidation } : {}),
    });
  };

  const handleChangeSelectedFieldType = (type: string) => {
    if (!selectedField || selectedField.isLocked || isProtectedSystemFieldKey(selectedField.key)) {
      showToast("Protected system field types cannot be changed.");
      return;
    }
    const paletteItem = PALETTE_ITEMS.find((item) => item.type === type);
    if (!paletteItem) return;
    handleUpdateSelectedField({
      type: paletteItem.type,
      placeholder: paletteItem.defaultPlaceholder,
      description: paletteItem.defaultDescription,
      validation: {},
    });
    showToast(`Field type changed to ${paletteItem.label}. Configure its settings before saving.`);
  };

  const handleUpdateFieldValidation = (key: string, value: string) => {
    if (!selectedField) return;
    handleUpdateSelectedField({
      validation: { ...(selectedField.validation ?? {}), [key]: value || null },
    });
  };

  const getChoiceOptions = (field: SchemaFieldItem): string[] => {
    const value = String(field.validation?.options ?? "");
    const options = value.split(",").map((option) => option.trim());
    return options.length > 0 ? options : [""];
  };

  const updateChoiceOptions = (options: string[]) => {
    handleUpdateFieldValidation("options", options.join(", "));
  };

  const handleToggleFieldActive = () => {
    if (!selectedField) return;
    if (selectedField.isLocked || isProtectedSystemFieldKey(selectedField.key)) {
      showToast("Protected system fields cannot be disabled.");
      return;
    }
    const nextActive = !selectedField.isActive;
    if (!nextActive && selectedField.isRequired) {
      handleUpdateSelectedField({ isActive: false, isRequired: false });
      showToast("Disabled field. Required setting was removed because a required field must be enabled.");
      return;
    }
    handleUpdateSelectedField({ isActive: nextActive });
  };

  const handleToggleFieldRequired = () => {
    if (!selectedField) return;
    if (selectedField.isLocked || isProtectedSystemFieldKey(selectedField.key)) {
      showToast("Protected system fields are always required.");
      return;
    }
    const nextRequired = !selectedField.isRequired;
    if (nextRequired && !selectedField.isActive) {
      handleUpdateSelectedField({ isRequired: true, isActive: true });
      showToast("Required fields are enabled automatically.");
      return;
    }
    handleUpdateSelectedField({ isRequired: nextRequired });
  };

  const handleMoveField = (fieldId: string, direction: "up" | "down") => {
    setFields((prev) => {
      const field = prev.find((f) => f.id === fieldId);
      if (!field) return prev;
      const sectionFields = prev.filter((f) => f.sectionId === field.sectionId);
      const sectionFieldIdx = sectionFields.findIndex((f) => f.id === fieldId);
      if (sectionFieldIdx === -1) return prev;
      const targetSectionFieldIdx = direction === "up" ? sectionFieldIdx - 1 : sectionFieldIdx + 1;
      if (targetSectionFieldIdx < 0 || targetSectionFieldIdx >= sectionFields.length) return prev;

      const neighborField = sectionFields[targetSectionFieldIdx];
      const idxA = prev.findIndex((f) => f.id === fieldId);
      const idxB = prev.findIndex((f) => f.id === neighborField.id);
      if (idxA === -1 || idxB === -1) return prev;

      const updated = [...prev];
      const temp = updated[idxA];
      updated[idxA] = updated[idxB];
      updated[idxB] = temp;
      return updated;
    });
  };

  const handleDropFieldOnSection = (fieldId: string, sectionId: string) => {
    setFields((prev) => {
      const field = prev.find((item) => item.id === fieldId);
      if (!field || field.sectionId === sectionId) return prev;
      return prev.map((item) => item.id === fieldId ? { ...item, sectionId, visibilityScope: sections.find((section) => section.id === sectionId)?.visibilityScope === "admin_only" ? "admin_only" : item.visibilityScope } : item);
    });
    setSelectedSectionId(sectionId);
    setSelectedFieldId(fieldId);
    setIsInspectorOpen(true);
    setDraggedFieldId(null);
    showToast("Field moved to the selected section.");
  };

  const handleDropSectionOnSection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setSections((prev) => {
      const sourceIndex = prev.findIndex((section) => section.id === sourceId);
      const targetIndex = prev.findIndex((section) => section.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      if (prev[sourceIndex].isProtected || prev[targetIndex].isProtected) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return renumberSections(next);
    });
    setDraggedSectionId(null);
    setSelectedSectionId(sourceId);
    setSelectedFieldId(null);
    setIsInspectorOpen(true);
    showToast("Section order updated.");
  };

  const handleSharedSelection = (selection: BuilderSelection) => {
    if (!selection) {
      setSelectedFieldId(null);
      setIsInspectorOpen(false);
      return;
    }
    if (selection.kind === "section") {
      setSelectedSectionId(selection.id);
      setSelectedFieldId(null);
    } else {
      const field = fields.find((item) => item.id === selection.id);
      if (!field) return;
      setSelectedSectionId(field.sectionId);
      setSelectedFieldId(field.id);
    }
    setIsInspectorOpen(true);
  };

  const handleSharedDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!overId || activeId === overId) return;
    if (activeId.startsWith("section-") && overId.startsWith("section-")) {
      handleDropSectionOnSection(activeId.replace(/^section-/, ""), overId.replace(/^section-/, ""));
      return;
    }
    if (!activeId.startsWith("field-")) return;
    const fieldId = activeId.replace(/^field-/, "");
    const targetFieldId = overId.replace(/^field-/, "");
    if (overId.startsWith("field-")) {
      const source = fields.find((field) => field.id === fieldId);
      const target = fields.find((field) => field.id === targetFieldId);
      if (!source || !target) return;
      if (source.sectionId !== target.sectionId) {
        handleDropFieldOnSection(fieldId, target.sectionId);
        return;
      }
      setFields((prev) => {
        const ordered = prev.filter((field) => field.sectionId === source.sectionId);
        const sourceIndex = ordered.findIndex((field) => field.id === fieldId);
        const targetIndex = ordered.findIndex((field) => field.id === targetFieldId);
        if (sourceIndex < 0 || targetIndex < 0) return prev;
        const nextOrdered = [...ordered];
        const [moved] = nextOrdered.splice(sourceIndex, 1);
        nextOrdered.splice(targetIndex, 0, moved);
        let cursor = 0;
        return prev.map((field) => field.sectionId === source.sectionId ? nextOrdered[cursor++] : field);
      });
      setSelectedSectionId(source.sectionId);
      setSelectedFieldId(fieldId);
      setIsInspectorOpen(true);
      return;
    }
    if (overId.startsWith("drop-")) {
      handleDropFieldOnSection(fieldId, overId.replace(/^drop-/, ""));
    }
  };

  const handleDuplicateField = (field: SchemaFieldItem) => {
    const newId = `f-dup-${Date.now()}`;
    const duplicate: SchemaFieldItem = {
      ...field,
      id: newId,
      key: `${field.key}_copy`,
      label: `${field.label} (Copy)`,
      isLocked: false,
    };
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === field.id);
      const updated = [...prev];
      updated.splice(idx + 1, 0, duplicate);
      return updated;
    });
    setSelectedFieldId(newId);
    showToast(`Duplicated "${field.label}".`);
  };

  const handleDeleteField = (field: SchemaFieldItem) => {
    if (field.isLocked || isProtectedSystemFieldKey(field.key)) {
      showToast("Protected system fields cannot be deleted.");
      return;
    }
    setFieldToDelete(field);
  };

  const handleConfirmDeleteField = () => {
    if (!fieldToDelete) return;
    const target = fieldToDelete;
    setFields((prev) => prev.filter((f) => f.id !== target.id));
    if (selectedFieldId === target.id) {
      const remaining = fields.filter((f) => f.id !== target.id && f.sectionId === target.sectionId);
      setSelectedFieldId(remaining[0]?.id ?? null);
    }
    setFieldToDelete(null);
    showToast(`Removed field “${target.label}” from draft configuration.`);
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) {
      showToast("Please enter a section name.");
      return;
    }
    const newSec: FormSectionDef = {
      id: `sec-custom-${Date.now()}`,
      name: `${sections.length + 1}. ${newSectionName.trim()}`,
      description: newSectionDesc.trim() || "Configurable custom section",
      type: newSectionVisibility === "admin_only" ? "admin_notes" : "configurable",
      isProtected: false,
      isActive: true,
      visibilityScope: newSectionVisibility,
    };
    setSections((prev) => [...prev, newSec]);
    setSelectedSectionId(newSec.id);
    setSelectedFieldId(null);
    setShowAddSectionModal(false);
    setNewSectionName("");
    setNewSectionDesc("");
    setNewSectionVisibility("customer_visible");
    showToast(`Added new section: "${newSec.name}".`);
  };

  const handleDeleteSection = (section: FormSectionDef) => {
    if (section.isProtected) {
      showToast("The protected system section cannot be removed.");
      return;
    }
    setConfirmDeleteSection(section);
  };

  const executeDeleteSection = (section: FormSectionDef) => {
    setConfirmDeleteSection(null);
    setSections((prev) => renumberSections(prev.filter((item) => item.id !== section.id)));
    setFields((prev) => prev.filter((field) => field.sectionId !== section.id));
    const nextSection = sections.find((item) => item.id !== section.id);
    setSelectedSectionId(nextSection?.id ?? "");
    setSelectedFieldId((current) => {
      const remaining = fields.filter((field) => field.sectionId !== section.id);
      return remaining.find((field) => field.sectionId === sections[0]?.id)?.id ?? remaining[0]?.id ?? current;
    });
    showToast(`Removed section “${section.name.replace(/^\d+\.\s*/, "")}".`);
  };

  const handleToggleSectionActive = (section: FormSectionDef) => {
    if (section.isProtected) {
      showToast("The protected system section cannot be disabled.");
      return;
    }
    handleUpdateSelectedSection({ isActive: !section.isActive });
  };

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === sectionId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length || targetIndex === 0 || prev[index].isProtected || prev[targetIndex].isProtected) {
        return prev;
      }
      const updated = [...prev];
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      return renumberSections(updated);
    });
  };

  const handleUpdateSelectedSection = (patch: Partial<FormSectionDef>) => {
    if (!selectedSection) return;
    if (patch.visibilityScope === "admin_only" && selectedSection.isProtected) {
      showToast("Protected core section must remain publishable.");
      return;
    }

    // Rule 1: If a section is Enterprise Admin Only, all its child fields are also restricted.
    if (patch.visibilityScope === "admin_only") {
      setFieldDrafts((prev) => {
        const next = { ...prev };
        fields.filter((field) => field.sectionId === selectedSection.id).forEach((field) => {
          next[field.id] = { ...(prev[field.id] ?? field), visibilityScope: "admin_only" };
        });
        return next;
      });
    }

    setSectionDrafts((prev) => ({
      ...prev,
      [selectedSection.id]: { ...selectedSection, ...patch },
    }));
  };

  const applyFieldDraft = (fieldId: string) => {
    const draft = fieldDrafts[fieldId];
    if (!draft) return;
    setFields((prev) => prev.map((field) => field.id === fieldId ? draft : field));
    setFieldDrafts((prev) => { const next = { ...prev }; delete next[fieldId]; return next; });
  };
  const discardFieldDraft = (fieldId: string) => setFieldDrafts((prev) => { const next = { ...prev }; delete next[fieldId]; return next; });
  const applySectionDraft = (sectionId: string) => {
    const draft = sectionDrafts[sectionId];
    if (!draft) return;
    setSections((prev) => prev.map((section) => section.id === sectionId ? draft : section));
    setSectionDrafts((prev) => { const next = { ...prev }; delete next[sectionId]; return next; });
  };
  const discardSectionDraft = (sectionId: string) => setSectionDrafts((prev) => { const next = { ...prev }; delete next[sectionId]; return next; });

  const buildSections = (): BlogFormSection[] => {
    const effectiveSections = sections.map((section) => sectionDrafts[section.id] ?? section);
    const effectiveFields = fields.map((field) => fieldDrafts[field.id] ?? field);
    return effectiveSections.map((section, sectionIndex) => ({
    id: section.id,
    title: section.name.replace(/^\d+\.\s*/, ""),
    description: section.description,
    type: section.type,
    order: sectionIndex + 1,
    visible: section.isProtected || section.isActive,
    visibility_scope: section.visibilityScope,
    fields: effectiveFields
      .filter((field) => field.sectionId === section.id)
      .map((field, fieldIndex) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        required: isProtectedSystemFieldKey(field.key) || field.isRequired,
        visible: isProtectedSystemFieldKey(field.key) || field.isActive,
        help_text: field.description || null,
        placeholder: field.placeholder || null,
        visibility_scope: isProtectedSystemFieldKey(field.key) ? "customer_visible" : field.visibilityScope,
        validation: field.validation ?? null,
        order: fieldIndex + 1,
      })),
    }));
  };

  const saveForm = async (publish: boolean): Promise<boolean> => {
    const effectiveSections = sections.map((section) => sectionDrafts[section.id] ?? section);
    const effectiveFields = fields.map((field) => fieldDrafts[field.id] ?? field);
    if (publish) setPublicationError(null);
    if (!formId) {
      showToast("Create the form first, then open the builder to save it.");
      return false;
    }
    if (!formTitle.trim()) {
      showToast("Enter a form name before saving.");
      return false;
    }
    const unnamedSection = effectiveSections.find((section) => !section.name.trim());
    if (unnamedSection) {
      showToast("Enter a name for every section before saving.");
      return false;
    }
    const invalidField = effectiveFields
      .map((field) => ({ field, error: validateFieldConfiguration(field) }))
      .find((result) => result.error);
    if (invalidField?.error) {
      setSelectedSectionId(invalidField.field.sectionId);
      setSelectedFieldId(invalidField.field.id);
      showToast(invalidField.error);
      return false;
    }
    const duplicateField = effectiveFields.find((field, index) => effectiveFields.some((other, otherIndex) => otherIndex > index && other.sectionId === field.sectionId && other.label.trim().toLowerCase() === field.label.trim().toLowerCase()));
    if (duplicateField) {
      showToast(`Field labels must be unique within each section. Rename “${duplicateField.label}”.`);
      return false;
    }
    const emptySection = effectiveSections.find((section) => !effectiveFields.some((field) => field.sectionId === section.id));
    if (emptySection) {
      showToast(`Add at least one field to “${emptySection.name.replace(/^\d+\.\s*/, "")}” before saving.`);
      return false;
    }
    if (publish && validationErrors.length > 0) {
      showToast(`Cannot publish configuration: ${validationErrors[0].message}`);
      return false;
    }
    // Explicit submission is confirmed via Review & Submit modal
    setIsSaving(true);
    try {
      // Direct links to a live form are supported too: branch the immutable
      // production version before applying any builder changes.
      const workingFormId = formStatus === "draft"
        ? formId
        : (await createAdminBlogFormDraft(formId)).id;
      const updated = await updateAdminBlogForm(workingFormId, { name: formTitle.trim(), type: formType, mode: formMode, sections: buildSections(), ...(formRevision !== null ? { base_revision: formRevision } : {}) });
      setSchemaVersion(`v${updated.version}`);
      setFormRevision(typeof updated.revision === "number" ? updated.revision : formRevision);
      setFormStatus(updated.status);
      if (publish) {
        const published = await publishAdminBlogForm(workingFormId, formRevision ?? undefined);
        setSchemaVersion(`v${published.version}`);
        setFormStatus(published.status);
        showToast("Configuration published successfully.");
      } else {
        setFormStatus(updated.status);
        showToast("Form draft saved successfully.");
        setShowSavedDraftModal(true);
      }
      if (workingFormId !== formId) {
        router.replace(`/blog-form-builder?id=${encodeURIComponent(workingFormId)}`);
      }
      setSavedSnapshot(JSON.stringify({ formTitle: formTitle.trim(), formMode, sections: effectiveSections, fields: effectiveFields }));
      setFields(effectiveFields);
      setSections(effectiveSections);
      setFieldDrafts({});
      setSectionDrafts({});
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save this form.";
      if (publish) setPublicationError(message);
      showToast(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const currentFormObject: BlogForm = useMemo(
    () => ({
      id: formId || "draft",
      name: formTitle.trim(),
      type: formType,
      mode: formMode,
      version: Number(schemaVersion.replace(/^v/, "")) || 1,
      status: formStatus,
      scope: "unassigned",
      tenant_ids: [],
      sections: buildSections(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    [formId, formTitle, formType, formMode, schemaVersion, formStatus, sections, fields]
  );


  interface ConfigurationValidationError {
    readonly id: string;
    readonly message: string;
    readonly sectionId?: string;
    readonly sectionName?: string;
    readonly fieldId?: string;
    readonly fieldLabel?: string;
    readonly settingType?: "name" | "section" | "field";
  }

  const validationErrors = useMemo<ConfigurationValidationError[]>(() => {
    const errors: ConfigurationValidationError[] = [];

    // 1. Form Title Validation
    if (!formTitle.trim()) {
      errors.push({
        id: "err-form-title",
        message: "Form Name cannot be empty.",
        settingType: "name",
      });
    } else if (formTitle.trim().length < 3) {
      errors.push({
        id: "err-form-title-len",
        message: "Form Name must contain at least 3 characters.",
        settingType: "name",
      });
    }

    // 2. Section Validations
    sections.forEach((sec, sIdx) => {
      if (!sec.name.trim()) {
        errors.push({
          id: `err-sec-name-${sec.id}`,
          message: `Section ${sIdx + 1} name cannot be blank.`,
          sectionId: sec.id,
          sectionName: `Section ${sIdx + 1}`,
          settingType: "section",
        });
      }

      const secFields = fields.filter((f) => f.sectionId === sec.id);
      if (secFields.length === 0) {
        errors.push({
          id: `err-sec-empty-${sec.id}`,
          message: `Section “${sec.name}” must contain at least one field.`,
          sectionId: sec.id,
          sectionName: sec.name,
          settingType: "section",
        });
      }

      // Rule: If section is Admin-only, all child fields must be admin-only
      const isSecAdminOnly = sec.visibilityScope === "admin_only" || sec.type === "admin_notes";
      if (isSecAdminOnly) {
        const invalidChild = secFields.find((f) => f.visibilityScope === "customer_visible");
        if (invalidChild) {
          errors.push({
            id: `err-sec-admin-${invalidChild.id}`,
            message: `Field “${invalidChild.label}” is marked Published, but parent section “${sec.name}” is Enterprise Admin Only.`,
            sectionId: sec.id,
            sectionName: sec.name,
            fieldId: invalidChild.id,
            fieldLabel: invalidChild.label,
            settingType: "field",
          });
        }
      }
    });

    // 3. Field Validations & Duplicate Checks
    fields.forEach((field, fIdx) => {
      const parentSec = sections.find((s) => s.id === field.sectionId);

      // Duplicate label check within section
      const isDuplicate = fields.some(
        (other, otherIdx) =>
          otherIdx > fIdx &&
          other.sectionId === field.sectionId &&
          other.label.trim().toLowerCase() === field.label.trim().toLowerCase(),
      );
      if (isDuplicate) {
        errors.push({
          id: `err-dup-${field.id}`,
          message: `Duplicate field label “${field.label}” found in section “${parentSec?.name || "section"}”.`,
          sectionId: field.sectionId,
          sectionName: parentSec?.name,
          fieldId: field.id,
          fieldLabel: field.label,
          settingType: "field",
        });
      }

      // Protected core fields cannot be disabled or admin-only
      const isProtected = field.isLocked || isProtectedSystemFieldKey(field.key);
      if (isProtected && !field.isActive) {
        errors.push({
          id: `err-prot-dis-${field.id}`,
          message: `Protected system field “${field.label}” cannot be disabled.`,
          sectionId: field.sectionId,
          sectionName: parentSec?.name,
          fieldId: field.id,
          fieldLabel: field.label,
          settingType: "field",
        });
      }
      if (isProtected && field.visibilityScope === "admin_only") {
        errors.push({
          id: `err-prot-vis-${field.id}`,
            message: `Protected system field “${field.label}” must remain publishable.`,
          sectionId: field.sectionId,
          sectionName: parentSec?.name,
          fieldId: field.id,
          fieldLabel: field.label,
          settingType: "field",
        });
      }

      // Required field must be enabled
      if (field.isRequired && !field.isActive) {
        errors.push({
          id: `err-req-dis-${field.id}`,
          message: `Required field “${field.label}” must be enabled.`,
          sectionId: field.sectionId,
          sectionName: parentSec?.name,
          fieldId: field.id,
          fieldLabel: field.label,
          settingType: "field",
        });
      }

      // Field configuration validation (min/max, regex, options, file size)
      const fieldErr = validateFieldConfiguration(field);
      if (fieldErr) {
        errors.push({
          id: `err-field-config-${field.id}`,
          message: fieldErr,
          sectionId: field.sectionId,
          sectionName: parentSec?.name,
          fieldId: field.id,
          fieldLabel: field.label,
          settingType: "field",
        });
      }
    });

    // 4. Essential System Fields Requirement
    // Rule: A configuration cannot be published if essential system fields are missing or disabled.
    const ESSENTIAL_FIELD_CHECKS: Array<{
      id: string;
      label: string;
      keys: string[];
    }> = [
      { id: "title", label: "Title", keys: ["title", "post_title_slug"] },
      { id: "excerpt", label: "Summary / Excerpt", keys: ["excerpt", "short_summary"] },
      { id: "content", label: "Content", keys: ["content", "article_content"] },
      { id: "category", label: "Category", keys: ["category", "category_id"] },
      { id: "cover_image", label: "Cover Image", keys: ["cover_image", "cover_image_url", "cover_image_file"] },
    ];

    ESSENTIAL_FIELD_CHECKS.forEach((essential) => {
      const match = fields.find((f) => essential.keys.includes(f.key));
      if (!match) {
        errors.push({
          id: `err-essential-missing-${essential.id}`,
          message: `Essential system field “${essential.label}” is missing from configuration. All essential article fields (Title, Summary, Content, Category, Cover Image) must exist before publication.`,
          settingType: "field",
        });
      } else if (!match.isActive) {
        const parentSec = sections.find((s) => s.id === match.sectionId);
        errors.push({
          id: `err-essential-disabled-${essential.id}`,
          message: `Essential system field “${match.label}” is disabled. Essential fields must remain enabled to publish the configuration.`,
          sectionId: match.sectionId,
          sectionName: parentSec?.name,
          fieldId: match.id,
          fieldLabel: match.label,
          settingType: "field",
        });
      }
    });

    return errors;
  }, [formTitle, sections, fields]);

  const handleFixError = (error: ConfigurationValidationError) => {
    setShowReviewSubmitModal(false);
    if (error.sectionId) {
      setSelectedSectionId(error.sectionId);
    }
    if (error.fieldId) {
      setSelectedFieldId(error.fieldId);
    } else {
      setSelectedFieldId(null);
    }
    showToast(`Navigated to ${error.fieldLabel ? `“${error.fieldLabel}”` : error.sectionName ? `“${error.sectionName}”` : "Form Title"} to fix.`);
  };

  const handlePublishConfiguration = () => {
    if (validationErrors.length > 0) {
      showToast(`Cannot publish configuration: ${validationErrors[0].message}`);
      return;
    }
    setPublishStep("confirm");
  };

  const handleConfirmPublish = async () => {
    if (validationErrors.length > 0) {
      showToast(`Cannot publish configuration: ${validationErrors[0].message}`);
      setPublishStep("review");
      return;
    }
    const success = await saveForm(true);
    if (success) {
      setPublishStep("published");
    }
  };

  const handleSaveDraft = () => { void saveForm(false); };
  const handleReviewAndSubmit = () => {
    setShowPreviewModal(false);
    setPublishStep("review");
    setShowReviewSubmitModal(true);
  };


  const getPreviewOptions = (field: SchemaFieldItem): string[] => {
    const rawOptions = field.validation?.options;
    if (Array.isArray(rawOptions)) {
      return rawOptions.map(String).map((option) => option.trim()).filter(Boolean);
    }
    if (typeof rawOptions === "string") {
      return rawOptions.split(",").map((option) => option.trim()).filter(Boolean);
    }
    return [];
  };

  const renderFieldPreviewLayout = (field: SchemaFieldItem) => {
    const options = getPreviewOptions(field);
    switch (field.type) {
      case "text":
      case "email":
        return (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400">
            {field.placeholder || (field.type === "email" ? "name@example.com" : `Enter ${field.label.toLowerCase()}...`)}
          </div>
        );
      case "textarea":
        return (
          <div className="min-h-[72px] rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-500 whitespace-pre-wrap">
            {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          </div>
        );
      case "rich_text":
        return (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
              <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-bold">B</span>
              <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-serif italic">I</span>
              <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 underline">U</span>
              <span className="h-3 w-px bg-slate-300 mx-0.5" />
              <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Link</span>
              <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">List</span>
            </div>
            <div className="min-h-[88px] p-3 text-xs text-slate-400 bg-slate-50/40">
              {field.placeholder || "Enter formatted article content (Markdown / Rich Text)..."}
            </div>
          </div>
        );
      case "select":
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
              <span>{field.placeholder || `Select ${field.label.toLowerCase()}...`}</span>
              <span className="text-slate-400 text-[10px]">&#9662;</span>
            </div>
            {options.length > 0 ? <p className="text-[10px] text-slate-400">{options.length} option{options.length === 1 ? "" : "s"}: {options.join(" · ")}</p> : <p className="text-[10px] text-amber-600">Options must be configured before publishing.</p>}
          </div>
        );
      case "radio":
        return (
          <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
            {(options.length > 0 ? options : ["Option 1", "Option 2"]).map((opt, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3.5 w-3.5 rounded-full border border-slate-300 bg-white" />
                <span>{opt}</span>
              </div>
            ))}
          </div>
        );
      case "multi_select":
      case "multiselect":
        return (
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-xs">
            {(options.length > 0 ? options : [field.placeholder || "Select multiple options..."]).map((option) => (
              <div key={option} className="flex items-center gap-2 text-slate-600">
                <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-white" />
                <span>{option}</span>
              </div>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-600">
            <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-white" />
            <span>{field.placeholder || `Enable ${field.label.toLowerCase()}`}</span>
          </div>
        );
      case "file_upload":
      case "media_upload":
        return (
          <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                {field.type === "media_upload" ? "MEDIA" : "DOC"}
              </span>
              <span className="font-medium text-slate-600">
                {field.placeholder || (field.type === "media_upload" ? "Click to upload images (PNG, JPG)" : "Attach internal supporting document (PDF, DOCX)")}
              </span>
            </div>
            <span className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs">
              Browse
            </span>
          </div>
        );
      case "date":
        return (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
            <span>{field.placeholder || "YYYY-MM-DD"}</span>
            <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase">Calendar</span>
          </div>
        );
      case "time":
        return (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
            <span>{field.placeholder || "HH:MM (e.g. 09:30 AM)"}</span>
            <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase">Time</span>
          </div>
        );
      case "number":
        return (
          <div className="space-y-1.5">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-400">
              {field.placeholder || "0"}
            </div>
            {(field.validation?.min !== undefined || field.validation?.max !== undefined) && <p className="text-[10px] text-slate-400">Range: {String(field.validation?.min ?? "any")} to {String(field.validation?.max ?? "any")}</p>}
          </div>
        );
      case "url":
        return (
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-500">
            <span className="border-r border-slate-200 bg-slate-100 px-2.5 py-2 font-mono text-[11px] text-slate-500">https://</span>
            <span className="px-2.5 py-2 text-slate-400">{field.placeholder?.replace(/^https?:\/\//, "") || "example.com"}</span>
          </div>
        );
      default:
        return (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-400">
            {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          </div>
        );
    }
  };

  const isParentSectionAdminOnly = selectedSection
    ? selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes"
    : false;
  const isProtectedField = selectedField
    ? selectedField.isLocked || isProtectedSystemFieldKey(selectedField.key)
    : false;

  return (
    <div className="form-configuration-builder-inspector blog-form-builder w-full bg-[#f4faf7] min-h-screen text-[#06201c]
      [&_.bg-slate-50]:bg-[#f8fbf9] [&_.bg-slate-100]:bg-[#eef6f2] [&_.bg-slate-200]:bg-[#e5efea]
      [&_.border-slate-100]:border-[#edf3f0] [&_.border-slate-200]:border-[#dfe9e4] [&_.border-slate-300]:border-[#cfe0d8]
      [&_.text-slate-900]:text-[#06201c] [&_.text-slate-800]:text-[#284940] [&_.text-slate-700]:text-[#355a51]
      [&_.text-slate-600]:text-[#52736a] [&_.text-slate-500]:text-[#718d84] [&_.text-slate-400]:text-[#8ca69e]">
      <style>{`.blog-form-builder button:focus-visible,.blog-form-builder input:focus-visible,.blog-form-builder select:focus-visible,.blog-form-builder textarea:focus-visible{outline:2px solid #1f6a58;outline-offset:2px}.blog-form-builder .shadow-sm{box-shadow:0 1px 3px rgba(31,106,88,.08),0 1px 2px rgba(6,32,28,.04)}.blog-form-builder .hover\\:bg-slate-50:hover{background:#f4faf7}.blog-form-builder .hover\\:bg-slate-100:hover{background:#eef6f2}.blog-form-builder .blog-field-palette{display:none!important}.blog-form-builder .blog-builder-toolbar{display:none!important}.blog-form-builder .blog-field-actions>div,.blog-form-builder .blog-field-actions>button:not(:first-child){display:none!important}`}</style>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-sm animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Subheader / Action Bar */}
      <div className="blog-builder-toolbar sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Left Meta & Titles */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/blog-forms"
            onClick={(event) => {
              if (isDirty && !window.confirm("You have unsaved changes. Leave without saving?")) event.preventDefault();
            }}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs font-semibold transition-colors"
          >
            <span>&larr;</span>
            <span>Back to Blog &amp; News Forms</span>
          </Link>
          <span className="h-4 w-px bg-slate-200"></span>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base font-bold tracking-tight text-slate-900">Blog Form Configuration</span>
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {schemaVersion}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              formStatus === "draft"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : formStatus === "published"
                ? "bg-purple-100 text-purple-900 border border-purple-200"
                : formStatus === "active"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-slate-100 text-slate-600"
            }`}>
              {formStatus === "published" ? "Published (Inactive)" : formStatus.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {formStatus === "published" && (
            <button
              type="button"
              onClick={() => setShowActivationDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <span>Activate Now</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFormDetailsModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <span>Form Details</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <span>Preview Form</span>
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold shadow-sm transition-colors ${
              isSaving ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50"
            }`}
          >
            <span>{isSaving ? "Saving Draft…" : "Save Draft"}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleReviewAndSubmit()}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <span>Review &amp; Submit</span>
          </button>
        </div>
      </div>

      {/* Active Form in Production Warning Callout */}
      {formStatus === "active" && (
        <div className="bg-emerald-50/90 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="leading-relaxed">
              <strong>Active Form in Production:</strong> You are editing an active configuration. Saving changes will preserve version <strong>{schemaVersion}</strong> live in production and create an unreleased draft version for you to preview, review, and activate.
            </span>
          </div>
          <span className="rounded bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 uppercase tracking-wider shrink-0">
            Live Template
          </span>
        </div>
      )}

      {/* Configuration details, matching the Training/Event builder hierarchy */}
      <section className="mx-auto mt-5 w-full max-w-7xl rounded-2xl border border-[#dfe9e4] bg-white p-5 shadow-sm sm:p-6">
        <Link href="/blog-forms" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[#52736a] hover:text-[#1f6a58]">← Back to Blog &amp; News Forms</Link>
        <h1 className="text-2xl font-bold text-[#06201c]">Blog Form Configurations</h1>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="block text-sm font-semibold text-[#355a51]">
            Configuration name
            <input
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
              aria-label="Form name"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#cfe0d8] bg-white px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]"
            />
          </label>
          <label className="block text-sm font-semibold text-[#355a51]">
            Description <span className="font-normal text-[#7f9d94]">(optional)</span>
            <textarea
              value={`${formType === "both" ? "Blog and News" : formType === "blog" ? "Blog" : "News"} submission form for Enterprise Admins.`}
              readOnly
              aria-label="Form description"
              className="mt-1.5 min-h-11 w-full resize-y rounded-xl border border-[#cfe0d8] bg-white px-3 py-2 font-normal text-[#52736a] outline-none"
            />
          </label>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#355a51]">Who can use this form?</p>
          <div className="mt-1.5 rounded-xl border border-[#dfe9e4] bg-[#f4faf7] px-3 py-3 text-sm text-[#355a51]">All enterprises</div>
          <p className="mt-1 text-xs text-[#7f9d94]">This choice is available when creating a new form and cannot be changed after saving.</p>
        </div>
      </section>

      {/* Main Three-Panel Workbench */}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-start lg:min-h-[calc(100vh-7rem)]">
        {/* LEFT PANEL: Section Structure & Palette (280px) */}
        <aside className="blog-legacy-sidebar hidden flex w-full shrink-0 flex-col gap-4 lg:w-72">
          {/* Section Tree */}
          <div className="rounded-2xl border border-[#dfe9e4] bg-white p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-[.14em] text-[#52736a]">Sections</span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {displayedSections.length} Defined
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {displayedSections.map((sec, sectionIndex) => {
                const count = fields.filter((f) => f.sectionId === sec.id).length;
                return (
                  <div
                    key={sec.id}
                    draggable={!sec.isProtected}
                    onDragStart={() => { if (!sec.isProtected) setDraggedSectionId(sec.id); }}
                    onDragEnd={() => setDraggedSectionId(null)}
                    onClick={() => {
                      setSelectedSectionId(sec.id);
                      setSelectedFieldId(null);
                      setIsInspectorOpen(true);
                    }}
                    onDragOver={(event) => { if (draggedFieldId || draggedSectionId) event.preventDefault(); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedFieldId) handleDropFieldOnSection(draggedFieldId, sec.id);
                      else if (draggedSectionId) handleDropSectionOnSection(draggedSectionId, sec.id);
                    }}
                    data-inspector-trigger="true"
                    className={`flex items-start gap-2 rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                      selectedSectionId === sec.id
                        ? "border-[#1f6a58] bg-[#e9f4ee] shadow-sm"
                        : sec.type === "admin_notes"
                          ? "border-[#eadcf5] bg-[#faf6ff] hover:border-[#c9a9e1]"
                          : "border-[#dfe9e4] bg-white hover:border-[#b9d4c8]"
                    }`}
                  >
                    <span aria-hidden="true" className={`mt-1 select-none text-base leading-none text-[#8ca69e] ${sec.isProtected ? "opacity-50" : "cursor-grab"}`}>⠿</span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-[10px] font-bold text-[#52736a]">{sectionIndex + 1}</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug break-words">{sec.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span
                          className={`font-semibold ${
                            sec.type === "core_protected"
                              ? "text-teal-700"
                              : sec.type === "admin_notes"
                              ? "text-purple-700"
                              : "text-slate-500"
                          }`}
                        >
                          {sec.type === "core_protected"
                            ? "Core Section"
                            : sec.type === "admin_notes"
                            ? "Internal Only"
                            : "Custom Section"}
                        </span>
                        <span className="text-slate-400 font-sans">• {count} fields</span>
                      </div>
                    </div>
                    {!sec.isProtected ? (
                      <button
                        type="button"
                        aria-label={`Remove ${sec.name}`}
                        onClick={() => handleDeleteSection(sec)}
                        className="hidden rounded px-1.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddSectionModal(true);
              }}
              className="mt-1 w-full rounded-xl border border-[#cfe0d8] bg-white px-3 py-2 text-sm font-bold text-[#1f6a58] transition-colors hover:bg-[#f4faf7]"
            >
              <span>+ Add Form Section</span>
            </button>
          </div>

          {/* Field Component Palette */}
          <div className="blog-field-palette hidden bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2.5 flex-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Field Palette</span>
              <span className="text-[10px] text-teal-700 font-bold uppercase">Click to add</span>
            </div>
            <p className="text-xs text-slate-500 leading-snug">Default article fields are included. Add and configure custom fields and sections below.</p>

            <div className="grid grid-cols-1 gap-1.5">
              {PALETTE_ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddFieldFromPalette(item, selectedSectionId)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-800 text-xs font-medium transition-colors text-left group"
                >
                  <span className="group-hover:text-teal-900 font-medium">{item.label}</span>
                  <span className="text-teal-600 font-bold text-sm">+</span>
                </button>
              ))}
            </div>


          </div>
        </aside>

        {/* CENTER CANVAS: Drag & Drop Interactive Canvas (Flex-1) */}
        <main className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Canvas Control Header */}
          <div className="blog-legacy-canvas-header hidden rounded-2xl border border-[#dfe9e4] bg-[#f7fbf8] px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[.14em] text-[#52736a]">Form structure</h2>
                <p className="mt-1 text-sm text-[#52736a]">Add sections and fields to build the Blog and News form.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">Builder</span>
                <button type="button" onClick={() => setShowPreviewModal(true)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1f6a58] shadow-sm hover:bg-[#eef6f2]">Preview</button>
              </div>
            </div>
          </div>

          <FormStructureCanvas
            sections={builderSections}
            fields={builderFields}
            selected={selectedFieldId ? { kind: "field", id: selectedFieldId } : selectedSectionId ? { kind: "section", id: selectedSectionId } : null}
            onSelect={handleSharedSelection}
            onDragEnd={handleSharedDragEnd}
            onAddSection={() => setShowAddSectionModal(true)}
            onAddField={(sectionId) => handleAddFieldFromPalette(PALETTE_ITEMS[0], sectionId)}
            domainLabel="Blog"
            onSectionAction={(sectionId, action) => {
              const section = sections.find((item) => item.id === sectionId);
              if (!section) return;
              if (action === "delete") handleDeleteSection(section);
              if (action === "toggle") {
                setSelectedSectionId(sectionId);
                setIsInspectorOpen(true);
                handleToggleSectionActive(section);
              }
              if (action === "duplicate") {
                const duplicateId = `sec-dup-${Date.now()}`;
                const duplicate = { ...section, id: duplicateId, name: `${sections.length + 1}. ${section.name.replace(/^\d+\.\s*/, "")} (Copy)`, isProtected: false, type: "configurable" as const };
                setSections((current) => renumberSections([...current, duplicate]));
                setSelectedSectionId(duplicateId);
                setSelectedFieldId(null);
                setIsInspectorOpen(true);
              }
            }}
            workspaceControls={
              <>
                <span className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">Builder</span>
                <button type="button" onClick={() => setShowPreviewModal(true)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1f6a58] shadow-sm hover:bg-[#eef6f2]">Preview</button>
              </>
            }
          />

          {/* Legacy Blog canvas retained only for the existing preview/edit flow. */}
          <div className="blog-legacy-canvas hidden w-full mx-auto">
            <div className="flex flex-col gap-6">
              {displayedSections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">Your form is empty</p>
                  <p className="mt-1 text-xs text-slate-500">Add a section to start building this form from scratch.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddSectionModal(true)}
                    className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    Add Form Section
                  </button>
                </div>
              ) : null}
              {displayedSections.filter((section) => section.id === selectedSectionId).map((section) => {
                const sectionFields = fields.filter((f) => f.sectionId === section.id);
                const isCore = section.type === "core_protected";
                const isAdminOnly = section.type === "admin_notes";

                return (
                  <div
                    key={section.id}
                    className={`bg-white rounded-xl border p-6 shadow-sm flex flex-col gap-4 ${
                      isCore
                        ? "border-slate-200"
                        : isAdminOnly
                        ? "border-purple-200 bg-purple-50/20"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Section Header */}
                    <div
                      className={`flex items-start justify-between pb-3 -mx-6 -mt-6 p-4 rounded-t-xl ${
                        isCore ? "bg-slate-50 border-b border-slate-100" : isAdminOnly ? "bg-purple-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span aria-hidden="true" className="select-none text-base leading-none text-[#8ca69e]">⠿</span>
                            <h2 className="text-lg font-bold text-slate-900">{section.name}</h2>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                !section.isActive
                                  ? "bg-slate-200 text-slate-600"
                                  : isCore
                                  ? "bg-slate-200 text-slate-700"
                                  : isAdminOnly
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-teal-50 text-teal-700 border border-teal-200"
                              }`}
                            >
                              {!section.isActive
                                ? "Disabled (Hidden)"
                                : isCore
                                ? "Core Section"
                                : isAdminOnly
                                ? "Enterprise Admin Only"
                                : "Published Section"}
                            </span>
                          </div>
                          <span className="mt-1 block text-xs text-[#7f9d94]">{sectionFields.length} fields · Select to edit this section. Drag the handle to change its order.</span>
                          <span className="text-xs text-slate-500">{section.description}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFieldFromPalette(PALETTE_ITEMS[0], section.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 shadow-2xs transition-colors shrink-0"
                        title={`Add field to ${section.name}`}
                      >
                        <span className="font-bold text-sm leading-none">+</span>
                        <span>Add Field</span>
                      </button>
                    </div>

                    {/* Section Fields */}
                    <div className="flex flex-col gap-2 pl-6">
                      {sectionFields.map((field, fieldIndex) => {
                        const isSelected = selectedFieldId === field.id;

                        return (
                          <div
                            key={field.id}
                            draggable
                            onDragStart={() => setDraggedFieldId(field.id)}
                            onDragEnd={() => setDraggedFieldId(null)}
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              setSelectedFieldId(field.id);
                              setIsInspectorOpen(true);
                            }}
                            data-inspector-trigger="true"
                            className={`relative flex flex-col gap-2 rounded-xl border p-4 transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#e9f4ee] border-[#dfe9e4]"
                                : "bg-white border-[#dfe9e4] hover:bg-[#f8fbf9]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span aria-hidden="true" className="select-none text-base leading-none text-[#8ca69e] cursor-grab">⠿</span>
                                <label className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-slate-900">
                                  <span>{field.label}</span>
                                  {field.isRequired && <span className="text-rose-600 font-bold">*</span>}
                                </label>
                                <span className="shrink-0 rounded-full bg-[#eef6f2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#176347]">
                                  {blogRendererLabel(field.type)}
                                </span>
                                {(field.isLocked || isProtectedSystemFieldKey(field.key)) && (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eef6f2] px-2 py-0.5 text-[10px] font-semibold text-[#176347]">
                                    <span>Core Field</span>
                                  </span>
                                )}
                                {!field.isActive ? (
                                  <span className="inline-flex items-center rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shrink-0">
                                    Disabled (Hidden)
                                  </span>
                                ) : field.visibilityScope === "admin_only" ? (
                                  <span className="inline-flex shrink-0 items-center rounded-full bg-[#f3ecfb] px-2 py-0.5 text-[10px] font-semibold text-[#6b3f91]">
                                    Enterprise Admin Only
                                  </span>
                                ) : (
                                  <span className="inline-flex shrink-0 items-center rounded-full bg-[#eef6f2] px-2 py-0.5 text-[10px] font-semibold text-[#176347]">
                                    Published
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons for Field: Edit & Delete */}
                              <div className="blog-field-actions flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionId(section.id);
                                    setSelectedFieldId(field.id);
                                    setIsInspectorOpen(true);
                                  }}
                                  className={`rounded-lg px-2 py-1 text-sm font-bold transition-colors ${
                                    isSelected
                                      ? "text-[#1f6a58]"
                                      : "text-[#1f6a58] hover:bg-[#eef6f2]"
                                  }`}
                                  title="Edit field settings"
                                  aria-label={`Edit ${field.label}`}
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>

                                <div className="flex items-center border-l border-slate-200 pl-1.5 ml-0.5 gap-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveField(field.id, "up");
                                    }}
                                    disabled={fieldIndex === 0}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move Up"
                                    aria-label={`Move ${field.label} up`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveField(field.id, "down");
                                    }}
                                    disabled={fieldIndex === sectionFields.length - 1}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move Down"
                                    aria-label={`Move ${field.label} down`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateField(field);
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                    title="Duplicate Field"
                                    aria-label={`Duplicate ${field.label}`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>

                                {!field.isLocked && !isProtectedSystemFieldKey(field.key) ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteField(field);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                                    title="Delete field from draft configuration"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Delete</span>
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <p className="text-xs text-[#7f9d94]">Select to view or edit this field.</p>
                          </div>
                        );
                      })}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddFieldFromPalette(PALETTE_ITEMS[0], section.id)}
                          className="text-sm font-bold text-[#1f6a58] hover:underline"
                        >
                          + Add field
                        </button>
                        <span className="text-xs text-[#7f9d94]">Choose the details to collect in this section.</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: Field Properties Inspector (320px) */}
        {inspectorOpen ? <aside ref={inspectorRef} className="fixed bottom-0 right-0 top-[72px] z-40 flex w-full shrink-0 flex-col gap-4 overflow-hidden border-l border-[#dfe9e4] bg-[#f7fbf8] p-5 shadow-[-12px_0_30px_rgba(7,53,45,0.12)] lg:w-[400px]">
          <div className="flex min-h-0 flex-1 flex-col gap-3.5">
            {/* Header */}
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {selectedField ? "Edit field" : "Edit section"}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-400">Selected:</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-teal-700 font-bold truncate max-w-[160px]">
                    {selectedField?.type ? selectedField.type.toUpperCase() : selectedSection ? selectedSection.name.replace(/^\d+\.\s*/, "") : "NONE"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close editor"
                title="Close editor"
                onClick={() => { if (selectedField) discardFieldDraft(selectedField.id); if (selectedSection) discardSectionDraft(selectedSection.id); setSelectedFieldId(null); setIsInspectorOpen(false); }}
                className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-teal-700"
              >
                ×
              </button>
            </div>

            {selectedBuilderField ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <FieldEditor
                    field={selectedBuilderField}
                    registry={blogFieldRegistry}
                    formLabel="Blog"
                    showContentVisibility
                    excludedRenderers={["video"]}
                    validationErrors={[]}
                    onChange={handleUpdateSharedField}
                    onRemoveFromForm={() => { if (selectedField) handleDeleteField(selectedField); }}
                  />
                </div>
                <div className="shrink-0 -mx-5 flex gap-2 border-t border-[#dfe9e4] bg-[#f7fbf8] px-5 py-4 shadow-[0_-8px_18px_rgba(7,53,45,0.06)]">
                  <button
                    type="button"
                    onClick={() => { if (selectedField) discardFieldDraft(selectedField.id); setSelectedFieldId(null); setIsInspectorOpen(false); }}
                    className="flex-1 rounded-full border border-[#cfe0d8] bg-white px-4 py-2 text-sm font-bold text-[#1f6a58]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedField) return;
                      const error = validateFieldConfiguration(selectedField);
                      if (error) { showToast(error); return; }
                      applyFieldDraft(selectedField.id);
                      showToast(`Changes applied to “${selectedField.label}”. Click Save Draft to persist.`);
                    }}
                    className="flex-1 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : selectedField && !selectedBuilderField && (
              <>
                {/* Configuration Inputs */}
                <div className="flex flex-col gap-3">
                  {/* Field Label */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor={labelId} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Field Label
                      </label>
                      {isProtectedField && (
                        <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Core Field
                        </span>
                      )}
                    </div>
                    <input
                      id={labelId}
                      type="text"
                      value={selectedField.label}
                      onChange={(e) => handleUpdateSelectedField({ label: e.target.value })}
                      className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 ${
                        !selectedField.label.trim() || isSelectedFieldLabelDuplicate
                          ? "border-rose-400 focus:ring-rose-500"
                          : "border-slate-200"
                      }`}
                    />
                    {!selectedField.label.trim() && (
                      <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                        Field label cannot be empty.
                      </p>
                    )}
                    {isSelectedFieldLabelDuplicate && (
                      <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                        Field label must be unique within this section.
                      </p>
                    )}
                  </div>

                  {/* Custom field type */}
                  {!selectedField.isLocked && !isProtectedSystemFieldKey(selectedField.key) ? (
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${labelId}-type`} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Field Type
                      </label>
                      <select
                        id={`${labelId}-type`}
                        value={selectedField.type}
                        onChange={(event) => handleChangeSelectedFieldType(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        {PALETTE_ITEMS.map((item) => (
                          <option key={item.type} value={item.type}>{item.label}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400">Changing the type resets type-specific validation settings.</p>
                    </div>
                  ) : null}

                  {/* Section Assignment for custom fields */}
                  {!selectedField.isLocked && !isProtectedSystemFieldKey(selectedField.key) ? (
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${labelId}-section`} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Assigned Section
                      </label>
                      <select
                        id={`${labelId}-section`}
                        value={selectedField.sectionId}
                        onChange={(event) => {
                          const nextSecId = event.target.value;
                          const targetSec = sections.find((s) => s.id === nextSecId);
                          handleUpdateSelectedField({
                            sectionId: nextSecId,
                            visibilityScope: targetSec?.visibilityScope === "admin_only" ? "admin_only" : selectedField.visibilityScope,
                          });
                          setSelectedSectionId(nextSecId);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        {sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.name} {sec.isProtected ? "(Core Section)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {/* Placeholder */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor={placeholderId} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Input Placeholder
                    </label>
                    <input
                      id={placeholderId}
                      type="text"
                      value={selectedField.placeholder || ""}
                      onChange={(e) => handleUpdateSelectedField({ placeholder: e.target.value })}
                      placeholder={getFieldDefaultPlaceholder(selectedField)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                    <p className="text-[10px] text-slate-400">
                      Default placeholder is shown above. Type here only if you wish to override it.
                    </p>
                  </div>

                  {/* Helper / Tooltip */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor={descId} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Helper Description
                    </label>
                    <textarea
                      id={descId}
                      rows={2}
                      value={selectedField.description}
                      onChange={(e) => handleUpdateSelectedField({ description: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 resize-none"
                    />
                  </div>

                  {/* Field Ordering Controls */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Rearrange Field
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveField(selectedField.id, "up")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition-colors"
                        title="Move Up in Section"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                        <span>Move Up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveField(selectedField.id, "down")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition-colors"
                        title="Move Down in Section"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>Move Down</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Validation Rules</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{selectedField.type}</span>
                    </div>
                    {isProtectedField ? (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">
                        Validation and allowed values are managed by the system for this protected field.
                      </p>
                    ) : null}
                    {!isProtectedField && (selectedField.type === "text" || selectedField.type === "textarea" || selectedField.type === "rich_text") ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-500">Min Length</span>
                            <input
                              value={String(selectedField.validation?.min_length ?? "")}
                              onChange={(event) => handleUpdateFieldValidation("min_length", event.target.value)}
                              inputMode="numeric"
                              placeholder="e.g. 5"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-500">Max Length</span>
                            <input
                              value={String(selectedField.validation?.max_length ?? "")}
                              onChange={(event) => handleUpdateFieldValidation("max_length", event.target.value)}
                              inputMode="numeric"
                              placeholder="e.g. 500"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                            />
                          </label>
                        </div>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-slate-500">Regular Expression Pattern</span>
                          <input
                            value={String(selectedField.validation?.pattern ?? "")}
                            onChange={(event) => handleUpdateFieldValidation("pattern", event.target.value)}
                            placeholder="e.g. ^[a-zA-Z0-9 ]+$"
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </label>
                      </div>
                    ) : null}
                    {!isProtectedField && selectedField.type === "number" ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-500">Minimum Value</span>
                            <input
                              value={String(selectedField.validation?.min ?? "")}
                              onChange={(event) => handleUpdateFieldValidation("min", event.target.value)}
                              placeholder="e.g. 0"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-500">Maximum Value</span>
                            <input
                              value={String(selectedField.validation?.max ?? "")}
                              onChange={(event) => handleUpdateFieldValidation("max", event.target.value)}
                              placeholder="e.g. 100"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                            />
                          </label>
                        </div>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-slate-500">Step Interval</span>
                          <input
                            value={String(selectedField.validation?.step ?? "")}
                            onChange={(event) => handleUpdateFieldValidation("step", event.target.value)}
                            placeholder="e.g. 1 or 0.1"
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </label>
                      </div>
                    ) : null}
                    {!isProtectedField && (selectedField.type === "date" || selectedField.type === "time") ? (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-500">
                              Earliest {selectedField.type === "date" ? "date" : "time"}
                            </span>
                          <input
                              type={selectedField.type === "date" ? "date" : "time"}
                            value={String(selectedField.validation?.min ?? "")}
                            onChange={(event) => handleUpdateFieldValidation("min", event.target.value)}
                              aria-label={`Earliest ${selectedField.type}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-500">
                              Latest {selectedField.type === "date" ? "date" : "time"}
                            </span>
                          <input
                              type={selectedField.type === "date" ? "date" : "time"}
                            value={String(selectedField.validation?.max ?? "")}
                            onChange={(event) => handleUpdateFieldValidation("max", event.target.value)}
                              aria-label={`Latest ${selectedField.type}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </label>
                      </div>
                    ) : null}
                    {!isProtectedField && (selectedField.type === "select" || selectedField.type === "radio" || selectedField.type === "multi_select" || selectedField.type === "multiselect" || selectedField.type === "checkbox") ? (
                      <fieldset className="flex flex-col gap-2">
                        <legend className="text-[10px] font-medium text-slate-500">
                          {selectedField.type === "select" ? "Dropdown options" : selectedField.type === "radio" ? "Radio options" : selectedField.type === "checkbox" ? "Checkbox options" : "Selectable values"}
                        </legend>
                        {getChoiceOptions(selectedField).map((option, optionIndex, options) => (
                          <div key={`${selectedField.id}-option-${optionIndex}`} className="flex items-center gap-2">
                            <input
                              aria-label={`Option ${optionIndex + 1}`}
                              value={option}
                              onChange={(event) => {
                                const next = [...options];
                                next[optionIndex] = event.target.value;
                                updateChoiceOptions(next);
                              }}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                            />
                            <button
                              type="button"
                              aria-label={`Remove option ${optionIndex + 1}`}
                              disabled={options.length <= 1}
                              onClick={() => updateChoiceOptions(options.filter((_, index) => index !== optionIndex))}
                              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateChoiceOptions([...getChoiceOptions(selectedField), ""])}
                          className="self-start rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-teal-700 transition-colors hover:bg-teal-50"
                        >
                          + Add option
                        </button>
                        <span className="text-[10px] text-slate-400">Add at least two unique options.</span>
                      </fieldset>
                    ) : null}
                    {!isProtectedField && (selectedField.type === "file_upload" || selectedField.type === "media_upload") ? (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-slate-500">
                            {selectedField.type === "media_upload" ? "Image formats" : "Document formats"}
                          </span>
                          <input
                            value={String(selectedField.validation?.allowed_extensions ?? "")}
                            onChange={(event) => handleUpdateFieldValidation("allowed_extensions", event.target.value)}
                            placeholder="png, jpg, pdf"
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-slate-500">
                            Maximum {selectedField.type === "media_upload" ? "image" : "document"} size (MB)
                          </span>
                          <input
                            value={String(selectedField.validation?.max_file_size_mb ?? "")}
                            onChange={(event) => handleUpdateFieldValidation("max_file_size_mb", event.target.value)}
                            placeholder="e.g. 10"
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </label>
                      </div>
                    ) : null}
                    {!isProtectedField && selectedField.type === "url" ? (
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-medium text-slate-500">URL Pattern</span>
                        <input
                          value={String(selectedField.validation?.pattern ?? "")}
                          onChange={(event) => handleUpdateFieldValidation("pattern", event.target.value)}
                          placeholder="https://.*"
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </label>
                    ) : null}
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-0.5"></div>

                {/* Behavior Toggles */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Behavior &amp; Rules
                  </span>

                  {/* Toggle: Required Field */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Required Field</span>
                      <span className="text-[10px] text-slate-500">Mandatory submission</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={selectedField.isRequired}
                      disabled={selectedField.isLocked}
                      onClick={handleToggleFieldRequired}
                      className={`w-10 h-5.5 rounded-full relative p-0.5 flex items-center transition-colors ${
                        selectedField.isRequired ? "bg-teal-600" : "bg-slate-300"
                      } ${selectedField.isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transform transition-transform ${
                          selectedField.isRequired ? "translate-x-4.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle: Enabled Field */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Enabled on form</span>
                      <span className="text-[10px] text-slate-500">Renders on forms</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={selectedField.isActive}
                      disabled={selectedField.isLocked}
                      onClick={handleToggleFieldActive}
                      className={`w-10 h-5.5 rounded-full relative p-0.5 flex items-center transition-colors ${selectedField.isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${
                        selectedField.isActive ? "bg-teal-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transform transition-transform ${
                          selectedField.isActive ? "translate-x-4.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Dedicated Visibility Settings (Section 5) */}
                <div id="field-visibility-settings" className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Visibility Settings
                    </span>
                    {!selectedField.isActive ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                        Disabled (Hidden)
                      </span>
                    ) : selectedField.visibilityScope === "admin_only" ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        Admin Only
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                        Published
                      </span>
                    )}
                  </div>

                  {isParentSectionAdminOnly && (
                    <div className="rounded-lg bg-purple-50 border border-purple-200 p-2 text-[10px] text-purple-900 font-medium">
                      Section Restriction: This section is Enterprise Admin Only. All child fields are restricted to Enterprise Admin Only.
                    </div>
                  )}

                  {isProtectedField && (
                    <div className="rounded-lg bg-teal-50 border border-teal-200 p-2 text-[10px] text-teal-900 font-medium">
                      Protected Core Field: Core article content must remain publishable.
                    </div>
                  )}

                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors ${
                    isParentSectionAdminOnly || selectedField.isLocked
                      ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200"
                      : selectedField.visibilityScope === "customer_visible"
                      ? "bg-teal-50/50 border-teal-300 ring-1 ring-teal-200 cursor-pointer"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer"
                  }`}>
                    <input
                      type="radio"
                      name="field-visibility"
                      checked={selectedField.visibilityScope === "customer_visible" && !isParentSectionAdminOnly}
                      disabled={selectedField.isLocked || isParentSectionAdminOnly}
                      onChange={() => {
                        handleUpdateSelectedField({ visibilityScope: "customer_visible" });
                        showToast(`“${selectedField.label}” visibility set to Published.`);
                      }}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Published content</span>
                      <span className="text-[10px] text-slate-500">Included in published content.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors ${
                    isProtectedField
                      ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200"
                      : selectedField.visibilityScope === "admin_only" || isParentSectionAdminOnly
                      ? "bg-purple-50/50 border-purple-300 ring-1 ring-purple-200 cursor-pointer"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer"
                  }`}>
                    <input
                      type="radio"
                      name="field-visibility"
                      checked={selectedField.visibilityScope === "admin_only" || isParentSectionAdminOnly}
                      disabled={selectedField.isLocked || isProtectedField}
                      onChange={() => {
                        handleUpdateSelectedField({ visibilityScope: "admin_only" });
                        showToast(`“${selectedField.label}” visibility set to Enterprise Admin Only.`);
                      }}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Enterprise Admin Only</span>
                      <span className="text-[10px] text-slate-500">
                        Enterprise Admin: Can enter the value • Not included in published content
                      </span>
                    </div>
                  </label>
                </div>

                {/* Inspector Action Buttons */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedField.label.trim()) {
                        showToast("Enter a valid field label before applying changes.");
                        return;
                      }
                      if (isSelectedFieldLabelDuplicate) {
                        showToast("Resolve duplicate field label before applying changes.");
                        return;
                      }
                      const validationError = validateFieldConfiguration(selectedField);
                      if (validationError) {
                        showToast(validationError);
                        return;
                      }
                      applyFieldDraft(selectedField.id);
                      showToast(`Changes applied to “${selectedField.label}”. Click Save Draft to persist.`);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-xs font-semibold shadow-sm transition-colors"
                  >
                    Apply Changes
                  </button>
                  {!selectedField.isLocked && !isProtectedSystemFieldKey(selectedField.key) ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteField(selectedField)}
                      className="w-full py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors border border-rose-200"
                    >
                      Delete Field from Configuration
                    </button>
                  ) : (
                    <p className="text-center text-[11px] text-slate-400 italic py-1">
                      Protected system fields cannot be deleted.
                    </p>
                  )}
                </div>
              </>
            )}
            {!selectedField && selectedSection ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg bg-teal-50 p-3 text-xs text-teal-900">
                  {selectedSection.isProtected
                    ? "Core article details section. Essential fields required for publishing are kept here."
                    : "Configure section details, visibility, and display settings below."}
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Section Name</span>
                  <input
                    value={selectedSection.name.replace(/^\d+\.\s*/, "")}
                    onChange={(event) => handleUpdateSelectedSection({ name: event.target.value })}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</span>
                  <textarea
                    rows={3}
                    value={selectedSection.description}
                    onChange={(event) => handleUpdateSelectedSection({ description: event.target.value })}
                    className="resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">Section type:</span>{" "}
                  {selectedSection.type === "core_protected" ? "Core Section" : selectedSection.type === "admin_notes" ? "Enterprise Admin-only" : "Custom Section"}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <span className="block text-xs font-semibold text-slate-900">Enabled on form</span>
                    <span className="block text-[10px] text-slate-500">
                      When disabled, this section is hidden from the form.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedSection.isActive}
                    disabled={selectedSection.isProtected}
                    onClick={() => handleToggleSectionActive(selectedSection)}
                    className={`relative flex h-5.5 w-10 items-center rounded-full p-0.5 ${selectedSection.isActive ? "bg-teal-600" : "bg-slate-300"} ${selectedSection.isProtected ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <span className={`h-4.5 w-4.5 rounded-full bg-white shadow-sm ${selectedSection.isActive ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>
                <div id="section-visibility-settings" className="flex flex-col gap-2 border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Visibility Settings</span>
                    {!selectedSection.isActive ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                        Disabled (Hidden)
                      </span>
                    ) : selectedSection.visibilityScope === "admin_only" ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        Admin Only
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                        Published
                      </span>
                    )}
                  </div>
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer ${
                    selectedSection.visibilityScope === "customer_visible"
                      ? "bg-teal-50/50 border-teal-300 ring-1 ring-teal-200"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}>
                    <input
                      type="radio"
                      name="section-visibility"
                      checked={selectedSection.visibilityScope === "customer_visible"}
                      disabled={selectedSection.isProtected}
                      onChange={() => {
                        handleUpdateSelectedSection({ visibilityScope: "customer_visible", type: "configurable" });
                        showToast(`“${selectedSection.name}” visibility set to Published.`);
                      }}
                      className="mt-0.5 accent-teal-600 cursor-pointer"
                    />
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-slate-900">Published content</span>
                      <span className="text-[10px] text-slate-500">
                        Included in published content.
                      </span>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer ${
                    selectedSection.visibilityScope === "admin_only"
                      ? "bg-purple-50/50 border-purple-300 ring-1 ring-purple-200"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}>
                    <input
                      type="radio"
                      name="section-visibility"
                      checked={selectedSection.visibilityScope === "admin_only"}
                      disabled={selectedSection.isProtected}
                      onChange={() => {
                        handleUpdateSelectedSection({ visibilityScope: "admin_only", type: "admin_notes" });
                        showToast(`“${selectedSection.name}” visibility set to Enterprise Admin Only.`);
                      }}
                      className="mt-0.5 accent-teal-600 cursor-pointer"
                    />
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-slate-900">Enterprise Admin Only</span>
                      <span className="text-[10px] text-slate-500">
                        Enterprise Admin: Can enter values • Not included in published content
                      </span>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => { if (selectedSection) { applySectionDraft(selectedSection.id); showToast("Section changes applied."); } }} className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700">Save</button>
                  <button type="button" onClick={() => { if (selectedSection) discardSectionDraft(selectedSection.id); setSelectedFieldId(null); setIsInspectorOpen(false); }} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                </div>
                {!selectedSection.isProtected ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(selectedSection)}
                    className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Remove Section
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside> : null}
      </div>

      <div className="sticky bottom-0 z-30 mt-6 flex flex-wrap items-center gap-3 border-t border-[#dfe9e4] bg-white px-5 py-4 shadow-[0_-8px_24px_rgba(7,53,45,0.08)] sm:px-6">
        <button type="button" onClick={handleSaveDraft} disabled={isSaving} className="rounded-full border border-[#cfe0d8] bg-white px-5 py-2.5 text-sm font-bold text-[#1f6a58] hover:bg-[#f4faf7] disabled:opacity-50">{isSaving ? "Saving…" : "Save Draft"}</button>
        <button type="button" onClick={() => void handleReviewAndSubmit()} disabled={isSaving} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#175245] disabled:opacity-50">Review &amp; Submit</button>
      </div>

      {showAddFieldModal && newFieldDraft ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Add {newFieldDraft.paletteItem.label}</h2>
                <p className="mt-1 text-xs text-slate-500">Configure this field before adding it to the selected section.</p>
              </div>
              <button type="button" onClick={() => { setShowAddFieldModal(false); setNewFieldDraft(null); }} className="text-sm font-bold text-slate-400">×</button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Target Section
                <select
                  value={newFieldDraft.sectionId || selectedSection?.id}
                  onChange={(event) => {
                    const secId = event.target.value;
                    const targetSec = sections.find((s) => s.id === secId);
                    setNewFieldDraft((current) => current ? {
                      ...current,
                      sectionId: secId,
                      visibilityScope: targetSec?.visibilityScope === "admin_only" ? "admin_only" : current.visibilityScope,
                    } : current);
                    setSelectedSectionId(secId);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 bg-white"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} {sec.isProtected ? "(Core Section)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Field Type
                <select
                  value={newFieldDraft.paletteItem.type}
                  onChange={(event) => {
                    const nextPaletteItem = PALETTE_ITEMS.find((item) => item.type === event.target.value);
                    if (!nextPaletteItem) return;
                    setNewFieldDraft((current) => {
                      if (!current) return current;
                      const usesDefaultPlaceholder = current.placeholder.trim() !== ""
                        && current.placeholder === current.paletteItem.defaultPlaceholder;
                      return {
                        ...current,
                        paletteItem: nextPaletteItem,
                        placeholder: usesDefaultPlaceholder ? nextPaletteItem.defaultPlaceholder : current.placeholder,
                        validation: {},
                      };
                    });
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  {PALETTE_ITEMS.map((item) => (
                    <option key={item.type} value={item.type}>{item.label}</option>
                  ))}
                </select>
                <span className="text-[10px] font-normal text-slate-400">
                  Changing the type resets type-specific validation settings.
                </span>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Field Label
                <input
                  autoFocus
                  value={newFieldDraft.label}
                  onChange={(event) => setNewFieldDraft((current) => current ? { ...current, label: event.target.value } : current)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                  placeholder="e.g., Reference Number"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Help Text
                <textarea
                  rows={2}
                  value={newFieldDraft.helpText}
                  onChange={(event) => setNewFieldDraft((current) => current ? { ...current, helpText: event.target.value } : current)}
                  className="resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                  placeholder="Optional guidance for authors"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Placeholder
                <input
                  value={newFieldDraft.placeholder}
                  onChange={(event) => setNewFieldDraft((current) => current ? { ...current, placeholder: event.target.value } : current)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  placeholder={getFieldDefaultPlaceholder({ type: newFieldDraft.paletteItem.type, label: newFieldDraft.label })}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={newFieldDraft.isActive} onChange={(event) => setNewFieldDraft((current) => current ? { ...current, isActive: event.target.checked } : current)} />
                  Enabled on form
                </label>
                <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={newFieldDraft.isRequired} onChange={(event) => setNewFieldDraft((current) => current ? { ...current, isRequired: event.target.checked, isActive: event.target.checked ? true : current.isActive } : current)} />
                  Required field
                </label>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Visibility Settings
                </span>
                {selectedSection && (selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes") && (
                  <p className="text-[10px] text-purple-900 bg-purple-50 p-2 rounded border border-purple-200 font-medium">
                    Section Restriction: This section is Enterprise Admin Only. All child fields are restricted to Enterprise Admin Only.
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                    selectedSection && (selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes")
                      ? "opacity-60 cursor-not-allowed bg-slate-100 border-slate-200"
                      : newFieldDraft.visibilityScope === "customer_visible"
                      ? "bg-white border-teal-400 ring-1 ring-teal-200 shadow-xs cursor-pointer"
                      : "bg-white border-slate-200 hover:bg-slate-50 cursor-pointer"
                  }`}>
                    <input
                      type="radio"
                      name="modal-field-visibility"
                      checked={newFieldDraft.visibilityScope === "customer_visible" && !(selectedSection && (selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes"))}
                      disabled={Boolean(selectedSection && (selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes"))}
                      onChange={() => setNewFieldDraft((current) => current ? { ...current, visibilityScope: "customer_visible" } : current)}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Published</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Admin enters value • Included in published content
                      </span>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    newFieldDraft.visibilityScope === "admin_only" || (selectedSection && (selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes"))
                      ? "bg-white border-purple-400 ring-1 ring-purple-200 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="modal-field-visibility"
                      checked={newFieldDraft.visibilityScope === "admin_only" || Boolean(selectedSection && (selectedSection.visibilityScope === "admin_only" || selectedSection.type === "admin_notes"))}
                      onChange={() => setNewFieldDraft((current) => current ? { ...current, visibilityScope: "admin_only" } : current)}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Enterprise Admin Only</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Admin enters value • Not included in published content
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Field Validation</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(newFieldDraft.paletteItem.type === "number" || newFieldDraft.paletteItem.type === "date" || newFieldDraft.paletteItem.type === "time") ? (['min', 'max'] as const).map((key) => (
                    <input key={key} value={String(newFieldDraft.validation[key] ?? "")} onChange={(event) => setNewFieldDraft((current) => current ? { ...current, validation: { ...current.validation, [key]: event.target.value || null } } : current)} placeholder={`${key[0].toUpperCase()}${key.slice(1)} (optional)`} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
                  )) : null}
                  {(newFieldDraft.paletteItem.type === "text" || newFieldDraft.paletteItem.type === "textarea" || newFieldDraft.paletteItem.type === "rich_text" || newFieldDraft.paletteItem.type === "url") ? (
                    <input value={String(newFieldDraft.validation.pattern ?? "")} onChange={(event) => setNewFieldDraft((current) => current ? { ...current, validation: { ...current.validation, pattern: event.target.value || null } } : current)} placeholder="Pattern (optional)" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
                  ) : null}
                  {(newFieldDraft.paletteItem.type === "select" || newFieldDraft.paletteItem.type === "radio" || newFieldDraft.paletteItem.type === "multi_select") ? (
                    <input value={String(newFieldDraft.validation.options ?? "")} onChange={(event) => setNewFieldDraft((current) => current ? { ...current, validation: { ...current.validation, options: event.target.value || null } } : current)} placeholder="Options separated by commas" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => { setShowAddFieldModal(false); setNewFieldDraft(null); }} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={handleCreateField} className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white">Add Field</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add Form Section Modal */}
      {showAddSectionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Form Section</h3>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={sectionNameId} className="text-xs font-semibold text-slate-700">
                  Section Name
                </label>
                <input
                  id={sectionNameId}
                  type="text"
                  placeholder="e.g., Additional details"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={sectionDescId} className="text-xs font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  id={sectionDescId}
                  rows={2}
                  placeholder="Describe what this section is for"
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 resize-none"
                />
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Visibility Settings
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    newSectionVisibility === "customer_visible"
                      ? "bg-white border-teal-400 ring-1 ring-teal-200 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="modal-sec-visibility"
                      checked={newSectionVisibility === "customer_visible"}
                      onChange={() => setNewSectionVisibility("customer_visible")}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Published</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Admin enters values • Included in published content
                      </span>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    newSectionVisibility === "admin_only"
                      ? "bg-white border-purple-400 ring-1 ring-purple-200 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="modal-sec-visibility"
                      checked={newSectionVisibility === "admin_only"}
                      onChange={() => setNewSectionVisibility("admin_only")}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Enterprise Admin Only</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Admin enters values • Not included in published content
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Preview Modal */}
      {confirmDeleteSection && (
        <BlogConfirmationModal
          isOpen={true}
          title="Remove Section?"
          message={`Are you sure you want to remove the optional section “${confirmDeleteSection.name.replace(/^\d+\.\s*/, "")}” and all fields inside it?`}
          confirmLabel="Remove Section"
          destructive={true}
          onConfirm={() => executeDeleteSection(confirmDeleteSection)}
          onCancel={() => setConfirmDeleteSection(null)}
        />
      )}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-6 sm:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-slate-900">Preview Form</h2>
                <span className="text-xs text-slate-500">
                  Review the Enterprise Admin form layout before saving or submitting.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Preview Options Switcher per Section 7 */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPreviewRole("enterprise")}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-colors text-center ${
                  previewMode === "enterprise"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Enterprise Admin Preview
              </button>
            </div>

            {/* Explanatory Banner per Section 7 */}
            {previewMode === "enterprise" ? (
              <div className="rounded-xl bg-teal-50 border border-teal-200 p-3.5 text-xs text-teal-900 flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Enterprise Admin Preview:</span>
                  <span>
                    Shows all enabled fields available to Enterprise Admin with mandatory indicators (*), Enterprise Admin-only sections, section order, and field layout. Disabled fields are hidden.
                  </span>
                </div>
              </div>
            ) : null}

            {/* PREVIEW CONTENT */}
            {previewMode === "enterprise" ? (
              /* Enterprise Admin Authoring View */
              <div className="flex flex-col gap-5">
                {sections
                  .filter((sec) => sec.isActive)
                  .map((sec) => {
                    const secFields = fields.filter(
                      (f) => f.sectionId === sec.id && f.isActive
                    );
                    if (secFields.length === 0) return null;
                    const isSecAdminOnly = sec.visibilityScope === "admin_only" || sec.type === "admin_notes";

                    return (
                      <div
                        key={sec.id}
                        className={`flex flex-col gap-3 p-4 rounded-xl border ${
                          isSecAdminOnly
                            ? "bg-purple-50/40 border-purple-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {sec.name}
                          </span>
                          {isSecAdminOnly ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-bold border border-purple-200">
                              Enterprise Admin-Only Section
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                              Published Section
                            </span>
                          )}
                        </div>
                        {sec.description && (
                          <p className="text-[11px] text-slate-500">{sec.description}</p>
                        )}
                        <div className="flex flex-col gap-3 mt-1">
                          {secFields.map((field) => (
                            <div
                              key={field.id}
                              className="flex flex-col gap-1.5 p-3 rounded-lg bg-white border border-slate-200 shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-800">
                                    {field.label}
                                  </span>
                                  {field.isRequired ? (
                                    <span className="inline-flex items-center gap-0.5">
                                      <span className="text-rose-600 font-bold" title="Mandatory field">*</span>
                                      <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                                        Required
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-normal text-slate-400">
                                      (Optional)
                                    </span>
                                  )}
                                </div>
                                {field.visibilityScope === "admin_only" ? (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                    Enterprise Admin Only (Internal)
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-semibold border border-teal-100">
                                    Published
                                  </span>
                                )}
                              </div>
                              {renderFieldPreviewLayout(field)}
                              {field.description && (
                                <span className="text-[10px] text-slate-400">{field.description}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : previewMode === "customer_mobile" ? (
              /* Customer Mobile View (Smartphone Mockup) */
              <div className="w-full max-w-[375px] mx-auto rounded-[36px] border-4 border-slate-800 bg-white shadow-2xl p-4 overflow-hidden flex flex-col gap-3">
                {/* Mobile Top Status Bar */}
                <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-100 text-[10px] font-semibold text-slate-600">
                  <span>9:41</span>
                  <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto" />
                  <div className="flex items-center gap-1">
                    <span>5G</span>
                    <span className="w-4 h-2 rounded-xs border border-slate-600 inline-block" />
                  </div>
                </div>

                {/* Mobile Reader Article */}
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase">
                      {formTitle || "Featured Blog"}
                    </span>
                    <span className="text-[10px] text-slate-400">3 min read</span>
                  </div>

                  <h1 className="text-base font-bold text-slate-900 leading-snug">
                    Sample Approved Post: Empowering Modern Healthcare Innovation
                  </h1>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Invigorate Editorial</span>
                    <span>•</span>
                    <span>Approved & Published</span>
                  </div>

                  {/* Sample Cover Media */}
                  <div className="w-full h-36 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center text-white text-xs font-semibold p-4 text-center">
                    Approved Cover Image Preview
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-teal-500 pl-2">
                    Executive summary of this published post highlighting actionable insights and wellness updates.
                  </p>

                  <div className="text-xs text-slate-700 leading-relaxed">
                    This is an approved publication viewable by customers on mobile devices. All public article details and approved customer-visible fields are rendered seamlessly.
                  </div>

                  {/* Customer-Visible Custom Fields - Defined Display Layout */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                        Approved Article Information
                      </span>
                      <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium border border-teal-100">
                        Defined Display Layout
                      </span>
                    </div>

                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-1 gap-2">
                      {sections
                        .filter((sec) => sec.isActive && sec.visibilityScope !== "admin_only" && sec.type !== "admin_notes")
                        .flatMap((sec) =>
                          fields.filter(
                            (f) =>
                              f.sectionId === sec.id &&
                              f.isActive &&
                              f.visibilityScope !== "admin_only"
                          )
                        )
                        .map((field) => (
                          field.type === "textarea" || field.type === "rich_text" ? (
                            <div key={field.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                              <span className="text-[11px] font-bold text-slate-900 block">{field.label}</span>
                              <p className="mt-1 text-xs text-slate-600 leading-relaxed italic">
                                {field.placeholder?.trim() || getFieldDefaultPlaceholder(field)}
                              </p>
                            </div>
                          ) : field.type === "file_upload" || field.type === "media_upload" ? (
                            <div key={field.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                              <div className="flex items-center gap-2 truncate">
                                <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 uppercase">
                                  DOC
                                </span>
                                <span className="text-xs font-semibold text-slate-800 truncate">{field.label}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-teal-700 shrink-0">Download</span>
                            </div>
                          ) : (
                            <div key={field.id} className="p-2.5 rounded-lg bg-teal-50/40 border border-teal-100 flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
                                {field.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-800">
                                {field.placeholder?.trim() || getFieldDefaultPlaceholder(field)}
                              </span>
                            </div>
                          )
                        ))}
                    </div>
                  </div>

                  {/* Privacy Guarantee Note */}
                  <div className="mt-2 p-2 rounded-lg bg-emerald-50 text-[10px] text-emerald-800 border border-emerald-100 text-center font-medium">
                    Enterprise Admin-only fields are completely hidden from Customer Mobile.
                  </div>
                </div>
              </div>
            ) : (
              /* Customer Web Desktop View */
              <div className="p-6 rounded-xl border border-slate-200 bg-white flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase">
                    {formTitle || "Blog Post"}
                  </span>
                  <span className="text-xs text-slate-400">Published Article</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  Sample Approved Post: Healthcare Innovation & Patient Experience
                </h1>
                <div className="h-44 w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold">
                  Approved Cover Image Display
                </div>
                <p className="text-sm text-slate-600 italic border-l-3 border-teal-500 pl-3">
                  Summary: Detailed overview of recent clinical breakthroughs and patient care workflows.
                </p>
                <div className="text-sm text-slate-700 leading-relaxed">
                  Full article content visible to customers on desktop web browsers. Only customer-visible fields are rendered.
                </div>
                <div className="flex flex-col gap-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                      Approved Article Information (Defined Display Layout)
                    </span>
                    <span className="text-xs text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full font-medium border border-teal-100">
                      Public Customer View
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sections
                      .filter((sec) => sec.isActive && sec.visibilityScope !== "admin_only" && sec.type !== "admin_notes")
                      .flatMap((sec) =>
                        fields.filter(
                          (f) =>
                            f.sectionId === sec.id &&
                            f.isActive &&
                            f.visibilityScope !== "admin_only"
                        )
                      )
                      .map((field) => (
                        field.type === "textarea" || field.type === "rich_text" ? (
                          <div key={field.id} className="sm:col-span-2 p-4 rounded-xl border border-slate-200 bg-[#fbfdfc]">
                            <span className="text-xs font-bold text-slate-800 block mb-1">{field.label}</span>
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                              {field.placeholder?.trim() || getFieldDefaultPlaceholder(field)}
                            </p>
                          </div>
                        ) : field.type === "file_upload" || field.type === "media_upload" ? (
                          <div key={field.id} className="sm:col-span-2 p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-3">
                              <span className="rounded-lg bg-teal-100 px-2 py-1 text-xs font-bold text-teal-800 uppercase">
                                PDF DOCUMENT
                              </span>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{field.label}</span>
                                <span className="text-[11px] text-slate-500">Approved customer document attachment</span>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-teal-700 px-3 py-1 rounded-lg border border-teal-200 hover:bg-teal-50">Download Document</span>
                          </div>
                        ) : (
                          <div key={field.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
                              {field.label}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                              {field.placeholder?.trim() || getFieldDefaultPlaceholder(field)}
                            </span>
                          </div>
                        )
                      ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs transition-colors"
              >
                <span>&larr; Back to Builder</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReviewAndSubmit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs transition-colors"
                >
                  <span>Continue to Review &amp; Submit &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Field Confirmation Modal */}
      {fieldToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-field-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h3 id="delete-field-title" className="text-base font-bold text-slate-900">
                  Delete Field
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-slate-900">“{fieldToDelete.label}”</span> from this draft configuration?
                </p>
                <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                  Previously stored post values will not be destroyed; existing published articles retain their stored data.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFieldToDelete(null)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteField}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm"
              >
                Delete Field
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Saved Draft Confirmation Modal per Rule 6 */}
      {showSavedDraftModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-draft-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-5 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <svg className="h-5 w-5 text-teal-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 id="saved-draft-title" className="text-base font-bold text-slate-900">
                    Draft Configuration Saved
                  </h3>
                  <p className="text-xs text-teal-700 font-medium">Form draft saved successfully.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedDraftModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {/* Saved Configuration Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Current Status</span>
                <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Draft
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Form Title</span>
                  <span className="font-semibold text-slate-900 truncate block">{formTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Version</span>
                  <span className="font-mono font-semibold text-slate-900">{schemaVersion}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Defined Sections</span>
                  <span className="font-semibold text-slate-900">{sections.length} sections</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Configured Fields</span>
                  <span className="font-semibold text-slate-900">{fields.filter((f) => f.isActive).length} fields</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your configuration changes have been saved. Status remains Draft. You can remain in the builder to continue editing now, or redirect to Form Details to review configuration metadata.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSavedDraftModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                Remain in Builder
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSavedDraftModal(false);
                  router.push(`/blog-forms?details=${encodeURIComponent(formId || "")}`);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Go to Form Details &rarr;
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Review & Submit Modal */}
      {showReviewSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-submit-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 sm:p-7 flex flex-col gap-5 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  validationErrors.length > 0 && publishStep === "review"
                    ? "bg-rose-50 border border-rose-200 text-rose-700"
                    : publishStep === "published"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-teal-50 border border-teal-200 text-teal-700"
                }`}>
                  {validationErrors.length > 0 && publishStep === "review" ? (
                    <span className="font-bold text-lg text-rose-600">!</span>
                  ) : (
                    <svg className="h-5 w-5 text-teal-700" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 id="review-submit-title" className="text-base font-bold text-slate-900">
                    {publishStep === "published"
                      ? `Configuration Published (${schemaVersion})`
                      : publishStep === "confirm"
                      ? "Confirm Configuration Publication"
                      : validationErrors.length > 0
                      ? "Review & Submit: Action Required"
                      : "Publish Configuration"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {publishStep === "published"
                      ? "Configuration published. Activate this template when it is ready for assigned enterprises."
                      : publishStep === "confirm"
                      ? "Final validation check. Confirm publication to finalize this schema version."
                      : validationErrors.length > 0
                      ? `The system detected ${validationErrors.length} configuration issue${validationErrors.length > 1 ? "s" : ""} that must be resolved before publishing.`
                      : "The configuration is valid and verified. Review the summary below to proceed with publication."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewSubmitModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {publishStep === "published" ? (
              /* Published State: System displays Activate Now */
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-xs text-emerald-950 flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      &#10003;
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        Configuration Published Successfully
                      </h4>
                      <p className="text-emerald-800 text-xs">
                        Version <strong>{schemaVersion}</strong> is finalized and archived.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200/80 bg-white p-3.5 text-xs text-slate-700">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-900">Next step</p>
                    <p className="mt-1">Activate the configuration to make it available for Enterprise Admin authoring.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowReviewSubmitModal(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                  >
                    Keep Inactive &amp; Close
                  </button>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewSubmitModal(false);
                        setShowFormDetailsModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                    >
                      View Form Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewSubmitModal(false);
                        setShowActivationDialog(true);
                      }}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>Activate Now &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : publishStep === "confirm" ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
                  <p className="font-bold text-amber-900">This action will publish the configuration.</p>
                  <p className="mt-1.5 leading-relaxed">The form will be saved as an immutable version and remain inactive until you assign and activate it.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-700">Publication details</h4>
                  <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-slate-700">
                    <div>
                      <dt className="text-[10px] uppercase font-semibold text-slate-400">Form name</dt>
                      <dd className="mt-0.5 font-bold text-slate-900">{formTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase font-semibold text-slate-400">Version</dt>
                      <dd className="mt-0.5 font-mono font-bold text-teal-800">{schemaVersion}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase font-semibold text-slate-400">Sections</dt>
                      <dd className="mt-0.5 font-semibold">{displayedSections.length}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase font-semibold text-slate-400">Optional fields</dt>
                      <dd className="mt-0.5 font-semibold">{fields.filter((field) => !isProtectedSystemFieldKey(field.key)).length}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase font-semibold text-slate-400">Status after publication</dt>
                      <dd className="mt-0.5 font-bold text-purple-800">Published · Inactive</dd>
                    </div>
                  </dl>
                </div>

                <p className="text-xs leading-relaxed text-slate-600">
                  Confirm publication to finalize this configuration. You can assign and activate it after publishing.
                </p>

                {publicationError ? (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-900">
                    <p className="font-semibold">Publication could not be completed.</p>
                    <p className="mt-1 leading-relaxed">{publicationError}</p>
                    <p className="mt-1 text-rose-700">Resolve the issue and try again.</p>
                  </div>
                ) : null}

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPublishStep("review")}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                  >
                    &larr; Back to Review
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleConfirmPublish()}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Publishing…" : "Publish configuration"}
                  </button>
                </div>
              </div>
            ) : validationErrors.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-rose-950 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span>Configuration Validation Issues ({validationErrors.length})</span>
                  </div>
                  <p className="text-rose-800 leading-relaxed">
                    Review &amp; Submit is configuration validation, not an article approval request. A configuration cannot be published if essential system fields are missing or disabled. Review each issue below and click <strong>Fix</strong> to return directly to the relevant setting.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {validationErrors.map((err) => (
                    <div
                      key={err.id}
                      className="p-3 rounded-xl border border-rose-200 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-rose-300 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-900 leading-snug">
                          {err.message}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                          {err.sectionName && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                              Section: {err.sectionName}
                            </span>
                          )}
                          {err.fieldLabel && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                              Field: {err.fieldLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFixError(err)}
                        className="px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold shrink-0 transition-colors shadow-2xs"
                      >
                        Fix &rarr;
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowReviewSubmitModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                  >
                    &larr; Back to Builder
                  </button>
                  <button
                    type="button"
                    disabled={true}
                    className="px-4 py-2 rounded-xl bg-slate-200 text-slate-500 text-xs font-semibold cursor-not-allowed"
                  >
                    Resolve {validationErrors.length} Issue{validationErrors.length > 1 ? "s" : ""} to Publish
                  </button>
                </div>
              </div>
            ) : (
              /* Valid State: Display Publish Configuration */
              <div className="flex flex-col gap-4">
                {/* Configuration summary */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Configuration summary
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs sm:col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">Form Name</span>
                      <span className="font-bold text-slate-900 text-sm truncate block mt-0.5">{formTitle}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">Form Type</span>
                      <span className="font-semibold text-slate-900 capitalize block mt-0.5">
                        {formType === "both" ? "Blog & News" : formType === "blog" ? "Blog" : "News"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Configurable Sections
                      </span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">{displayedSections.length}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Custom Fields
                      </span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">
                        {fields.filter((field) => !isProtectedSystemFieldKey(field.key)).length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="text-rose-700 block text-[10px] uppercase tracking-wider font-bold">Required Fields</span>
                      <span className="font-bold text-rose-900 text-sm block mt-0.5">
                        {fields.filter((f) => f.isRequired).length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="text-purple-700 block text-[10px] uppercase tracking-wider font-bold">Admin-only Fields</span>
                      <span className="font-bold text-purple-900 text-sm block mt-0.5">
                        {fields.filter((f) => f.visibilityScope === "admin_only" || sections.find((s) => s.id === f.sectionId)?.visibilityScope === "admin_only").length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs sm:col-span-4 sm:col-start-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Disabled Fields</span>
                          <p className="text-[11px] text-slate-400">Fields disabled from authoring entry and hidden from readers</p>
                        </div>
                        <span className="font-bold text-slate-700 text-sm px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {fields.filter((f) => !f.isActive).length} disabled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation summary */}
                <div className="flex flex-col gap-2 rounded-xl border border-teal-100 bg-teal-50/40 p-3.5 text-xs text-teal-950">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-teal-900">
                    Checks passed
                  </span>
                  <ul className="space-y-1.5 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                      <span>All essential system fields (Title, Summary, Content, Category, Cover Image) are present and enabled.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                      <span>Core protected fields remain publishable with defined article layouts.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                      <span>Enterprise Admin-only fields and sections are excluded from published output.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                      <span>Section order, field layout, and mandatory requirements are confirmed.</span>
                    </li>
                  </ul>
                </div>

                {/* Important Logic: Lifecycle, Audit & Post Compatibility */}
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3.5 text-xs text-sky-950 flex flex-col gap-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-sky-900">
                    What happens next
                  </span>
                  <ul className="space-y-1.5 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-700 font-bold mt-0.5">&bull;</span>
                      <span><strong>Published version:</strong> The configuration is saved as an immutable version for future authoring.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-700 font-bold mt-0.5">&bull;</span>
                      <span><strong>Activation is separate:</strong> Publishing does not activate the form. Assign and activate it when it is ready for Enterprise Admins.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-700 font-bold mt-0.5">&bull;</span>
                      <span><strong>Existing content:</strong> Published versions are retained so existing posts continue using their original configuration.</span>
                    </li>
                  </ul>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirm publication to create version {schemaVersion}. Enterprise Admins can use this form after it is activated.
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowReviewSubmitModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                  >
                    &larr; Back to Builder
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewSubmitModal(false);
                        setShowPreviewModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                    >
                      Preview Layout
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handlePublishConfiguration}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Publish Configuration &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Form Details Modal */}
      {showFormDetailsModal && (
        <BlogFormDetailsDialog
          form={currentFormObject}
          onClose={() => setShowFormDetailsModal(false)}
        />
      )}
      {/* Activation Dialog for Section 9 Activate Now */}
      {showActivationDialog && (
        <BlogFormActivationDialog
          form={currentFormObject}
          onClose={() => setShowActivationDialog(false)}
          onActivated={(updated) => {
            setFormStatus(updated.status);
            showToast(`Form “${updated.name}” activated successfully. Now available to assigned enterprises.`);
          }}
        />
      )}
    </div>
  );
}
