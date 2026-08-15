import type { JsonObject, JsonValue } from "./types";

/** Canonical field types supported by the Workflow Forms API visual builder. */
export const supportedFormFieldTypes = ["text", "textarea", "email", "number", "date", "radio", "dropdown", "multiselect", "photo", "signature", "audio", "video", "file"] as const;

/** Canonical field type supported by the Workflow Forms API visual builder. */
export type SupportedFormFieldType = (typeof supportedFormFieldTypes)[number];

/** A documented form field while retaining unknown backend properties. */
export type WorkflowFormDefinitionField = JsonObject & {
  id: string;
  label: string;
  type: SupportedFormFieldType;
  required: boolean;
  options: string[];
};

/** The documented form definition while retaining unknown backend properties. */
export type WorkflowFormDefinition = JsonObject & {
  title: string;
  fields: WorkflowFormDefinitionField[];
};

/** A canonical linear workflow form reference node with backend metadata retained. */
export type WorkflowFormReferenceNode = {
  [key: string]: JsonValue;
  id: string;
  type: "form_ref";
  data: { [key: string]: JsonValue; formId: string };
};

/** A canonical workflow start node with backend metadata retained. */
export type WorkflowStartNode = { [key: string]: JsonValue; id: string; type: "start" };

/** A canonical workflow edge with backend metadata retained. */
export type WorkflowEdge = { [key: string]: JsonValue; source: string; target: string };

/** A safely editable linear workflow graph with backend metadata retained. */
export type LinearWorkflowGraph = {
  [key: string]: JsonValue;
  nodes: [WorkflowStartNode, ...WorkflowFormReferenceNode[]];
  edges: WorkflowEdge[];
};

