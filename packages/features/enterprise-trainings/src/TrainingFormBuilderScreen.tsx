"use client";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { activateTrainingFormConfig, assignTrainingFormConfig, createEmptyField, createEmptySection, createTrainingFormConfig, deactivateTrainingFormConfig, getTrainingFormConfig, listTrainingFormConfigs, publishTrainingFormConfig, updateTrainingFormConfig, type TrainingFormConfig, type TrainingFormField, type TrainingFormSection } from "./training-form-config.service";

const inputClass = "mt-1.5 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]";

function TrainingFormBuilderContent() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["training-form-configs"], queryFn: listTrainingFormConfigs });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailQ = useQuery({ queryKey: ["training-form-config", selectedId], queryFn: () => getTrainingFormConfig(selectedId!), enabled: !!selectedId });

  const [draft, setDraft] = useState<TrainingFormConfig | null>(null);
  const cfg: TrainingFormConfig | null = draft ?? detailQ.data ?? null;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!cfg) throw new Error("No config");
      try {
        if (selectedId) return await updateTrainingFormConfig(selectedId, { title: cfg.title, description: cfg.description, is_global: cfg.is_global, enterprise_ids: cfg.enterprise_ids, sections: cfg.sections });
        return await createTrainingFormConfig({ title: cfg.title, description: cfg.description, is_global: cfg.is_global, enterprise_ids: cfg.enterprise_ids, sections: cfg.sections });
      } catch (e) {
        if ((e as { status?: number })?.status === 404) throw new Error('Backend 404 — {"detail":"Not Found"}: /trainings/form-configuration not yet deployed (events has it). UI is ready; backend will wire it. Your draft is kept locally.');
        throw e;
      }
    },
    onSuccess: async (saved) => { await qc.invalidateQueries({ queryKey: ["training-form-configs"] }); setSelectedId(saved.id); setDraft(null); },
    onError: (e) => alert((e as Error).message),
  });

  const startNew = () => {
    setSelectedId(null);
    setDraft({ id: "new", title: "New Training Form", description: "", status: "draft", is_global: true, enterprise_ids: [], sections: [createEmptySection(0)], created_at: null, updated_at: null });
  };
  const load = (id: string) => { setSelectedId(id); setDraft(null); };
  const updateCfg = (patch: Partial<TrainingFormConfig>) => setDraft((c) => ({ ...(c ?? detailQ.data!), ...patch } as TrainingFormConfig));

  const moveSection = (idx: number, dir: -1 | 1) => {
    if (!cfg) return;
    const next = [...cfg.sections]; const j = idx + dir; if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]]; next.forEach((s, i) => (s.order = i));
    updateCfg({ sections: next });
  };
  const moveField = (sIdx: number, fIdx: number, dir: -1 | 1) => {
    if (!cfg) return;
    const next = [...cfg.sections]; const fields = [...next[sIdx].fields]; const j = fIdx + dir; if (j < 0 || j >= fields.length) return;
    [fields[fIdx], fields[j]] = [fields[j], fields[fIdx]]; fields.forEach((f, i) => (f.order = i)); next[sIdx] = { ...next[sIdx], fields };
    updateCfg({ sections: next });
  };

  if (listQ.isError && (listQ.error as { status?: number })?.status !== 404) return <div className="rounded-xl border border-[#f3d0cb] bg-[#fff6f5] p-4 text-sm text-[#b42318]">{(listQ.error as Error).message} — retry.</div>;

  return (
    <div className="w-full">
      <header className="border-b border-[#edf3f0] pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">Super Admin — Training Form Builder</p>
        <h1 className="mt-1 text-2xl font-bold text-[#06201c]">Training Forms — Global or Enterprise-assigned</h1>
        <p className="mt-1 text-sm text-[#52736a]">Create once, assign globally or to selected enterprises. Enterprise Create Training will use the active form (selective → global → static fallback). Sections & fields are reorderable, renameable, typed.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={startNew} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white">+ New Form</button>
          <button type="button" onClick={() => saveMut.mutate()} disabled={!cfg || saveMut.isPending} className="h-9 rounded-full border border-[#d7e5df] px-4 text-xs font-bold text-[#52736a] disabled:opacity-50">{saveMut.isPending ? "Saving..." : selectedId ? "Save Changes" : "Create Form"}</button>
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-[#e1ebe6] bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Existing forms</p>
          {listQ.isLoading ? <p className="mt-2 text-xs text-[#52736a]">Loading...</p> : (listQ.data ?? []).length === 0 ? <p className="mt-2 text-xs text-[#7f9d94]">No forms yet — create one. Maps to TrainingCreate via custom_values.</p> : (listQ.data ?? []).map((f) => (
            <button key={f.id} type="button" onClick={() => load(f.id)} className={`mt-2 block w-full rounded-lg border px-3 py-2 text-left text-xs ${selectedId === f.id ? "border-[#1f6a58] bg-[#e8f6ee]" : "border-[#e1ebe6] hover:bg-[#f9fcfa]"}`}>
              <span className="font-bold text-[#06201c]">{f.title}</span> <span className="ml-2 rounded bg-[#f1f4f3] px-1.5 py-0.5 text-[10px]">{f.status}</span>
              <span className="block text-[11px] text-[#7f9d94]">{f.is_global ? "Global" : `${f.enterprise_ids.length} enterprises`} · {f.sections.length} sections</span>
            </button>
          ))}
        </aside>

        {!cfg ? <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-8 text-center text-sm text-[#52736a]">Select or create a form. Super Admin can reorder sections/fields (↑↓), rename, change type, mark required — values map to TrainingCreate keys on Enterprise side.</div> : (
          <main className="rounded-xl border border-[#e1ebe6] bg-white p-4 space-y-4">
            <label className="block text-xs font-semibold text-[#06201c]">Form title<input value={cfg.title} onChange={(e) => updateCfg({ title: e.target.value })} className={inputClass} /></label>
            <label className="block text-xs font-semibold text-[#06201c]">Description<textarea value={cfg.description ?? ""} onChange={(e) => updateCfg({ description: e.target.value })} rows={2} className={`${inputClass} h-auto py-2`} /></label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={cfg.is_global} onChange={(e) => updateCfg({ is_global: e.target.checked, enterprise_ids: e.target.checked ? [] : cfg.enterprise_ids })} /> Global (all enterprises)</label>
            {!cfg.is_global ? <label className="block text-xs font-semibold text-[#06201c]">Enterprise IDs (comma-separated)<input value={cfg.enterprise_ids.join(", ")} onChange={(e) => updateCfg({ enterprise_ids: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="uuid1, uuid2" className={inputClass} /></label> : null}

            <div className="flex items-center justify-between border-t border-[#edf3f0] pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#06201c]">Sections & Fields — reorderable</p>
              <button type="button" onClick={() => updateCfg({ sections: [...cfg.sections, createEmptySection(cfg.sections.length)] })} className="text-xs font-bold text-[#1f6a58]">+ Add section</button>
            </div>

            {cfg.sections.map((sec, sIdx) => (
              <section key={sec.id} className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3">
                <div className="flex gap-2">
                  <input value={sec.title} onChange={(e) => { const next = [...cfg.sections]; next[sIdx] = { ...sec, title: e.target.value }; updateCfg({ sections: next }); }} className={`${inputClass} flex-1`} placeholder="Section title" />
                  <button type="button" onClick={() => moveSection(sIdx, -1)} className="h-9 w-9 rounded border border-[#d7e5df] text-xs">↑</button>
                  <button type="button" onClick={() => moveSection(sIdx, 1)} className="h-9 w-9 rounded border border-[#d7e5df] text-xs">↓</button>
                  <button type="button" onClick={() => updateCfg({ sections: cfg.sections.filter((_, i) => i !== sIdx) })} className="h-9 rounded px-2 text-xs font-bold text-[#b42318]">Remove</button>
                </div>
                <input value={sec.description ?? ""} onChange={(e) => { const next = [...cfg.sections]; next[sIdx] = { ...sec, description: e.target.value }; updateCfg({ sections: next }); }} className={inputClass} placeholder="Section description" />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#52736a]">{sec.fields.length} fields</span>
                  <button type="button" onClick={() => { const next = [...cfg.sections]; next[sIdx] = { ...sec, fields: [...sec.fields, createEmptyField(sec.fields.length)] }; updateCfg({ sections: next }); }} className="text-xs font-bold text-[#1f6a58]">+ Add field</button>
                </div>
                {sec.fields.map((fld, fIdx) => (
                  <div key={fld.id} className="mt-2 grid grid-cols-[1fr_110px_90px_auto] gap-1 rounded-lg border border-[#e1ebe6] bg-white p-2">
                    <input value={fld.label} onChange={(e) => { const next = [...cfg.sections]; const fs = [...next[sIdx].fields]; fs[fIdx] = { ...fld, label: e.target.value }; next[sIdx] = { ...next[sIdx], fields: fs }; updateCfg({ sections: next }); }} className={inputClass} placeholder="Label" />
                    <input value={fld.key} onChange={(e) => { const next = [...cfg.sections]; const fs = [...next[sIdx].fields]; fs[fIdx] = { ...fld, key: e.target.value }; next[sIdx] = { ...next[sIdx], fields: fs }; updateCfg({ sections: next }); }} className={inputClass} placeholder="key e.g. title" />
                    <select value={fld.type} onChange={(e) => { const next = [...cfg.sections]; const fs = [...next[sIdx].fields]; fs[fIdx] = { ...fld, type: e.target.value as TrainingFormField["type"] }; next[sIdx] = { ...next[sIdx], fields: fs }; updateCfg({ sections: next }); }} className={inputClass}>
                      <option value="text">text</option><option value="textarea">textarea</option><option value="select">select</option><option value="number">number</option><option value="date">date</option><option value="url">url</option><option value="checkbox">checkbox</option>
                    </select>
                    <span className="flex items-center gap-1">
                      <button type="button" onClick={() => moveField(sIdx, fIdx, -1)} className="h-7 w-7 rounded border text-xs">↑</button>
                      <button type="button" onClick={() => moveField(sIdx, fIdx, 1)} className="h-7 w-7 rounded border text-xs">↓</button>
                      <label className="ml-1 flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!fld.required} onChange={(e) => { const next = [...cfg.sections]; const fs = [...next[sIdx].fields]; fs[fIdx] = { ...fld, required: e.target.checked }; next[sIdx] = { ...next[sIdx], fields: fs }; updateCfg({ sections: next }); }} /> Req</label>
                      <button type="button" onClick={() => { const next = [...cfg.sections]; next[sIdx] = { ...next[sIdx], fields: next[sIdx].fields.filter((_, i) => i !== fIdx) }; updateCfg({ sections: next }); }} className="ml-1 text-xs font-bold text-[#b42318]">×</button>
                    </span>
                    {fld.type === "select" ? <input value={(fld.options ?? []).join(", ")} onChange={(e) => { const next = [...cfg.sections]; const fs = [...next[sIdx].fields]; fs[fIdx] = { ...fld, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }; next[sIdx] = { ...next[sIdx], fields: fs }; updateCfg({ sections: next }); }} placeholder="options, comma-separated" className={`${inputClass} col-span-4`} /> : null}
                  </div>
                ))}
              </section>
            ))}

            {selectedId ? (
              <div className="flex flex-wrap gap-2 border-t border-[#edf3f0] pt-3">
                <button type="button" onClick={async () => { await publishTrainingFormConfig(selectedId); }} className="h-9 rounded-full border border-[#d9a24a] bg-[#fffaf0] px-4 text-xs font-bold text-[#8a5a00]">Publish</button>
                <button type="button" onClick={async () => { await activateTrainingFormConfig(selectedId); }} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white">Activate</button>
                <button type="button" onClick={async () => { await deactivateTrainingFormConfig(selectedId); }} className="h-9 rounded-full border border-[#d7e5df] px-4 text-xs font-bold text-[#52736a]">Deactivate</button>
              </div>
            ) : null}
            <p className="text-[11px] text-[#7f9d94]">Enterprise Create Training reads <code>GET /trainings/form-configuration/active</code> (selective → global → static fallback) and maps field <code>key</code>s to <code>TrainingCreate</code> + <code>custom_values</code>. Backend needs to add trainings form-config routes (mirrors events). Until then this builder saves to admin routes and falls back gracefully on 404.</p>
          </main>
        )}
      </div>
    </div>
  );
}

/** Self-contained provider — works on platform routes where shell has no QueryClient (PlatformProviders only has AuthProvider, enterprise routes get it via TenantContext). */
export default function TrainingFormBuilderScreen() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={client}>
      <TrainingFormBuilderContent />
    </QueryClientProvider>
  );
}
