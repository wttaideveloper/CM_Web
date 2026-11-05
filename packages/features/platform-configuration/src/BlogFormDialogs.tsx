"use client";

import Link from "next/link";
import { activateAdminBlogForm, createAdminBlogFormDraft, deactivateAdminBlogForm, deleteAdminBlogForm, listAdminBlogForms, type BlogForm } from "@ihp/shared";
import { useEffect, useState, type ReactNode } from "react";
import { getPlatformEnterprises } from "@ihp/platform-enterprises";

interface BlogFormDialogProps {
  readonly form: BlogForm;
  readonly onClose: () => void;
  readonly onEditConfiguration?: (form: BlogForm) => void;
  readonly onDeactivate?: (form: BlogForm) => void;
  readonly onDelete?: (form: BlogForm) => void;
}

const typeLabel = (value: BlogForm["type"]): string =>
  value === "both" ? "Blog & News" : value === "blog" ? "Blog" : "News";

const activeFormConflictMessage = (activeForm: BlogForm): string =>
  `Another ${typeLabel(activeForm.type)} form is already active: “${activeForm.name}” (v${activeForm.version}). Please deactivate that form, then try again.`;

const DialogFrame = ({
  title,
  children,
  onClose,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4" onClick={onClose}>
    <section
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => event.stopPropagation()}
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#edf3f0] pb-4">
        <h2 className="text-xl font-bold text-[#06201c]">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">
          Close
        </button>
      </div>
      {children}
    </section>
  </div>
);

/** Displays the configuration metadata and field inventory without exposing edit controls. */
export function BlogFormDetailsDialog({ form, onClose, onEditConfiguration, onDeactivate, onDelete }: BlogFormDialogProps) {
  const isDraft = form.status === "draft";
  const assignedCount = form.assigned_count ?? form.tenant_ids?.length ?? 0;
  const isAssigned = form.scope === "global" || (form.scope === "selected" && assignedCount > 0);
  return (
    <DialogFrame title="Form Details" onClose={onClose}>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-[#f8fbf9] p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Form Name</dt>
          <dd className="mt-1 text-sm font-semibold text-[#175245]">{form.name}</dd>
        </div>
        <div className="rounded-xl bg-[#f8fbf9] p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Form Type</dt>
          <dd className="mt-1 text-sm font-semibold capitalize text-[#175245]">{typeLabel(form.type)}</dd>
        </div>
        <div className="rounded-xl bg-[#f8fbf9] p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Status</dt>
          <dd className="mt-1 flex items-center gap-1.5">
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isDraft
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : form.status === "active"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : form.status === "published"
                  ? "bg-purple-100 text-purple-900 border border-purple-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {form.status === "published" ? "Published (Inactive)" : form.status}
            </span>
          </dd>
        </div>
        <div className="rounded-xl bg-[#f8fbf9] p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Version &amp; Audit</dt>
          <dd className="mt-1 text-sm font-semibold text-[#175245]">
            <span className="font-mono">v{form.version}</span>
            <span className="ml-1 text-[11px] text-[#7f9d94] font-normal block sm:inline sm:ml-2">Archived</span>
          </dd>
        </div>
        <div className="rounded-xl bg-[#f8fbf9] p-3 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Assigned Scope</dt>
          <dd className="mt-1 text-sm font-semibold text-[#175245]">
            {form.scope === "global"
              ? "Global (All Enterprises)"
              : form.scope === "selected"
              ? `Selected Enterprises (${assignedCount} assigned)`
              : "Not assigned yet"}
          </dd>
        </div>
      </dl>

      {form.status === "active" && isAssigned && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
          <span className="font-bold">Active configuration:</span> This form is available for Enterprise Admin authoring. Editing it creates a new draft version (v{form.version + 1}) so live authoring is not disrupted.
        </div>
      )}
      {form.status === "active" && !isAssigned && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
          <span className="font-bold">Assignment required:</span> This configuration is marked active but has no enterprise assignment yet. Assign it before Enterprise Admins can use it.
        </div>
      )}
      {form.status === "published" && (
        <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-950">
          <span className="font-bold">Published Configuration Version v{form.version}:</span>{" "}
          This schema is validated and preserved. Published configurations do not automatically become active; assign and activate it when ready.
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#edf3f0]">
          <h3 className="text-sm font-bold text-[#06201c]">Configured Sections &amp; Fields</h3>
          <span className="text-xs font-semibold text-[#52736a]">
            {form.sections.length} sections · {form.sections.flatMap((s) => s.fields).length} fields
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {form.sections.map((section, sectionIndex) => (
            <div key={section.id} className="rounded-xl border border-[#edf3f0] p-3.5 bg-[#fbfdfc]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#175245]">
                  {section.title.match(/^\d+\./) ? section.title : `${sectionIndex + 1}. ${section.title}`}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    section.visibility_scope === "admin_only" || section.type === "admin_notes"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-teal-50 text-teal-800 border border-teal-200"
                  }`}
                >
                  {section.visibility_scope === "admin_only" || section.type === "admin_notes"
                    ? "Enterprise Admin Only"
                    : "Published"}
                </span>
              </div>
              {section.description && (
                <p className="mt-1 text-xs text-[#52736a]">{section.description}</p>
              )}
              <div className="mt-2.5 space-y-1.5">
                {section.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#e8f0ec] bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-slate-800 truncate">{field.label}</span>
                      <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {field.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          field.visibility_scope === "admin_only"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {field.visibility_scope === "admin_only" ? "Admin Only" : "Published"}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          field.required ? "text-amber-700 font-bold" : "text-slate-600"
                        }`}
                      >
                        {field.required ? "Required" : "Optional"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#edf3f0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {form.status === "active" && onDeactivate && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeactivate(form);
              }}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Deactivate Form
            </button>
          )}
          {form.status === "draft" && onDelete && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(form);
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
            >
              Delete Draft
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onEditConfiguration) {
                void onEditConfiguration(form);
              } else {
                window.location.href = `/blog-form-builder?id=${encodeURIComponent(form.id)}`;
              }
            }}
            className="rounded-xl bg-[#1f6a58] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#185345] shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <span>{form.status === "draft" ? "Continue Editing in Builder" : "Edit Configuration"}</span>
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}

