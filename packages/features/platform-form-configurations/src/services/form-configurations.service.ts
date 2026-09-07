import type { CreateEventFormConfigurationRequest, EventCoreFieldRegistryEntry, EventFormAssignment, EventFormAuditEntry, EventFormCompositeConfig, EventFormConfiguration, EventFormConfigurationCreateResponse, EventFormConfigurationSummary, EventFormConfigurationVersion, EventFormPublishResponse, UpdateEventFormConfigurationAssignmentsRequest, UpdateEventFormConfigurationRequest } from "../model/event-form-configuration-api.types";

const eventFormConfigurationsPath = "/api/v1/admin/event-form-configurations";

/** Represents an HTTP failure without exposing backend response bodies. */
export class FormConfigurationsApiError extends Error {
  constructor(readonly status: number | null, message = "Event Form Configurations request failed") { super(message); this.name = "FormConfigurationsApiError"; }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === "string"; }
function isNullableString(value: unknown): value is string | null | undefined { return value === undefined || value === null || isString(value); }
function isNullableFiniteNumber(value: unknown): boolean { return value === undefined || value === null || (typeof value === "number" && Number.isFinite(value)); }
function isScope(value: unknown): boolean { return value === "global" || value === "selective"; }
function isStatus(value: unknown): boolean { return value === "draft" || value === "published" || value === "retired"; }
function isValidation(value: unknown): boolean { return isRecord(value) && isNullableFiniteNumber(value.min_length) && isNullableFiniteNumber(value.max_length) && isNullableFiniteNumber(value.min) && isNullableFiniteNumber(value.max) && isNullableString(value.pattern); }
function isOption(value: unknown): boolean { return isRecord(value) && isString(value.value) && isString(value.label) && Number.isInteger(value.position); }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(isString); }
function isCompositeConfig(value: unknown): value is EventFormCompositeConfig { return isRecord(value) && (value.enabled_fields === undefined || isStringArray(value.enabled_fields)) && (value.required_fields === undefined || isStringArray(value.required_fields)); }
function isNullableCompositeConfig(value: unknown): value is EventFormCompositeConfig | null | undefined { return value === undefined || value === null || isCompositeConfig(value); }
function isField(value: unknown): boolean { return isRecord(value) && isString(value.id) && (value.source === "core" || value.source === "custom") && isNullableString(value.core_key) && isNullableString(value.stable_key) && isString(value.label) && isString(value.renderer) && isString(value.value_type) && typeof value.required === "boolean" && typeof value.is_enabled === "boolean" && Number.isInteger(value.position) && isNullableString(value.placeholder) && isNullableString(value.help_text) && Array.isArray(value.options) && value.options.every(isOption) && isValidation(value.validation) && isNullableCompositeConfig(value.composite_config); }
function isSection(value: unknown): boolean { return isRecord(value) && isString(value.id) && isString(value.stable_key) && isString(value.label) && isNullableString(value.description) && Number.isInteger(value.position) && typeof value.is_enabled === "boolean" && Array.isArray(value.fields) && value.fields.every(isField); }
function isSummary(value: unknown): value is EventFormConfigurationSummary { return isRecord(value) && isString(value.id) && isString(value.name) && isNullableString(value.description) && isScope(value.scope) && isStatus(value.status) && typeof value.is_active === "boolean" && Number.isInteger(value.current_version) && isNullableString(value.created_by) && isNullableString(value.created_at) && isNullableString(value.updated_at) && isNullableString(value.published_at); }
function isVersion(value: unknown): value is EventFormConfigurationVersion { return isRecord(value) && isString(value.id) && isString(value.configuration_id) && Number.isInteger(value.version) && isStatus(value.status) && Array.isArray(value.sections) && value.sections.every(isSection) && isNullableString(value.created_by) && isNullableString(value.created_at) && isNullableString(value.published_at); }
function isNullableVersion(value: unknown): value is EventFormConfigurationVersion | null { return value === null || isVersion(value); }
function isConfiguration(value: unknown): value is EventFormConfiguration { return isSummary(value) && isRecord(value) && "draft_version" in value && isNullableVersion(value.draft_version) && (!("published_version" in value) || isNullableVersion(value.published_version)); }
function isCreatedConfiguration(value: unknown): value is EventFormConfigurationCreateResponse { return isConfiguration(value) && isVersion(value.draft_version); }
function isRegistryEntry(value: unknown): value is EventCoreFieldRegistryEntry { if (!isRecord(value) || !isString(value.key) || !isString(value.display_name) || !isString(value.value_type) || !Array.isArray(value.allowed_renderers) || !value.allowed_renderers.every(isString) || !isString(value.default_renderer) || typeof value.required_by_domain !== "boolean" || typeof value.removable !== "boolean" || typeof value.hideable !== "boolean" || !isRecord(value.configurable)) return false; const configurable = value.configurable; return ["label", "section", "position", "required", "renderer", "placeholder", "help_text", "validation"].every((key) => typeof configurable[key] === "boolean"); }
function isAssignment(value: unknown): value is EventFormAssignment { return isRecord(value) && isString(value.id) && isString(value.configuration_id) && isString(value.tenant_id) && isNullableString(value.created_at) && isNullableString(value.updated_at); }
function collectionEntries(value: unknown, keys: readonly string[]): unknown[] | null { if (Array.isArray(value)) return value; if (!isRecord(value)) return null; for (const key of keys) if (Array.isArray(value[key])) return value[key] as unknown[]; return null; }
function assignmentEntries(value: unknown): unknown[] | null { return collectionEntries(value, ["data", "items", "assignments"]); }
function auditActorId(value: Record<string, unknown>): string | null | undefined { if ("actor_id" in value && isNullableString(value.actor_id)) return value.actor_id ?? null; if (value.actor === null) return null; if (!isRecord(value.actor)) return undefined; return isString(value.actor.id) ? value.actor.id : isString(value.actor.user_id) ? value.actor.user_id : undefined; }
function toAuditEntry(value: unknown): EventFormAuditEntry | null { if (!isRecord(value) || !isString(value.id) || !isString(value.configuration_id) || !isString(value.action)) return null; const actorId = auditActorId(value); const createdAt = isString(value.created_at) ? value.created_at : isString(value.timestamp) ? value.timestamp : undefined; const metadata = value.metadata ?? value.details ?? null; if (actorId === undefined || !createdAt || (metadata !== null && !isRecord(metadata))) return null; return { id: value.id, configuration_id: value.configuration_id, action: value.action, actor_id: actorId, created_at: createdAt, metadata }; }
function auditEntries(value: unknown): EventFormAuditEntry[] | null { const entries = collectionEntries(value, ["data", "items", "audit", "audit_history"]); if (!entries) return null; const parsedEntries = entries.map(toAuditEntry); return parsedEntries.every((entry): entry is EventFormAuditEntry => entry !== null) ? parsedEntries : null; }