const choiceFieldTypes = new Set<SupportedFormFieldType>(["radio", "dropdown", "multiselect"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonObject(value: Record<string, unknown>): JsonObject {
  return value as JsonObject;
}

/** Returns whether a canonical field type supports option values. */
export function isChoiceFieldType(type: SupportedFormFieldType): boolean {
  return choiceFieldTypes.has(type);
}

/** Generates a stable client-side field or step ID without using array order. */
export function createWorkflowLocalId(prefix: "field" | "step"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Creates a documented empty form definition. */
export function createEmptyWorkflowFormDefinition(): WorkflowFormDefinition {
  return { title: "Untitled form", fields: [] };
}

/** Creates a documented default field without adding undocumented properties. */
export function createWorkflowFormField(): WorkflowFormDefinitionField {
  return { id: createWorkflowLocalId("field"), label: "New field", type: "text", required: false, options: [] };
}

/** Parses a definition only when it safely supports the documented visual builder shape. */
export function parseWorkflowFormDefinition(value: unknown): { definition: WorkflowFormDefinition | null; error: string | null } {
  if (!isRecord(value) || typeof value.title !== "string" || !Array.isArray(value.fields)) return { definition: null, error: "This definition contains unsupported/custom structure. Use Raw JSON mode to edit it." };
  const fields: WorkflowFormDefinitionField[] = [];
  for (const field of value.fields) {
    if (!isRecord(field) || typeof field.id !== "string" || typeof field.label !== "string" || typeof field.type !== "string" || !supportedFormFieldTypes.includes(field.type as SupportedFormFieldType) || typeof field.required !== "boolean" || !Array.isArray(field.options) || !field.options.every((option) => typeof option === "string")) return { definition: null, error: "This definition contains unsupported/custom structure. Use Raw JSON mode to edit it." };
    fields.push({ ...toJsonObject(field), id: field.id, label: field.label, type: field.type as SupportedFormFieldType, required: field.required, options: [...field.options] });
  }
  return { definition: { ...toJsonObject(value), title: value.title, fields }, error: null };
}

/** Validates a documented form definition before a save or publish mutation. */
export function validateWorkflowFormDefinition(definition: WorkflowFormDefinition, forPublish = false): string | null {
  if (!definition.title.trim()) return "Definition title is required.";
  if (forPublish && definition.fields.length === 0) return "Publishing requires at least one field.";
  const fieldIds = new Set<string>();
  for (const field of definition.fields) {
    if (!field.id.trim()) return "Every field requires an ID.";
    if (fieldIds.has(field.id)) return `Duplicate field ID: ${field.id}.`;
    fieldIds.add(field.id);
    if (!field.label.trim()) return "Every field requires a label.";
    if (!supportedFormFieldTypes.includes(field.type)) return `Unsupported field type: ${field.type}.`;
    if (isChoiceFieldType(field.type) && field.options.every((option) => !option.trim())) return `${field.label || "Choice field"} requires at least one option.`;
  }
  return null;
}

/** Reorders a field array without changing stable field IDs or unknown properties. */
export function reorderWorkflowFormFields(fields: WorkflowFormDefinitionField[], fromIndex: number, toIndex: number): WorkflowFormDefinitionField[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= fields.length || toIndex >= fields.length) return fields;
  const next = [...fields]; const [moved] = next.splice(fromIndex, 1); next.splice(toIndex, 0, moved); return next;
}

/** Returns a cloned field with canonical option semantics while preserving unknown properties. */
export function updateWorkflowFormField(field: WorkflowFormDefinitionField, changes: Partial<Pick<WorkflowFormDefinitionField, "label" | "type" | "required" | "options">>): WorkflowFormDefinitionField {
  const type = changes.type ?? field.type;
  return { ...field, ...changes, type, options: isChoiceFieldType(type) ? [...(changes.options ?? field.options)] : [] };
}

/** Parses a metadata-tolerant linear graph without flattening advanced topology. */
export function parseLinearWorkflowGraph(value: unknown): { graph: LinearWorkflowGraph | null; error: string | null } {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." };
  const nodes = value.nodes; const edges = value.edges;
  if (nodes.length === 0) return { graph: { ...toJsonObject(value), nodes: [{ id: "start-1", type: "start" }], edges: [] } as LinearWorkflowGraph, error: null };
  const nodeById = new Map<string, Record<string, unknown>>(); let startNode: WorkflowStartNode | null = null;
  for (const node of nodes) {
    if (!isRecord(node) || typeof node.id !== "string" || !node.id.trim() || nodeById.has(node.id)) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." };
    if (node.type === "start") { if (startNode) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." }; startNode = node as WorkflowStartNode; }
    else if (node.type !== "form_ref" || !isRecord(node.data) || typeof node.data.formId !== "string" || !node.data.formId.trim()) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." };
    nodeById.set(node.id, node);
  }
  if (!startNode || edges.length !== nodes.length - 1) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." };
  const outgoing = new Map<string, WorkflowEdge[]>(); const incoming = new Map<string, WorkflowEdge[]>(); const parsedEdges: WorkflowEdge[] = [];
  for (const edge of edges) {
    if (!isRecord(edge) || typeof edge.source !== "string" || typeof edge.target !== "string" || !nodeById.has(edge.source) || !nodeById.has(edge.target)) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." };
    const parsedEdge = edge as WorkflowEdge; parsedEdges.push(parsedEdge); outgoing.set(parsedEdge.source, [...(outgoing.get(parsedEdge.source) ?? []), parsedEdge]); incoming.set(parsedEdge.target, [...(incoming.get(parsedEdge.target) ?? []), parsedEdge]);
  }
  for (const [nodeId, node] of nodeById) {
    const incomingCount = incoming.get(nodeId)?.length ?? 0; const outgoingCount = outgoing.get(nodeId)?.length ?? 0;
    if ((node.type === "start" && incomingCount !== 0) || (node.type !== "start" && incomingCount !== 1) || outgoingCount > 1) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." };
  }
  const orderedIds: string[] = []; const visited = new Set<string>(); let currentId: string | null = startNode.id;
  while (currentId) { if (visited.has(currentId)) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." }; visited.add(currentId); orderedIds.push(currentId); currentId = outgoing.get(currentId)?.[0]?.target ?? null; }
  if (visited.size !== nodes.length) return { graph: null, error: "This workflow contains an advanced graph that cannot be safely edited with the Linear Composer. Use Raw JSON mode." };
  const orderedReferences = orderedIds.slice(1).map((nodeId) => nodeById.get(nodeId) as WorkflowFormReferenceNode);
  return { graph: { ...toJsonObject(value), nodes: [startNode, ...orderedReferences], edges: parsedEdges } as LinearWorkflowGraph, error: null };
}

/** Builds canonical linear graph edges, retaining matching backend edge metadata when supplied. */
export function buildLinearWorkflowGraph(start: WorkflowStartNode, steps: WorkflowFormReferenceNode[], previousGraph?: LinearWorkflowGraph): LinearWorkflowGraph {
  const nodes: [WorkflowStartNode, ...WorkflowFormReferenceNode[]] = [start, ...steps];
  const previousEdges = new Map((previousGraph?.edges ?? []).map((edge) => [`${edge.source}\u0000${edge.target}`, edge]));
  return { ...previousGraph, nodes, edges: nodes.slice(1).map((node, index) => previousEdges.get(`${nodes[index].id}\u0000${node.id}`) ?? { source: nodes[index].id, target: node.id }) };
}

/** Validates a canonical linear graph before a save or publish mutation. */
export function validateLinearWorkflowGraph(graph: LinearWorkflowGraph, forPublish = false): string | null {
  if (graph.nodes.filter((node) => node.type === "start").length !== 1) return "A linear workflow requires exactly one start node.";
  if (forPublish && graph.nodes.length < 2) return "Publishing requires at least one Form step.";
  const ids = new Set<string>();
  for (const node of graph.nodes) { if (!node.id || ids.has(node.id)) return "Workflow node IDs must be unique."; ids.add(node.id); if (node.type === "form_ref" && !node.data.formId) return "Every Form step requires a Form ID."; }
  if (!graph.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))) return "Every workflow edge must reference existing nodes.";
  return null;
}

/** Converts documented visual structures into the generic JSON object used by the transport layer. */
export function toJsonDefinition(value: WorkflowFormDefinition | LinearWorkflowGraph): JsonObject {
  return value as unknown as JsonObject;
}

/** Retains JSON typing for raw-document state. */
export function asJsonObject(value: JsonValue): JsonObject | null {
  return isRecord(value) ? toJsonObject(value) : null;
}