/** Renders the Enterprise Admin form layout preview. */
export function BlogFormPreviewDialog({ form, onClose }: BlogFormDialogProps) {
  const [previewTab, setPreviewTab] = useState<"enterprise" | "customer">("enterprise");

  const customerSections = form.sections
    .filter(
      (section) =>
        section.visible !== false &&
        section.visibility_scope !== "admin_only" &&
        section.type !== "admin_notes",
    )
    .map((section) => ({
      ...section,
      fields: section.fields.filter(
        (field) =>
          field.visible &&
          field.visibility_scope !== "admin_only" &&
          ![
            "title",
            "excerpt",
            "content",
            "category",
            "cover_image",
            "tags",
          ].includes(field.key),
      ),
    }));

  return (
    <DialogFrame title={`Preview Form: ${form.name}`} onClose={onClose}>
      {/* Preview Options Switcher per Section 7 */}
      <div className="mt-4 flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
        <button
          type="button"
          onClick={() => setPreviewTab("enterprise")}
          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-colors text-center ${
            previewTab === "enterprise"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Enterprise Admin Preview
        </button>
      </div>

      {previewTab === "enterprise" ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs text-teal-900">
            <span className="font-bold">Enterprise Admin Preview: </span>
            Shows all enabled fields, mandatory indicators (*), Enterprise Admin-only sections, section order, and field layout.
          </div>
          <div className="space-y-4">
            {form.sections
              .filter((section) => section.visible !== false)
              .map((section, sIndex) => {
                const isAdminOnly = section.visibility_scope === "admin_only" || section.type === "admin_notes";
                return (
                  <section
                    key={section.id}
                    className={`rounded-xl border p-4 ${
                      isAdminOnly
                        ? "border-purple-200 bg-purple-50/40"
                        : "border-[#dfe9e4] bg-[#fbfdfc]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#06201c]">
                        {section.title.match(/^\d+\./) ? section.title : `${sIndex + 1}. ${section.title}`}
                      </h3>
                      {isAdminOnly ? (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 border border-purple-200">
                          Enterprise Admin Only Section
                        </span>
                      ) : (
                        <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                          Published Section
                        </span>
                      )}
                    </div>
                    {section.description ? (
                      <p className="mt-1 text-xs text-[#52736a]">{section.description}</p>
                    ) : null}
                    <div className="mt-3 space-y-3">
                      {section.fields
                        .filter((field) => field.visible)
                        .map((field) => (
                          <div key={field.id} className="rounded-lg border border-[#e8f0ec] bg-white p-3 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs font-bold text-[#175245]">
                                  {field.label}
                                </label>
                                {field.required ? (
                                  <span className="inline-flex items-center gap-0.5">
                                    <span className="text-rose-600 font-bold" title="Mandatory field">*</span>
                                    <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                                      Required
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    (Optional)
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  field.visibility_scope === "admin_only"
                                    ? "bg-purple-50 text-purple-700"
                                    : "bg-teal-50 text-teal-700"
                                }`}
                              >
                                {field.visibility_scope === "admin_only" ? "Admin Only" : "Published"}
                              </span>
                            </div>
                            <div className="mt-1.5 rounded-lg border border-[#d7e5df] bg-[#fbfdfc] px-3 py-2 text-xs text-slate-500">
                              {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                            </div>
                            {field.help_text ? (
                              <p className="mt-1 text-[10px] text-[#7f9d94]">{field.help_text}</p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </section>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 text-xs text-purple-900">
            <span className="font-bold">Published Article Preview: </span>
            Shows only published fields. Internal fields and Enterprise Admin-only sections are completely hidden.
          </div>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                {form.type === "both" ? "Blog & News" : form.type}
              </span>
              <h2 className="mt-2 text-lg font-bold text-slate-900">
                Sample Approved Article Preview
              </h2>
              <p className="text-xs text-slate-500 mt-1">General Health &bull; 3 min read</p>
            </div>
            <div className="h-32 w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
              Cover Image Display
            </div>
            <p className="text-xs text-[#365b52] italic border-l-2 border-teal-500 pl-3 leading-relaxed">
              Approved post summary and highlights as published.
            </p>
            <div className="text-xs leading-relaxed text-slate-700">
              This preview reflects the published article layout. Only published fields are rendered below.
            </div>

            {customerSections.some((s) => s.fields.length > 0) && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 block">
                  Additional Information (Defined Display Layout)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {customerSections.flatMap((s) => s.fields).map((field) => (
                    <div key={field.id} className="rounded-lg bg-teal-50/40 border border-teal-100 p-2.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-900">
                        {field.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {field.placeholder || "Approved value"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 p-2 rounded-lg bg-emerald-50 text-[10px] text-emerald-800 border border-emerald-100 text-center font-medium">
              Enterprise Admin-only fields and internal notes are never included in published output.
            </div>
          </article>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-[#edf3f0] flex items-center justify-between gap-3">
        <Link
          href={`/blog-form-builder?id=${encodeURIComponent(form.id)}`}
          onClick={onClose}
          className="rounded-xl bg-[#1f6a58] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#185345] shadow-xs transition-colors inline-flex items-center gap-1.5"
        >
          <span>Open in Form Builder &rarr;</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Close
        </button>
      </div>
    </DialogFrame>
  );
}

export interface BlogFormActivationDialogProps {
  readonly form: BlogForm;
  readonly onClose: () => void;
  readonly onActivated: (updated: BlogForm) => void;
}

type EnterpriseOption = Awaited<ReturnType<typeof getPlatformEnterprises>>[number];

const getEnterpriseDisplayName = (enterprise: EnterpriseOption): string => {
  if (typeof enterprise === "object" && enterprise !== null) {
    if ("business_legal_name" in enterprise && typeof enterprise.business_legal_name === "string" && enterprise.business_legal_name.trim()) {
      return enterprise.business_legal_name;
    }
    if ("business_short_name" in enterprise && typeof enterprise.business_short_name === "string" && enterprise.business_short_name.trim()) {
      return enterprise.business_short_name;
    }
    if ("name" in enterprise && typeof enterprise.name === "string" && enterprise.name.trim()) {
      return enterprise.name;
    }
  }
  return enterprise.id;
};

/**
 * Dialog enabling Super Admins to assign and activate a published form configuration.
 */
export function BlogFormActivationDialog({ form, onClose, onActivated }: BlogFormActivationDialogProps) {
  const [scope, setScope] = useState<"global" | "selected">(form.scope === "selected" ? "selected" : "global");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>(form.tenant_ids ?? []);
  const [reviewingActivation, setReviewingActivation] = useState(false);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseOption[]>([]);
  const [activeForms, setActiveForms] = useState<BlogForm[]>([]);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterprisesLoading, setEnterprisesLoading] = useState(false);
  const [enterprisesError, setEnterprisesError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setEnterprisesLoading(true);
    setEnterprisesError("");
    Promise.all([
      getPlatformEnterprises().catch((reason: unknown) => {
        if (!cancelled) {
          setEnterprisesError(
            reason instanceof Error ? reason.message : "Unable to load enterprises.",
          );
        }
        return [];
      }),
      listAdminBlogForms({ status: "active" })
        .then((res) => res.items)
        .catch(() => []),
    ]).then(([enterprises, activeList]) => {
      if (!cancelled) {
        setEnterpriseOptions(enterprises);
        setActiveForms(activeList);
        setEnterprisesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScopeChange = (newScope: "global" | "selected") => {
    setScope(newScope);
    setReviewingActivation(false);
    setError("");
  };

  const existingActiveForm = activeForms.find(
    (f) => f.id !== form.id && f.type === form.type,
  );
  const tenantsWithSpecificOverrides = activeForms
    .filter((f) => f.id !== form.id && f.scope === "selected")
    .flatMap((f) => f.tenant_ids ?? []);
  const uniqueSpecificTenantCount = new Set(tenantsWithSpecificOverrides).size;

  // Selected tenant conflict calculation
  const selectedTenantConflicts = selectedTenantIds.map((tenantId) => {
    const enterprise = enterpriseOptions.find((e) => e.id === tenantId);
    const replacedForm = activeForms.find(
      (f) =>
        f.id !== form.id &&
        f.status === "active" &&
        f.type === form.type &&
        f.scope === "selected" &&
        f.tenant_ids?.includes(tenantId),
    );
    return {
      tenantId,
      enterprise,
      displayName: enterprise ? getEnterpriseDisplayName(enterprise) : tenantId,
      replacedForm,
    };
  });
  const conflictingTenants = selectedTenantConflicts.filter((item) => item.replacedForm != null);
  const directTenants = selectedTenantConflicts.filter((item) => item.replacedForm == null);

  const handleActivate = async () => {
    if (scope === "selected" && selectedTenantIds.length === 0) {
      setError("Please select at least one enterprise for selected assignment.");
      return;
    }
    if (existingActiveForm) {
      setError(activeFormConflictMessage(existingActiveForm));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await activateAdminBlogForm(form.id, scope, selectedTenantIds);
      onActivated(updated);
      onClose();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to activate this form.");
    } finally {
      setBusy(false);
    }
  };

  const filteredEnterprises = enterpriseOptions.filter((e) => {
    const q = enterpriseSearch.trim().toLowerCase();
    if (!q) return true;
    const name = getEnterpriseDisplayName(e).toLowerCase();
    return name.includes(q) || e.id.toLowerCase().includes(q);
  });

  return (
    <DialogFrame title={`Activate ${form.name}`} onClose={onClose}>
      <div className="mt-4 flex flex-col gap-4">
        <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5 text-xs text-teal-950">
          <p className="font-bold uppercase tracking-wider text-[10px] text-teal-900">Activation</p>
          <p className="mt-1 text-slate-700">Choose where this published form can be used for Enterprise Admin authoring.</p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {existingActiveForm && !error ? (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {activeFormConflictMessage(existingActiveForm)}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Assignment scope
            </span>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              {scope === "global" ? "Global Scope" : "Selected Tenants Scope"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Choose whether this configuration applies platform-wide or exclusively to selected enterprise tenants.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <label
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs cursor-pointer transition-all ${
                scope === "global"
                  ? "border-teal-600 bg-teal-50/70 text-teal-950 font-semibold ring-2 ring-teal-600/20 shadow-2xs"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="global"
                checked={scope === "global"}
                onChange={() => handleScopeChange("global")}
                className="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900 text-xs">Global — All Tenants</span>
                <span className="text-[11px] text-slate-500 block mt-0.5 font-normal leading-relaxed">
                  Applies to all current and future enterprise tenants across the platform.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs cursor-pointer transition-all ${
                scope === "selected"
                  ? "border-teal-600 bg-teal-50/70 text-teal-950 font-semibold ring-2 ring-teal-600/20 shadow-2xs"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="selected"
                checked={scope === "selected"}
                onChange={() => handleScopeChange("selected")}
                className="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900 text-xs">Selected Tenants</span>
                <span className="text-[11px] text-slate-500 block mt-0.5 font-normal leading-relaxed">
                  Assign this form configuration exclusively to chosen enterprise tenants.
                </span>
              </div>
            </label>
          </div>
        </div>

        {scope === "global" && (
          <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-4 flex flex-col gap-3.5 text-xs text-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
              <span className="font-bold uppercase tracking-wider text-[11px] text-teal-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                Global activation impact
              </span>
              <span className="rounded bg-teal-100/90 text-teal-900 px-2 py-0.5 text-[10px] font-bold uppercase">
                Platform Default
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-lg bg-white p-2.5 border border-teal-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Post Type
                </span>
                <span className="font-bold text-slate-900 text-xs block mt-0.5">
                  {typeLabel(form.type)}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-teal-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Target Version
                </span>
                <span className="font-mono font-bold text-teal-800 text-xs block mt-0.5">
                  v{form.version}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-teal-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Target Scope
                </span>
                <span className="font-bold text-emerald-800 text-xs block mt-0.5">
                  All Registered Tenants
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-white p-3.5 border border-teal-100 shadow-2xs">
              <span className="font-bold text-slate-900 text-xs">Tenant Impact Assessment</span>
              <ul className="space-y-1.5 text-slate-600 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-teal-700 font-bold mt-0.5">&bull;</span>
                  <span>
                    <strong>Global Default:</strong> This configuration becomes the platform-wide default template for all <strong>{typeLabel(form.type)}</strong> posts.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-700 font-bold mt-0.5">&bull;</span>
                  <span>
                    <strong>Enterprises Without Specific Form:</strong> All registered enterprise tenants ({enterpriseOptions.length > 0 ? `${enterpriseOptions.length} registered tenants` : "platform-wide"}) without a custom assigned form will immediately start authoring using this global form.
                  </span>
                </li>
                {uniqueSpecificTenantCount > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">&bull;</span>
                    <span>
                      <strong>Enterprises With Specific Custom Overrides:</strong> {uniqueSpecificTenantCount} tenant(s) currently have custom form assignments. Their custom templates will remain active and will not be overwritten.
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-teal-700 font-bold mt-0.5">&bull;</span>
                  <span>
                    <strong>Existing Articles &amp; Drafts:</strong> Existing published articles and pending drafts will retain their historical form version schemas without data disruption.
                  </span>
                </li>
              </ul>
            </div>

            <p className="text-[11px] text-teal-900 font-medium leading-relaxed">
              Confirming will apply this form as the platform-wide default for {typeLabel(form.type)} posts.
            </p>
          </div>
        )}

        {scope === "selected" && !reviewingActivation && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 flex flex-col gap-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                Select tenants
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {selectedTenantIds.length} enterprise{selectedTenantIds.length === 1 ? "" : "s"} selected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Choose Enterprises</span>
                <span className="text-[11px] text-slate-500">Search and select one or more enterprises that will receive this form.</span>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedTenantIds(enterpriseOptions.map((e) => e.id))}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-teal-800 hover:bg-slate-50 shadow-2xs"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTenantIds([])}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  Clear all
                </button>
              </div>
            </div>

            <input
              type="text"
              value={enterpriseSearch}
              onChange={(e) => setEnterpriseSearch(e.target.value)}
              placeholder="Search enterprises by name or ID…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-teal-600"
            />

            {enterprisesError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {enterprisesError}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {enterprisesLoading ? (
                <p className="py-4 text-center text-xs text-slate-500">Loading enterprises…</p>
              ) : filteredEnterprises.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  {enterpriseOptions.length === 0 ? "No enterprises available." : "No enterprises match your search."}
                </p>
              ) : (
                filteredEnterprises.map((enterprise) => {
                  const isChecked = selectedTenantIds.includes(enterprise.id);
                  const activeConflictingForm = activeForms.find(
                    (f) =>
                      f.id !== form.id &&
                      f.status === "active" &&
                      (f.type === "both" || form.type === "both" || f.type === form.type) &&
                      f.scope === "selected" &&
                      f.tenant_ids?.includes(enterprise.id),
                  );
                  return (
                    <label
                      key={enterprise.id}
                      className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 font-semibold"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedTenantIds((curr) =>
                              isChecked ? curr.filter((id) => id !== enterprise.id) : [...curr, enterprise.id],
                            );
                          }}
                        />
                        <div className="min-w-0">
                          <span className="block truncate">{getEnterpriseDisplayName(enterprise)}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{enterprise.id}</span>
                        </div>
                      </div>
                      {activeConflictingForm ? (
                        <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-800 font-semibold shrink-0">
                          Replaces: {activeConflictingForm.name}
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 font-normal shrink-0">
                          Uses global
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {/* Review Selected Tenants Strip */}
            {selectedTenantIds.length > 0 && (
              <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-3 text-xs mt-1">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-teal-200/60">
                  <span className="font-bold text-teal-950">
                    Review Selected Tenants ({selectedTenantIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTenantIds([])}
                    className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {selectedTenantIds.map((id) => {
                    const ent = enterpriseOptions.find((e) => e.id === id);
                    const name = ent ? getEnterpriseDisplayName(ent) : id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-800 border border-teal-200 shadow-2xs"
                      >
                        <span className="truncate max-w-[160px]">{name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTenantIds((curr) => curr.filter((tId) => tId !== id))}
                          className="text-slate-400 hover:text-rose-600 font-bold text-xs"
                          title={`Remove ${name}`}
                          aria-label={`Remove ${name}`}
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

            {/* Review assignments and conflicts */}
        {scope === "selected" && reviewingActivation && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 flex flex-col gap-3.5 text-xs text-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
              <span className="font-bold uppercase tracking-wider text-[11px] text-teal-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                Review assignments
              </span>
              <span className="rounded bg-teal-100 text-teal-900 px-2 py-0.5 text-[10px] font-bold uppercase">
                {selectedTenantIds.length} Tenant{selectedTenantIds.length === 1 ? "" : "s"} Targeted
              </span>
            </div>

            {/* Target Configuration Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-lg bg-white p-2.5 border border-teal-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Post Type
                </span>
                <span className="font-bold text-slate-900 text-xs block mt-0.5">
                  {typeLabel(form.type)}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-teal-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Target Version
                </span>
                <span className="font-mono font-bold text-teal-800 text-xs block mt-0.5">
                  v{form.version}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-teal-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Target Scope
                </span>
                <span className="font-bold text-teal-800 text-xs block mt-0.5">
                  {selectedTenantIds.length} Selected Tenant{selectedTenantIds.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Conflicting Assignments Assessment */}
            {conflictingTenants.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-xl bg-amber-50/90 p-3.5 border border-amber-200 text-amber-950">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900">
                    Conflicting Assignments Detected ({conflictingTenants.length})
                  </span>
                  <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    Forms will be replaced
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The following enterprise(s) currently have an active custom form for <strong>{typeLabel(form.type)}</strong> posts. Activating this configuration will replace their existing form assignment:
                </p>
                <div className="mt-1 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {conflictingTenants.map((item) => (
                    <div
                      key={item.tenantId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white p-2.5 border border-amber-200 text-xs shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{item.displayName}</span>
                        <span className="text-[10px] font-mono text-slate-400">{item.tenantId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <div className="rounded bg-rose-50 px-2 py-1 border border-rose-200 text-rose-900">
                          <span className="text-[9px] uppercase font-bold text-rose-500 block">Replaced Form</span>
                          <span className="font-semibold">{item.replacedForm!.name} (v{item.replacedForm!.version})</span>
                        </div>
                        <span className="text-slate-400 font-bold">&rarr;</span>
                        <div className="rounded bg-teal-50 px-2 py-1 border border-teal-200 text-teal-900">
                          <span className="text-[9px] uppercase font-bold text-teal-600 block">New Form</span>
                          <span className="font-semibold">{form.name} (v{form.version})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200 text-emerald-950">
                <span className="font-bold text-xs text-emerald-900">No Conflicting Assignments</span>
                <p className="text-[11px] text-emerald-800">
                  None of the selected enterprises have conflicting custom forms. All {selectedTenantIds.length} enterprise(s) will receive {form.name} (v{form.version}) cleanly.
                </p>
              </div>
            )}

            {/* Direct Assignments (Enterprises transitioning from global default) */}
            {directTenants.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl bg-white p-3 border border-slate-200 text-xs">
                <span className="font-bold text-slate-800">
                  Direct Assignments ({directTenants.length})
                </span>
                <p className="text-[11px] text-slate-500">
                  These enterprises currently use the platform global default template. They will now use this assigned form exclusively.
                </p>
                <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto">
                  {directTenants.map((item) => (
                    <span
                      key={item.tenantId}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {item.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tenant Isolation Guarantee Notice */}
            <div className="rounded-lg bg-teal-100/70 p-2.5 text-[11px] text-teal-950 font-medium">
              <strong>Tenant Isolation Guarantee:</strong> Only the {selectedTenantIds.length} selected enterprise(s) will receive this form. All other enterprises across the platform remain completely unaffected and continue using their current assignments or the global default.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          {scope === "selected" && reviewingActivation ? (
            <>
              <button
                type="button"
                onClick={() => setReviewingActivation(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                Back to Tenant Selection
              </button>
              <button
                type="button"
                disabled={busy || selectedTenantIds.length === 0}
                onClick={() => void handleActivate()}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy
                  ? "Activating…"
                  : `Confirm Activation for ${selectedTenantIds.length} Tenant${selectedTenantIds.length === 1 ? "" : "s"}`}
              </button>
            </>
          ) : scope === "selected" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || selectedTenantIds.length === 0}
                onClick={() => {
                  if (selectedTenantIds.length === 0) {
                    setError("Please select at least one enterprise.");
                    return;
                  }
                  setError("");
                  setReviewingActivation(true);
                }}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review Activation ({selectedTenantIds.length} Selected)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleActivate()}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Activating…" : "Confirm Global Activation"}
              </button>
            </>
          )}
        </div>
      </div>
    </DialogFrame>
  );
}

export interface BlogFormDeactivationDialogProps {
  readonly form: BlogForm;
  readonly onClose: () => void;
  readonly onDeactivated?: (form: BlogForm) => void;
}

export function BlogFormDeactivationDialog({
  form,
  onClose,
  onDeactivated,
}: BlogFormDeactivationDialogProps) {
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseOption[]>([]);
  const [activeForms, setActiveForms] = useState<BlogForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      getPlatformEnterprises().catch(() => []),
      listAdminBlogForms({ status: "active" })
        .then((res) => res.items)
        .catch(() => []),
    ]).then(([enterprises, activeList]) => {
      if (!cancelled) {
        setEnterpriseOptions(enterprises);
        setActiveForms(activeList);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // System checks affected tenants
  let affectedEnterprises: EnterpriseOption[] = [];
  if (form.scope === "global") {
    // Global form applies to all enterprises except those with an active custom override for this post type
    const specificOverrides = new Set(
      activeForms
        .filter(
          (f) =>
            f.id !== form.id &&
            f.scope === "selected" &&
            (f.type === "both" || form.type === "both" || f.type === form.type),
        )
        .flatMap((f) => f.tenant_ids ?? []),
    );
    affectedEnterprises = enterpriseOptions.filter((e) => !specificOverrides.has(e.id));
  } else if (form.scope === "selected") {
    const assignedIds = new Set(form.tenant_ids ?? []);
    affectedEnterprises = enterpriseOptions.filter((e) => assignedIds.has(e.id));
  }

  // Show which replacement form will apply
  // When a selected tenant form is deactivated, affected tenants fall back to the active global default for this post type
  const replacementGlobalForm =
    form.scope === "selected"
      ? activeForms.find(
          (f) =>
            f.id !== form.id &&
            f.scope === "global" &&
            (f.type === "both" || form.type === "both" || f.type === form.type),
        )
      : null;

  const filteredEnterprises = affectedEnterprises.filter((e) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const displayName = getEnterpriseDisplayName(e).toLowerCase();
    return displayName.includes(q) || e.id.toLowerCase().includes(q);
  });

  const handleConfirmDeactivation = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await deactivateAdminBlogForm(form.id);
      onDeactivated?.(updated);
      onClose();
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Unable to deactivate this form.",
      );
      setBusy(false);
    }
  };

  return (
    <DialogFrame title="Deactivate Form Configuration" onClose={onClose}>
      <div className="mt-4 space-y-4">
        {/* Form Identity */}
        <div className="rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">Form Name</span>
              <h3 className="text-base font-bold text-[#06201c]">{form.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-900">
                {typeLabel(form.type)}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                v{form.version}
              </span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                Active
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#52736a]">
            Assigned Scope:{" "}
            <strong>
              {form.scope === "global"
                ? "Global (All Enterprises without custom overrides)"
                : `Selected Enterprises (${form.tenant_ids?.length ?? 0} assigned)`}
            </strong>
          </p>
        </div>

        {/* Affected Tenants Impact Analysis */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Affected Tenants Impact Analysis
            </span>
            <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              {loading ? "Checking..." : `${affectedEnterprises.length} Enterprise${affectedEnterprises.length === 1 ? "" : "s"} Affected`}
            </span>
          </div>

          <p className="mt-2 text-xs text-amber-950">
            {form.scope === "global" ? (
              <>
                Deactivating this <strong>Global Form</strong> affects all <strong>{affectedEnterprises.length}</strong> enterprise(s) that rely on the global default.
              </>
            ) : (
              <>
                Deactivating this <strong>Selected Tenant Form</strong> affects the <strong>{affectedEnterprises.length}</strong> enterprise(s) specifically assigned to it.
              </>
            )}
          </p>

          {affectedEnterprises.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200/80 bg-white p-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100 text-xs">
                <span className="font-semibold text-slate-700">Affected Enterprises</span>
                {affectedEnterprises.length > 5 && (
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter enterprises..."
                    className="rounded border border-slate-200 px-2 py-0.5 text-xs"
                  />
                )}
              </div>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                {filteredEnterprises.slice(0, 15).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50">
                    <span className="font-medium text-slate-800">{getEnterpriseDisplayName(e)}</span>
                    <span className="font-mono text-[11px] text-slate-500">{e.id.slice(0, 8)}</span>
                  </div>
                ))}
                {filteredEnterprises.length > 15 && (
                  <div className="text-[11px] text-slate-500 pt-1 text-center">
                    + {filteredEnterprises.length - 15} more enterprises
                  </div>
                )}
                {filteredEnterprises.length === 0 && (
                  <div className="text-xs text-slate-500 py-1 text-center">No enterprises match filter.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Replacement Form Behavior */}
        <div className="rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#175245]">
            Replacement Form Behavior
          </span>

          {replacementGlobalForm ? (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                    Automatic Fallback Form
                  </span>
                  <span className="text-sm font-bold text-emerald-950">
                    {replacementGlobalForm.name} (v{replacementGlobalForm.version})
                  </span>
                </div>
                <span className="rounded bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-900">
                  Global Default
                </span>
              </div>
              <p className="mt-1.5 text-xs text-emerald-900">
                Upon deactivation, the affected enterprises will automatically fall back to this active global form for all new post authoring.
              </p>
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50/70 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-900">
                  No Replacement Form Available
                </span>
              </div>
              <p className="mt-1 text-xs text-red-950">
                There is currently no active global default form for <strong>{typeLabel(form.type)}</strong>.
                When this form is deactivated, post authoring for {typeLabel(form.type)} will be{" "}
                <strong>temporarily unavailable</strong> for affected enterprises until a new form configuration is activated.
              </p>
            </div>
          )}
        </div>

        {/* Existing Content Safeguard Notice */}
        <div className="rounded-xl border border-[#d7e5df] bg-[#f8fbf9] p-3 text-xs text-[#365b52]">
          <span className="font-bold">Existing Content Safeguard:</span> Deactivation does not overwrite or delete existing articles. Published articles, pending approvals, and enterprise drafts remain completely intact and continue using their original configuration schema.
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#edf3f0] flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void handleConfirmDeactivation()}
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy ? "Deactivating..." : "Confirm Deactivation"}
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}

export interface BlogFormDeleteDialogProps {
  readonly form: BlogForm;
  readonly onClose: () => void;
  readonly onDeleted?: (formId: string) => void;
  readonly onDeactivateInstead?: (form: BlogForm) => void;
}

export function BlogFormDeleteDialog({
  form,
  onClose,
  onDeleted,
  onDeactivateInstead,
}: BlogFormDeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isActive = form.status === "active";
  const isPublished = form.status === "published";
  const isDraft = form.status === "draft";

  const handleDelete = async () => {
    if (!isDraft) return;
    setBusy(true);
    setError("");
    try {
      await deleteAdminBlogForm(form.id);
      onDeleted?.(form.id);
      onClose();
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete this form.",
      );
      setBusy(false);
    }
  };

  return (
    <DialogFrame title="Delete Form Configuration" onClose={onClose}>
      <div className="mt-4 space-y-4">
        {/* Form Identity Card */}
        <div className="rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">Form Configuration</span>
              <h3 className="text-base font-bold text-[#06201c]">{form.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-900">
                {typeLabel(form.type)}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                v{form.version}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  isDraft
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : isActive
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-purple-100 text-purple-900 border border-purple-200"
                }`}
              >
                {form.status}
              </span>
            </div>
          </div>
        </div>

        {/* Status Validation Checks */}
        {isActive && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-900 block">
              Active Forms Cannot Be Deleted Directly
            </span>
            <p className="text-xs text-red-950">
              This form is currently active in production for enterprise post authoring. Direct deletion is disabled to prevent disruption to active enterprises.
            </p>
            <p className="text-xs text-red-950">
              To retire this form, please deactivate it first.
            </p>
          </div>
        )}

        {isPublished && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900 block">
              Published Configurations Preserved for Audit
            </span>
            <p className="text-xs text-purple-950">
              Published form configurations are permanently archived to maintain audit trails and compatibility with historical posts. Published versions cannot be deleted.
            </p>
          </div>
        )}

        {isDraft && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                Confirm Draft Form Deletion
              </span>
              <p className="mt-1 text-xs text-amber-950">
                Are you sure you want to permanently delete draft form <strong>“{form.name}” (v{form.version})</strong>? This action will remove the unpublished draft configuration.
              </p>
            </div>

            <div className="rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-3 text-xs text-[#365b52]">
              <span className="font-bold">Safe Content Guarantee:</span> Deleting this unreleased draft form will not delete or alter any existing enterprise posts or published configurations.
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#edf3f0] flex items-center justify-between gap-3">
          {isActive && onDeactivateInstead ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeactivateInstead(form);
              }}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Deactivate Form Instead
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            {isDraft && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 shadow-xs transition-colors disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Delete Draft"}
              </button>
            )}
          </div>
        </div>
      </div>
    </DialogFrame>
  );
}
