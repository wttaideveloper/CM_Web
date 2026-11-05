"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BlogConfirmationModal } from "./BlogConfirmationModal";
import {
  activateAdminBlogForm,
  createAdminBlogForm,
  createAdminBlogFormDraft,
  deactivateAdminBlogForm,
  deleteAdminBlogForm,
  getAdminBlogForm,
  listAdminBlogForms,
  publishAdminBlogForm,
  type BlogForm,
} from "@ihp/shared";
import {
  BlogFormActivationDialog,
  BlogFormDetailsDialog,
  BlogFormPreviewDialog,
} from "./BlogFormDialogs";
import { formatAuditDateTime } from "./audit-date-formatters";

type FormType = "all" | "blog" | "news" | "both";
type FormStatus = "all" | BlogForm["status"];
const dateLabel = (value: string) => {
  const formatted = formatAuditDateTime(value);
  return formatted === "Not provided" ? "—" : formatted;
};
const typeLabel = (value: BlogForm["type"]) =>
  value === "both" ? "Blog & News" : value === "blog" ? "Blog" : "News";
const statusLabel = (value: BlogForm["status"]) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export default function PlatformBlogFormsListScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailsId = searchParams?.get("details");

  useEffect(() => {
    if (!detailsId) return;
    let cancelled = false;
    void getAdminBlogForm(detailsId)
      .then((item) => {
        if (!cancelled && item) setDetailsForm(item);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [detailsId]);
  const [forms, setForms] = useState<BlogForm[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<FormType>("all");
  const [status, setStatus] = useState<FormStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [createType, setCreateType] =
    useState<Exclude<FormType, "all">>("both");
  const [activationForm, setActivationForm] = useState<BlogForm | null>(null);
  const [detailsForm, setDetailsForm] = useState<BlogForm | null>(null);
  const [previewForm, setPreviewForm] = useState<BlogForm | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, page_size: 20, total_pages: 0 });
  const [busy, setBusy] = useState(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    action: () => Promise<unknown>;
  } | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listAdminBlogForms({
        page,
        pageSize: 20,
        search: search.trim() || undefined,
        type: type === "all" ? undefined : type,
        status: status === "all" ? undefined : status,
      });
      setForms(response.items);
      setPagination(response.pagination);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load Blog & News forms.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [search, type, status, page]);
  useEffect(() => {
    setPage(1);
  }, [search, type, status]);
  useEffect(() => {
    if (!createOpen && !activationForm && !detailsForm && !previewForm) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCreateOpen(false);
        setActivationForm(null);
        setDetailsForm(null);
        setPreviewForm(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen, activationForm, detailsForm, previewForm]);
  useEffect(() => {
    if (!openActionsId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(`[data-form-actions="${openActionsId}"]`)) {
        setOpenActionsId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenActionsId(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openActionsId]);
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setError("");
    setBusy(true);
    try {
      await action();
      setNotice(success);
      await load();
      return true;
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update this form.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleEditConfiguration = async (formItem: BlogForm) => {
    // Published/active configurations are immutable live versions. Editing
    // them must branch a draft first so Save Draft never tries to mutate the
    // production schema in place.
    if (formItem.status === "draft") {
      router.push(`/blog-form-builder?id=${encodeURIComponent(formItem.id)}`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const draft = await createAdminBlogFormDraft(formItem.id);
      setNotice(`Draft v${draft.version} created from the live configuration.`);
      router.push(`/blog-form-builder?id=${encodeURIComponent(draft.id)}`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to create an editable configuration draft.");
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    if (name.trim().length < 3) {
      setError("Enter a form name with at least 3 characters.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const created = await createAdminBlogForm({
        name: name.trim(),
        type: createType,
        mode: "configurable",
      });
      setCreateOpen(false);
      setName("");
      setNotice("Form created. Continue building its fields.");
      router.push(`/blog-form-builder?id=${encodeURIComponent(created.id)}`);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to create this form.",
      );
    } finally {
      setBusy(false);
    }
  };

  const renderFormActions = (form: BlogForm, isLastRow = false) => (
    <div className="relative" data-form-actions={form.id}>
      <button type="button" aria-label={`Actions for ${form.name}`} title="More actions" aria-haspopup="menu" aria-expanded={openActionsId === form.id} onClick={(event) => {
        if (openActionsId === form.id) {
          setOpenActionsId(null);
          setActionMenuPosition(null);
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        setActionMenuPosition(isLastRow
          ? { left: Math.max(8, rect.right - 190), bottom: Math.max(8, window.innerHeight - rect.top + 6) }
          : { left: Math.max(8, rect.right - 190), top: Math.min(window.innerHeight - 220, rect.bottom + 6) });
        setOpenActionsId(form.id);
      }} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#cfe0d8] text-[#1f6a58] transition hover:border-[#1f6a58] hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
      </button>
      {openActionsId === form.id && (
      <div role="menu" style={actionMenuPosition ?? undefined} className="fixed z-[60] min-w-[190px] rounded-xl border border-[#edf3f0] bg-white py-1.5 shadow-xl ring-1 ring-black/5">
        <button type="button" role="menuitem" onClick={() => { setOpenActionsId(null); setDetailsForm(form); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-[#f4faf7] hover:text-[#175245]"><span aria-hidden="true" className="text-sm text-[#52736a]">◉</span>View</button>
        <button type="button" role="menuitem" onClick={() => { setOpenActionsId(null); setPreviewForm(form); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-[#f4faf7] hover:text-[#175245]"><span aria-hidden="true" className="text-sm text-[#52736a]">▣</span>Preview</button>
        <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenActionsId(null); handleEditConfiguration(form); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-[#f4faf7] hover:text-[#175245] disabled:opacity-50"><span aria-hidden="true" className="text-sm text-[#52736a]">✎</span>{form.status === "draft" ? "Edit" : "Edit configuration"}</button>
        {form.status === "draft" && (
          <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenActionsId(null); setConfirmation({ title: "Publish this form?", message: "Publishing this form will make it available for enterprise assignment and publication.", confirmLabel: "Publish Form", destructive: false, action: () => run(() => publishAdminBlogForm(form.id), "Form published.") }); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-[#175245] transition-colors hover:bg-[#f4faf7] disabled:opacity-50"><span aria-hidden="true" className="text-sm text-[#1f6a58]">✓</span>Publish</button>
        )}
        {form.status === "published" && (
          <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenActionsId(null); setActivationForm(form); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-[#175245] transition-colors hover:bg-[#f4faf7] disabled:opacity-50"><span aria-hidden="true" className="text-sm text-[#1f6a58]">●</span>Activate</button>
        )}
        {form.status === "active" && (
          <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenActionsId(null); setConfirmation({ title: "Deactivate this form?", message: "Enterprises will no longer be able to create new posts with this form configuration.", confirmLabel: "Deactivate Form", destructive: true, action: () => run(() => deactivateAdminBlogForm(form.id), "Form deactivated.") }); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50 disabled:opacity-50"><span aria-hidden="true" className="text-sm text-amber-600">⊘</span>Deactivate</button>
        )}
        {form.status === "inactive" && (
          <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenActionsId(null); setConfirmation({ title: "Activate this form?", message: "Activate this form with its current tenant scope selection.", confirmLabel: "Activate Form", destructive: false, action: () => run(() => activateAdminBlogForm(form.id, form.scope === "selected" ? "selected" : "global", form.tenant_ids ?? []), "Form reactivated.") }); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-[#175245] transition-colors hover:bg-[#f4faf7] disabled:opacity-50"><span aria-hidden="true" className="text-sm text-[#1f6a58]">●</span>Activate</button>
        )}
        {form.status === "draft" && (
          <><div className="my-1 border-t border-[#edf3f0]" /><button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenActionsId(null); setConfirmation({ title: "Delete unused draft form?", message: "This draft configuration will be permanently deleted.", confirmLabel: "Delete Draft", destructive: true, action: () => run(() => deleteAdminBlogForm(form.id), "Draft form deleted.") }); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"><span aria-hidden="true" className="text-sm text-red-500">▢</span>Delete</button></>
        )}
      </div>
      )}
    </div>
  );
  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">
              Content management
            </p>
            <h1 className="mt-1 text-3xl font-bold">Blog &amp; News forms</h1>
            <p className="mt-1 text-sm text-[#52736a]">
              Create and assign the form Enterprise Admins use to publish posts.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError("");
              setCreateOpen(true);
            }}
            className="rounded-xl bg-[#1f6a58] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#175245] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30"
          >
            Create form
          </button>
        </header>
        {!createOpen && error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl border border-[#b6dfce] bg-[#eff8f3] px-4 py-3 text-sm text-[#175245]"
          >
            {notice}
          </p>
        )}
        <div className="rounded-xl border border-[#dfe9e4] bg-[#f8fcfa] px-4 py-3 text-xs text-[#52736a]">
          <p className="font-bold text-[#355a51]">About form configuration lifecycle</p>
          <p className="mt-1">Published configurations are retained for existing posts. Activate a published form separately before Enterprise Admins can use it.</p>
        </div>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search form name"
              className="min-w-[220px] flex-1 rounded-xl border border-[#d7e5df] px-4 py-3 text-sm outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FormType)}
              className="rounded-xl border border-[#d7e5df] bg-white px-3 py-3 text-sm outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            >
              <option value="all">All content types</option>
              <option value="blog">Blog</option>
              <option value="news">News</option>
              <option value="both">Blog &amp; News</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FormStatus)}
              className="rounded-xl border border-[#d7e5df] bg-white px-3 py-3 text-sm outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </section>
        <section className="overflow-x-auto rounded-2xl border border-[#dfe9e4] bg-white shadow-sm">
          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-[#52736a]">Loading forms…</div>
          ) : forms.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#52736a]">No forms found.</div>
          ) : (
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[#f4faf7] text-xs uppercase tracking-[.12em] text-[#52736a]"><tr>
                {['Type', 'Form name', 'Scope', 'Status', 'Version', 'Created at', 'Updated at', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-bold">{heading}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#edf3f0]">
                {forms.map((form) => (
                  <tr key={form.id} className="text-[#355a51] transition-colors hover:bg-[#fbfdfc]">
                    <td className="px-4 py-4 font-semibold text-[#06201c]">{typeLabel(form.type)}</td>
                    <td className="px-4 py-4"><button type="button" onClick={() => setDetailsForm(form)} className="font-bold text-[#06201c] hover:text-[#1f6a58] hover:underline">{form.name}</button><p className="mt-1 text-xs text-[#52736a]">{form.status === "active" ? "Live configuration" : "Configuration"}</p></td>
                    <td className="px-4 py-4">{form.status === "draft" ? "Not assigned" : form.scope === "global" ? "Global" : form.scope === "selected" ? `${form.assigned_count ?? form.tenant_ids?.length ?? 0} tenants` : "Not assigned"}</td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${form.status === "draft" ? "border border-amber-200 bg-amber-50 text-amber-800" : form.status === "published" ? "border border-purple-200 bg-purple-50 text-purple-800" : form.status === "active" ? "bg-[#e8f6ee] text-[#175245]" : "bg-slate-100 text-slate-700"}`}>{statusLabel(form.status)}</span></td>
                    <td className="px-4 py-4">v{form.version}</td>
                    <td className="whitespace-nowrap px-4 py-4">{dateLabel(form.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{dateLabel(form.updated_at)}</td>
                    <td className="px-4 py-4">{renderFormActions(form, form.id === forms[forms.length - 1]?.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <div className="flex items-center justify-between text-sm text-[#52736a]">
          <span>{pagination.total} form{pagination.total === 1 ? "" : "s"} · Page {pagination.page} of {Math.max(pagination.total_pages, 1)}</span>
          <div className="flex gap-2">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-[#d7e5df] px-3 py-2 transition-colors hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30 disabled:opacity-50">Previous</button>
            <button type="button" disabled={loading || page >= pagination.total_pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-2 transition-colors hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
      {detailsForm ? (
        <BlogFormDetailsDialog
          form={detailsForm}
          onClose={() => setDetailsForm(null)}
          onEditConfiguration={handleEditConfiguration}
        />
      ) : null}
      {previewForm ? <BlogFormPreviewDialog form={previewForm} onClose={() => setPreviewForm(null)} /> : null}
      {createOpen && (
        <div onClick={() => setCreateOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4">
          <section
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Create form</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#52736a] transition-colors hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30"
              >
                Close
              </button>
            </div>
            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}
            <label className="mt-5 block text-sm font-medium">
              Form name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-3"
                placeholder="e.g. Enterprise Blog Form"
              />
            </label>
            <div className="mt-4">
              <label className="text-sm font-medium">
                Content type
                <select
                  value={createType}
                  onChange={(e) =>
                    setCreateType(e.target.value as typeof createType)
                  }
                  className="mt-2 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-3"
                >
                  <option value="both">Blog &amp; News</option>
                  <option value="blog">Blog</option>
                  <option value="news">News</option>
                </select>
              </label>
            </div>
            <p className="mt-4 rounded-xl bg-[#f4faf7] px-3 py-2.5 text-xs leading-5 text-[#52736a]">
              Tenant assignment is completed after the form is published.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void create()}
                className="rounded-xl bg-[#1f6a58] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#175245] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30 disabled:opacity-50"
              >
                Continue to builder
              </button>
            </div>
          </section>
        </div>
      )}
      {activationForm && (
        <BlogFormActivationDialog
          form={activationForm}
          onClose={() => setActivationForm(null)}
          onActivated={(updated) => {
            setActivationForm(null);
            setNotice(`Form "${updated.name}" activated successfully.`);
            void load();
            router.push(`/blog-forms?details=${encodeURIComponent(updated.id)}`);
          }}
        />
      )}
    </main>
  );
}
