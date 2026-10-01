"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateEventTaxonomyCategory, useDeleteEventTaxonomyCategory, useEventTaxonomyCategories, useUpdateEventTaxonomyCategory } from "./event-category-taxonomy.queries";
import { EventTaxonomyApiError, type EventTaxonomyCategory, type EventTaxonomyCategoryInput } from "./event-category-taxonomy.service";
import { useCreateTrainingTaxonomyCategory, useDeleteTrainingTaxonomyCategory, useTrainingTaxonomyCategories, useUpdateTrainingTaxonomyCategory } from "./training-category-taxonomy.queries";
import { TrainingTaxonomyApiError, type TrainingTaxonomyCategory } from "./training-category-taxonomy.service";

  type Module = "products-services" | "events" | "trainings";
type TaxonomyCategory = Pick<EventTaxonomyCategory, "id" | "name" | "parent_id" | "description"> & { created_at: string | null };
type Editor = { mode: "create" | "edit"; parent: TaxonomyCategory | null; category?: TaxonomyCategory } | null;
  const modules: Module[] = ["products-services", "events", "trainings"];

function moduleLabel(module: Module, t: (key: string) => string): string { return module === "products-services" ? t("categories.productsServices") : t(`categories.${module}`); }
function kindLabel(category: TaxonomyCategory, t: (key: string) => string): string { return category.parent_id === null ? t("categories.category") : t("categories.subcategory"); }
function errorMessage(error: unknown, fallback: string): string { return error instanceof EventTaxonomyApiError || error instanceof TrainingTaxonomyApiError ? error.message : fallback; }

