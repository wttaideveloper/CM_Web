/** Server-defined scope used when resolving a Training form configuration. */
export type TrainingFormConfigurationScope = "global" | "selective";

/** Lifecycle state returned for a Training form configuration or version. */
export type TrainingFormConfigurationStatus = "draft" | "published" | "retired";

/** Backend-defined renderer identifier. */
export type TrainingFormRenderer = string;

/** Backend-defined Training field value type. */
export type TrainingFormValueType = string;

/** A selectable option configured for one Training form field. */
export interface TrainingFormFieldOption { value: string; label: string; position: number; }

/** Validation metadata accepted by the Training Form Configuration API. */
export interface TrainingFormFieldValidation { min_length?: number | null; max_length?: number | null; min?: number | null; max?: number | null; pattern?: string | null; }

/** Persisted settings for a backend-defined composite Training core field. */
export interface TrainingFormCompositeConfig {
  enabled_fields?: string[];
  required_fields?: string[];
  [key: string]: unknown;
}

/** A field in an ordered Training form section. */
export interface TrainingFormField { id: string; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: TrainingFormRenderer; value_type: TrainingFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: TrainingFormFieldOption[]; validation: TrainingFormFieldValidation; composite_config?: TrainingFormCompositeConfig | null; }

/** A section and its ordered fields in a persisted configuration version. */
export interface TrainingFormSection { id: string; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: TrainingFormField[]; }

/** An immutable version of a Training form configuration. */
export interface TrainingFormConfigurationVersion { id: string; configuration_id: string; version: number; status: TrainingFormConfigurationStatus; sections: TrainingFormSection[]; created_by: string | null; created_at: string | null; published_at: string | null; }

/** Summary returned by the Training form configuration list endpoint. */
export interface TrainingFormConfigurationSummary { id: string; name: string; description: string | null; scope: TrainingFormConfigurationScope; status: TrainingFormConfigurationStatus; is_active: boolean; current_version: number; created_by: string | null; created_at: string | null; updated_at: string | null; published_at: string | null; }

/** Full Training form configuration returned by detail and mutation endpoints. */
export interface TrainingFormConfiguration extends TrainingFormConfigurationSummary { draft_version: TrainingFormConfigurationVersion | null; published_version?: TrainingFormConfigurationVersion | null; }

/** Response returned after creating a draft configuration. */
export interface TrainingFormConfigurationCreateResponse extends TrainingFormConfiguration { draft_version: TrainingFormConfigurationVersion; }

/** Authoritative metadata for one core Training field. */
export interface TrainingCoreFieldRegistryEntry { key: string; display_name: string; value_type: TrainingFormValueType; allowed_renderers: TrainingFormRenderer[]; default_renderer: TrainingFormRenderer; required_by_domain: boolean; removable: boolean; hideable: boolean; configurable: { label: boolean; section: boolean; position: boolean; required: boolean; renderer: boolean; placeholder: boolean; help_text: boolean; validation: boolean; }; }

/** One tenant assignment returned by the configuration assignment endpoint. */
export interface TrainingFormAssignment { id: string; configuration_id: string; tenant_id: string; created_at: string | null; updated_at: string | null; }

/** One immutable audit entry for a configuration change. */
export interface TrainingFormAuditEntry { id: string; configuration_id: string; action: string; actor_id: string | null; created_at: string; metadata: Record<string, unknown> | null; }

/** Writable section shape shared by create and update requests. */
export interface TrainingFormSectionInput { id?: string | null; stable_key: string; label: string; description: string | null; position: number; is_enabled: boolean; fields: TrainingFormFieldInput[]; }

/** Writable field shape shared by create and update requests. */
export interface TrainingFormFieldInput { id?: string | null; source: "core" | "custom"; core_key: string | null; stable_key: string | null; label: string; renderer: TrainingFormRenderer; value_type: TrainingFormValueType; required: boolean; is_enabled: boolean; position: number; placeholder: string | null; help_text: string | null; options: TrainingFormFieldOption[]; validation: TrainingFormFieldValidation; composite_config?: TrainingFormCompositeConfig | null; }

/** Request body for creating a Training form configuration. */
export interface CreateTrainingFormConfigurationRequest { name: string; description: string | null; scope: TrainingFormConfigurationScope; sections: TrainingFormSectionInput[]; }

/** Request body for updating a Training form configuration. */
export interface UpdateTrainingFormConfigurationRequest { name: string; description: string | null; scope: TrainingFormConfigurationScope; sections: TrainingFormSectionInput[]; }

/** Request body for replacing a configuration's tenant assignments. */
export interface UpdateTrainingFormConfigurationAssignmentsRequest { tenant_ids: string[]; }

/** Response returned after publishing a configuration. */
export interface TrainingFormPublishResponse { configuration: TrainingFormConfiguration; version: TrainingFormConfigurationVersion; }