function errorMessages(value: unknown): string[] {
  if (isString(value)) return [value];
  if (Array.isArray(value)) return value.flatMap(errorMessages);
  if (!isRecord(value)) return [];
  const messages = [isString(value.message) ? value.message : null, isString(value.detail) ? value.detail : null].filter(isString);
  const nested = [value.detail, value.errors].flatMap((item) => Array.isArray(item) || isRecord(item) ? errorMessages(item) : []);
  if (messages.length || nested.length) return [...messages, ...nested];
  return Object.entries(value).flatMap(([key, item]) => errorMessages(item).map((message) => `${key}: ${message}`));
}
async function errorMessage(response: Response): Promise<string> { const body = await response.json().catch(() => null) as unknown; const messages = errorMessages(body); return messages.length ? messages.join("\n") : `Event Form Configurations request failed (HTTP ${response.status}).`; }
async function requestJson(path: string, init?: RequestInit): Promise<unknown> { let response: Response; try { response = await fetch(path, { credentials: "include", ...init }); } catch { throw new FormConfigurationsApiError(null, "Unable to reach Event Form Configurations."); } if (!response.ok) throw new FormConfigurationsApiError(response.status, await errorMessage(response)); return response.json().catch(() => { throw new FormConfigurationsApiError(response.status, "Event Form Configurations returned invalid JSON."); }); }
function jsonRequest(method: "POST" | "PATCH" | "PUT", body?: object): RequestInit { return { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }; }
function configurationPath(configurationId: string, suffix = ""): string { return `${eventFormConfigurationsPath}/${encodeURIComponent(configurationId)}${suffix}`; }
function expect<T>(value: unknown, predicate: (candidate: unknown) => boolean, label: string): T { if (!predicate(value)) throw new FormConfigurationsApiError(null, `Event Form Configurations returned invalid ${label}.`); return value as T; }