/** Module-based taxonomy management with independent Event and Training contracts. */
export default function PlatformCategoriesScreen() {
  const { t } = useTranslation("platform");
  const [module, setModule] = useState<Module>("events");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editor, setEditor] = useState<Editor>(null);
  const [deleting, setDeleting] = useState<TaxonomyCategory | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const eventQuery = useEventTaxonomyCategories(module === "events");
  const trainingQuery = useTrainingTaxonomyCategories(module === "trainings");
  const createEvent = useCreateEventTaxonomyCategory();
  const updateEvent = useUpdateEventTaxonomyCategory();
  const deleteEvent = useDeleteEventTaxonomyCategory();
  const createTraining = useCreateTrainingTaxonomyCategory();
  const updateTraining = useUpdateTrainingTaxonomyCategory();
  const deleteTraining = useDeleteTrainingTaxonomyCategory();
  const isTraining = module === "trainings";
  const query = isTraining ? trainingQuery : eventQuery;
  const create = isTraining ? createTraining : createEvent;
  const update = isTraining ? updateTraining : updateEvent;
  const remove = isTraining ? deleteTraining : deleteEvent;
  const pending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending
    || createTraining.isPending || updateTraining.isPending || deleteTraining.isPending;
  const entries: TaxonomyCategory[] = isTraining
    ? (trainingQuery.data ?? []).map((category: TrainingTaxonomyCategory) => category)
    : (eventQuery.data ?? []).map((category: EventTaxonomyCategory) => category);
  const matches = useCallback((entry: TaxonomyCategory) => [entry.name, entry.description ?? ""].some((value) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [search]);
  const parents = useMemo(() => entries.filter((entry) => entry.parent_id === null).filter((parent) => !search.trim() || matches(parent) || entries.some((child) => child.parent_id === parent.id && matches(child))), [entries, matches, search]);
  const childrenFor = (parentId: string) => entries.filter((entry) => entry.parent_id === parentId);
  const save = (input: EventTaxonomyCategoryInput) => {
    if (!editor) return;
    const onSuccess = () => { setSuccess(t("categories.createSuccess")); setEditor(null); };
    if (isTraining) {
      if (editor.mode === "edit" && editor.category) {
        updateTraining.mutate({
          categoryId: editor.category.id,
          input: { name: input.name, description: input.description },
        }, { onSuccess });
      } else {
        createTraining.mutate(input, { onSuccess });
      }
    } else if (editor.mode === "edit" && editor.category) {
      updateEvent.mutate({ categoryId: editor.category.id, input }, { onSuccess });
    } else {
      createEvent.mutate(input, { onSuccess });
    }
  };
  const confirmDelete = () => {
    if (!deleting) return;
    const onSuccess = () => { setSuccess(t("categories.deleteSuccess")); setDeleting(null); };
    if (isTraining) deleteTraining.mutate(deleting.id, { onSuccess });
    else deleteEvent.mutate(deleting.id, { onSuccess });
  };

  return <section className="mx-auto w-full max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#7f9d94]">{t("categories.eyebrow")}</p><h1 className="mt-2 text-3xl font-bold text-[#06201c]">{t("categories.title")}</h1><p className="mt-2 text-sm text-[#52736a]">{t("categories.description")}</p>
    <div role="tablist" aria-label={t("categories.title")} className="mt-7 flex flex-wrap gap-2 border-b border-[#d7e5df]">{modules.map((item) => <button key={item} id={`category-module-${item}`} type="button" role="tab" aria-selected={module === item} onClick={() => { setModule(item); setSearch(""); setSuccess(null); }} className={module === item ? "border-b-2 border-[#1f6a58] -mb-px px-4 py-3 text-sm font-bold text-[#1f6a58]" : "px-4 py-3 text-sm font-bold text-[#52736a] hover:text-[#1f6a58]"}>{moduleLabel(item, t)}</button>)}</div>
    {module !== "events" && module !== "trainings" ? <div role="tabpanel" className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-8 text-center shadow-sm"><p className="font-bold text-[#06201c]">{moduleLabel(module, t)}</p><p className="mt-2 text-sm text-[#52736a]">{t("categories.notConfigured")}</p></div> : <section role="tabpanel" className="mt-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold text-[#06201c]">{moduleLabel(module, t)}</h2><p className="mt-1 text-sm text-[#52736a]">{t(isTraining ? "categories.trainingsDescription" : "categories.eventsDescription")}</p></div><button type="button" onClick={() => { setEditor({ mode: "create", parent: null }); setSuccess(null); }} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white hover:bg-[#175245]">+ {t("categories.addCategory")}</button></div><div className="mt-5 flex max-w-md items-center gap-2"><label className="block flex-1"><span className="sr-only">{t("categories.search")}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("categories.search")} className="h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-4 text-sm outline-none focus:border-[#1f6a58]" /></label>{search ? <button type="button" onClick={() => setSearch("")} className="h-11 shrink-0 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]">{t("categories.clearFilter")}</button> : null}</div>{success ? <p role="status" className="mt-4 rounded-xl bg-[#e9f4ee] px-4 py-3 text-sm font-semibold text-[#1f6a58]">{success}</p> : null}
      {query.isLoading ? <div role="status" className="mt-6 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#edf3f0]" />)}</div> : null}
      {query.isError ? <div className="mt-6 rounded-2xl border border-[#f3d0cb] bg-white p-6"><p role="alert" className="font-semibold text-[#b42318]">{errorMessage(query.error, t(isTraining ? "categories.trainingLoadError" : "categories.loadError"))}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">{t("categories.retry")}</button></div> : null}
      {!query.isLoading && !query.isError && parents.length === 0 ? <div className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-8 text-center shadow-sm"><p className="font-bold text-[#06201c]">{search ? t(isTraining ? "categories.trainingNoMatches" : "categories.noMatches") : t(isTraining ? "categories.trainingEmpty" : "categories.empty")}</p>{!search ? <button type="button" onClick={() => setEditor({ mode: "create", parent: null })} className="mt-4 font-semibold text-[#1f6a58] underline">+ {t("categories.addCategory")}</button> : null}</div> : null}
      {!query.isLoading && !query.isError && parents.length > 0 ? <div className="mt-6 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">{parents.map((parent) => { const children = childrenFor(parent.id); const searching = Boolean(search.trim()); const visibleChildren = searching ? children.filter(matches) : children; const open = expanded[parent.id] ?? (searching ? visibleChildren.length > 0 : true); return <article key={parent.id} className="border-b border-[#edf3f0] last:border-b-0"><div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><button type="button" onClick={() => setExpanded((current) => ({ ...current, [parent.id]: !open }))} aria-label={open ? t("categories.collapse", { name: parent.name }) : t("categories.expand", { name: parent.name })} className="mt-0.5 h-7 w-7 rounded-full text-[#1f6a58] hover:bg-[#e8f6ee]">{open ? "−" : "+"}</button><div className="min-w-0"><h3 className="break-words font-bold text-[#06201c]">{parent.name}</h3>{parent.description ? <p className="mt-1 break-words text-sm text-[#52736a]">{parent.description}</p> : null}<p className="mt-1 text-xs font-semibold text-[#7f9d94]">{children.length} {t("categories.subcategories")}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => setEditor({ mode: "create", parent })} className="h-9 rounded-full border border-[#1f6a58] px-3 text-sm font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-60">+ {t("categories.addSubcategory")}</button><button type="button" disabled={pending} onClick={() => setEditor({ mode: "edit", parent: null, category: parent })} className="h-9 rounded-full border border-[#d7e5df] px-3 text-sm font-bold text-[#31594d] hover:bg-[#eef6f2] disabled:opacity-60">{t("categories.editCategory")}</button><button type="button" disabled={pending} onClick={() => setDeleting(parent)} className="h-9 rounded-full border border-[#f0c6c0] px-3 text-sm font-bold text-[#b42318] hover:bg-[#fff1f0] disabled:opacity-60">{t("categories.delete")}</button></div></div>{open ? <div className="border-t border-[#edf3f0] bg-[#f8fbf9]">{visibleChildren.map((child) => <div key={child.id} className="flex flex-col gap-3 border-b border-[#edf3f0] px-6 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-[#17372f]">{child.name}</p>{child.description ? <p className="mt-1 break-words text-sm text-[#52736a]">{child.description}</p> : null}</div><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => setEditor({ mode: "edit", parent, category: child })} className="rounded px-1 text-sm font-bold text-[#1f6a58] hover:underline disabled:opacity-60">{t("categories.editSubcategory")}</button><button type="button" disabled={pending} onClick={() => setDeleting(child)} className="rounded px-1 text-sm font-bold text-[#b42318] hover:underline disabled:opacity-60">{t("categories.delete")}</button></div></div>)}{visibleChildren.length === 0 && searching ? <p className="px-6 py-3 text-sm text-[#52736a]">{t(isTraining ? "categories.trainingNoMatches" : "categories.noMatches")}</p> : null}</div> : null}</article>; })}</div> : null}
    </section>}
    {editor ? <CategoryEditor editor={editor} pending={create.isPending || update.isPending} error={create.error ?? update.error} fallback={t(isTraining ? "categories.trainingMutationError" : "categories.mutationError")} onClose={() => !pending && setEditor(null)} onSave={save} /> : null}{deleting ? <DeleteDialog category={deleting} pending={remove.isPending} error={remove.error} fallback={t(isTraining ? "categories.trainingDeleteError" : "categories.deleteError")} onCancel={() => !remove.isPending && setDeleting(null)} onConfirm={confirmDelete} /> : null}
  </section>;
}

