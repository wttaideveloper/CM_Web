import type { CreateCourseFormConfigurationRequest, CourseCoreFieldRegistryEntry, CourseFormAssignment, CourseFormAuditEntry, CourseFormCompositeConfig, CourseFormConfiguration, CourseFormConfigurationCreateResponse, CourseFormConfigurationSummary, CourseFormConfigurationVersion, CourseFormPublishResponse, UpdateCourseFormConfigurationAssignmentsRequest, UpdateCourseFormConfigurationRequest } from "../model/course-form-configuration-api.types";

const courseFormConfigurationsPath = "/api/platform-super-admin/course-form-configurations";

/** Represents an HTTP failure without exposing backend response bodies. */
export class CourseFormConfigurationsApiError extends Error {
  constructor(readonly status: number | null, message = "Course Form Configurations request failed") { super(message); this.name = "CourseFormConfigurationsApiError"; }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === "string"; }
function isNullableString(value: unknown): value is string | null | undefined { return value === undefined || value === null || isString(value); }
function isNullableFiniteNumber(value: unknown): boolean { return value === undefined || value === null || (typeof value === "number" && Number.isFinite(value)); }
function isScope(value: unknown): boolean { return value === "global" || value === "selective"; }
function isStatus(value: unknown): boolean { return value === "draft" || value === "published" || value === "retired" || value === "active" || value === "inactive" || value === "archived"; }
function isValidation(value: unknown): boolean { return isRecord(value) && isNullableFiniteNumber(value.min_length) && isNullableFiniteNumber(value.max_length) && isNullableFiniteNumber(value.min) && isNullableFiniteNumber(value.max) && isNullableString(value.pattern); }
function isOption(value: unknown): boolean { return isRecord(value) && isString(value.value) && isString(value.label) && Number.isInteger(value.position); }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(isString); }
function isCompositeConfig(value: unknown): value is CourseFormCompositeConfig { return isRecord(value) && (value.enabled_fields === undefined || isStringArray(value.enabled_fields)) && (value.required_fields === undefined || isStringArray(value.required_fields)); }
function isNullableCompositeConfig(value: unknown): value is CourseFormCompositeConfig | null | undefined { return value === undefined || value === null || isCompositeConfig(value); }
function isField(value: unknown): boolean { return isRecord(value) && isString(value.id) && (value.source === "core" || value.source === "custom") && isNullableString(value.core_key) && isNullableString(value.stable_key) && isString(value.label) && isString(value.renderer) && isString(value.value_type) && typeof value.required === "boolean" && typeof value.is_enabled === "boolean" && Number.isInteger(value.position) && isNullableString(value.placeholder) && isNullableString(value.help_text) && Array.isArray(value.options) && value.options.every(isOption) && isValidation(value.validation) && isNullableCompositeConfig(value.composite_config); }
function isSection(value: unknown): boolean { return isRecord(value) && isString(value.id) && isString(value.stable_key) && isString(value.label) && isNullableString(value.description) && Number.isInteger(value.position) && typeof value.is_enabled === "boolean" && Array.isArray(value.fields) && value.fields.every(isField); }
function isSummary(value: unknown): value is CourseFormConfigurationSummary { return isRecord(value) && isString(value.id) && isString(value.name) && isNullableString(value.description) && isScope(value.scope) && isStatus(value.status) && typeof value.is_active === "boolean" && Number.isInteger(value.current_version) && isNullableString(value.created_by) && isNullableString(value.created_at) && isNullableString(value.updated_at) && isNullableString(value.published_at); }
function isVersion(value: unknown): value is CourseFormConfigurationVersion { return isRecord(value) && isString(value.id) && isString(value.configuration_id) && Number.isInteger(value.version) && isStatus(value.status) && Array.isArray(value.sections) && value.sections.every(isSection) && isNullableString(value.created_by) && isNullableString(value.created_at) && isNullableString(value.published_at); }
function isNullableVersion(value: unknown): value is CourseFormConfigurationVersion | null { return value === null || isVersion(value); }
function isConfiguration(value: unknown): value is CourseFormConfiguration { return isSummary(value) && isRecord(value) && "draft_version" in value && isNullableVersion(value.draft_version) && (!("published_version" in value) || isNullableVersion(value.published_version)); }
function isCreatedConfiguration(value: unknown): value is CourseFormConfigurationCreateResponse { return isConfiguration(value) && isVersion(value.draft_version); }
function isRegistryEntry(value: unknown): value is CourseCoreFieldRegistryEntry { if (!isRecord(value) || !isString(value.key) || !isString(value.display_name) || !isString(value.value_type) || !Array.isArray(value.allowed_renderers) || !value.allowed_renderers.every(isString) || !isString(value.default_renderer) || typeof value.required_by_domain !== "boolean" || typeof value.removable !== "boolean" || typeof value.hideable !== "boolean" || !isRecord(value.configurable)) return false; const configurable = value.configurable; return ["label", "section", "position", "required", "renderer", "placeholder", "help_text", "validation"].every((key) => typeof configurable[key] === "boolean"); }
function isAssignment(value: unknown): value is CourseFormAssignment { return isRecord(value) && isString(value.id) && isString(value.configuration_id) && isString(value.tenant_id) && isNullableString(value.created_at) && isNullableString(value.updated_at); }
function collectionEntries(value: unknown, keys: readonly string[]): unknown[] | null { if (Array.isArray(value)) return value; if (!isRecord(value)) return null; for (const key of keys) if (Array.isArray(value[key])) return value[key] as unknown[]; return null; }
function assignmentEntries(value: unknown): unknown[] | null { return collectionEntries(value, ["data", "items", "assignments"]); }
function auditActorId(value: Record<string, unknown>): string | null | undefined { if ("actor_id" in value && isNullableString(value.actor_id)) return value.actor_id ?? null; if (value.actor === null) return null; if (!isRecord(value.actor)) return undefined; return isString(value.actor.id) ? value.actor.id : isString(value.actor.user_id) ? value.actor.user_id : undefined; }
function toAuditEntry(value: unknown): CourseFormAuditEntry | null { if (!isRecord(value) || !isString(value.id) || !isString(value.configuration_id) || !isString(value.action)) return null; const actorId = auditActorId(value); const createdAt = isString(value.created_at) ? value.created_at : isString(value.timestamp) ? value.timestamp : undefined; const metadata = value.metadata ?? value.details ?? null; if (actorId === undefined || !createdAt || (metadata !== null && !isRecord(metadata))) return null; return { id: value.id, configuration_id: value.configuration_id, action: value.action, actor_id: actorId, created_at: createdAt, metadata }; }
function auditEntries(value: unknown): CourseFormAuditEntry[] | null { const entries = collectionEntries(value, ["data", "items", "audit", "audit_history"]); if (!entries) return null; const parsedEntries = entries.map(toAuditEntry); return parsedEntries.every((entry): entry is CourseFormAuditEntry => entry !== null) ? parsedEntries : null; }

