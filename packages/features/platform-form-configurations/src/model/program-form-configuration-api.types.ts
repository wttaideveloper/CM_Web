/** Server-defined scope used when resolving a Program form configuration. */
export type ProgramFormConfigurationScope = "global" | "selective";

/** Lifecycle state returned for a Program form configuration or version. */
export type ProgramFormConfigurationStatus = "draft" | "published" | "retired" | "active" | "inactive" | "archived";

/** Backend-defined renderer identifier. */
export type ProgramFormRenderer = string;

/** Backend-defined Program field value type. */
export type ProgramFormValueType = string;

/** A selectable option configured for one Program form field. */
export interface ProgramFormFieldOption { value: string; label: string; position: number; }

/** Validation metadata accepted by the Program Form Configuration API. */
export interface ProgramFormFieldValidation { min_length?: number | null; max_length?: number | null; min?: number | null; max?: number | null; pattern?: string | null; }

/** Persisted settings for a backend-defined composite Program core field. */
export interface ProgramFormCompositeConfig {
  enabled_fields?: string[];
  required_fields?: string[];
  [key: string]: unknown;
}

/** A field in an ordered Program form section. */
export interface ProgramFormField { id: string; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: ProgramFormRenderer; value_type: ProgramFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: ProgramFormFieldOption[]; validation: ProgramFormFieldValidation; composite_config?: ProgramFormCompositeConfig | null; }

/** A section and its ordered fields in a persisted configuration version. */
export interface ProgramFormSection { id: string; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: ProgramFormField[]; }

/** An immutable version of a Program form configuration. */
export interface ProgramFormConfigurationVersion { id: string; configuration_id: string; version: number; status: ProgramFormConfigurationStatus; sections: ProgramFormSection[]; created_by: string | null; created_at: string | null; published_at: string | null; }

/** Summary returned by the Program form configuration list endpoint. */
export interface ProgramFormConfigurationSummary { id: string; name: string; description: string | null; scope: ProgramFormConfigurationScope; status: ProgramFormConfigurationStatus; is_active: boolean; current_version: number; created_by: string | null; created_at: string | null; updated_at: string | null; published_at: string | null; }

/** Full Program form configuration returned by detail and mutation endpoints. */
export interface ProgramFormConfiguration extends ProgramFormConfigurationSummary { draft_version: ProgramFormConfigurationVersion | null; published_version?: ProgramFormConfigurationVersion | null; }

/** Response returned after creating a draft configuration. */
export interface ProgramFormConfigurationCreateResponse extends ProgramFormConfiguration { draft_version: ProgramFormConfigurationVersion; }

/** Authoritative metadata for one core Program field. */
export interface ProgramCoreFieldRegistryEntry { key: string; display_name: string; value_type: ProgramFormValueType; allowed_renderers: ProgramFormRenderer[]; default_renderer: ProgramFormRenderer; required_by_domain: boolean; removable: boolean; hideable: boolean; configurable: { label: boolean; section: boolean; position: boolean; required: boolean; renderer: boolean; placeholder: boolean; help_text: boolean; validation: boolean; }; }

/** One tenant assignment returned by the configuration assignment endpoint. */
export interface ProgramFormAssignment { id: string; configuration_id: string; tenant_id: string; created_at: string | null; updated_at: string | null; }

/** One immutable audit entry for a configuration change. */
export interface ProgramFormAuditEntry { id: string; configuration_id: string; action: string; actor_id: string | null; created_at: string; metadata: Record<string, unknown> | null; }

/** Writable section shape shared by create and update requests. */
export interface ProgramFormSectionInput { id?: string | null; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: ProgramFormFieldInput[]; }

/** Writable field shape shared by create and update requests. */
export interface ProgramFormFieldInput { id?: string | null; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: ProgramFormRenderer; value_type: ProgramFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: ProgramFormFieldOption[]; validation: ProgramFormFieldValidation; composite_config?: ProgramFormCompositeConfig | null; }

/** Request body for creating a Program form configuration. */
export interface CreateProgramFormConfigurationRequest { name: string; description: string | null; scope: ProgramFormConfigurationScope; sections: ProgramFormSectionInput[]; }

/** Request body for updating a Program form configuration. */
export interface UpdateProgramFormConfigurationRequest { name: string; description: string | null; scope: ProgramFormConfigurationScope; sections: ProgramFormSectionInput[]; }

/** Request body for replacing a configuration's tenant assignments. */
export interface UpdateProgramFormConfigurationAssignmentsRequest { tenant_ids: string[]; }

/** Response returned after publishing a configuration. */
export interface ProgramFormPublishResponse { configuration: ProgramFormConfiguration; version: ProgramFormConfigurationVersion; }
