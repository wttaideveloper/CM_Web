"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { buildLinearWorkflowGraph, createWorkflowLocalId, type LinearWorkflowGraph, type WorkflowForm, type WorkflowFormReferenceNode } from "@ihp/workflow-runtime";
import { FormPicker } from "./FormPicker";
import { WorkspaceCard } from "./WorkspacePrimitives";

function SortableStep({ node, index, form, onRemove }: { node: WorkflowFormReferenceNode; index: number; form?: WorkflowForm; onRemove: () => void }) {
  const sortable = useSortable({ id: node.id }); const { attributes, listeners, setNodeRef, transform, transition } = sortable;
  return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-xl border border-[#e1ebe6] bg-[#fbfdfc] p-3"><div className="flex items-center gap-2"><button type="button" {...attributes} {...listeners} aria-label={`Reorder Form step ${index + 1}`} className="cursor-grab rounded px-2 py-1 text-xs font-bold text-[#52736a]">↕</button><div className="min-w-0 flex-1"><p className="font-semibold text-[#16332b]">{index + 1}. {form?.name ?? "Referenced Form"}</p><p className="break-all text-xs text-[#52736a]">{node.data.formId}</p>{form ? <p className="mt-1 text-xs text-[#167550]">Published · {form.fieldCount} fields</p> : <p className="mt-1 text-xs text-[#8b5b17]">Form details are not present in the current library response.</p>}</div><button type="button" onClick={onRemove} className="text-sm font-semibold text-[#b42318]">Remove</button></div></article>;
}

/** Safely edits the documented linear start → form_ref graph while preserving stable step IDs. */
export function WorkflowComposer({ graph, forms, onChange }: { graph: LinearWorkflowGraph; forms: WorkflowForm[]; onChange: (graph: LinearWorkflowGraph) => void }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })); const [start, ...steps] = graph.nodes;
  const onDragEnd = ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; const from = steps.findIndex((step) => step.id === active.id); const to = steps.findIndex((step) => step.id === over.id); if (from < 0 || to < 0) return; const next = [...steps]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); onChange(buildLinearWorkflowGraph(start, next, graph)); };
  const addForm = (form: WorkflowForm) => onChange(buildLinearWorkflowGraph(start, [...steps, { id: createWorkflowLocalId("step"), type: "form_ref", data: { formId: form.id } }], graph));
  return <div className="space-y-4"><WorkspaceCard title="Linear Composer"><p className="text-sm text-[#52736a]">START</p><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}><div className="mt-3 space-y-2">{steps.map((step, index) => <SortableStep key={step.id} node={step} index={index} form={forms.find((form) => form.id === step.data.formId)} onRemove={() => onChange(buildLinearWorkflowGraph(start, steps.filter((candidate) => candidate.id !== step.id), graph))} />)}</div></SortableContext></DndContext>{steps.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-[#d7e5df] p-4 text-center text-sm text-[#52736a]">Add a published Form to create the first workflow step.</p> : null}</WorkspaceCard><FormPicker selectedFormId={null} onSelect={addForm} /></div>;
}