function errorMessages(value: unknown): string[] {
  if (isString(value)) return [value];
  if (Array.isArray(value)) return value.flatMap(errorMessages);
  if (!isRecord(value)) return [];
  const messages = [isString(value.message) ? value.message : null, isString(value.detail) ? value.detail : null].filter(isString);
  const nested = [value.detail, value.errors].flatMap((item) => Array.isArray(item) || isRecord(item) ? errorMessages(item) : []);
  if (messages.length || nested.length) return [...messages, ...nested];
  return Object.entries(value).flatMap(([key, item]) => errorMessages(item).map((message) => `${key}: ${message}`));
}
async function errorMessage(response: Response): Promise<string> { if (response.status === 401) return "Super Admin authentication is required."; if (response.status === 403) return "You do not have permission to manage form configurations."; const body = await response.json().catch(() => null) as unknown; const messages = errorMessages(body); return messages.length ? messages.join("\n") : `Course Form Configurations request failed (HTTP ${response.status}).`; }
async function request(path: string, init?: RequestInit): Promise<Response> { let response: Response; try { response = await fetch(path, init); } catch { throw new CourseFormConfigurationsApiError(null, "Unable to reach Course Form Configurations."); } if (!response.ok) throw new CourseFormConfigurationsApiError(response.status, await errorMessage(response)); return response; }
async function requestJson(path: string, init?: RequestInit): Promise<unknown> { const response = await request(path, init); if (response.status === 204) return undefined; return response.json().catch(() => { throw new CourseFormConfigurationsApiError(response.status, "Course Form Configurations returned invalid JSON."); }); }
function jsonRequest(method: "POST" | "PATCH" | "PUT", body?: object): RequestInit { return { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }; }
function configurationPath(configurationId: string, suffix = ""): string { return `${courseFormConfigurationsPath}/${encodeURIComponent(configurationId)}${suffix}`; }
function expect<T>(value: unknown, predicate: (candidate: unknown) => boolean, label: string): T { if (!predicate(value)) throw new CourseFormConfigurationsApiError(null, `Course Form Configurations returned invalid ${label}.`); return value as T; }

