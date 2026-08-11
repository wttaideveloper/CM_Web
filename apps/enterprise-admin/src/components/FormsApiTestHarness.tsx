"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import {
  addSkuField,
  createForm,
  createTestFormDefinition,
  getForm,
  getFormVersions,
  listForms,
  publishForm,
  type Form,
  updateForm,
} from "@/services/forms.service";

const formsQueryKey = ["forms"] as const;
const formQueryKey = (formId: string) => ["form", formId] as const;
const formVersionsQueryKey = (formId: string) => ["formVersions", formId] as const;

function fieldCount(form: Form): number {
  return form.fieldCount ?? form.definition?.sections.reduce((count, section) => count + section.fields.length, 0) ?? 0;
}

function formError(error: Error | null): string | null {
  return error ? error.message : null;
}

function statusLabel(form: Form): string {
  return form.isPublished ? "Published" : "Draft";
}

// TEMPORARY FORMS API TEST HARNESS
export default function FormsApiTestHarness() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("Enterprise API test form");
  const [description, setDescription] = useState("Temporary Forms API test harness form.");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [versionsRequested, setVersionsRequested] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [skuResult, setSkuResult] = useState<string | null>(null);

  const formsQuery = useQuery({ queryKey: formsQueryKey, queryFn: listForms });
  const formQuery = useQuery({
    queryKey: selectedFormId ? formQueryKey(selectedFormId) : ["form", "none"],
    queryFn: () => getForm(selectedFormId ?? ""),
    enabled: Boolean(selectedFormId),
  });
  const versionsQuery = useQuery({
    queryKey: selectedFormId ? formVersionsQueryKey(selectedFormId) : ["formVersions", "none"],
    queryFn: () => getFormVersions(selectedFormId ?? ""),
    enabled: Boolean(selectedFormId && versionsRequested),
  });

  const createMutation = useMutation({
    mutationFn: () => createForm({ name, description, definition: createTestFormDefinition() }),
    onSuccess: async (form) => {
      setSelectedFormId(form.id);
      setVersionsRequested(false);
      setResult(`Created form ${form.id}.`);
      await queryClient.invalidateQueries({ queryKey: formsQueryKey });
    },
  });
  const skuMutation = useMutation({
    mutationFn: async () => {
      if (!formQuery.data?.definition) throw new Error("The selected form has no definition to update.");
      return updateForm(formQuery.data.id, {
        name: formQuery.data.name,
        description: formQuery.data.description ?? "",
        definition: addSkuField(formQuery.data.definition),
      });
    },
    onSuccess: async (form) => {
      await queryClient.invalidateQueries({ queryKey: formsQueryKey });
      const reloaded = await queryClient.fetchQuery({
        queryKey: formQueryKey(form.id),
        queryFn: () => getForm(form.id),
      });
      const skuFound = reloaded.definition?.sections.some((section) =>
        section.fields.some((field) => field.field_key === "sku"),
      );
      setSkuResult(skuFound ? "SKU was confirmed in the refetched backend definition." : "SKU was not found after refetch.");
    },
  });
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!formQuery.data) throw new Error("Select a form before publishing.");
      await publishForm(formQuery.data.id);
      return queryClient.fetchQuery({
        queryKey: formQueryKey(formQuery.data.id),
        queryFn: () => getForm(formQuery.data.id),
      });
    },
    onSuccess: async (form) => {
      await queryClient.invalidateQueries({ queryKey: formsQueryKey });
      setResult(`Refetched published state: isPublished=${String(form.isPublished)}, version=${String(form.version)}.`);
    },
  });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setSkuResult(null);
    createMutation.mutate();
  }

  const selectedForm = formQuery.data;
  const operationError = formError(createMutation.error) ?? formError(skuMutation.error) ?? formError(publishMutation.error);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 text-[#183b34]">
      <header>
        <p className="text-sm font-semibold text-[#1f5d4e]">Temporary developer-only page</p>
        <h1 className="text-2xl font-bold">Forms API Test Harness</h1>
        <p className="mt-1 text-sm text-[#64756f]">Uses the authenticated Enterprise Admin browser session.</p>
      </header>

      <section className="rounded-xl border border-[#d9e5e0] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold">Current Forms</h2><p className="text-sm text-[#64756f]">GET /api/v1/forms</p></div>
          <button className="rounded bg-[#1f5d4e] px-3 py-2 text-sm font-semibold text-white" onClick={() => void formsQuery.refetch()}>Refresh</button>
        </div>
        {formsQuery.isLoading ? <p className="mt-4 text-sm">Loading forms…</p> : null}
        {formsQuery.error ? <p className="mt-4 text-sm text-red-700" role="alert">{formError(formsQuery.error)}</p> : null}
        {formsQuery.data?.length === 0 ? <p className="mt-4 text-sm text-[#64756f]">No forms returned.</p> : null}
        <div className="mt-4 grid gap-2">
          {formsQuery.data?.map((form) => <button key={form.id} className="rounded border border-[#d9e5e0] p-3 text-left text-sm hover:bg-[#f4f8f6]" onClick={() => { setSelectedFormId(form.id); setVersionsRequested(false); setSkuResult(null); }}>
            <span className="font-semibold">{form.name}</span> · {statusLabel(form)} · v{form.version ?? "—"} · {fieldCount(form)} fields
            <span className="block text-[#64756f]">{form.description ?? "No description"} · {form.id}</span>
          </button>)}
        </div>
      </section>

      <section className="rounded-xl border border-[#d9e5e0] bg-white p-5 shadow-sm">
        <h2 className="font-bold">Create test form</h2>
        <p className="mt-1 text-sm text-[#64756f]">POST /api/v1/forms with Product Name, Description, and Price fields.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submitCreate}>
          <label className="grid gap-1 text-sm font-medium">Name<input className="rounded border border-[#b9cac4] p-2" value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label className="grid gap-1 text-sm font-medium">Description<input className="rounded border border-[#b9cac4] p-2" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <button className="w-fit rounded bg-[#1f5d4e] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? "Creating…" : "Create test form"}</button>
        </form>
      </section>

      <section className="rounded-xl border border-[#d9e5e0] bg-white p-5 shadow-sm">
        <h2 className="font-bold">Selected form</h2>
        {!selectedFormId ? <p className="mt-3 text-sm text-[#64756f]">Select a form above to inspect it.</p> : null}
        {formQuery.isLoading ? <p className="mt-3 text-sm">Loading selected form…</p> : null}
        {formQuery.error ? <p className="mt-3 text-sm text-red-700" role="alert">{formError(formQuery.error)}</p> : null}
        {selectedForm ? <div className="mt-3 space-y-3 text-sm"><p><strong>{selectedForm.name}</strong> · {statusLabel(selectedForm)} · v{selectedForm.version ?? "—"} · {fieldCount(selectedForm)} fields</p><pre className="overflow-auto rounded bg-[#f4f8f6] p-3 text-xs">{JSON.stringify(selectedForm.definition ?? null, null, 2)}</pre><div className="flex flex-wrap gap-2"><button className="rounded border border-[#1f5d4e] px-3 py-2 font-semibold text-[#1f5d4e] disabled:opacity-60" disabled={skuMutation.isPending || !selectedForm.definition} onClick={() => { setSkuResult(null); skuMutation.mutate(); }}>Add Test Field: SKU</button><button className="rounded bg-[#1f5d4e] px-3 py-2 font-semibold text-white disabled:opacity-60" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>{publishMutation.isPending ? "Publishing…" : "Publish"}</button><button className="rounded border border-[#1f5d4e] px-3 py-2 font-semibold text-[#1f5d4e]" onClick={() => setVersionsRequested(true)}>Load versions</button></div></div> : null}
        {skuResult ? <p className="mt-3 text-sm" role="status">{skuResult}</p> : null}
        {result ? <p className="mt-3 text-sm" role="status">{result}</p> : null}
        {operationError ? <p className="mt-3 text-sm text-red-700" role="alert">{operationError}</p> : null}
        {versionsRequested && versionsQuery.isLoading ? <p className="mt-3 text-sm">Loading versions…</p> : null}
        {versionsQuery.error ? <p className="mt-3 text-sm text-red-700" role="alert">{formError(versionsQuery.error)}</p> : null}
        {versionsQuery.data ? <div className="mt-3"><h3 className="font-semibold">Versions</h3>{versionsQuery.data.length === 0 ? <p className="mt-1 text-sm text-[#64756f]">No versions returned.</p> : <ul className="mt-2 space-y-1 text-sm">{versionsQuery.data.map((version) => <li key={version.id ?? version.version}>Version {version.version} · {version.fieldCount ?? 0} fields · {version.publishedAt ?? "Not published"}</li>)}</ul>}</div> : null}
      </section>
    </main>
  );
}
