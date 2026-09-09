/** Server-defined scope used when resolving a Course form configuration. */
export type CourseFormConfigurationScope = "global" | "selective";

/** Lifecycle state returned for a Course form configuration or version. */
export type CourseFormConfigurationStatus = "draft" | "published" | "retired" | "active" | "inactive" | "archived";

/** Backend-defined renderer identifier. */
export type CourseFormRenderer = string;

/** Backend-defined Course field value type. */
export type CourseFormValueType = string;

/** A selectable option configured for one Course form field. */
export interface CourseFormFieldOption { value: string; label: string; position: number; }

/** Validation metadata accepted by the Course Form Configuration API. */
export interface CourseFormFieldValidation { min_length?: number | null; max_length?: number | null; min?: number | null; max?: number | null; pattern?: string | null; }

/** Persisted settings for a backend-defined composite Course core field. */
export interface CourseFormCompositeConfig {
  enabled_fields?: string[];
  required_fields?: string[];
  [key: string]: unknown;
}

/** A field in an ordered Course form section. */
export interface CourseFormField { id: string; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: CourseFormRenderer; value_type: CourseFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: CourseFormFieldOption[]; validation: CourseFormFieldValidation; composite_config?: CourseFormCompositeConfig | null; }

/** A section and its ordered fields in a persisted configuration version. */
export interface CourseFormSection { id: string; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: CourseFormField[]; }

/** An immutable version of a Course form configuration. */
export interface CourseFormConfigurationVersion { id: string; configuration_id: string; version: number; status: CourseFormConfigurationStatus; sections: CourseFormSection[]; created_by: string | null; created_at: string | null; published_at: string | null; }

/** Summary returned by the Course form configuration list endpoint. */
export interface CourseFormConfigurationSummary { id: string; name: string; description: string | null; scope: CourseFormConfigurationScope; status: CourseFormConfigurationStatus; is_active: boolean; current_version: number; created_by: string | null; created_at: string | null; updated_at: string | null; published_at: string | null; }

/** Full Course form configuration returned by detail and mutation endpoints. */
export interface CourseFormConfiguration extends CourseFormConfigurationSummary { draft_version: CourseFormConfigurationVersion | null; published_version?: CourseFormConfigurationVersion | null; }

/** Response returned after creating a draft configuration. */
export interface CourseFormConfigurationCreateResponse extends CourseFormConfiguration { draft_version: CourseFormConfigurationVersion; }

/** Authoritative metadata for one core Course field. */
export interface CourseCoreFieldRegistryEntry { key: string; display_name: string; value_type: CourseFormValueType; allowed_renderers: CourseFormRenderer[]; default_renderer: CourseFormRenderer; required_by_domain: boolean; removable: boolean; hideable: boolean; configurable: { label: boolean; section: boolean; position: boolean; required: boolean; renderer: boolean; placeholder: boolean; help_text: boolean; validation: boolean; }; }

/** One tenant assignment returned by the configuration assignment endpoint. */
export interface CourseFormAssignment { id: string; configuration_id: string; tenant_id: string; created_at: string | null; updated_at: string | null; }

/** One immutable audit entry for a configuration change. */
export interface CourseFormAuditEntry { id: string; configuration_id: string; action: string; actor_id: string | null; created_at: string; metadata: Record<string, unknown> | null; }

/** Writable section shape shared by create and update requests. */
export interface CourseFormSectionInput { id?: string | null; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: CourseFormFieldInput[]; }

/** Writable field shape shared by create and update requests. */
export interface CourseFormFieldInput { id?: string | null; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: CourseFormRenderer; value_type: CourseFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: CourseFormFieldOption[]; validation: CourseFormFieldValidation; composite_config?: CourseFormCompositeConfig | null; }

/** Request body for creating a Course form configuration. */
export interface CreateCourseFormConfigurationRequest { name: string; description: string | null; scope: CourseFormConfigurationScope; sections: CourseFormSectionInput[]; }

/** Request body for updating a Course form configuration. */
export interface UpdateCourseFormConfigurationRequest { name: string; description: string | null; scope: CourseFormConfigurationScope; sections: CourseFormSectionInput[]; }

/** Request body for replacing a configuration's tenant assignments. */
export interface UpdateCourseFormConfigurationAssignmentsRequest { tenant_ids: string[]; }

/** Response returned after publishing a configuration. */
export interface CourseFormPublishResponse { configuration: CourseFormConfiguration; version: CourseFormConfigurationVersion; }