/** Reads the backend-authoritative Course core field registry. */
export async function getCourseFormFieldRegistry(): Promise<CourseCoreFieldRegistryEntry[]> { const value = await requestJson(`${courseFormConfigurationsPath}/field-registry`); return expect(value, (candidate) => Array.isArray(candidate) && candidate.every(isRegistryEntry), "field registry"); }
/** Lists Course form configuration summaries. */
export async function listCourseFormConfigurations(): Promise<CourseFormConfigurationSummary[]> { const value = await requestJson(courseFormConfigurationsPath); return expect(value, (candidate) => Array.isArray(candidate) && candidate.every(isSummary), "configuration list"); }
/** Creates one draft Course form configuration. */
export async function createCourseFormConfiguration(payload: CreateCourseFormConfigurationRequest): Promise<CourseFormConfigurationCreateResponse> { return expect(await requestJson(courseFormConfigurationsPath, jsonRequest("POST", payload)), isCreatedConfiguration, "created configuration"); }
/** Retrieves one Course form configuration and its current ordered sections. */
export async function getCourseFormConfiguration(configurationId: string): Promise<CourseFormConfiguration> { return expect(await requestJson(configurationPath(configurationId)), isConfiguration, "configuration"); }
/** Updates one Course form configuration. */
export async function updateCourseFormConfiguration(configurationId: string, payload: UpdateCourseFormConfigurationRequest): Promise<CourseFormConfiguration> { return expect(await requestJson(configurationPath(configurationId), jsonRequest("PATCH", payload)), isConfiguration, "updated configuration"); }
/** Deletes one Course form configuration. */
export async function deleteCourseFormConfiguration(configurationId: string): Promise<void> { await request(configurationPath(configurationId), { method: "DELETE" }); }
/** Lists immutable versions for one Course form configuration. */
export async function listCourseFormConfigurationVersions(configurationId: string): Promise<CourseFormConfigurationVersion[]> { const value = await requestJson(configurationPath(configurationId, "/versions")); return expect(value, (candidate) => Array.isArray(candidate) && candidate.every(isVersion), "versions"); }
/** Retrieves one immutable Course form configuration version. */
export async function getCourseFormConfigurationVersion(configurationId: string, versionId: string): Promise<CourseFormConfigurationVersion> { return expect(await requestJson(configurationPath(configurationId, `/versions/${encodeURIComponent(versionId)}`)), isVersion, "version"); }
/** Publishes the current draft and returns its published version. */
export async function publishCourseFormConfiguration(configurationId: string): Promise<CourseFormPublishResponse> {
  const value = await requestJson(configurationPath(configurationId, "/publish"), jsonRequest("POST"));
  const maybeWrapped = isRecord(value) && "data" in value && isRecord(value.data) ? value.data : value;
  if (isConfiguration(maybeWrapped as unknown)) {
    const cfg = maybeWrapped as unknown as CourseFormConfiguration;
    const ver = cfg.published_version ?? cfg.draft_version;
    if (ver && isVersion(ver)) return { configuration: cfg, version: ver };
  }
  if (isRecord(maybeWrapped) && isRecord(maybeWrapped.configuration) && isRecord(maybeWrapped.version)) {
    const cfg = maybeWrapped.configuration;
    const ver = maybeWrapped.version;
    if (typeof cfg.id === "string" && typeof cfg.name === "string" && typeof ver.id === "string" && typeof (ver as Record<string, unknown>).version === "number") {
      return { configuration: cfg as unknown as CourseFormConfiguration, version: ver as unknown as CourseFormConfigurationVersion };
    }
  }
  if (isRecord(value) && isConfiguration(value.configuration as unknown) && isVersion(value.version as unknown)) return { configuration: value.configuration as unknown as CourseFormConfiguration, version: value.version as unknown as CourseFormConfigurationVersion };
  throw new CourseFormConfigurationsApiError(null, "Course Form Configurations returned invalid publish data.");
}
/** Activates one published Course form configuration. */
export async function activateCourseFormConfiguration(configurationId: string): Promise<CourseFormConfiguration> { return expect(await requestJson(configurationPath(configurationId, "/activate"), jsonRequest("POST")), isConfiguration, "activated configuration"); }
/** Deactivates one Course form configuration. */
export async function deactivateCourseFormConfiguration(configurationId: string): Promise<CourseFormConfiguration> { return expect(await requestJson(configurationPath(configurationId, "/deactivate"), jsonRequest("POST")), isConfiguration, "deactivated configuration"); }
/** Retires one published Course form configuration through the Courses lifecycle endpoint. */
export async function retireCourseFormConfiguration(configurationId: string): Promise<CourseFormConfiguration> { return expect(await requestJson(configurationPath(configurationId, "/retire"), jsonRequest("POST")), isConfiguration, "retired configuration"); }
/** Retrieves persisted tenant assignments for one Course form configuration. */
export async function getCourseFormConfigurationAssignments(configurationId: string): Promise<CourseFormAssignment[]> { const value = await requestJson(configurationPath(configurationId, "/assignments")); const entries = assignmentEntries(value); return expect(entries, (candidate) => Array.isArray(candidate) && candidate.every(isAssignment), "assignments"); }
/** Replaces tenant assignments for one Course form configuration. */
export async function updateCourseFormConfigurationAssignments(configurationId: string, payload: UpdateCourseFormConfigurationAssignmentsRequest): Promise<CourseFormAssignment[]> { const value = await requestJson(configurationPath(configurationId, "/assignments"), jsonRequest("PUT", payload)); const entries = assignmentEntries(value); return expect(entries, (candidate) => Array.isArray(candidate) && candidate.every(isAssignment), "updated assignments"); }
/** Retrieves immutable audit history for one Course form configuration. */
export async function getCourseFormConfigurationAudit(configurationId: string): Promise<CourseFormAuditEntry[]> { const value = await requestJson(configurationPath(configurationId, "/audit")); const entries = auditEntries(value); return expect(entries, (candidate) => Array.isArray(candidate) && candidate.every((entry) => entry !== null), "audit history"); }