function CategoryEditor({ editor, pending, error, fallback, onClose, onSave }: { editor: Exclude<Editor, null>; pending: boolean; error: unknown; fallback: string; onClose: () => void; onSave: (input: EventTaxonomyCategoryInput) => void }) { const { t } = useTranslation("platform"); const category = editor.category; const [name, setName] = useState(category?.name ?? ""); const [description, setDescription] = useState(category?.description ?? ""); const child = editor.parent !== null || Boolean(category?.parent_id); const parentId = editor.parent?.id ?? category?.parent_id ?? null; const title = editor.mode === "edit" ? child ? t("categories.editSubcategory") : t("categories.editCategory") : child ? t("categories.addSubcategory") : t("categories.addCategory"); return <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 sm:items-center sm:justify-center sm:p-5" role="presentation"><form role="dialog" aria-modal="true" aria-labelledby="taxonomy-editor-title" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave({ name: name.trim(), parent_id: parentId, description: description.trim() || null }); }} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="taxonomy-editor-title" className="text-lg font-bold text-[#06201c]">{title}</h2><label className="mt-5 block text-sm font-bold text-[#06201c]">{t("categories.nameField")} *<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 outline-none focus:border-[#1f6a58]" /></label><label className="mt-4 block text-sm font-bold text-[#06201c]">{t("categories.descriptionField")}<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 h-24 w-full resize-y rounded-xl border border-[#d7e5df] p-3 outline-none focus:border-[#1f6a58]" /></label>{error ? <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">{errorMessage(error, fallback)}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={onClose} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7] disabled:opacity-60">{t("categories.cancel")}</button><button type="submit" disabled={pending || !name.trim()} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white hover:bg-[#195646] disabled:opacity-60">{editor.mode === "edit" ? t("categories.save") : t("categories.create")}</button></div></form></div>; }
function DeleteDialog({ category, pending, error, fallback, onCancel, onConfirm }: { category: TaxonomyCategory; pending: boolean; error: unknown; fallback: string; onCancel: () => void; onConfirm: () => void }) { const { t } = useTranslation("platform"); return <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 sm:items-center sm:justify-center sm:p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="taxonomy-delete-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="taxonomy-delete-title" className="text-lg font-bold text-[#06201c]">{t("categories.deleteTitle", { kind: kindLabel(category, t) })}</h2><p className="mt-2 text-sm text-[#52736a]">{t("categories.deleteDescription", { name: category.name })}</p>{error ? <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">{errorMessage(error, fallback)}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={onCancel} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7] disabled:opacity-60">{t("categories.cancel")}</button><button type="button" disabled={pending} onClick={onConfirm} className="h-10 rounded-full bg-[#b42318] px-4 text-sm font-bold text-white hover:bg-[#912018] disabled:opacity-60">{t("categories.delete")}</button></div></div></div>; }