/** Reads the backend-authoritative Event core field registry. */
export async function getEventFormFieldRegistry(): Promise<EventCoreFieldRegistryEntry[]> { const value = await requestJson(`${eventFormConfigurationsPath}/field-registry`); return expect(value, (candidate) => Array.isArray(candidate) && candidate.every(isRegistryEntry), "field registry"); }
/** Lists Event form configuration summaries. */
export async function listEventFormConfigurations(): Promise<EventFormConfigurationSummary[]> { const value = await requestJson(eventFormConfigurationsPath); return expect(value, (candidate) => Array.isArray(candidate) && candidate.every(isSummary), "configuration list"); }
/** Creates one draft Event form configuration. */
export async function createEventFormConfiguration(payload: CreateEventFormConfigurationRequest): Promise<EventFormConfigurationCreateResponse> { return expect(await requestJson(eventFormConfigurationsPath, jsonRequest("POST", payload)), isCreatedConfiguration, "created configuration"); }
/** Retrieves one Event form configuration and its current ordered sections. */
export async function getEventFormConfiguration(configurationId: string): Promise<EventFormConfiguration> { return expect(await requestJson(configurationPath(configurationId)), isConfiguration, "configuration"); }
/** Updates one Event form configuration. */
export async function updateEventFormConfiguration(configurationId: string, payload: UpdateEventFormConfigurationRequest): Promise<EventFormConfiguration> { return expect(await requestJson(configurationPath(configurationId), jsonRequest("PATCH", payload)), isConfiguration, "updated configuration"); }
/** Deletes one Event form configuration. */
export async function deleteEventFormConfiguration(configurationId: string): Promise<void> { await requestJson(configurationPath(configurationId), { method: "DELETE" }); }
/** Lists immutable versions for one Event form configuration. */
export async function listEventFormConfigurationVersions(configurationId: string): Promise<EventFormConfigurationVersion[]> { const value = await requestJson(configurationPath(configurationId, "/versions")); return expect(value, (candidate) => Array.isArray(candidate) && candidate.every(isVersion), "versions"); }
/** Retrieves one immutable Event form configuration version. */
export async function getEventFormConfigurationVersion(configurationId: string, versionId: string): Promise<EventFormConfigurationVersion> { return expect(await requestJson(configurationPath(configurationId, `/versions/${encodeURIComponent(versionId)}`)), isVersion, "version"); }
/** Publishes the current draft and returns its published version. */
export async function publishEventFormConfiguration(configurationId: string): Promise<EventFormPublishResponse> { const value = await requestJson(configurationPath(configurationId, "/publish"), jsonRequest("POST")); if (!isRecord(value) || !isConfiguration(value.configuration) || !isVersion(value.version)) throw new FormConfigurationsApiError(null, "Event Form Configurations returned invalid publish data."); return { configuration: value.configuration, version: value.version }; }
/** Activates one published Event form configuration. */
export async function activateEventFormConfiguration(configurationId: string): Promise<EventFormConfiguration> { return expect(await requestJson(configurationPath(configurationId, "/activate"), jsonRequest("POST")), isConfiguration, "activated configuration"); }
/** Deactivates one Event form configuration. */
export async function deactivateEventFormConfiguration(configurationId: string): Promise<EventFormConfiguration> { return expect(await requestJson(configurationPath(configurationId, "/deactivate"), jsonRequest("POST")), isConfiguration, "deactivated configuration"); }
/** Retires one published Event form configuration through the Events lifecycle endpoint. */
export async function retireEventFormConfiguration(configurationId: string): Promise<EventFormConfiguration> { return expect(await requestJson(`/api/v1/events/form-configuration/admin/${encodeURIComponent(configurationId)}/retire`, jsonRequest("POST")), isConfiguration, "retired configuration"); }
/** Retrieves persisted tenant assignments for one Event form configuration. */
export async function getEventFormConfigurationAssignments(configurationId: string): Promise<EventFormAssignment[]> { const value = await requestJson(configurationPath(configurationId, "/assignments")); const entries = assignmentEntries(value); return expect(entries, (candidate) => Array.isArray(candidate) && candidate.every(isAssignment), "assignments"); }
/** Replaces tenant assignments for one Event form configuration. */
export async function updateEventFormConfigurationAssignments(configurationId: string, payload: UpdateEventFormConfigurationAssignmentsRequest): Promise<EventFormAssignment[]> { const value = await requestJson(configurationPath(configurationId, "/assignments"), jsonRequest("PUT", payload)); const entries = assignmentEntries(value); return expect(entries, (candidate) => Array.isArray(candidate) && candidate.every(isAssignment), "updated assignments"); }
/** Retrieves immutable audit history for one Event form configuration. */
export async function getEventFormConfigurationAudit(configurationId: string): Promise<EventFormAuditEntry[]> { const value = await requestJson(configurationPath(configurationId, "/audit")); const entries = auditEntries(value); return expect(entries, (candidate) => Array.isArray(candidate) && candidate.every((entry) => entry !== null), "audit history"); }
